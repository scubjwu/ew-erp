import fs from "fs";
import path from "path";
import { setTimeout as delay } from "timers/promises";
import { execFileSync } from "child_process";

import { createClient } from "@supabase/supabase-js";

const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";
const DEFAULT_APP_BASE_URL = "http://127.0.0.1:3000";

function readEnvFile() {
  const envPath = path.join(process.cwd(), ".env.local");
  const raw = fs.readFileSync(envPath, "utf8");
  return Object.fromEntries(
    raw
      .split(/\r?\n/)
      .filter(Boolean)
      .filter((line) => !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

function fail(message) {
  throw new Error(message);
}

function runPsql(sql) {
  execFileSync(
    "docker",
    [
      "exec",
      "supabase_db_db",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      sql,
    ],
    {
      cwd: process.cwd(),
      stdio: "ignore",
    }
  );
}

function escapeLiteral(value) {
  return value.replace(/'/g, "''");
}

async function assertHttpOk(url, expectedText = []) {
  let lastFailure = null;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) {
        lastFailure = `Expected ${url} to return 200, got ${response.status}`;
      } else {
        const body = await response.text();
        if (body.includes("Unhandled Runtime Error")) {
          lastFailure = `Runtime error detected in ${url}`;
        } else if (body.includes("Error:")) {
          lastFailure = `Unexpected error text detected in ${url}`;
        } else {
          let missingText = null;
          for (const text of expectedText) {
            if (!body.includes(text)) {
              missingText = `Expected ${url} to include "${text}"`;
              break;
            }
          }
          if (!missingText) return;
          lastFailure = missingText;
        }
      }
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : String(error);
    }
    await delay(1000);
  }
  fail(lastFailure ?? `Failed to load ${url}`);
}

async function must(resultPromise, label) {
  const result = await resultPromise;
  if (result.error) {
    result.error.message = `${label}: ${result.error.message}`;
    throw result.error;
  }
  return result.data;
}

async function waitForSupabaseReady(supabase) {
  let lastError = null;
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      const { error } = await supabase.from("users").select("id").limit(1);
      if (!error) return;
      lastError = error;
    } catch (error) {
      lastError = error;
    }
    await delay(1000);
  }
  if (lastError instanceof Error) throw lastError;
  throw new Error(`Supabase API did not become ready: ${String(lastError)}`);
}

