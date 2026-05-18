import { execFileSync } from "child_process";
import { setTimeout as delay } from "timers/promises";
import fs from "fs";
import path from "path";
import os from "os";

import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const DB_SUPABASE_DIR = path.join(ROOT, "db", "supabase");
const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";
const DEFAULT_APP_BASE_URL = "http://127.0.0.1:3000";
const SEED_EXPORT_SCRIPT = path.join(ROOT, "scripts", "export_basic_info_seeds.py");
const PURCHASE_SEED_FILES = [
  "20260403_purchase_order.sql",
  "20260403_purchase_order_item.sql",
  "20260403_purchase_order_item_attachment_links.sql",
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

function describeLocalReachabilityFailure(target, error, label = "app URL") {
  return `Cannot reach ${label} ${target} from this environment. If this regression is running inside a sandboxed automation session, rerun it from a shell/session with local network access. Details: ${formatError(error)}`;
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

async function fetchHtml(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) {
    fail(`Expected ${url} to return 200, got ${response.status}`);
  }
  return response.text();
}

async function assertHttpPage(url, { includes = [], excludes = [] } = {}) {
  let lastFailure = null;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const body = await fetchHtml(url);
      if (body.includes("Unhandled Runtime Error")) {
        lastFailure = `Runtime error detected in ${url}`;
      } else if (body.includes("Error:")) {
        lastFailure = `Unexpected error text detected in ${url}`;
      } else {
        const missingText = includes.find((text) => !body.includes(text));
        if (missingText) {
          lastFailure = `Expected ${url} to include "${missingText}"`;
        } else {
          const unexpectedText = excludes.find((text) => body.includes(text));
          if (!unexpectedText) return;
          lastFailure = `Expected ${url} to exclude "${unexpectedText}"`;
        }
      }
    } catch (error) {
      lastFailure = describeLocalReachabilityFailure(url, error, "app URL");
    }
    await delay(1000);
  }
  fail(lastFailure ?? `Failed to validate ${url}`);
}

