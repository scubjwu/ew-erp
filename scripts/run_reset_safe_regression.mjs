import { execFileSync } from "child_process";
import { setTimeout as delay } from "timers/promises";
import fs from "fs";
import path from "path";
import os from "os";

import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const DB_SUPABASE_DIR = path.join(ROOT, "db", "supabase");
const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";
const SEED_EXPORT_SCRIPT = path.join(ROOT, "scripts", "export_basic_info_seeds.py");
const PURCHASE_SEED_FILES = [
  "20260403_purchase_order.sql",
  "20260403_purchase_order_item.sql",
  "20260403_purchase_order_container.sql",
  "20260403_purchase_order_material_type.sql",
  "20260403_purchase_finance_record.sql",
];

function readEnvFile() {
  const envPath = path.join(ROOT, ".env.local");
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

function formatError(error) {
  if (error instanceof Error) {
    const cause = error.cause instanceof Error ? ` Cause: ${error.cause.message}` : "";
    return `${error.message}${cause}`;
  }
  return String(error);
}

function describeSupabaseReachabilityFailure(error) {
  return `Cannot reach local Supabase API ${LOCAL_SUPABASE_URL} from this environment. If this regression is running inside a sandboxed automation session, rerun it from a shell/session with local network access. Details: ${formatError(error)}`;
}

function run(command, args, options = {}) {
  execFileSync(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    ...options,
  });
}

function backupPurchaseSeeds() {
  const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), "ew-erp-purchase-seeds-"));
  for (const filename of PURCHASE_SEED_FILES) {
    const source = path.join(ROOT, "db", "supabase", "seeds", filename);
    const target = path.join(backupDir, filename);
    fs.copyFileSync(source, target);
  }
  return backupDir;
}

function restorePurchaseSeeds(backupDir) {
  for (const filename of PURCHASE_SEED_FILES) {
    const source = path.join(backupDir, filename);
    const target = path.join(ROOT, "db", "supabase", "seeds", filename);
    fs.copyFileSync(source, target);
  }
}

function runResetSafeDbReset(backupDir) {
  try {
    run("npm", ["run", "db:reset"]);
    return;
  } catch (error) {
    const message = formatError(error);
    if (!message.includes("supabase db reset")) {
      throw error;
    }

    console.warn(`Primary npm run db:reset failed, retrying bare supabase reset with preserved seeds: ${message}`);
    restorePurchaseSeeds(backupDir);
    run("supabase", ["db", "reset"], { cwd: DB_SUPABASE_DIR });
  }
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
      cwd: ROOT,
      stdio: "inherit",
    }
  );
}

function escapeLiteral(value) {
  return value.replace(/'/g, "''");
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
    throw new Error(describeSupabaseReachabilityFailure(lastError));
  }
  throw new Error(`Supabase API did not become ready after reset: ${String(lastError)}`);
}