async function main() {
  const env = readEnvFile();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const appBaseUrl = process.env.EW_ERP_BASE_URL || DEFAULT_APP_BASE_URL;

  if (!supabaseUrl || !anonKey) {
    fail("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  }
  if (supabaseUrl !== LOCAL_SUPABASE_URL) {
    fail(
      `Regression workflow only supports local Supabase. Current NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}`
    );
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await assertHttpOk(appBaseUrl);

  runPsql("notify pgrst, 'reload schema';");
  await waitForSupabaseReady(supabase);

  const createdIds = {
    userId: null,
    vendorId: null,
    materialVendorId: null,
    lesseeId: null,
    ownerId: null,
    customerId: null,
  };

  const stamp = String(Date.now());
  const last4 = stamp.slice(-4);
  const last5 = stamp.slice(-5);

  try {
    const seedUsers = await must(
      supabase
        .from("users")
        .select("id, full_name")
        .order("created_at", { ascending: true })
        .limit(1),
      "load seed users"
    );
    if ((seedUsers ?? []).length === 0) {
      fail("Local regression requires at least one seed user");
    }
    const baseUserId = seedUsers[0].id;

    const regions = await must(
      supabase
        .from("region_codes")
        .select("id, region_code")
        .in("region_code", ["China", "USA"])
        .order("region_code", { ascending: true }),
      "load region options"
    );
    const china = regions.find((row) => row.region_code === "China") ?? regions[0];
    const usa = regions.find((row) => row.region_code === "USA") ?? regions[0];
    if (!china?.id || !usa?.id) {
      fail("Could not resolve required region ids");
    }

    const createdUser = await must(
      supabase
        .from("users")
        .insert({
          user_code: `QA${last4}`,
          full_name: `Regression User ${stamp}`,
          email: `regression.user.${stamp}@example.com`,
          role: "Operations",
          status: "Inactive",
          phone: "18880001111",
          department: "QA",
          job_title: "Regression Tester",
          remarks: "regression-create",
        })
        .select("id, user_code, full_name")
        .single(),
      "create regression user"
    );
    createdIds.userId = createdUser.id;

    await must(
      supabase
        .from("users")
        .update({
          job_title: "Senior Regression Tester",
          remarks: "regression-updated",
        })
        .eq("id", createdUser.id)
        .select("id")
        .single(),
      "update regression user"
    );

    const createdCustomer = await must(
      supabase
        .from("customers")
        .insert({
          customer_custom_id: `C${last5}`,
          company_name: `Regression Customer ${stamp}`,
          company_name_other_language: `Regression Customer Alias ${stamp}`,
          customer_grade: "A",
          assigned_sales: "Regression Sales",
          region_id: china.id,
          contact_person: "Customer Regression PIC",
          status: "Normal",
          contact_phone: "9001002000",
          address: "Regression Customer Address",
          notes: "regression-create",
          finance_emails: [`regression.customer.finance.${stamp}@example.com`],
          ops_emails: [`regression.customer.ops.${stamp}@example.com`],
          purchasing_emails: [`regression.customer.primary.${stamp}@example.com`],
          credit_limit: 0,
          credit_term_days: 7,
          depot_info: {},
        })
        .select("id, customer_custom_id")
        .single(),
      "create regression customer"
    );
    createdIds.customerId = createdCustomer.id;

    await must(
      supabase
        .from("customer_certificate_links")
        .insert({
          customer_id: createdCustomer.id,
          link_url: `https://example.com/regression-customer-${stamp}.pdf`,
        })
        .select("id")
        .single(),
      "create regression customer certificate"
    );

    await must(
      supabase
        .from("customers")
        .update({
          company_name: `Regression Customer ${stamp} Updated`,
          notes: "regression-updated",
        })
        .eq("id", createdCustomer.id)
        .select("id")
        .single(),
      "update regression customer"
    );

    const createdVendor = await must(
      supabase
        .from("vendors")
        .insert({
          vendor_code: `S${last5}`,
          legal_company_name: `Regression Vendor ${stamp}`,
          company_name: `Regression Vendor Alias ${stamp}`,
          address: "Regression Vendor Address",
          region_id: china.id,
          country: "China",
          primary_contact_person: "Vendor Regression PIC",
          contact_email: `regression.vendor.${stamp}@example.com`,
          contact_tel: "1002003000",
          category: "Container",
          assigned_buyer_id: baseUserId,
          settlement_credit_days: 30,
          settlement_advance_payment_percentage: 5,
          settlement_currency: "USD",
          settlement_prepayment_pool: false,
          settlement_prepayment_threshold: 0,
          settlement_current_prepaid_balance: 0,
          status: "Normal",
          remark: "regression-create",
        })
        .select("id, vendor_code")
        .single(),
      "create regression vendor"
    );
    createdIds.vendorId = createdVendor.id;

    await must(
      supabase
        .from("vendor_attachment_links")
        .insert({
          vendor_id: createdVendor.id,
          url: `https://example.com/regression-vendor-${stamp}.pdf`,
          remark: "regression-attachment",
        })
        .select("id")
        .single(),
      "create regression vendor attachment"
    );

    await must(
      supabase
        .from("vendors")
        .update({
          legal_company_name: `Regression Vendor ${stamp} Updated`,
          remark: "regression-updated",
        })
        .eq("id", createdVendor.id)
        .select("id")
        .single(),
      "update regression vendor"
    );

    const createdMaterialVendor = await must(
      supabase
        .from("material_vendors")
        .insert({
          vendor_code: `DB${last4}`,
          legal_company_name: `Regression Material Vendor ${stamp}`,
          company_name: `Regression Material Alias ${stamp}`,
          address: "Regression Material Address",
          country: "China",
          primary_contact_person: "Material Regression PIC",
          material_category: "地板",
          contact_email: `regression.material.${stamp}@example.com`,
          contact_tel: "2003004000",
          pic_user_id: baseUserId,
          is_default_vendor: false,
          settlement_credit_days: 15,
          settlement_advance_payment_percentage: 2,
          settlement_currency: "CNY",
          settlement_prepayment_pool: false,
          settlement_prepayment_threshold: 0,
          settlement_current_prepaid_balance: 0,
          status: "Normal",
          remark: "regression-create",
        })
        .select("id, vendor_code")
        .single(),
      "create regression material vendor"
    );
    createdIds.materialVendorId = createdMaterialVendor.id;

    await must(
      supabase
        .from("material_vendor_attachment_links")
        .insert({
          material_vendor_id: createdMaterialVendor.id,
          url: `https://example.com/regression-material-${stamp}.pdf`,
          remark: "regression-attachment",
        })
        .select("id")
        .single(),
      "create regression material vendor attachment"
    );

    await must(
      supabase
        .from("material_vendors")
        .update({
          legal_company_name: `Regression Material Vendor ${stamp} Updated`,
          remark: "regression-updated",
        })
        .eq("id", createdMaterialVendor.id)
        .select("id")
        .single(),
      "update regression material vendor"
    );

    const createdLessee = await must(
      supabase
        .from("lessees")
        .insert({
          lessee_code: `B${last5}`,
          legal_company_name: `Regression Lessee ${stamp}`,
          company_name: `Regression Lessee Alias ${stamp}`,
          address: "Regression Lessee Address",
          region_id: usa.id,
          country: "USA",
          primary_contact_person: "Lessee Regression PIC",
          contact_email: `regression.lessee.${stamp}@example.com`,
          contact_tel: "3004005000",
          pic_user_id: baseUserId,
          settlement_credit_days: 45,
          settlement_advance_payment_percentage: 3,
          settlement_currency: "USD",
          settlement_prepayment_pool: false,
          settlement_prepayment_threshold: 0,
          settlement_current_prepaid_balance: 0,
          status: "Normal",
          remark: "regression-create",
        })
        .select("id, lessee_code")
        .single(),
      "create regression lessee"
    );
    createdIds.lesseeId = createdLessee.id;

    await must(
      supabase
        .from("lessee_attachment_links")
        .insert({
          lessee_id: createdLessee.id,
          url: `https://example.com/regression-lessee-${stamp}.pdf`,
          remark: "regression-attachment",
        })
        .select("id")
        .single(),
      "create regression lessee attachment"
    );

    await must(
      supabase
        .from("lessees")
        .update({
          legal_company_name: `Regression Lessee ${stamp} Updated`,
          remark: "regression-updated",
        })
        .eq("id", createdLessee.id)
        .select("id")
        .single(),
      "update regression lessee"
    );

    const createdOwner = await must(
      supabase
        .from("container_owners")
        .insert({
          container_owner_code: `O${last5}`,
          legal_company_name: `Regression Container Owner ${stamp}`,
          company_name: `Regression Owner Alias ${stamp}`,
          address: "Regression Owner Address",
          region_id: china.id,
          country: "China",
          primary_contact_person: "Owner Regression PIC",
          contact_email: `regression.owner.${stamp}@example.com`,
          contact_tel: "4005006000",
          pic_user_id: baseUserId,
          settlement_credit_days: 20,
          settlement_advance_payment_percentage: 4,
          settlement_currency: "USD",
          settlement_prepayment_pool: false,
          settlement_prepayment_threshold: 0,
          settlement_current_prepaid_balance: 0,
          status: "Normal",
          remark: "regression-create",
        })
        .select("id, container_owner_code")
        .single(),
      "create regression container owner"
    );
    createdIds.ownerId = createdOwner.id;

    await must(
      supabase
        .from("container_owner_attachment_links")
        .insert({
          container_owner_id: createdOwner.id,
          url: `https://example.com/regression-owner-${stamp}.pdf`,
          remark: "regression-attachment",
        })
        .select("id")
        .single(),
      "create regression container owner attachment"
    );

    await must(
      supabase
        .from("container_owners")
        .update({
          legal_company_name: `Regression Container Owner ${stamp} Updated`,
          remark: "regression-updated",
        })
        .eq("id", createdOwner.id)
        .select("id")
        .single(),
      "update regression container owner"
    );

    const checks = [];

    const usersSearch = await must(
      supabase
        .from("users")
        .select("*")
        .ilike("user_code", `%${createdUser.user_code}%`)
        .eq("role", "Operations")
        .eq("status", "Inactive"),
      "search regression users"
    );
    checks.push(["users_search", usersSearch.length === 1 && usersSearch[0].id === createdUser.id]);

    const usersExportRows = await must(
      supabase
        .from("users")
        .select("*")
        .eq("status", "Inactive")
        .ilike("full_name", `%Regression User ${stamp}%`),
      "export datasource users"
    );
    checks.push([
      "users_filtered_export_datasource",
      usersExportRows.length === 1 && usersExportRows[0].user_code === createdUser.user_code,
    ]);

    const vendorsSearch = await must(
      supabase
        .from("vendors")
        .select("id, vendor_code, region_id")
        .ilike("vendor_code", `%${createdVendor.vendor_code}%`)
        .or(
          `legal_company_name.ilike.%Regression Vendor ${stamp} Updated%,company_name.ilike.%Regression Vendor Alias ${stamp}%`
        )
        .eq("region_id", china.id),
      "search regression vendors"
    );
    checks.push([
      "vendors_search",
      vendorsSearch.length === 1 && vendorsSearch[0].id === createdVendor.id,
    ]);

    const vendorExportRows = await must(
      supabase
        .from("vendors")
        .select("id, vendor_code")
        .eq("region_id", china.id)
        .ilike("vendor_code", `%${createdVendor.vendor_code}%`),
      "export datasource vendors"
    );
    const vendorAttachments = await must(
      supabase
        .from("vendor_attachment_links")
        .select("*")
        .eq("vendor_id", createdVendor.id),
      "export datasource vendor attachments"
    );
    checks.push([
      "vendors_filtered_export_datasource",
      vendorExportRows.length === 1 && vendorAttachments.length === 1,
    ]);

    const materialSearch = await must(
      supabase
        .from("material_vendors")
        .select("id, vendor_code")
        .ilike("vendor_code", `%${createdMaterialVendor.vendor_code}%`)
        .or(
          `legal_company_name.ilike.%Regression Material Vendor ${stamp} Updated%,company_name.ilike.%Regression Material Alias ${stamp}%`
        )
        .eq("material_category", "地板")
        .eq("is_default_vendor", false),
      "search regression material vendors"
    );
    checks.push([
      "material_vendors_search",
      materialSearch.length === 1 && materialSearch[0].id === createdMaterialVendor.id,
    ]);

    const materialExportRows = await must(
      supabase
        .from("material_vendors")
        .select("id, vendor_code")
        .eq("material_category", "地板")
        .eq("is_default_vendor", false)
        .ilike("vendor_code", `%${createdMaterialVendor.vendor_code}%`),
      "export datasource material vendors"
    );
    const materialAttachments = await must(
      supabase
        .from("material_vendor_attachment_links")
        .select("*")
        .eq("material_vendor_id", createdMaterialVendor.id),
      "export datasource material vendor attachments"
    );
    checks.push([
      "material_vendors_filtered_export_datasource",
      materialExportRows.length === 1 && materialAttachments.length === 1,
    ]);

    const lesseeSearch = await must(
      supabase
        .from("lessees")
        .select("id, lessee_code")
        .ilike("lessee_code", `%${createdLessee.lessee_code}%`)
        .or(
          `legal_company_name.ilike.%Regression Lessee ${stamp} Updated%,company_name.ilike.%Regression Lessee Alias ${stamp}%`
        )
        .eq("region_id", usa.id),
      "search regression lessees"
    );
    checks.push([
      "lessees_search",
      lesseeSearch.length === 1 && lesseeSearch[0].id === createdLessee.id,
    ]);

    const lesseeExportRows = await must(
      supabase
        .from("lessees")
        .select("id, lessee_code")
        .eq("region_id", usa.id)
        .ilike("lessee_code", `%${createdLessee.lessee_code}%`),
      "export datasource lessees"
    );
    const lesseeAttachments = await must(
      supabase
        .from("lessee_attachment_links")
        .select("*")
        .eq("lessee_id", createdLessee.id),
      "export datasource lessee attachments"
    );
    checks.push([
      "lessees_filtered_export_datasource",
      lesseeExportRows.length === 1 && lesseeAttachments.length === 1,
    ]);

    const ownerSearch = await must(
      supabase
        .from("container_owners")
        .select("id, container_owner_code")
        .ilike("container_owner_code", `%${createdOwner.container_owner_code}%`)
        .or(
          `legal_company_name.ilike.%Regression Container Owner ${stamp} Updated%,company_name.ilike.%Regression Owner Alias ${stamp}%`
        )
        .eq("region_id", china.id),
      "search regression container owners"
    );
    checks.push([
      "container_owners_search",
      ownerSearch.length === 1 && ownerSearch[0].id === createdOwner.id,
    ]);

    const ownerExportRows = await must(
      supabase
        .from("container_owners")
        .select("id, container_owner_code")
        .eq("region_id", china.id)
        .ilike("container_owner_code", `%${createdOwner.container_owner_code}%`),
      "export datasource container owners"
    );
    const ownerAttachments = await must(
      supabase
        .from("container_owner_attachment_links")
        .select("*")
        .eq("container_owner_id", createdOwner.id),
      "export datasource container owner attachments"
    );
    checks.push([
      "container_owners_filtered_export_datasource",
      ownerExportRows.length === 1 && ownerAttachments.length === 1,
    ]);

    const customersSearch = await must(
      supabase
        .from("customers")
        .select("id, customer_custom_id")
        .ilike("customer_custom_id", `%${createdCustomer.customer_custom_id}%`)
        .or(
          `company_name.ilike.%Regression Customer ${stamp} Updated%,company_name_other_language.ilike.%Regression Customer Alias ${stamp}%`
        )
        .eq("region_id", china.id),
      "search regression customers"
    );
    checks.push([
      "customers_search",
      customersSearch.length === 1 && customersSearch[0].id === createdCustomer.id,
    ]);

    const customerExportRows = await must(
      supabase
        .from("customers")
        .select("id, customer_custom_id")
        .eq("region_id", china.id)
        .ilike("customer_custom_id", `%${createdCustomer.customer_custom_id}%`),
      "export datasource customers"
    );
    const customerCertificates = await must(
      supabase
        .from("customer_certificate_links")
        .select("*")
        .eq("customer_id", createdCustomer.id),
      "export datasource customer certificates"
    );
    checks.push([
      "customers_filtered_export_datasource",
      customerExportRows.length === 1 && customerCertificates.length === 1,
    ]);

    const allUsers = await must(
      supabase.from("users").select("id"),
      "reset-equivalent user count"
    );
    checks.push(["users_reset", allUsers.length >= 3]);

    const allVendors = await must(
      supabase.from("vendors").select("id"),
      "reset-equivalent vendor count"
    );
    checks.push(["vendors_reset", allVendors.length >= 3]);

    const allMaterialVendors = await must(
      supabase.from("material_vendors").select("id"),
      "reset-equivalent material vendor count"
    );
    checks.push(["material_vendors_reset", allMaterialVendors.length >= 4]);

    const allLessees = await must(
      supabase.from("lessees").select("id"),
      "reset-equivalent lessee count"
    );
    checks.push(["lessees_reset", allLessees.length >= 3]);

    const allOwners = await must(
      supabase.from("container_owners").select("id"),
      "reset-equivalent container owner count"
    );
    checks.push(["container_owners_reset", allOwners.length >= 3]);

    const allCustomers = await must(
      supabase.from("customers").select("id"),
      "reset-equivalent customer count"
    );
    checks.push(["customers_reset", allCustomers.length >= 3]);

    const failedChecks = checks.filter(([, ok]) => !ok);
    if (failedChecks.length > 0) {
      fail(`Regression datasource checks failed: ${failedChecks.map(([name]) => name).join(", ")}`);
    }

    const routeChecks = [
      [`${appBaseUrl}/`, []],
      [`${appBaseUrl}/basic-info`, []],
      [`${appBaseUrl}/basic-info/regions`, ["Export CSV"]],
      [`${appBaseUrl}/basic-info/cities`, ["Export CSV"]],
      [`${appBaseUrl}/basic-info/companies`, ["Export CSV"]],
      [`${appBaseUrl}/basic-info/condition-codes`, ["Export CSV"]],
      [`${appBaseUrl}/basic-info/container-number-rules`, ["Export CSV"]],
      [`${appBaseUrl}/basic-info/cost-codes`, ["Export CSV"]],
      [`${appBaseUrl}/basic-info/depots`, ["Export CSV"]],
      [`${appBaseUrl}/basic-info/operation-prices`, ["Export CSV"]],
      [`${appBaseUrl}/basic-info/revenue-codes`, ["Export CSV"]],
      [`${appBaseUrl}/basic-info/size-codes`, ["Export CSV"]],
      [`${appBaseUrl}/basic-info/type-codes`, ["Export CSV"]],
      [`${appBaseUrl}/partners`, ["Partners Center"]],
      [`${appBaseUrl}/partners/lessor`, ["Lessor"]],
      [`${appBaseUrl}/settings`, []],
      [`${appBaseUrl}/settings/users`, ["Regression User", "Export CSV"]],
      [`${appBaseUrl}/settings/users/new`, []],
      [`${appBaseUrl}/settings/users/${createdUser.id}`, [`Regression User ${stamp}`]],
      [`${appBaseUrl}/settings/users/${createdUser.id}/edit`, []],
      [`${appBaseUrl}/customers`, ["Customers"]],
      [`${appBaseUrl}/customers/new`, []],
      [`${appBaseUrl}/customers/${createdCustomer.id}`, [`Regression Customer ${stamp} Updated`]],
      [`${appBaseUrl}/partners/customers`, [`Regression Customer ${stamp} Updated`, "Export CSV"]],
      [`${appBaseUrl}/partners/customers/new`, []],
      [`${appBaseUrl}/partners/customers/${createdCustomer.id}`, [`Regression Customer ${stamp} Updated`]],
      [`${appBaseUrl}/partners/customers/${createdCustomer.id}/edit`, []],
      [`${appBaseUrl}/partners/vendors`, [`Regression Vendor ${stamp} Updated`, "Export CSV"]],
      [`${appBaseUrl}/partners/vendors/new`, []],
      [`${appBaseUrl}/partners/vendors/${createdVendor.id}`, [`Regression Vendor ${stamp} Updated`]],
      [`${appBaseUrl}/partners/vendors/${createdVendor.id}/edit`, []],
      [`${appBaseUrl}/partners/material-vendors`, [`Regression Material Vendor ${stamp} Updated`, "Export CSV"]],
      [`${appBaseUrl}/partners/material-vendors/new`, []],
      [`${appBaseUrl}/partners/material-vendors/${createdMaterialVendor.id}`, [`Regression Material Vendor ${stamp} Updated`]],
      [`${appBaseUrl}/partners/material-vendors/${createdMaterialVendor.id}/edit`, []],
      [`${appBaseUrl}/partners/lessee`, [`Regression Lessee ${stamp} Updated`, "Export CSV"]],
      [`${appBaseUrl}/partners/lessee/new`, []],
      [`${appBaseUrl}/partners/lessee/${createdLessee.id}`, [`Regression Lessee ${stamp} Updated`]],
      [`${appBaseUrl}/partners/lessee/${createdLessee.id}/edit`, []],
      [`${appBaseUrl}/partners/container-owners`, [`Regression Container Owner ${stamp} Updated`, "Export CSV"]],
      [`${appBaseUrl}/partners/container-owners/new`, []],
      [`${appBaseUrl}/partners/container-owners/${createdOwner.id}`, [`Regression Container Owner ${stamp} Updated`]],
      [`${appBaseUrl}/partners/container-owners/${createdOwner.id}/edit`, []],
    ];

    for (const [url, expected] of routeChecks) {
      await assertHttpOk(url, expected);
    }

    console.log("Local regression passed.");
    console.log(
      JSON.stringify(
        {
          routes_checked: routeChecks.length,
          data_checks: checks.length,
        },
        null,
        2
      )
    );
  } finally {
    if (createdIds.vendorId) {
      runPsql(
        `delete from public.vendors where id = '${escapeLiteral(createdIds.vendorId)}';`
      );
    }
    if (createdIds.materialVendorId) {
      runPsql(
        `delete from public.material_vendors where id = '${escapeLiteral(createdIds.materialVendorId)}';`
      );
    }
    if (createdIds.lesseeId) {
      runPsql(
        `delete from public.lessees where id = '${escapeLiteral(createdIds.lesseeId)}';`
      );
    }
    if (createdIds.ownerId) {
      runPsql(
        `delete from public.container_owners where id = '${escapeLiteral(createdIds.ownerId)}';`
      );
    }
    if (createdIds.customerId) {
      runPsql(
        `delete from public.customer_certificate_links where customer_id = '${escapeLiteral(createdIds.customerId)}';`
      );
      runPsql(
        `delete from public.customers where id = '${escapeLiteral(createdIds.customerId)}';`
      );
    }
    if (createdIds.userId) {
      runPsql(
        `delete from public.users where id = '${escapeLiteral(createdIds.userId)}';`
      );
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
