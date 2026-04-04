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

function isLocalHttpTarget(target) {
  return /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?/i.test(target);
}

function formatError(error) {
  if (error instanceof Error) {
    const cause = error.cause instanceof Error ? ` Cause: ${error.cause.message}` : "";
    return `${error.message}${cause}`;
  }
  return String(error);
}

function describeLocalReachabilityFailure(target, error, label = "local endpoint") {
  const detail = formatError(error);
  if (!isLocalHttpTarget(target)) {
    return detail;
  }
  return `Cannot reach ${label} ${target} from this environment. If this regression is running inside a sandboxed automation session, rerun it from a shell/session with local network access. Details: ${detail}`;
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
      lastFailure = describeLocalReachabilityFailure(url, error, "app URL");
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
  if (lastError instanceof Error) {
    throw new Error(
      describeLocalReachabilityFailure(`${LOCAL_SUPABASE_URL}/rest/v1/users`, lastError, "Supabase API")
    );
  }
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
    regionId: null,
    cityId: null,
    companyId: null,
    companyBankAccountId: null,
    costCodeId: null,
    revenueCodeId: null,
    conditionCodeId: null,
    sizeCodeId: null,
    typeCodeId: null,
    containerNumberRuleId: null,
    operationPriceId: null,
    depotId: null,
    vendorId: null,
    materialVendorId: null,
    lesseeId: null,
    ownerId: null,
    customerId: null,
    purchaseOrderId: null,
    purchaseOrderItemId: null,
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

    const createdRegion = await must(
      supabase
        .from("region_codes")
        .insert({
          region_code: `RG${last4}`,
          region_name: `Regression Region ${stamp}`,
          description: "regression-create",
          status: "ACTIVE",
        })
        .select("id, region_code")
        .single(),
      "create regression region"
    );
    createdIds.regionId = createdRegion.id;

    await must(
      supabase
        .from("region_codes")
        .update({
          region_name: `Regression Region ${stamp} Updated`,
          description: "regression-updated",
          status: "INACTIVE",
        })
        .eq("id", createdRegion.id)
        .select("id")
        .single(),
      "update regression region"
    );

    const createdCity = await must(
      supabase
        .from("cities")
        .insert({
          city_code: `RG${last4}`,
          city_name: `Regression City ${stamp}`,
          region_id: createdRegion.id,
          region: `Regression Region ${stamp} Updated`,
          country: "RegressionLand",
          remark: "regression-create",
        })
        .select("id, city_code")
        .single(),
      "create regression city"
    );
    createdIds.cityId = createdCity.id;

    await must(
      supabase
        .from("cities")
        .update({
          city_name: `Regression City ${stamp} Updated`,
          remark: "regression-updated",
        })
        .eq("id", createdCity.id)
        .select("id")
        .single(),
      "update regression city"
    );

    const createdCompany = await must(
      supabase
        .from("company_profiles")
        .insert({
          company_name_cn: `回归公司${stamp}`,
          company_name_en: `Regression Company ${stamp}`,
          address_cn: `回归地址${stamp}`,
          address_en: `Regression Address ${stamp}`,
          phone: `8000${last4}`,
          email: `regression.company.${stamp}@example.com`,
          location_code: `LOC${last4}`,
          status: "ACTIVE",
          remark: "regression-create",
        })
        .select("id, company_name_en")
        .single(),
      "create regression company"
    );
    createdIds.companyId = createdCompany.id;

    await must(
      supabase
        .from("company_profiles")
        .update({
          company_name_en: `Regression Company ${stamp} Updated`,
          remark: "regression-updated",
        })
        .eq("id", createdCompany.id)
        .select("id")
        .single(),
      "update regression company"
    );

    const createdCompanyBankAccount = await must(
      supabase
        .from("company_bank_accounts")
        .insert({
          company_profile_id: createdCompany.id,
          account_name: `Regression Company Account ${stamp}`,
          account_number: `ACCT${last5}`,
          bank_name: "Regression Bank",
          bank_code: "RGBK",
          bank_address: "Regression Bank Address",
          swift_code: `SWF${last5}`,
          remark: "regression-create",
        })
        .select("id")
        .single(),
      "create regression company bank account"
    );
    createdIds.companyBankAccountId = createdCompanyBankAccount.id;

    const createdCostCode = await must(
      supabase
        .from("cost_codes")
        .insert({
          cost_code: `QC${last4}`,
          cost_name: `Regression Cost ${stamp}`,
          description: "regression-create",
          status: "INACTIVE",
        })
        .select("id, cost_code")
        .single(),
      "create regression cost code"
    );
    createdIds.costCodeId = createdCostCode.id;

    await must(
      supabase
        .from("cost_codes")
        .update({
          cost_name: `Regression Cost ${stamp} Updated`,
          description: "regression-updated",
        })
        .eq("id", createdCostCode.id)
        .select("id")
        .single(),
      "update regression cost code"
    );

    const createdRevenueCode = await must(
      supabase
        .from("revenue_codes")
        .insert({
          revenue_code: `QR${last4}`,
          revenue_name: `Regression Revenue ${stamp}`,
          description: "regression-create",
          status: "INACTIVE",
        })
        .select("id, revenue_code")
        .single(),
      "create regression revenue code"
    );
    createdIds.revenueCodeId = createdRevenueCode.id;

    await must(
      supabase
        .from("revenue_codes")
        .update({
          revenue_name: `Regression Revenue ${stamp} Updated`,
          description: "regression-updated",
        })
        .eq("id", createdRevenueCode.id)
        .select("id")
        .single(),
      "update regression revenue code"
    );

    const createdConditionCode = await must(
      supabase
        .from("container_condition_codes")
        .insert({
          condition_code: `RC${last4}`,
          condition_name: `Regression Condition ${stamp}`,
          description: "regression-create",
          status: "INACTIVE",
        })
        .select("id, condition_code")
        .single(),
      "create regression condition code"
    );
    createdIds.conditionCodeId = createdConditionCode.id;

    await must(
      supabase
        .from("container_condition_codes")
        .update({
          condition_name: `Regression Condition ${stamp} Updated`,
          description: "regression-updated",
        })
        .eq("id", createdConditionCode.id)
        .select("id")
        .single(),
      "update regression condition code"
    );

    const createdSizeCode = await must(
      supabase
        .from("container_size_codes")
        .insert({
          size_code: `9${last4}`,
          size_name: `Regression Size ${stamp}`,
          remark: `Regression Size ${stamp}`,
          status: "ACTIVE",
        })
        .select("id, size_code")
        .single(),
      "create regression size code"
    );
    createdIds.sizeCodeId = createdSizeCode.id;

    await must(
      supabase
        .from("container_size_codes")
        .update({
          size_name: `Regression Size ${stamp} Updated`,
          remark: `Regression Size ${stamp} Updated`,
        })
        .eq("id", createdSizeCode.id)
        .select("id")
        .single(),
      "update regression size code"
    );

    const createdTypeCode = await must(
      supabase
        .from("container_type_codes")
        .insert({
          type_code: `RT${last4}`,
          type_description: `Regression Type ${stamp}`,
          remark: "regression-create",
          status: "INACTIVE",
        })
        .select("id, type_code")
        .single(),
      "create regression type code"
    );
    createdIds.typeCodeId = createdTypeCode.id;

    await must(
      supabase
        .from("container_type_codes")
        .update({
          type_description: `Regression Type ${stamp} Updated`,
          remark: "regression-updated",
        })
        .eq("id", createdTypeCode.id)
        .select("id")
        .single(),
      "update regression type code"
    );

    const createdContainerNumberRule = await must(
      supabase
        .from("container_number_rules")
        .insert({
          container_size_code_id: createdSizeCode.id,
          prefix: `RG${last4}`,
          serial_length: 5,
          start_serial: 0,
          end_serial: 99999,
          current_serial: 7,
          status: "INACTIVE",
          example_container_number: `RG${last4}00008`,
          remark: "regression-create",
        })
        .select("id, prefix")
        .single(),
      "create regression container number rule"
    );
    createdIds.containerNumberRuleId = createdContainerNumberRule.id;

    await must(
      supabase
        .from("container_number_rules")
        .update({
          current_serial: 8,
          example_container_number: `RG${last4}00009`,
          remark: "regression-updated",
        })
        .eq("id", createdContainerNumberRule.id)
        .select("id")
        .single(),
      "update regression container number rule"
    );

    const createdOperationPrice = await must(
      supabase
        .from("operation_price_configs")
        .insert({
          container_size_code_id: createdSizeCode.id,
          container_condition_code_id: createdConditionCode.id,
          addon_price: 88.5,
          currency: "USD",
          effective_from: "2026-04-02",
          effective_to: null,
          status: "INACTIVE",
          remark: "regression-create",
        })
        .select("id")
        .single(),
      "create regression operation price"
    );
    createdIds.operationPriceId = createdOperationPrice.id;

    await must(
      supabase
        .from("operation_price_configs")
        .update({
          addon_price: 99.5,
          remark: "regression-updated",
        })
        .eq("id", createdOperationPrice.id)
        .select("id")
        .single(),
      "update regression operation price"
    );

    const createdDepot = await must(
      supabase
        .from("depots")
        .insert({
          city_id: createdCity.id,
          country_name: "RegressionLand",
          country_code: "RG",
          depot_code: `RG${last4}001`,
          depot_name: `Regression Depot ${stamp}`,
          depot_type: "CONTRACT",
          depot_address: "Regression Depot Address",
          contact_person: "Regression Depot PIC",
          contact_email: `regression.depot.${stamp}@example.com`,
          gate_email: `regression.depot.gate.${stamp}@example.com`,
          account_email: `regression.depot.account.${stamp}@example.com`,
          depot_tel: "7008009000",
          status: "NORMAL",
          is_primary_depot: false,
          gate_in_20_cost: 10,
          gate_out_20_cost: 11,
          lift_in_20_cost: 12,
          lift_out_20_cost: 13,
          gate_in_40_cost: 14,
          gate_out_40_cost: 15,
          lift_in_40_cost: 16,
          lift_out_40_cost: 17,
          storage_rate_20: 1,
          storage_rate_40: 2,
          labour_cost: 3,
          free_days: 5,
          currency: "USD",
          data_updated_on: new Date().toISOString(),
          remark: "regression-create",
          depot_attachment_url: `https://example.com/regression-depot-${stamp}.pdf`,
        })
        .select("id, depot_code")
        .single(),
      "create regression depot"
    );
    createdIds.depotId = createdDepot.id;

    await must(
      supabase
        .from("depot_additional_costs")
        .insert({
          depot_id: createdDepot.id,
          cost_item: "Regression Fuel Surcharge",
          rate: 12.34,
          currency: "USD",
          remark: "regression-create",
        })
        .select("id")
        .single(),
      "create regression depot additional cost"
    );

    await must(
      supabase
        .from("depot_attachment_links")
        .insert({
          depot_id: createdDepot.id,
          url: `https://example.com/regression-depot-attachment-${stamp}.pdf`,
        })
        .select("id")
        .single(),
      "create regression depot attachment"
    );

    await must(
      supabase
        .from("depots")
        .update({
          depot_name: `Regression Depot ${stamp} Updated`,
          remark: "regression-updated",
        })
        .eq("id", createdDepot.id)
        .select("id")
        .single(),
      "update regression depot"
    );

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

    const purchaseOrderNo = `PO-RG-${last5}`;

    const createdPurchaseOrder = await must(
      supabase
        .from("purchase_order")
        .insert({
          order_no: purchaseOrderNo,
          purchase_type: "FACTORY_ORDER",
          supplier_id: createdVendor.id,
          owner_id: createdOwner.id,
          buyer_id: baseUserId,
          purchase_date: "2026-04-03",
          estimated_offline_time: "2026-04-10T08:00:00.000Z",
          contract_number: `CT-${last5}`,
          invoice_number: `INV-${last5}`,
          freeday: 7,
          vendor_release_number: `REL-${last5}`,
          vendor_release_date: "2026-04-12",
          remark: "regression-purchase-order",
          exchange_rate: 1,
          order_status: "CONFIRMED",
          inbound_status: "PARTIAL",
          payment_mode: "PREPAYMENT",
          payment_account: "Regression Payment Account",
          due_date: "2026-05-03",
          settlement_payment_term: "Net 30",
          settlement_credit_days: 30,
          settlement_advance_payment_percentage: 10,
          settlement_balance_trigger_event: "After Offline",
          settlement_currency: "USD",
          settlement_prepayment_pool: true,
          settlement_prepayment_threshold: 1000,
          settlement_current_prepaid_balance: 5000,
        })
        .select("id, order_no")
        .single(),
      "create regression purchase order"
    );
    createdIds.purchaseOrderId = createdPurchaseOrder.id;

    const createdPurchaseOrderItem = await must(
      supabase
        .from("purchase_order_item")
        .insert({
          purchase_order_id: createdPurchaseOrder.id,
          line_no: 1,
          location_city_id: createdCity.id,
          depot_id: createdDepot.id,
          container_size_code_id: createdSizeCode.id,
          container_type_code_id: createdTypeCode.id,
          container_condition_code_id: createdConditionCode.id,
          color: "Blue",
          flp: true,
          lbx: false,
          locking_bars_count: 4,
          vents_count: 2,
          machine_type: "Carrier PrimeLINE",
          yom: 2026,
          offline_date: "2026-04-10",
          planned_qty: 2,
          unit_price: 2000,
          financial_cost: 150,
          settlement_price: 2150,
          line_amount: 4300,
          remark: "regression-purchase-item",
        })
        .select("id")
        .single(),
      "create regression purchase order item"
    );
    createdIds.purchaseOrderItemId = createdPurchaseOrderItem.id;

    await must(
      supabase
        .from("purchase_order_container")
        .insert([
          {
            purchase_order_id: createdPurchaseOrder.id,
            purchase_order_item_id: createdPurchaseOrderItem.id,
            container_number: `RGREADY${last4}`,
            location_city_id: createdCity.id,
            depot_id: createdDepot.id,
            container_size_code_id: createdSizeCode.id,
            container_type_code_id: createdTypeCode.id,
            container_condition_code_id: createdConditionCode.id,
            color: "Blue",
            flp: true,
            lbx: false,
            locking_bars_count: 4,
            vents_count: 2,
            machine_type: "Carrier PrimeLINE",
            yom: 2026,
            offline_date: "2026-04-10",
            actual_offline_time: "2026-04-10T10:00:00.000Z",
            purchase_price: 2000,
            financial_cost: 150,
            container_status: "READY",
            remark: "regression-ready-container",
          },
          {
            purchase_order_id: createdPurchaseOrder.id,
            purchase_order_item_id: createdPurchaseOrderItem.id,
            container_number: `RGPICK${last4}`,
            location_city_id: createdCity.id,
            depot_id: createdDepot.id,
            container_size_code_id: createdSizeCode.id,
            container_type_code_id: createdTypeCode.id,
            container_condition_code_id: createdConditionCode.id,
            color: "Blue",
            flp: false,
            lbx: true,
            locking_bars_count: 3,
            vents_count: 1,
            machine_type: "Daikin LXE",
            yom: 2026,
            offline_date: "2026-04-11",
            actual_offline_time: "2026-04-11T10:00:00.000Z",
            purchase_price: 2050,
            financial_cost: 175,
            container_status: "PICKED_UP",
            remark: "regression-picked-container",
          },
        ])
        .select("id"),
      "create regression purchase order containers"
    );

    await must(
      supabase
        .from("purchase_order_material_type")
        .insert({
          purchase_order_id: createdPurchaseOrder.id,
          material_type: "地板",
          material_vendor_id: createdMaterialVendor.id,
          material_vendor_name_snapshot: `Regression Material Vendor ${stamp} Updated`,
          material_vendor_code_snapshot: createdMaterialVendor.vendor_code,
        })
        .select("id")
        .single(),
      "create regression purchase material type"
    );

    const checks = [];

    const regionsSearch = await must(
      supabase
        .from("region_codes")
        .select("id")
        .or(`region_code.ilike.%${createdRegion.region_code}%,region_name.ilike.%Regression Region ${stamp} Updated%,description.ilike.%regression-updated%`),
      "search regression regions"
    );
    checks.push(["regions_search", regionsSearch.length === 1]);

    const regionsExportRows = await must(
      supabase
        .from("region_codes")
        .select("id")
        .ilike("region_code", `%${createdRegion.region_code}%`),
      "export datasource regions"
    );
    checks.push(["regions_filtered_export_datasource", regionsExportRows.length === 1]);

    const citiesSearch = await must(
      supabase
        .from("cities")
        .select("id")
        .ilike("city_code", `%${createdCity.city_code}%`)
        .ilike("city_name", `%Regression City ${stamp} Updated%`)
        .eq("region_id", createdRegion.id)
        .ilike("country", "%RegressionLand%"),
      "search regression cities"
    );
    checks.push(["cities_search", citiesSearch.length === 1]);

    const citiesExportRows = await must(
      supabase
        .from("cities")
        .select("id")
        .eq("region_id", createdRegion.id)
        .ilike("city_code", `%${createdCity.city_code}%`),
      "export datasource cities"
    );
    checks.push(["cities_filtered_export_datasource", citiesExportRows.length === 1]);

    const companiesSearch = await must(
      supabase
        .from("company_profiles")
        .select("id")
        .ilike("company_name_cn", `%回归公司${stamp}%`)
        .ilike("company_name_en", `%Regression Company ${stamp} Updated%`)
        .or(`address_cn.ilike.%回归地址${stamp}%,address_en.ilike.%Regression Address ${stamp}%`)
        .ilike("phone", `%${`8000${last4}`}%`)
        .ilike("email", `%regression.company.${stamp}@example.com%`),
      "search regression companies"
    );
    checks.push(["companies_search", companiesSearch.length === 1]);

    const companiesExportRows = await must(
      supabase
        .from("company_profiles")
        .select("id")
        .ilike("company_name_en", `%Regression Company ${stamp} Updated%`),
      "export datasource companies"
    );
    const companyBankAccounts = await must(
      supabase
        .from("company_bank_accounts")
        .select("id")
        .eq("company_profile_id", createdCompany.id),
      "export datasource company bank accounts"
    );
    checks.push([
      "companies_filtered_export_datasource",
      companiesExportRows.length === 1 && companyBankAccounts.length === 1,
    ]);

    const costCodesSearch = await must(
      supabase
        .from("cost_codes")
        .select("id")
        .ilike("cost_code", `%${createdCostCode.cost_code}%`)
        .ilike("cost_name", `%Regression Cost ${stamp} Updated%`)
        .eq("status", "INACTIVE"),
      "search regression cost codes"
    );
    checks.push(["cost_codes_search", costCodesSearch.length === 1]);

    const costCodesExportRows = await must(
      supabase
        .from("cost_codes")
        .select("id")
        .eq("status", "INACTIVE")
        .ilike("cost_code", `%${createdCostCode.cost_code}%`),
      "export datasource cost codes"
    );
    checks.push(["cost_codes_filtered_export_datasource", costCodesExportRows.length === 1]);

    const revenueCodesSearch = await must(
      supabase
        .from("revenue_codes")
        .select("id")
        .ilike("revenue_code", `%${createdRevenueCode.revenue_code}%`)
        .ilike("revenue_name", `%Regression Revenue ${stamp} Updated%`)
        .eq("status", "INACTIVE"),
      "search regression revenue codes"
    );
    checks.push(["revenue_codes_search", revenueCodesSearch.length === 1]);

    const revenueCodesExportRows = await must(
      supabase
        .from("revenue_codes")
        .select("id")
        .eq("status", "INACTIVE")
        .ilike("revenue_code", `%${createdRevenueCode.revenue_code}%`),
      "export datasource revenue codes"
    );
    checks.push(["revenue_codes_filtered_export_datasource", revenueCodesExportRows.length === 1]);

    const conditionCodesSearch = await must(
      supabase
        .from("container_condition_codes")
        .select("id")
        .ilike("condition_code", `%${createdConditionCode.condition_code}%`)
        .ilike("condition_name", `%Regression Condition ${stamp} Updated%`),
      "search regression condition codes"
    );
    checks.push(["condition_codes_search", conditionCodesSearch.length === 1]);

    const conditionCodesExportRows = await must(
      supabase
        .from("container_condition_codes")
        .select("id")
        .ilike("condition_code", `%${createdConditionCode.condition_code}%`),
      "export datasource condition codes"
    );
    checks.push(["condition_codes_filtered_export_datasource", conditionCodesExportRows.length === 1]);

    const sizeCodesSearch = await must(
      supabase
        .from("container_size_codes")
        .select("id")
        .ilike("size_code", `%${createdSizeCode.size_code}%`),
      "search regression size codes"
    );
    checks.push(["size_codes_search", sizeCodesSearch.length === 1]);

    const sizeCodesExportRows = await must(
      supabase
        .from("container_size_codes")
        .select("id")
        .ilike("size_code", `%${createdSizeCode.size_code}%`),
      "export datasource size codes"
    );
    checks.push(["size_codes_filtered_export_datasource", sizeCodesExportRows.length === 1]);

    const typeCodesSearch = await must(
      supabase
        .from("container_type_codes")
        .select("id")
        .ilike("type_code", `%${createdTypeCode.type_code}%`),
      "search regression type codes"
    );
    checks.push(["type_codes_search", typeCodesSearch.length === 1]);

    const typeCodesExportRows = await must(
      supabase
        .from("container_type_codes")
        .select("id")
        .ilike("type_code", `%${createdTypeCode.type_code}%`),
      "export datasource type codes"
    );
    checks.push(["type_codes_filtered_export_datasource", typeCodesExportRows.length === 1]);

    const numberRulesSearch = await must(
      supabase
        .from("container_number_rules")
        .select("id")
        .eq("container_size_code_id", createdSizeCode.id)
        .ilike("prefix", `%RG${last4}%`)
        .eq("status", "INACTIVE"),
      "search regression container number rules"
    );
    checks.push(["container_number_rules_search", numberRulesSearch.length === 1]);

    const numberRulesExportRows = await must(
      supabase
        .from("container_number_rules")
        .select("id")
        .eq("container_size_code_id", createdSizeCode.id)
        .ilike("prefix", `%RG${last4}%`)
        .eq("status", "INACTIVE"),
      "export datasource container number rules"
    );
    checks.push(["container_number_rules_filtered_export_datasource", numberRulesExportRows.length === 1]);

    const operationPricesSearch = await must(
      supabase
        .from("operation_price_configs")
        .select("id")
        .eq("container_size_code_id", createdSizeCode.id)
        .eq("container_condition_code_id", createdConditionCode.id)
        .eq("status", "INACTIVE"),
      "search regression operation prices"
    );
    checks.push(["operation_prices_search", operationPricesSearch.length === 1]);

    const operationPricesExportRows = await must(
      supabase
        .from("operation_price_configs")
        .select("id")
        .eq("container_size_code_id", createdSizeCode.id)
        .eq("container_condition_code_id", createdConditionCode.id)
        .eq("status", "INACTIVE"),
      "export datasource operation prices"
    );
    checks.push(["operation_prices_filtered_export_datasource", operationPricesExportRows.length === 1]);

    const depotsSearch = await must(
      supabase
        .from("depots")
        .select("id")
        .ilike("depot_code", `%${createdDepot.depot_code}%`)
        .ilike("depot_name", `%Regression Depot ${stamp} Updated%`)
        .eq("city_id", createdCity.id)
        .eq("depot_type", "CONTRACT")
        .eq("status", "NORMAL"),
      "search regression depots"
    );
    checks.push(["depots_search", depotsSearch.length === 1]);

    const depotsExportRows = await must(
      supabase
        .from("depots")
        .select("id")
        .eq("city_id", createdCity.id)
        .ilike("depot_code", `%${createdDepot.depot_code}%`),
      "export datasource depots"
    );
    const depotAdditionalCosts = await must(
      supabase
        .from("depot_additional_costs")
        .select("id")
        .eq("depot_id", createdDepot.id),
      "export datasource depot additional costs"
    );
    const depotAttachments = await must(
      supabase
        .from("depot_attachment_links")
        .select("id")
        .eq("depot_id", createdDepot.id),
      "export datasource depot attachments"
    );
    checks.push([
      "depots_filtered_export_datasource",
      depotsExportRows.length === 1 && depotAdditionalCosts.length === 1 && depotAttachments.length === 1,
    ]);

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

    const allRegions = await must(
      supabase.from("region_codes").select("id"),
      "reset-equivalent region count"
    );
    checks.push(["regions_reset", allRegions.length >= 19]);

    const allCities = await must(
      supabase.from("cities").select("id"),
      "reset-equivalent city count"
    );
    checks.push(["cities_reset", allCities.length >= 413]);

    const allCompanies = await must(
      supabase.from("company_profiles").select("id"),
      "reset-equivalent company count"
    );
    checks.push(["companies_reset", allCompanies.length >= 2]);

    const allCostCodes = await must(
      supabase.from("cost_codes").select("id"),
      "reset-equivalent cost code count"
    );
    checks.push(["cost_codes_reset", allCostCodes.length >= 31]);

    const allRevenueCodes = await must(
      supabase.from("revenue_codes").select("id"),
      "reset-equivalent revenue code count"
    );
    checks.push(["revenue_codes_reset", allRevenueCodes.length >= 9]);

    const allConditionCodes = await must(
      supabase.from("container_condition_codes").select("id"),
      "reset-equivalent condition code count"
    );
    checks.push(["condition_codes_reset", allConditionCodes.length >= 5]);

    const allSizeCodes = await must(
      supabase.from("container_size_codes").select("id"),
      "reset-equivalent size code count"
    );
    checks.push(["size_codes_reset", allSizeCodes.length >= 5]);

    const allTypeCodes = await must(
      supabase.from("container_type_codes").select("id"),
      "reset-equivalent type code count"
    );
    checks.push(["type_codes_reset", allTypeCodes.length >= 23]);

    const allNumberRules = await must(
      supabase.from("container_number_rules").select("id"),
      "reset-equivalent container number rule count"
    );
    checks.push(["container_number_rules_reset", allNumberRules.length >= 3]);

    const allOperationPrices = await must(
      supabase.from("operation_price_configs").select("id"),
      "reset-equivalent operation price count"
    );
    checks.push(["operation_prices_reset", allOperationPrices.length >= 3]);

    const allDepots = await must(
      supabase.from("depots").select("id"),
      "reset-equivalent depot count"
    );
    checks.push(["depots_reset", allDepots.length >= 3]);

    const purchaseOrderChecks = await must(
      supabase
        .from("purchase_order")
        .select(
          "id, freeday, vendor_release_number, vendor_release_date, total_planned_qty, total_available_qty, total_received_qty"
        )
        .eq("id", createdPurchaseOrder.id)
        .single(),
      "read regression purchase order"
    );
    checks.push([
      "purchase_order_detail_shape",
      purchaseOrderChecks.freeday === 7 &&
        purchaseOrderChecks.vendor_release_number === `REL-${last5}` &&
        purchaseOrderChecks.vendor_release_date === "2026-04-12" &&
        purchaseOrderChecks.total_planned_qty === 2 &&
        purchaseOrderChecks.total_available_qty === 2 &&
        purchaseOrderChecks.total_received_qty === 1,
    ]);

    const purchaseFinanceChecks = await must(
      supabase
        .from("purchase_finance_record")
        .select("id, order_no, finance_status, grand_total")
        .eq("purchase_order_id", createdPurchaseOrder.id)
        .single(),
      "read regression purchase finance record"
    );
    checks.push([
      "purchase_finance_record_sync",
      purchaseFinanceChecks.order_no === purchaseOrderNo &&
        purchaseFinanceChecks.finance_status === "PENDING" &&
        Number(purchaseFinanceChecks.grand_total) === 4300,
    ]);

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
      [`${appBaseUrl}/purchase`, ["PO Management"]],
      [`${appBaseUrl}/purchase/po-management`, ["PO Management", "Prepaid Balance"]],
      [
        `${appBaseUrl}/purchase/po-management/${createdPurchaseOrder.id}`,
        ["Purchase Order Detail", purchaseOrderNo, "View Containers", "Finance Sync"],
      ],
      [
        `${appBaseUrl}/purchase/po-management/${createdPurchaseOrder.id}/items/${createdPurchaseOrderItem.id}/containers`,
        ["Container Details", purchaseOrderNo, "Purchase Price", "Machine Type"],
      ],
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
    if (createdIds.purchaseOrderId) {
      runPsql(
        `delete from public.purchase_order where id = '${escapeLiteral(createdIds.purchaseOrderId)}';`
      );
    }
    if (createdIds.depotId) {
      runPsql(
        `delete from public.depot_attachment_links where depot_id = '${escapeLiteral(createdIds.depotId)}';`
      );
      runPsql(
        `delete from public.depot_additional_costs where depot_id = '${escapeLiteral(createdIds.depotId)}';`
      );
      runPsql(
        `delete from public.depots where id = '${escapeLiteral(createdIds.depotId)}';`
      );
    }
    if (createdIds.operationPriceId) {
      runPsql(
        `delete from public.operation_price_configs where id = '${escapeLiteral(createdIds.operationPriceId)}';`
      );
    }
    if (createdIds.containerNumberRuleId) {
      runPsql(
        `delete from public.container_number_rules where id = '${escapeLiteral(createdIds.containerNumberRuleId)}';`
      );
    }
    if (createdIds.typeCodeId) {
      runPsql(
        `delete from public.container_type_codes where id = '${escapeLiteral(createdIds.typeCodeId)}';`
      );
    }
    if (createdIds.sizeCodeId) {
      runPsql(
        `delete from public.container_size_codes where id = '${escapeLiteral(createdIds.sizeCodeId)}';`
      );
    }
    if (createdIds.conditionCodeId) {
      runPsql(
        `delete from public.container_condition_codes where id = '${escapeLiteral(createdIds.conditionCodeId)}';`
      );
    }
    if (createdIds.revenueCodeId) {
      runPsql(
        `delete from public.revenue_codes where id = '${escapeLiteral(createdIds.revenueCodeId)}';`
      );
    }
    if (createdIds.costCodeId) {
      runPsql(
        `delete from public.cost_codes where id = '${escapeLiteral(createdIds.costCodeId)}';`
      );
    }
    if (createdIds.companyBankAccountId) {
      runPsql(
        `delete from public.company_bank_accounts where id = '${escapeLiteral(createdIds.companyBankAccountId)}';`
      );
    }
    if (createdIds.companyId) {
      runPsql(
        `delete from public.company_profiles where id = '${escapeLiteral(createdIds.companyId)}';`
      );
    }
    if (createdIds.cityId) {
      runPsql(
        `delete from public.cities where id = '${escapeLiteral(createdIds.cityId)}';`
      );
    }
    if (createdIds.regionId) {
      runPsql(
        `delete from public.region_codes where id = '${escapeLiteral(createdIds.regionId)}';`
      );
    }
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