async function generateUniqueResetSafeUserCode(supabase) {
  const rows = await must(
    supabase
      .from("users")
      .select("user_code")
      .like("user_code", "RS%")
      .order("user_code", { ascending: false })
      .limit(200),
    "load reset-safe user codes"
  );

  const maxSequence = (rows ?? []).reduce((highest, row) => {
    const value = Number.parseInt(String(row.user_code ?? "").slice(2), 10);
    return Number.isFinite(value) ? Math.max(highest, value) : highest;
  }, 0);

  const nextSequence = maxSequence + 1;
  if (nextSequence > 9999) {
    fail("Reset-safe user code sequence exhausted");
  }

  return `RS${String(nextSequence).padStart(4, "0")}`;
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
    purchaseOrderItemId: null,
    oneWayPlanId: null,
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

  const nextResetSafeUserCode = await generateUniqueResetSafeUserCode(supabase);

  const createdUser = await must(
    supabase
      .from("users")
      .insert({
        user_code: nextResetSafeUserCode,
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
        uses_internal_container_numbering: true,
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
    supabase.from("cities").select("id, city_code, city_name, region").order("created_at", { ascending: true }).limit(1).single(),
    "load purchase city"
  );
  const depot = await must(
    supabase.from("depots").select("id, depot_code, depot_name").order("created_at", { ascending: true }).limit(1).single(),
    "load purchase depot"
  );

  const purchaseOrder = await must(
    supabase
      .from("purchase_order")
      .insert({
        order_no: `PO-RS-${stamp}`,
        purchase_type: "USED_CONTAINER",
        supplier_id: createdVendor.id,
        owner_id: createdOwner.id,
        buyer_id: createdUser.id,
        purchase_date: "2026-04-03",
        estimated_offline_time: null,
        contract_number: null,
        invoice_number: null,
        payment_mode: "PREPAYMENT",
        payment_account: `RESET-SAFE-ACCOUNT-${stamp}`,
        due_date: "2026-05-03",
        freeday: 7,
        vendor_release_date: "2026-04-12",
        order_status: "RELEASED",
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
        color: "RAL1001",
        flp: true,
        lbx: false,
        locking_bars_count: 4,
        vents_count: 2,
        machine_type: "RS-MODEL",
        yom: 2026,
        estimated_offline_date: "2026-04-09",
        offline_date: "2026-04-10",
        vendor_release_number: `VRN-${stamp}`,
        planned_pod: `POD-${stamp}`,
        tare_weight: 2200,
        maximum_weight: 30480,
        csc_number: `CSC-ITEM-${stamp}`,
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
  ids.purchaseOrderItemId = purchaseItem.id;

  await must(
    supabase
      .from("purchase_order_item_attachment_links")
      .insert([
        {
          purchase_order_item_id: purchaseItem.id,
          attachment_type: "VENDOR_RELEASE",
          url: `https://example.com/reset-safe-vendor-release-${stamp}-1.pdf`,
          remark: `reset-safe-vendor-release-1-${stamp}`,
        },
        {
          purchase_order_item_id: purchaseItem.id,
          attachment_type: "VENDOR_RELEASE",
          url: `https://example.com/reset-safe-vendor-release-${stamp}-2.pdf`,
          remark: `reset-safe-vendor-release-2-${stamp}`,
        },
        {
          purchase_order_item_id: purchaseItem.id,
          attachment_type: "GENERAL",
          url: `https://example.com/reset-safe-general-${stamp}.pdf`,
          remark: `reset-safe-general-${stamp}`,
        },
      ])
      .select("id"),
    "create reset-safe purchase item attachments"
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
        color: "RAL1001",
        flp: true,
        lbx: false,
        locking_bars_count: 4,
        vents_count: 2,
        machine_type: "RS-MODEL",
        yom: 2026,
        estimated_offline_date: "2026-04-10",
        offline_date: "2026-04-11",
        planned_pod: `POD-${stamp}`,
        tare_weight: 2350,
        maximum_weight: 30480,
        csc_number: `CSC-CONTAINER-${stamp}`,
        purchase_price: 1250,
        financial_cost: 45,
        container_status: "IN_YARD",
        actual_offline_time: "2026-04-11T00:00:00Z",
        remark: `reset-safe-${stamp}`,
      })
      .select("id")
      .single(),
    "create reset-safe purchase container"
  );

  const createdOneWayPlan = await must(
    supabase
      .from("one_way_plan")
      .insert({
        offer_id: `RS-OFFER-${stamp}`,
        status: "APPROVED",
        apply_date: "2026-05-01",
        availability_date: "2026-05-10",
        arranged_dispatch_date: "2026-05-12",
        lessee_id: createdLessee.id,
        depot_id: null,
        pol_city_id: city.id,
        pod_codes_raw: `${city.city_code} / USLAX`,
        size_code_id: sizeCode.id,
        type_code_id: typeCode.id,
        condition_code_id: conditionCode.id,
        color_code: "RAL1001",
        planned_qty: 3,
        authorized_qty: 2,
        remaining_qty: 1,
        picked_up_qty: 1,
        non_picked_up_qty: 0,
        pickup_charge: 35,
        free_days: 9,
        per_diem: 4.25,
        dpp: 15,
        shipper_request_id: `RS-SHIPPER-${stamp}`,
        onhire_no: `RS-ONHIRE-${stamp}`,
        remarks: `reset-safe-${stamp}`,
        conversion_status: "OPEN",
        carrier: "RESET SAFE CARRIER",
        currency: "USD",
        rv: 12.5,
        machine_type: "RS-MACHINE-TYPE",
      })
      .select("id, plan_id")
      .single(),
    "create reset-safe one way plan"
  );
  ids.oneWayPlanId = createdOneWayPlan.id;

  return { ids, markers: {
    userCode: createdUser.user_code,
    vendorCode: createdVendor.vendor_code,
    materialVendorCode: createdMaterialVendor.vendor_code,
    lesseeCode: createdLessee.lessee_code,
    ownerCode: createdOwner.container_owner_code,
    purchaseOrderNo: purchaseOrder.order_no,
    purchaseOrderId: purchaseOrder.id,
    purchaseOrderItemId: purchaseItem.id,
    vendorReleaseNumber: `VRN-${stamp}`,
    vendorReleaseRemark1: `reset-safe-vendor-release-1-${stamp}`,
    vendorReleaseRemark2: `reset-safe-vendor-release-2-${stamp}`,
    generalAttachmentRemark: `reset-safe-general-${stamp}`,
    regionLabel: city.region,
    cityCode: city.city_code,
    cityName: city.city_name,
    depotCode: depot.depot_code,
    depotName: depot.depot_name,
    sizeType: `${sizeCode.size_code}${typeCode.type_code}`,
    conditionCode: conditionCode.condition_code,
    color: "RAL1001",
    machineType: "RS-MODEL",
    oneWayPlanId: createdOneWayPlan.id,
    oneWayPlanPlanId: createdOneWayPlan.plan_id,
    oneWayPlanOfferId: `RS-OFFER-${stamp}`,
    oneWayPlanShipperRequestId: `RS-SHIPPER-${stamp}`,
    oneWayPlanOnhireNo: `RS-ONHIRE-${stamp}`,
    oneWayPlanMachineType: "RS-MACHINE-TYPE",
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

  const owner = await must(
    supabase
      .from("container_owners")
      .select("id, remark, uses_internal_container_numbering")
      .eq("container_owner_code", markers.ownerCode)
      .single(),
    "verify restored owner"
  );
  if (owner.uses_internal_container_numbering !== true) fail("Restored owner numbering eligibility mismatch");
  const ownerAttachments = await must(supabase.from("container_owner_attachment_links").select("id").eq("container_owner_id", owner.id), "verify restored owner attachment");
  if ((ownerAttachments ?? []).length !== 1) fail("Restored container owner attachment missing");

  const purchaseOrder = await must(
    supabase
      .from("purchase_order")
      .select("id, total_planned_qty, total_available_qty, grand_total, vendor_bank_information, freeday, vendor_release_date")
      .eq("order_no", markers.purchaseOrderNo)
      .single(),
    "verify restored purchase order"
  );
  if (purchaseOrder.total_planned_qty !== 2) fail("Restored purchase order planned qty mismatch");
  if (purchaseOrder.total_available_qty !== 1) fail("Restored purchase order available qty mismatch");
  if (Number(purchaseOrder.grand_total) !== 2500) fail("Restored purchase order grand total mismatch");
  if (purchaseOrder.freeday !== 7) fail("Restored purchase order freeday mismatch");
  if (purchaseOrder.vendor_release_date !== "2026-04-12") fail("Restored purchase order vendor release date mismatch");

  const purchaseItems = await must(
    supabase
      .from("purchase_order_item")
      .select("id, yom, estimated_offline_date, offline_date, vendor_release_number, planned_pod, tare_weight, maximum_weight, payload_weight, csc_number")
      .eq("purchase_order_id", purchaseOrder.id),
    "verify restored purchase items"
  );
  if ((purchaseItems ?? []).length !== 1) fail("Restored purchase item missing");
  if (Number(purchaseItems[0].tare_weight) !== 2200) fail("Restored purchase item tare weight mismatch");
  if (Number(purchaseItems[0].maximum_weight) !== 30480) fail("Restored purchase item maximum weight mismatch");
  if (Number(purchaseItems[0].payload_weight) !== 28280) fail("Restored purchase item payload weight mismatch");
  if (purchaseItems[0].csc_number !== `CSC-ITEM-${markers.stamp}`) fail("Restored purchase item CSC number mismatch");
  if (purchaseItems[0].vendor_release_number !== `VRN-${markers.stamp}`) fail("Restored purchase item vendor release number mismatch");
  if (purchaseItems[0].planned_pod !== `POD-${markers.stamp}`) fail("Restored purchase item planned POD mismatch");
  if (purchaseItems[0].estimated_offline_date !== "2026-04-09") fail("Restored purchase item estimated offline date mismatch");

  const purchaseItemAttachments = await must(
    supabase
      .from("purchase_order_item_attachment_links")
      .select("attachment_type, remark")
      .eq("purchase_order_item_id", markers.purchaseOrderItemId)
      .order("created_at", { ascending: true }),
    "verify restored purchase item attachments"
  );
  if ((purchaseItemAttachments ?? []).length !== 3) {
    fail("Restored purchase item attachments mismatch");
  }
  const attachmentTypes = new Set(
    (purchaseItemAttachments ?? []).map((row) => row.attachment_type)
  );
  if (!attachmentTypes.has("VENDOR_RELEASE") || !attachmentTypes.has("GENERAL")) {
    fail("Restored purchase item attachment types mismatch");
  }
  if (
    !(purchaseItemAttachments ?? []).some(
      (row) => row.remark === markers.vendorReleaseRemark1
    ) ||
    !(purchaseItemAttachments ?? []).some(
      (row) => row.remark === markers.vendorReleaseRemark2
    ) ||
    !(purchaseItemAttachments ?? []).some(
      (row) => row.remark === markers.generalAttachmentRemark
    )
  ) {
    fail("Restored purchase item attachment remarks mismatch");
  }

  const purchaseContainers = await must(
    supabase
      .from("purchase_order_container")
      .select("id, container_status, estimated_offline_date, offline_date, planned_pod, tare_weight, maximum_weight, payload_weight, csc_number")
      .eq("purchase_order_id", purchaseOrder.id),
    "verify restored purchase containers"
  );
  if ((purchaseContainers ?? []).length !== 1) fail("Restored purchase container missing");
  if (Number(purchaseContainers[0].tare_weight) !== 2350) fail("Restored purchase container tare weight mismatch");
  if (Number(purchaseContainers[0].maximum_weight) !== 30480) fail("Restored purchase container maximum weight mismatch");
  if (Number(purchaseContainers[0].payload_weight) !== 28130) fail("Restored purchase container payload weight mismatch");
  if (purchaseContainers[0].csc_number !== `CSC-CONTAINER-${markers.stamp}`) fail("Restored purchase container CSC number mismatch");
  if (purchaseContainers[0].planned_pod !== `POD-${markers.stamp}`) fail("Restored purchase container planned POD mismatch");
  if (purchaseContainers[0].estimated_offline_date !== "2026-04-10") fail("Restored purchase container estimated offline date mismatch");

  const financeRecords = await must(
    supabase.from("purchase_finance_record").select("id, grand_total").eq("purchase_order_id", purchaseOrder.id),
    "verify restored purchase finance record"
  );
  if ((financeRecords ?? []).length !== 1) fail("Restored purchase finance record missing");

  const oneWayPlan = await must(
    supabase
      .from("one_way_plan")
      .select(
        "id, plan_id, offer_id, conversion_status, carrier, currency, rv, onhire_no, shipper_request_id, depot_id, machine_type"
      )
      .eq("plan_id", markers.oneWayPlanPlanId)
      .single(),
    "verify restored one way plan"
  );
  if (oneWayPlan.offer_id !== markers.oneWayPlanOfferId) fail("Restored one way plan offer id mismatch");
  if (oneWayPlan.conversion_status !== "OPEN") fail("Restored one way plan conversion status mismatch");
  if (oneWayPlan.carrier !== "RESET SAFE CARRIER") fail("Restored one way plan carrier mismatch");
  if (oneWayPlan.currency !== "USD") fail("Restored one way plan currency mismatch");
  if (Number(oneWayPlan.rv) !== 12.5) fail("Restored one way plan rv mismatch");
  if (oneWayPlan.onhire_no !== markers.oneWayPlanOnhireNo) fail("Restored one way plan onhire mismatch");
  if (oneWayPlan.shipper_request_id !== markers.oneWayPlanShipperRequestId) {
    fail("Restored one way plan shipper request id mismatch");
  }
  if (oneWayPlan.machine_type !== markers.oneWayPlanMachineType) {
    fail("Restored one way plan machine type mismatch");
  }
  if (oneWayPlan.depot_id !== null) fail("Restored one way plan nullable depot mismatch");
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

  await assertTableCount(supabase, "cities", 413);
  await must(supabase.from("cities").select("id").eq("city_code", "USLAX").single(), "verify city seed");

  await assertTableCount(supabase, "depots", 415);
  await must(supabase.from("depots").select("id").eq("depot_code", "USLAX001").single(), "verify depot seed");
  await must(supabase.from("depots").select("id").eq("depot_code", "USLAXVDP").single(), "verify vendor depot seed");

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

  await assertTableCount(supabase, "ral_color_codes", 211);
  await must(supabase.from("ral_color_codes").select("id").eq("color_code", "RAL1001").single(), "verify RAL color seed");

  await assertTableCount(supabase, "operation_price_configs", 2);
  await must(
    supabase.from("operation_price_configs").select("id").eq("currency", "USD").eq("addon_price", 20).limit(1).single(),
    "verify operation price seed"
  );
}

function normalizeUrlPath(url) {
  return url.replace(/\/+$/, "");
}

function buildDispatchReleaseCreateUrl(markers) {
  const params = new URLSearchParams({
    region: markers.regionLabel,
    city: `${markers.cityCode} · ${markers.cityName}`,
    depot: markers.depotName,
    sizeType: markers.sizeType,
    condition: markers.conditionCode,
    color: markers.color,
    machineType: markers.machineType,
    releaseSource: "VENDOR_REF",
    sourcePurchaseOrderId: markers.purchaseOrderId,
    sourcePurchaseOrderItemId: markers.purchaseOrderItemId,
    vendorReleaseNumber: markers.vendorReleaseNumber,
  });
  return `/dispatch/dispatch-release/create?${params.toString()}`;
}

async function createDispatchReleaseFixture(supabase, markers) {
  const [purchaseItem, lessee, city, depot, sourceAttachments] = await Promise.all([
    must(
      supabase
        .from("purchase_order_item")
        .select("id, vendor_release_number")
        .eq("id", markers.purchaseOrderItemId)
        .single(),
      "load restored purchase item for dispatch fixture"
    ),
    must(
      supabase.from("lessees").select("id").eq("lessee_code", markers.lesseeCode).single(),
      "load restored lessee for dispatch fixture"
    ),
    must(
      supabase.from("cities").select("id").eq("city_code", markers.cityCode).single(),
      "load dispatch fixture city"
    ),
    must(
      supabase.from("depots").select("id").eq("depot_code", markers.depotCode).single(),
      "load dispatch fixture depot"
    ),
    must(
      supabase
        .from("purchase_order_item_attachment_links")
        .select("id, attachment_type, url, remark")
        .eq("purchase_order_item_id", markers.purchaseOrderItemId)
        .order("created_at", { ascending: true }),
      "load dispatch fixture source attachments"
    ),
  ]);

  const releaseNumber = `DRS${markers.stamp.slice(-7)}`;
  const insertedOrder = await must(
    supabase
      .from("transfer_order")
      .insert({
        order_no: releaseNumber,
        transfer_type: "ONE_WAY_LEASE",
        from_depot_id: depot.id,
        to_depot_id: null,
        customer_id: null,
        status: "CREATED",
        total_cost: 0,
        total_revenue: 0,
        release_source: "VENDOR_REF",
        source_purchase_order_id: markers.purchaseOrderId,
        source_purchase_order_item_id: markers.purchaseOrderItemId,
        vendor_release_number: purchaseItem.vendor_release_number,
        dispatch_vendor_id: lessee.id,
        onhire_no: `ONH-${markers.stamp.slice(-6)}`,
        release_date: "2026-05-03",
        pol_city_id: city.id,
        pod_city_id: city.id,
        carrier: "RESET SAFE CARRIER",
        box_selection_mode: "UNSPECIFIED",
        release_qty: 1,
        assigned_qty: 0,
        unassigned_qty: 1,
        pickup_charge: 25,
        dpp: 0,
        free_days: 10,
        rv: 0,
        daily_rent: 3,
        trucking_cost: 0,
        handling_fee: 0,
        repair_cost_total: 0,
        damage_claim_total: 0,
      })
      .select("id, order_no")
      .single(),
    "create reset-safe dispatch release"
  );

  const vendorReleaseAttachments = (sourceAttachments ?? []).filter(
    (row) => row.attachment_type === "VENDOR_RELEASE"
  );
  if (vendorReleaseAttachments.length !== 2) {
    fail("Expected two VENDOR_RELEASE attachments for dispatch fixture");
  }

  await must(
    supabase
      .from("transfer_order_attachment_links")
      .insert(
        vendorReleaseAttachments.map((row) => ({
          transfer_order_id: insertedOrder.id,
          source_purchase_order_item_attachment_id: row.id,
          url: row.url,
          remark: row.remark,
          inherited: true,
        }))
      )
      .select("id"),
    "inherit reset-safe vendor release attachments"
  );

  return {
    transferOrderId: insertedOrder.id,
    releaseNumber: insertedOrder.order_no,
  };
}

async function assertDispatchReleaseVendorAttachmentFlow(supabase, appBaseUrl, markers) {
  const createUrl = `${normalizeUrlPath(appBaseUrl)}${buildDispatchReleaseCreateUrl(markers)}`;
  await assertHttpPage(createUrl, {
    includes: [
      "Create Dispatch Release",
    ],
  });

  const { transferOrderId, releaseNumber } = await createDispatchReleaseFixture(
    supabase,
    markers
  );

  const inheritedRows = await must(
    supabase
      .from("transfer_order_attachment_links")
      .select("remark, inherited")
      .eq("transfer_order_id", transferOrderId)
      .order("created_at", { ascending: true }),
    "verify inherited transfer order attachments"
  );
  if ((inheritedRows ?? []).length !== 2) {
    fail("Expected exactly two inherited vendor release attachments on transfer order");
  }
  if ((inheritedRows ?? []).some((row) => row.inherited !== true)) {
    fail("Expected all transfer order attachments to be marked inherited");
  }
  if ((inheritedRows ?? []).some((row) => row.remark === markers.generalAttachmentRemark)) {
    fail("GENERAL attachment should not be inherited onto transfer order");
  }

  const detailUrl = `${normalizeUrlPath(appBaseUrl)}/dispatch/dispatch-release/${transferOrderId}`;
  await assertHttpPage(detailUrl, {
    includes: [
      "Dispatch Release Detail",
      "Release Number",
      releaseNumber,
    ],
  });
}

async function cleanupRestored(_supabase, markers) {
  const userCode = escapeLiteral(markers.userCode);
  const vendorCode = escapeLiteral(markers.vendorCode);
  const materialVendorCode = escapeLiteral(markers.materialVendorCode);
  const lesseeCode = escapeLiteral(markers.lesseeCode);
  const ownerCode = escapeLiteral(markers.ownerCode);
  const purchaseOrderNo = escapeLiteral(markers.purchaseOrderNo);

  runPsql(`delete from public.transfer_order where order_no like 'DRS%';`);
  runPsql(`delete from public.one_way_plan where plan_id = '${escapeLiteral(markers.oneWayPlanPlanId)}';`);
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
    [path.join(ROOT, "db/supabase/seeds/20260403_purchase_order_item_attachment_links.sql"), markers.purchaseOrderNo],
    [path.join(ROOT, "db/supabase/seeds/20260403_purchase_order_container.sql"), markers.purchaseOrderNo],
    [path.join(ROOT, "db/supabase/seeds/20260403_purchase_finance_record.sql"), markers.purchaseOrderNo],
    [path.join(ROOT, "db/supabase/seeds/20260517_one_way_plan.sql"), markers.oneWayPlanPlanId],
  ];
  for (const [filePath, marker] of checks) {
    const body = fs.readFileSync(filePath, "utf8");
    if (!body.includes(marker)) fail(`Expected seed file ${path.basename(filePath)} to contain ${marker}`);
  }
}

async function main() {
  const env = readEnvFile();
  const appBaseUrl = process.env.EW_ERP_BASE_URL || DEFAULT_APP_BASE_URL;
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
    await assertDispatchReleaseVendorAttachmentFlow(resetClient, appBaseUrl, markers);

    console.log("Reset-safe regression passed.");
    console.log(JSON.stringify({ reset_safe_checks: 39 }, null, 2));
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