function buildClient(env) {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    fail("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  }
  if (supabaseUrl !== LOCAL_SUPABASE_URL) {
    fail(`Reset-safe regression only supports local Supabase. Current NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}`);
  }

  return createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function createRegressionFixtures(supabase, stamp) {
  const ids = {
    userId: null,
    vendorId: null,
    materialVendorId: null,
    lesseeId: null,
    ownerId: null,
    purchaseOrderId: null,
  };

  const last4 = stamp.slice(-4);
  const last5 = stamp.slice(-5);

  const seedUsers = await must(
    supabase.from("users").select("id, full_name").order("created_at", { ascending: true }).limit(1),
    "load seed users"
  );
  if ((seedUsers ?? []).length === 0) {
    fail("Reset-safe regression requires at least one seed user");
  }
  const baseUserId = seedUsers[0].id;

  const regions = await must(
    supabase.from("region_codes").select("id, region_code").in("region_code", ["China", "USA"]).order("region_code", { ascending: true }),
    "load region options"
  );
  const china = regions.find((row) => row.region_code === "China") ?? regions[0];
  if (!china?.id) fail("Could not resolve China region id");

  const createdUser = await must(
    supabase
      .from("users")
      .insert({
        user_code: `RS${last4}`,
        full_name: `Reset Safe User ${stamp}`,
        email: `reset.safe.user.${stamp}@example.com`,
        role: "Operations",
        status: "Active",
        phone: "19990001111",
        department: "QA",
        job_title: "Reset Safe Tester",
        remarks: `reset-safe-${stamp}`,
      })
      .select("id, user_code")
      .single(),
    "create reset-safe user"
  );
  ids.userId = createdUser.id;

  const createdVendor = await must(
    supabase
      .from("vendors")
      .insert({
        vendor_code: `S${last5}`,
        legal_company_name: `Reset Safe Vendor ${stamp}`,
        company_name: `Reset Safe Vendor Alias ${stamp}`,
        address: "Reset Safe Vendor Address",
        region_id: china.id,
        country: "China",
        primary_contact_person: "Reset Safe PIC",
        contact_email: `reset.safe.vendor.${stamp}@example.com`,
        contact_tel: "1002003000",
        category: "Container",
        assigned_buyer_id: baseUserId,
        settlement_credit_days: 30,
        settlement_currency: "USD",
        settlement_advance_payment_percentage: 0,
        settlement_prepayment_pool: false,
        settlement_prepayment_threshold: 0,
        settlement_current_prepaid_balance: 0,
        status: "Normal",
        remark: `reset-safe-${stamp}`,
      })
      .select("id, vendor_code")
      .single(),
    "create reset-safe vendor"
  );
  ids.vendorId = createdVendor.id;

  await must(
    supabase
      .from("vendor_attachment_links")
      .insert({
        vendor_id: createdVendor.id,
        url: `https://example.com/reset-safe-vendor-${stamp}.pdf`,
        remark: `reset-safe-${stamp}`,
      })
      .select("id")
      .single(),
    "create reset-safe vendor attachment"
  );

  const createdMaterialVendor = await must(
    supabase
      .from("material_vendors")
      .insert({
        vendor_code: `DB${last4}`,
        legal_company_name: `Reset Safe Material Vendor ${stamp}`,
        company_name: `Reset Safe Material Alias ${stamp}`,
        address: "Reset Safe Material Address",
        country: "China",
        primary_contact_person: "Reset Safe Material PIC",
        material_category: "地板",
        contact_email: `reset.safe.material.${stamp}@example.com`,
        contact_tel: "2003004000",
        pic_user_id: baseUserId,
        is_default_vendor: false,
        settlement_credit_days: 15,
        settlement_currency: "CNY",
        settlement_advance_payment_percentage: 0,
        settlement_prepayment_pool: false,
        settlement_prepayment_threshold: 0,
        settlement_current_prepaid_balance: 0,
        status: "Normal",
        remark: `reset-safe-${stamp}`,
      })
      .select("id, vendor_code")
      .single(),
    "create reset-safe material vendor"
  );
  ids.materialVendorId = createdMaterialVendor.id;

  await must(
    supabase
      .from("material_vendor_attachment_links")
      .insert({
        material_vendor_id: createdMaterialVendor.id,
        url: `https://example.com/reset-safe-material-${stamp}.pdf`,
        remark: `reset-safe-${stamp}`,
      })
      .select("id")
      .single(),
    "create reset-safe material attachment"
  );

  const createdLessee = await must(
    supabase
      .from("lessees")
      .insert({
        lessee_code: `B${last5}`,
        legal_company_name: `Reset Safe Lessee ${stamp}`,
        company_name: `Reset Safe Lessee Alias ${stamp}`,
        address: "Reset Safe Lessee Address",
        region_id: china.id,
        country: "China",
        primary_contact_person: "Reset Safe Lessee PIC",
        contact_email: `reset.safe.lessee.${stamp}@example.com`,
        contact_tel: "3004005000",
        pic_user_id: baseUserId,
        settlement_credit_days: 20,
        settlement_currency: "USD",
        settlement_advance_payment_percentage: 0,
        settlement_prepayment_pool: false,
        settlement_prepayment_threshold: 0,
        settlement_current_prepaid_balance: 0,
        status: "Normal",
        remark: `reset-safe-${stamp}`,
      })
      .select("id, lessee_code")
      .single(),
    "create reset-safe lessee"
  );
  ids.lesseeId = createdLessee.id;

  await must(
    supabase
      .from("lessee_attachment_links")
      .insert({
        lessee_id: createdLessee.id,
        url: `https://example.com/reset-safe-lessee-${stamp}.pdf`,
        remark: `reset-safe-${stamp}`,
      })
      .select("id")
      .single(),
    "create reset-safe lessee attachment"
  );

  const createdOwner = await must(
    supabase
      .from("container_owners")
      .insert({
        container_owner_code: `O${last5}`,
        legal_company_name: `Reset Safe Owner ${stamp}`,
        company_name: `Reset Safe Owner Alias ${stamp}`,
        address: "Reset Safe Owner Address",
        region_id: china.id,
        country: "China",
        primary_contact_person: "Reset Safe Owner PIC",
        contact_email: `reset.safe.owner.${stamp}@example.com`,
        contact_tel: "4005006000",
        pic_user_id: baseUserId,
        settlement_credit_days: 10,
        settlement_currency: "USD",
        settlement_advance_payment_percentage: 0,
        settlement_prepayment_pool: false,
        settlement_prepayment_threshold: 0,
        settlement_current_prepaid_balance: 0,
        status: "Normal",
        remark: `reset-safe-${stamp}`,
      })
      .select("id, container_owner_code")
      .single(),
    "create reset-safe owner"
  );
  ids.ownerId = createdOwner.id;

  await must(
    supabase
      .from("container_owner_attachment_links")
      .insert({
        container_owner_id: createdOwner.id,
        url: `https://example.com/reset-safe-owner-${stamp}.pdf`,
        remark: `reset-safe-${stamp}`,
      })
      .select("id")
      .single(),
    "create reset-safe owner attachment"
  );

  const sizeCode = await must(
    supabase.from("container_size_codes").select("id, size_code").order("created_at", { ascending: true }).limit(1).single(),
    "load purchase size code"
  );
  const typeCode = await must(
    supabase.from("container_type_codes").select("id, type_code").order("created_at", { ascending: true }).limit(1).single(),
    "load purchase type code"
  );
  const conditionCode = await must(
    supabase.from("container_condition_codes").select("id, condition_code").order("created_at", { ascending: true }).limit(1).single(),
    "load purchase condition code"
  );
  const city = await must(
    supabase.from("cities").select("id, city_code").order("created_at", { ascending: true }).limit(1).single(),
    "load purchase city"
  );
  const depot = await must(
    supabase.from("depots").select("id, depot_code").order("created_at", { ascending: true }).limit(1).single(),
    "load purchase depot"
  );

  const purchaseOrder = await must(
    supabase
      .from("purchase_order")
      .insert({
        order_no: `PO-RS-${stamp}`,
        purchase_type: "FACTORY_ORDER",
        supplier_id: createdVendor.id,
        owner_id: createdOwner.id,
        buyer_id: createdUser.id,
        purchase_date: "2026-04-03",
        estimated_offline_time: "2026-04-10T00:00:00Z",
        contract_number: `CT-${stamp}`,
        invoice_number: `INV-${stamp}`,
        payment_mode: "PREPAYMENT",
        payment_account: `RESET-SAFE-ACCOUNT-${stamp}`,
        due_date: "2026-05-03",
        order_status: "CONFIRMED",
        inbound_status: "PARTIAL",
        settlement_currency: "USD",
        exchange_rate: 1,
        remark: `reset-safe-${stamp}`,
      })
      .select("id, order_no")
      .single(),
    "create reset-safe purchase order"
  );
  ids.purchaseOrderId = purchaseOrder.id;

  const purchaseItem = await must(
    supabase
      .from("purchase_order_item")
      .insert({
        purchase_order_id: purchaseOrder.id,
        line_no: 1,
        location_city_id: city.id,
        depot_id: depot.id,
        container_size_code_id: sizeCode.id,
        container_type_code_id: typeCode.id,
        container_condition_code_id: conditionCode.id,
        color: "Blue",
        flp: true,
        lbx: false,
        locking_bars_count: 4,
        vents_count: 2,
        machine_type: "RS-MODEL",
        yom: 2026,
        offline_date: "2026-04-10",
        planned_qty: 2,
        unit_price: 1200,
        financial_cost: 45,
        settlement_price: 1250,
        line_amount: 2500,
        remark: `reset-safe-${stamp}`,
      })
      .select("id")
      .single(),
    "create reset-safe purchase item"
  );

  await must(
    supabase
      .from("purchase_order_container")
      .insert({
        purchase_order_id: purchaseOrder.id,
        purchase_order_item_id: purchaseItem.id,
        container_number: `RSCU${last4}0001`,
        location_city_id: city.id,
        depot_id: depot.id,
        container_size_code_id: sizeCode.id,
        container_type_code_id: typeCode.id,
        container_condition_code_id: conditionCode.id,
        color: "Blue",
        flp: true,
        lbx: false,
        yom: 2026,
        offline_date: "2026-04-11",
        purchase_price: 1250,
        financial_cost: 45,
        container_status: "READY",
        actual_offline_time: "2026-04-11T00:00:00Z",
        remark: `reset-safe-${stamp}`,
      })
      .select("id")
      .single(),
    "create reset-safe purchase container"
  );

  await must(
    supabase
      .from("purchase_order_material_type")
      .insert({
        purchase_order_id: purchaseOrder.id,
        material_type: "地板",
      })
      .select("id")
      .single(),
    "create reset-safe purchase material type"
  );

  return { ids, markers: {
    userCode: createdUser.user_code,
    vendorCode: createdVendor.vendor_code,
    materialVendorCode: createdMaterialVendor.vendor_code,
    lesseeCode: createdLessee.lessee_code,
    ownerCode: createdOwner.container_owner_code,
    purchaseOrderNo: purchaseOrder.order_no,
    stamp,
  }};
}

async function assertRestored(supabase, markers) {
  const user = await must(supabase.from("users").select("id, remarks").eq("user_code", markers.userCode).single(), "verify restored user");
  if (user.remarks !== `reset-safe-${markers.stamp}`) fail("Restored user remark mismatch");

  const vendor = await must(supabase.from("vendors").select("id, remark").eq("vendor_code", markers.vendorCode).single(), "verify restored vendor");
  const vendorAttachments = await must(supabase.from("vendor_attachment_links").select("id").eq("vendor_id", vendor.id), "verify restored vendor attachment");
  if ((vendorAttachments ?? []).length !== 1) fail("Restored vendor attachment missing");

  const materialVendor = await must(supabase.from("material_vendors").select("id, remark").eq("vendor_code", markers.materialVendorCode).single(), "verify restored material vendor");
  const materialAttachments = await must(supabase.from("material_vendor_attachment_links").select("id").eq("material_vendor_id", materialVendor.id), "verify restored material attachment");
  if ((materialAttachments ?? []).length !== 1) fail("Restored material vendor attachment missing");

  const lessee = await must(supabase.from("lessees").select("id, remark").eq("lessee_code", markers.lesseeCode).single(), "verify restored lessee");
  const lesseeAttachments = await must(supabase.from("lessee_attachment_links").select("id").eq("lessee_id", lessee.id), "verify restored lessee attachment");
  if ((lesseeAttachments ?? []).length !== 1) fail("Restored lessee attachment missing");

  const owner = await must(supabase.from("container_owners").select("id, remark").eq("container_owner_code", markers.ownerCode).single(), "verify restored owner");
  const ownerAttachments = await must(supabase.from("container_owner_attachment_links").select("id").eq("container_owner_id", owner.id), "verify restored owner attachment");
  if ((ownerAttachments ?? []).length !== 1) fail("Restored container owner attachment missing");

  const purchaseOrder = await must(
    supabase
      .from("purchase_order")
      .select("id, total_planned_qty, total_available_qty, grand_total, vendor_bank_information")
      .eq("order_no", markers.purchaseOrderNo)
      .single(),
    "verify restored purchase order"
  );
  if (purchaseOrder.total_planned_qty !== 2) fail("Restored purchase order planned qty mismatch");
  if (purchaseOrder.total_available_qty !== 1) fail("Restored purchase order available qty mismatch");
  if (Number(purchaseOrder.grand_total) !== 2500) fail("Restored purchase order grand total mismatch");

  const purchaseItems = await must(
    supabase.from("purchase_order_item").select("id, yom, offline_date").eq("purchase_order_id", purchaseOrder.id),
    "verify restored purchase items"
  );
  if ((purchaseItems ?? []).length !== 1) fail("Restored purchase item missing");

  const purchaseContainers = await must(
    supabase.from("purchase_order_container").select("id, container_status, offline_date").eq("purchase_order_id", purchaseOrder.id),
    "verify restored purchase containers"
  );
  if ((purchaseContainers ?? []).length !== 1) fail("Restored purchase container missing");

  const purchaseMaterialTypes = await must(
    supabase.from("purchase_order_material_type").select("id, material_vendor_id").eq("purchase_order_id", purchaseOrder.id),
    "verify restored purchase material types"
  );
  if ((purchaseMaterialTypes ?? []).length !== 1) fail("Restored purchase material type missing");
  if (!purchaseMaterialTypes[0].material_vendor_id) fail("Restored purchase material vendor resolution missing");

  const financeRecords = await must(
    supabase.from("purchase_finance_record").select("id, grand_total").eq("purchase_order_id", purchaseOrder.id),
    "verify restored purchase finance record"
  );
  if ((financeRecords ?? []).length !== 1) fail("Restored purchase finance record missing");
}

async function assertTableCount(supabase, table, expected) {
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
  if (error) {
    error.message = `count ${table}: ${error.message}`;
    throw error;
  }
  if (count !== expected) {
    fail(`Expected ${table} to contain ${expected} rows after reset, found ${count ?? "null"}`);
  }
}

async function assertBasicInfoRestored(supabase) {
  await assertTableCount(supabase, "company_profiles", 1);
  await must(
    supabase
      .from("company_profiles")
      .select("id")
      .eq("company_name_en", "EW INTERNATIONAL LOGISTICS COMPANY LIMITED")
      .single(),
    "verify company profile seed"
  );

  await assertTableCount(supabase, "company_bank_accounts", 0);
  await assertTableCount(supabase, "customer_certificate_links", 0);

  await assertTableCount(supabase, "region_codes", 18);
  await must(supabase.from("region_codes").select("id").eq("region_code", "China").single(), "verify region seed");

  await assertTableCount(supabase, "cities", 412);
  await must(supabase.from("cities").select("id").eq("city_code", "USLAX").single(), "verify city seed");

  await assertTableCount(supabase, "depots", 2);
  await must(supabase.from("depots").select("id").eq("depot_code", "USLAX001").single(), "verify depot seed");

  await assertTableCount(supabase, "depot_attachment_links", 0);
  await assertTableCount(supabase, "depot_additional_costs", 0);

  await assertTableCount(supabase, "cost_codes", 30);
  await must(supabase.from("cost_codes").select("id").eq("cost_code", "ZLF").single(), "verify cost code seed");

  await assertTableCount(supabase, "revenue_codes", 8);
  await must(supabase.from("revenue_codes").select("id").eq("revenue_code", "OCE").single(), "verify revenue code seed");

  await assertTableCount(supabase, "container_condition_codes", 4);
  await must(
    supabase.from("container_condition_codes").select("id").eq("condition_code", "Brand New").single(),
    "verify condition code seed"
  );

  await assertTableCount(supabase, "container_size_codes", 4);
  await must(supabase.from("container_size_codes").select("id").eq("size_code", "20").single(), "verify size code seed");

  await assertTableCount(supabase, "container_type_codes", 22);
  await must(supabase.from("container_type_codes").select("id").eq("type_code", "GP").single(), "verify type code seed");

  await assertTableCount(supabase, "container_number_rules", 2);
  await must(supabase.from("container_number_rules").select("id").eq("prefix", "EWLU").limit(1).single(), "verify number rule seed");

  await assertTableCount(supabase, "operation_price_configs", 2);
  await must(
    supabase.from("operation_price_configs").select("id").eq("currency", "USD").eq("addon_price", 20).limit(1).single(),
    "verify operation price seed"
  );
}

async function cleanupRestored(_supabase, markers) {
  const userCode = escapeLiteral(markers.userCode);
  const vendorCode = escapeLiteral(markers.vendorCode);
  const materialVendorCode = escapeLiteral(markers.materialVendorCode);
  const lesseeCode = escapeLiteral(markers.lesseeCode);
  const ownerCode = escapeLiteral(markers.ownerCode);
  const purchaseOrderNo = escapeLiteral(markers.purchaseOrderNo);

  runPsql(`delete from public.purchase_order where order_no = '${purchaseOrderNo}';`);
  runPsql(`delete from public.users where user_code = '${userCode}';`);
  runPsql(`delete from public.vendors where vendor_code = '${vendorCode}';`);
  runPsql(`delete from public.material_vendors where vendor_code = '${materialVendorCode}';`);
  runPsql(`delete from public.lessees where lessee_code = '${lesseeCode}';`);
  runPsql(`delete from public.container_owners where container_owner_code = '${ownerCode}';`);
}

function assertSeedFilesContain(markers) {
  const checks = [
    [path.join(ROOT, "db/supabase/seeds/20260401_partner_master_users.sql"), markers.userCode],
    [path.join(ROOT, "db/supabase/seeds/20260401_partner_master_vendors.sql"), markers.vendorCode],
    [path.join(ROOT, "db/supabase/seeds/20260401_partner_master_material_vendors.sql"), markers.materialVendorCode],
    [path.join(ROOT, "db/supabase/seeds/20260401_partner_master_lessees.sql"), markers.lesseeCode],
    [path.join(ROOT, "db/supabase/seeds/20260401_partner_master_container_owners.sql"), markers.ownerCode],
    [path.join(ROOT, "db/supabase/seeds/20260403_purchase_order.sql"), markers.purchaseOrderNo],
    [path.join(ROOT, "db/supabase/seeds/20260403_purchase_order_item.sql"), markers.purchaseOrderNo],
    [path.join(ROOT, "db/supabase/seeds/20260403_purchase_order_container.sql"), markers.purchaseOrderNo],
    [path.join(ROOT, "db/supabase/seeds/20260403_purchase_order_material_type.sql"), markers.purchaseOrderNo],
    [path.join(ROOT, "db/supabase/seeds/20260403_purchase_finance_record.sql"), markers.purchaseOrderNo],
  ];
  for (const [filePath, marker] of checks) {
    const body = fs.readFileSync(filePath, "utf8");
    if (!body.includes(marker)) fail(`Expected seed file ${path.basename(filePath)} to contain ${marker}`);
  }
}

async function main() {
  const env = readEnvFile();
  runPsql("notify pgrst, 'reload schema';");
  const initialClient = buildClient(env);
  await waitForSupabaseReady(initialClient);
  const stamp = String(Date.now());
  let markers = null;
  let purchaseSeedBackupDir = null;

  try {
    const fixtures = await createRegressionFixtures(initialClient, stamp);
    markers = fixtures.markers;

    run("python3", [SEED_EXPORT_SCRIPT]);
    assertSeedFilesContain(markers);
    purchaseSeedBackupDir = backupPurchaseSeeds();

    runResetSafeDbReset(purchaseSeedBackupDir);
    runPsql("notify pgrst, 'reload schema';");

    const resetClient = buildClient(readEnvFile());
    await waitForSupabaseReady(resetClient);
    await assertRestored(resetClient, markers);
    await assertBasicInfoRestored(resetClient);

    console.log("Reset-safe regression passed.");
    console.log(JSON.stringify({ reset_safe_checks: 30 }, null, 2));
  } finally {
    if (markers) {
      await cleanupRestored(null, markers);
    }
    run("python3", [SEED_EXPORT_SCRIPT]);
    if (purchaseSeedBackupDir) {
      fs.rmSync(purchaseSeedBackupDir, { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
