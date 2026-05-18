"use server";

import { execFile } from "node:child_process";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { getDispatchReleaseSelectableContainers } from "@/app/depot-inventory/actions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  OneWayPlanAutocompleteOption,
  OneWayPlanConversionStatus,
  OneWayPlanCreateInput,
  OneWayPlanCreateResult,
  OneWayPlanDetail,
  OneWayPlanDepotOption,
  OneWayPlanEditDraft,
  OneWayPlanFilterOptions,
  OneWayPlanFormOptions,
  OneWayPlanImportPreviewRawRow,
  OneWayPlanImportPreviewResult,
  OneWayPlanImportPreviewRow,
  OneWayPlanImportResult,
  OneWayPlanManagementQuery,
  OneWayPlanManagementResult,
  OneWayPlanManagementRow,
  OneWayPlanReleaseHistoryRow,
  OneWayPlanManagementSortBy,
  OneWayPlanReleaseSourceDetail,
  OneWayPlanStatus,
  OneWayPlanUpdateInput,
  OneWayPlanUpdateResult,
} from "@/types/one-way-planning";
import { EMPTY_ONE_WAY_PLAN_QUERY } from "@/types/one-way-planning";

const execFileAsync = promisify(execFile);

type OneWayPlanRowRecord = {
  id: string;
  plan_id: string | null;
  status: string | null;
  conversion_status: string | null;
  shipper_request_id: string | null;
  apply_date: string | null;
  availability_date: string | null;
  pod_codes_raw: string | null;
  color_code: string | null;
  machine_type: string | null;
  planned_qty: number | null;
  authorized_qty: number | null;
  remaining_qty: number | null;
  picked_up_qty: number | null;
  non_picked_up_qty: number | null;
  onhire_no: string | null;
  carrier: string | null;
  currency: string | null;
  rv: number | null;
  lessee:
    | {
        company_name?: string | null;
        legal_company_name?: string | null;
        lessee_code?: string | null;
      }
    | Array<{
        company_name?: string | null;
        legal_company_name?: string | null;
        lessee_code?: string | null;
      }>
    | null;
  depot:
    | {
        depot_code?: string | null;
      }
    | Array<{
        depot_code?: string | null;
      }>
    | null;
  pol_city:
    | {
        city_code?: string | null;
        region?: string | null;
      }
    | Array<{
        city_code?: string | null;
        region?: string | null;
      }>
    | null;
  size:
    | {
        size_code?: string | null;
      }
    | Array<{
        size_code?: string | null;
      }>
    | null;
  type:
    | {
        type_code?: string | null;
      }
    | Array<{
        type_code?: string | null;
      }>
    | null;
  condition:
    | {
        condition_code?: string | null;
      }
    | Array<{
        condition_code?: string | null;
      }>
    | null;
};

type OneWayPlanSummaryRecord = {
  status: string | null;
  planned_qty: number | null;
  remaining_qty: number | null;
};

type RegionRow = { region: string | null };
type LesseeRow = {
  id: string;
  company_name: string | null;
  legal_company_name: string | null;
  lessee_code: string | null;
};
type DepotRow = { id: string; depot_code: string | null; depot_name: string | null; city_id: string | null };
type CityRow = { id: string; city_code: string | null; city_name: string | null; region: string | null };
type SizeRow = { id: string; size_code: string | null };
type TypeRow = { id: string; type_code: string | null };
type ConditionRow = { id: string; condition_code: string | null };
type ColorRow = { color_code: string | null };
type CityCodeRow = { city_code: string | null };
type OneWayPlanDetailRecord = OneWayPlanRowRecord & {
  arranged_dispatch_date: string | null;
  pickup_charge: number | null;
  free_days: number | null;
  per_diem: number | null;
  dpp: number | null;
  shipper_request_id: string | null;
  remarks: string | null;
};
type OneWayPlanEditRecord = {
  id: string;
  plan_id: string | null;
  status: string | null;
  conversion_status: string | null;
  apply_date: string | null;
  availability_date: string | null;
  arranged_dispatch_date: string | null;
  lessee_id: string | null;
  depot_id: string | null;
  pol_city_id: string | null;
  pod_codes_raw: string | null;
  size_code_id: string | null;
  type_code_id: string | null;
  condition_code_id: string | null;
  color_code: string | null;
  machine_type: string | null;
  planned_qty: number | null;
  authorized_qty: number | null;
  remaining_qty: number | null;
  picked_up_qty: number | null;
  non_picked_up_qty: number | null;
  pickup_charge: number | null;
  free_days: number | null;
  per_diem: number | null;
  dpp: number | null;
  carrier: string | null;
  currency: string | null;
  rv: number | null;
  shipper_request_id: string | null;
  onhire_no: string | null;
  remarks: string | null;
  lessee:
    | {
        company_name?: string | null;
        legal_company_name?: string | null;
        lessee_code?: string | null;
      }
    | Array<{
        company_name?: string | null;
        legal_company_name?: string | null;
        lessee_code?: string | null;
      }>
    | null;
  depot:
    | {
        depot_code?: string | null;
      }
    | Array<{
        depot_code?: string | null;
      }>
    | null;
  pol_city:
    | {
        city_code?: string | null;
      }
    | Array<{
        city_code?: string | null;
      }>
    | null;
  condition:
    | {
        condition_code?: string | null;
      }
    | Array<{
        condition_code?: string | null;
      }>
    | null;
};

type OneWayPlanReleaseSourceRecord = {
  id: string;
  plan_id: string | null;
  status: string | null;
  conversion_status: string | null;
  lessee_id: string | null;
  pod_codes_raw: string | null;
  color_code: string | null;
  machine_type: string | null;
  planned_qty: number | null;
  pickup_charge: number | null;
  free_days: number | null;
  per_diem: number | null;
  dpp: number | null;
  onhire_no: string | null;
  carrier: string | null;
  currency: string | null;
  rv: number | null;
  lessee:
    | {
        company_name?: string | null;
        legal_company_name?: string | null;
        lessee_code?: string | null;
      }
    | Array<{
        company_name?: string | null;
        legal_company_name?: string | null;
        lessee_code?: string | null;
      }>
    | null;
  depot:
    | {
        depot_code?: string | null;
        depot_name?: string | null;
      }
    | Array<{
        depot_code?: string | null;
        depot_name?: string | null;
      }>
    | null;
  pol_city:
    | {
        city_code?: string | null;
        city_name?: string | null;
        region?: string | null;
      }
    | Array<{
        city_code?: string | null;
        city_name?: string | null;
        region?: string | null;
      }>
    | null;
  size:
    | {
        size_code?: string | null;
      }
    | Array<{
        size_code?: string | null;
      }>
    | null;
  type:
    | {
        type_code?: string | null;
      }
    | Array<{
        type_code?: string | null;
      }>
    | null;
  condition:
    | {
        condition_code?: string | null;
      }
    | Array<{
        condition_code?: string | null;
      }>
    | null;
};
type TransferOrderHistoryRecord = {
  id: string;
  order_no: string | null;
  status: string | null;
  release_date: string | null;
  release_qty: number | null;
  pod:
    | {
        city_code?: string | null;
        city_name?: string | null;
      }
    | Array<{
        city_code?: string | null;
        city_name?: string | null;
      }>
    | null;
};
type TransferOutEventHistoryRecord = {
  business_id: string | null;
  container_id: string | null;
};

type ImportLookupBundle = {
  lesseeByKey: Map<string, { id: string; label: string }>;
  defaultCmaLessee: { id: string; label: string } | null;
  cityByCode: Map<string, { id: string; code: string }>;
  depotsByCityId: Map<string, Array<{ id: string; code: string }>>;
  conditionByKey: Map<string, { id: string; code: string }>;
  sizeTypeByKey: Map<string, { sizeCodeId: string; typeCodeId: string; label: string }>;
  validCityCodes: string[];
  validColors: Set<string>;
};

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function normalizeKey(value: string | null | undefined) {
  return normalizeText(value).replace(/[^A-Z0-9]+/gi, "").toUpperCase();
}

function normalizePodCodes(
  value: string | null | undefined,
  validCityCodes: Iterable<string>
) {
  const validCodeSet = new Set(
    Array.from(validCityCodes, (code) => normalizeText(code).toUpperCase()).filter(Boolean)
  );
  const matches = normalizeText(value).toUpperCase().match(/[A-Z]{5}/g) ?? [];
  const uniqueCodes = Array.from(
    new Set(matches.filter((code) => validCodeSet.has(code)))
  ).sort((left, right) => left.localeCompare(right));
  return uniqueCodes.join(" / ");
}

function resolveImportPythonExecutable() {
  const bundled = path.join(
    os.homedir(),
    ".cache",
    "codex-runtimes",
    "codex-primary-runtime",
    "dependencies",
    "python",
    "bin",
    "python3"
  );
  return process.env.EW_ERP_IMPORT_PYTHON || bundled;
}

async function parseOneWayOffersWorkbook(filePath: string) {
  const scriptPath = path.join(process.cwd(), "scripts", "parse_one_way_offers_xlsx.py");
  const pythonExecutable = resolveImportPythonExecutable();
  const { stdout } = await execFileAsync(pythonExecutable, [scriptPath, filePath], {
    cwd: process.cwd(),
    maxBuffer: 10 * 1024 * 1024,
  });
  const parsed = JSON.parse(stdout) as { rows?: OneWayPlanImportPreviewRawRow[] };
  return parsed.rows ?? [];
}

async function getValidCityCodes() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("cities").select("city_code");
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{ city_code: string | null }>)
    .map((row) => normalizeText(row.city_code).toUpperCase())
    .filter(Boolean);
}

async function getImportLookups(): Promise<ImportLookupBundle> {
  const supabase = createServerSupabaseClient();
  const [
    lesseesResult,
    citiesResult,
    depotsResult,
    sizesResult,
    typesResult,
    conditionsResult,
    colorsResult,
  ] = await Promise.all([
    supabase.from("lessees").select("id, company_name, legal_company_name, lessee_code"),
    supabase.from("cities").select("id, city_code"),
    supabase.from("depots").select("id, depot_code, city_id"),
    supabase.from("container_size_codes").select("id, size_code"),
    supabase.from("container_type_codes").select("id, type_code"),
    supabase.from("container_condition_codes").select("id, condition_code"),
    supabase.from("ral_color_codes").select("color_code"),
  ]);

  for (const result of [
    lesseesResult,
    citiesResult,
    depotsResult,
    sizesResult,
    typesResult,
    conditionsResult,
    colorsResult,
  ]) {
    if (result.error) throw new Error(result.error.message);
  }

  const lesseeByKey = new Map<string, { id: string; label: string }>();
  let defaultCmaLessee: { id: string; label: string } | null = null;
  for (const row of (lesseesResult.data ?? []) as LesseeRow[]) {
    const label = buildLesseeLabel(row);
    for (const candidate of [row.company_name, row.legal_company_name, row.lessee_code]) {
      const key = normalizeKey(candidate);
      if (key) lesseeByKey.set(key, { id: row.id, label });
    }
    if (
      !defaultCmaLessee &&
      [row.company_name, row.legal_company_name]
        .map((value) => normalizeKey(value))
        .some((value) => value.includes("CMA"))
    ) {
      defaultCmaLessee = { id: row.id, label };
    }
  }

  const cityByCode = new Map<string, { id: string; code: string }>();
  for (const row of (citiesResult.data ?? []) as Array<{ id: string; city_code: string | null }>) {
    const code = normalizeText(row.city_code).toUpperCase();
    if (!code) continue;
    cityByCode.set(code, { id: row.id, code });
  }

  const depotsByCityId = new Map<string, Array<{ id: string; code: string }>>();
  for (const row of (depotsResult.data ?? []) as Array<{ id: string; depot_code: string | null; city_id: string | null }>) {
    const cityId = normalizeText(row.city_id);
    if (!cityId) continue;
    const bucket = depotsByCityId.get(cityId) ?? [];
    bucket.push({ id: row.id, code: normalizeText(row.depot_code) || row.id });
    depotsByCityId.set(cityId, bucket);
  }

  const conditionByKey = new Map<string, { id: string; code: string }>();
  for (const row of (conditionsResult.data ?? []) as ConditionRow[]) {
    const code = normalizeText(row.condition_code);
    const exactKey = normalizeKey(code);
    if (exactKey) conditionByKey.set(exactKey, { id: row.id, code });
  }
  const brandNew = Array.from(conditionByKey.entries()).find((entry) => entry[1].code === "Brand New");
  if (brandNew) {
    conditionByKey.set("NEW", brandNew[1]);
    conditionByKey.set("BRANDNEW", brandNew[1]);
  }

  const sizeTypeByKey = new Map<string, { sizeCodeId: string; typeCodeId: string; label: string }>();
  const sizes = (sizesResult.data ?? []) as SizeRow[];
  const types = (typesResult.data ?? []) as TypeRow[];
  for (const size of sizes) {
    const sizeCode = normalizeText(size.size_code);
    if (!sizeCode) continue;
    for (const type of types) {
      const typeCode = normalizeText(type.type_code);
      if (!typeCode) continue;
      const value = {
        sizeCodeId: size.id,
        typeCodeId: type.id,
        label: `${sizeCode}${typeCode}`,
      };
      sizeTypeByKey.set(normalizeKey(`${sizeCode}${typeCode}`), value);
    }
  }

  for (const [key, target] of [
    ["20STANDARD", "20GP"],
    ["40STANDARD", "40GP"],
    ["45STANDARD", "45GP"],
    ["53STANDARD", "53GP"],
    ["40HIGHCUBE", "40HQ"],
    ["45HIGHCUBE", "45HQ"],
    ["40HIGHCUBEOPENSIDE", "40HCOS"],
    ["40OPENSIDE", "40OS"],
    ["20OPENSIDE", "20OS"],
    ["20GP", "20GP"],
    ["40GP", "40GP"],
    ["40HQ", "40HQ"],
    ["40HCOS", "40HCOS"],
    ["40HCFOS", "40HCFOS"],
  ] as const) {
    const resolved = sizeTypeByKey.get(normalizeKey(target));
    if (resolved) sizeTypeByKey.set(key, resolved);
  }

  const validCityCodes = Array.from(cityByCode.keys()).sort((left, right) => left.localeCompare(right));
  const validColors = new Set(
    ((colorsResult.data ?? []) as ColorRow[])
      .map((row) => normalizeText(row.color_code).toUpperCase())
      .filter(Boolean)
  );

  return {
    lesseeByKey,
    defaultCmaLessee,
    cityByCode,
    depotsByCityId,
    conditionByKey,
    sizeTypeByKey,
    validCityCodes,
    validColors,
  };
}

function validateImportStatus(rawStatus: string) {
  const normalized = normalizeKey(rawStatus);
  switch (normalized) {
    case "SUBMITTED":
      return "SUBMITTED" as const;
    case "APPROVED":
      return "APPROVED" as const;
    case "REJECTED":
      return "REJECTED" as const;
    case "HOLD":
      return "HOLD" as const;
    case "COMPLETED":
      return "COMPLETED" as const;
    case "CANCELLED":
      return "CANCELLED" as const;
    default:
      return null;
  }
}

async function getExistingOneWayPlanLesseeRequestIds(requestIds: string[]) {
  const uniqueIds = Array.from(new Set(requestIds.map((value) => normalizeText(value)).filter(Boolean)));
  if (uniqueIds.length === 0) return new Set<string>();

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("one_way_plan")
    .select("shipper_request_id")
    .in("shipper_request_id", uniqueIds);

  if (error) throw new Error(error.message);

  return new Set(
    (((data ?? []) as Array<{ shipper_request_id: string | null }>))
      .map((row) => normalizeText(row.shipper_request_id))
      .filter(Boolean)
  );
}

function buildImportPreviewRow(
  raw: OneWayPlanImportPreviewRawRow,
  lookups: ImportLookupBundle,
  options: {
    existingOfferIds: Set<string>;
    seenOfferIdsInWorkbook: Set<string>;
  }
): OneWayPlanImportPreviewRow {
  const errors: string[] = [];
  const normalizedOfferId = normalizeText(raw.offerId);
  if (!normalizedOfferId) errors.push("Offer ID is required");

  const status = validateImportStatus(raw.status);
  if (!status) errors.push(`Unsupported status: ${raw.status || "-"}`);

  const lessee = lookups.defaultCmaLessee;
  if (!lessee) errors.push("Default CMA lessee not found in system master.");

  const polCode = normalizeText(raw.pol).toUpperCase();
  const pol = lookups.cityByCode.get(polCode);
  if (!pol) errors.push(`POL not found: ${raw.pol || "-"}`);

  let depot: { id: string; code: string } | null = null;
  let depotCandidates: Array<{ id: string; code: string }> = [];
  let canChooseDepot = false;
  if (pol) {
    depotCandidates = lookups.depotsByCityId.get(pol.id) ?? [];
    if (depotCandidates.length === 1) {
      depot = depotCandidates[0];
    } else if (depotCandidates.length > 1) {
      canChooseDepot = true;
    }
  }

  const normalizedPod = normalizePodCodes(raw.pod, lookups.validCityCodes);
  if (!normalizedPod) errors.push("POD does not contain valid City Codes");

  const sizeType = lookups.sizeTypeByKey.get(normalizeKey(raw.sizeType));
  if (!sizeType) errors.push(`Size/Type not mapped: ${raw.sizeType || "-"}`);

  const condition = lookups.conditionByKey.get(normalizeKey(raw.condition));
  if (!condition) errors.push(`Condition not mapped: ${raw.condition || "-"}`);

  const normalizedColor = normalizeText(raw.color).toUpperCase();
  if (normalizedColor && !lookups.validColors.has(normalizedColor)) {
    errors.push(`Color not found: ${raw.color}`);
  }

  if (!Number.isFinite(raw.quantity) || raw.quantity <= 0) errors.push("Quantity must be greater than 0");
  for (const [label, value] of [
    ["Authorized Qty", raw.authorizedQty],
    ["Remaining Qty", raw.remainingQty],
    ["Picked Up Qty", raw.pickedUpQty],
    ["Non Picked Up Qty", raw.nonPickedUpQty],
    ["Pick-up Charge", raw.pickupCharge],
    ["Free Days", raw.freeDays],
    ["Per Diem", raw.perDiem],
    ["DPP", raw.dpp],
  ] as const) {
    if (!Number.isFinite(value) || value < 0) errors.push(`${label} must be 0 or greater`);
  }

  let willImport = true;
  let skipReason: string | null = null;
  if (normalizedOfferId) {
    if (options.existingOfferIds.has(normalizedOfferId)) {
      willImport = false;
      skipReason = "Already imported; will be skipped";
    } else if (options.seenOfferIdsInWorkbook.has(normalizedOfferId)) {
      willImport = false;
      skipReason = "Duplicate Offer ID in workbook; will be skipped";
    } else {
      options.seenOfferIdsInWorkbook.add(normalizedOfferId);
    }
  }

  const depotMessage = canChooseDepot
    ? "Select depot if available"
    : pol && depotCandidates.length === 0
      ? "Depot can be assigned later"
      : null;
  const validationResult =
    errors.length > 0
      ? `${errors.join(" | ")}${depotMessage ? ` | ${depotMessage}` : ""}`
      : skipReason
        ? `${skipReason}${depotMessage ? ` | ${depotMessage}` : ""}`
        : depotMessage ?? "Valid";

  return {
    rowNo: raw.rowNo,
    sheetName: raw.sheetName,
    status: raw.status,
    offerId: raw.offerId,
    statusDate: raw.statusDate,
    applyDate: raw.applyDate,
    availabilityDate: raw.availabilityDate,
    lessee: lessee?.label ?? raw.lessee,
    depotCandidates,
    selectedDepotId: depot?.id ?? null,
    selectedDepotCode: depot?.code ?? null,
    canChooseDepot,
    depotCode: depot?.code ?? "",
    pol: polCode,
    pod: normalizedPod,
    sizeType: sizeType?.label ?? raw.sizeType,
    condition: condition?.code ?? raw.condition,
    color: normalizedColor,
    machineType: normalizeText(raw.machineType) || "",
    quantity: raw.quantity,
    authorizedQty: raw.authorizedQty,
    remainingQty: raw.remainingQty,
    pickedUpQty: raw.pickedUpQty,
    nonPickedUpQty: raw.nonPickedUpQty,
    pickupCharge: raw.pickupCharge,
    freeDays: raw.freeDays,
    perDiem: raw.perDiem,
    dpp: raw.dpp,
    shipperRequestId: normalizedOfferId,
    onhireNo: raw.onhireNo,
    remarks: raw.remarks,
    validationResult,
    isValid: errors.length === 0,
    willImport,
    skipReason,
    errors,
    prepared:
      errors.length === 0 && status && lessee && pol && sizeType && condition
        ? {
            status,
            applyDate: raw.applyDate || raw.statusDate,
            availabilityDate: raw.availabilityDate,
            lesseeId: lessee.id,
            depotId: depot?.id ?? null,
            polCityId: pol.id,
            pod: normalizedPod,
            sizeCodeId: sizeType.sizeCodeId,
            typeCodeId: sizeType.typeCodeId,
            conditionCodeId: condition.id,
            color: normalizedColor || null,
            machineType: normalizeText(raw.machineType) || null,
            quantity: raw.quantity,
            authorizedQty: raw.authorizedQty,
            remainingQty: raw.remainingQty,
            pickedUpQty: raw.pickedUpQty,
            nonPickedUpQty: raw.nonPickedUpQty,
            pickupCharge: raw.pickupCharge,
            freeDays: raw.freeDays,
            perDiem: raw.perDiem,
            dpp: raw.dpp,
            carrier: "CMA",
            currency: "USD",
            rv: 0,
            shipperRequestId: normalizedOfferId,
            onhireNo: raw.onhireNo,
            remarks: raw.remarks,
            sourceSheetName: raw.sheetName,
            sourceRowNumber: raw.rowNo,
          }
        : null,
  };
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function buildSizeTypeLabel(sizeCode: string | null | undefined, typeCode: string | null | undefined) {
  return `${normalizeText(sizeCode)}${normalizeText(typeCode)}` || "-";
}

function buildLesseeLabel(row: {
  company_name?: string | null;
  legal_company_name?: string | null;
  lessee_code?: string | null;
} | null) {
  if (!row) return "-";
  return (
    normalizeText(row.company_name) ||
    normalizeText(row.legal_company_name) ||
    normalizeText(row.lessee_code) ||
    "-"
  );
}

function computeShortfall(plannedQty: number | null | undefined, remainingQty: number | null | undefined) {
  return Math.max((plannedQty ?? 0) - (remainingQty ?? 0), 0);
}

function computePlanningShortfall(
  plannedQty: number | null | undefined,
  matchedQty: number | null | undefined,
  releasedQty: number | null | undefined
) {
  return Math.max((plannedQty ?? 0) - (matchedQty ?? 0) - (releasedQty ?? 0), 0);
}

function normalizeConversionStatus(
  value: string | null | undefined
): OneWayPlanConversionStatus {
  return normalizeText(value).toUpperCase() === "CONVERTED" ? "CONVERTED" : "OPEN";
}

function buildSelectColumns() {
  return `
    id,
    plan_id,
    status,
    conversion_status,
    shipper_request_id,
    apply_date,
    availability_date,
    pod_codes_raw,
    color_code,
    machine_type,
    planned_qty,
    authorized_qty,
    remaining_qty,
    picked_up_qty,
    non_picked_up_qty,
    onhire_no,
    carrier,
    currency,
    rv,
    lessee:lessees!one_way_plan_lessee_id_fkey(company_name, legal_company_name, lessee_code),
    depot:depots!one_way_plan_depot_id_fkey(depot_code),
    pol_city:cities!one_way_plan_pol_city_id_fkey(city_code, region),
    size:container_size_codes!one_way_plan_size_code_id_fkey(size_code),
    type:container_type_codes!one_way_plan_type_code_id_fkey(type_code),
    condition:container_condition_codes!one_way_plan_condition_code_id_fkey(condition_code)
  `;
}

function buildDetailSelectColumns() {
  return `
    id,
    plan_id,
    status,
    conversion_status,
    apply_date,
    availability_date,
    arranged_dispatch_date,
    pod_codes_raw,
    color_code,
    machine_type,
    planned_qty,
    authorized_qty,
    remaining_qty,
    picked_up_qty,
    non_picked_up_qty,
    pickup_charge,
    free_days,
    per_diem,
    dpp,
    carrier,
    currency,
    rv,
    shipper_request_id,
    onhire_no,
    remarks,
    lessee:lessees!one_way_plan_lessee_id_fkey(company_name, legal_company_name, lessee_code),
    depot:depots!one_way_plan_depot_id_fkey(depot_code),
    pol_city:cities!one_way_plan_pol_city_id_fkey(city_code, region),
    size:container_size_codes!one_way_plan_size_code_id_fkey(size_code),
    type:container_type_codes!one_way_plan_type_code_id_fkey(type_code),
    condition:container_condition_codes!one_way_plan_condition_code_id_fkey(condition_code)
  `;
}

function buildEditSelectColumns() {
  return `
    id,
    plan_id,
    status,
    conversion_status,
    apply_date,
    availability_date,
    arranged_dispatch_date,
    lessee_id,
    depot_id,
    pol_city_id,
    pod_codes_raw,
    size_code_id,
    type_code_id,
    condition_code_id,
    color_code,
    machine_type,
    planned_qty,
    authorized_qty,
    remaining_qty,
    picked_up_qty,
    non_picked_up_qty,
    pickup_charge,
    free_days,
    per_diem,
    dpp,
    carrier,
    currency,
    rv,
    shipper_request_id,
    onhire_no,
    remarks,
    lessee:lessees!one_way_plan_lessee_id_fkey(company_name, legal_company_name, lessee_code),
    depot:depots!one_way_plan_depot_id_fkey(depot_code),
    pol_city:cities!one_way_plan_pol_city_id_fkey(city_code),
    condition:container_condition_codes!one_way_plan_condition_code_id_fkey(condition_code)
  `;
}

function applySort(query: any, sortBy: OneWayPlanManagementSortBy, sortDirection: "asc" | "desc") {
  const ascending = sortDirection === "asc";
  switch (sortBy) {
    case "planId":
      return query.order("plan_id", { ascending }).order("created_at", { ascending: false });
    case "status":
      return query.order("status", { ascending }).order("created_at", { ascending: false });
    case "availabilityDate":
      return query.order("availability_date", { ascending }).order("created_at", { ascending: false });
    case "quantity":
      return query.order("planned_qty", { ascending }).order("created_at", { ascending: false });
    case "remainingQty":
      return query.order("remaining_qty", { ascending }).order("created_at", { ascending: false });
    case "onhireNo":
      return query.order("onhire_no", { ascending }).order("created_at", { ascending: false });
    case "applyDate":
    case "shortfall":
    default:
      return query.order("apply_date", { ascending }).order("created_at", { ascending: false });
  }
}

async function resolveRegionCityIds(region: string) {
  const normalizedRegion = normalizeText(region);
  if (!normalizedRegion) return null;

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("cities")
    .select("id")
    .eq("region", normalizedRegion);

  if (error) throw new Error(error.message);

  return ((data ?? []) as Array<{ id: string }>).map((row) => row.id);
}

type ResolvedOneWayPlanFilters = OneWayPlanManagementQuery & {
  regionCityIds: string[] | null;
};

function applyFilters(query: any, filters: ResolvedOneWayPlanFilters) {
  let next = query;

  if (filters.region) {
    const cityIds = filters.regionCityIds;
    if (!cityIds || cityIds.length === 0) {
      next = next.in("pol_city_id", ["00000000-0000-0000-0000-000000000000"]);
    } else {
      next = next.in("pol_city_id", cityIds);
    }
  }

  if (filters.status) next = next.eq("status", filters.status);
  if (filters.lesseeId) next = next.eq("lessee_id", filters.lesseeId);
  if (filters.shipperRequestId) {
    next = next.ilike("shipper_request_id", `%${filters.shipperRequestId.trim()}%`);
  }
  if (filters.depotId) next = next.eq("depot_id", filters.depotId);
  if (filters.polCityId) next = next.eq("pol_city_id", filters.polCityId);
  if (filters.podContains) next = next.ilike("pod_codes_raw", `%${filters.podContains.trim()}%`);
  if (filters.conditionId) next = next.eq("condition_code_id", filters.conditionId);
  if (filters.color) next = next.eq("color_code", filters.color);
  if (filters.machineType) next = next.ilike("machine_type", `%${filters.machineType.trim()}%`);
  if (filters.onhireNo) next = next.ilike("onhire_no", `%${filters.onhireNo.trim()}%`);
  if (filters.applyDateFrom) next = next.gte("apply_date", filters.applyDateFrom);
  if (filters.applyDateTo) next = next.lte("apply_date", filters.applyDateTo);
  if (filters.availabilityDateFrom) {
    next = next.gte("availability_date", filters.availabilityDateFrom);
  }
  if (filters.availabilityDateTo) next = next.lte("availability_date", filters.availabilityDateTo);

  if (filters.sizeType) {
    const [sizeId, typeId] = filters.sizeType.split("::");
    if (sizeId && typeId) {
      next = next.eq("size_code_id", sizeId).eq("type_code_id", typeId);
    }
  }

  return next;
}

function mapRow(row: OneWayPlanRowRecord): OneWayPlanManagementRow {
  const lessee = first(row.lessee);
  const depot = first(row.depot);
  const polCity = first(row.pol_city);
  const size = first(row.size);
  const type = first(row.type);
  const condition = first(row.condition);

  return {
    id: row.id,
    planId: normalizeText(row.plan_id) || "-",
    status: (normalizeText(row.status) || "SUBMITTED") as OneWayPlanStatus,
    conversionStatus: normalizeConversionStatus(row.conversion_status),
    shipperRequestId: normalizeText(row.shipper_request_id) || "-",
    applyDate: row.apply_date,
    availabilityDate: row.availability_date,
    lesseeLabel: buildLesseeLabel(lessee),
    depotCode: normalizeText(depot?.depot_code) || "-",
    polCode: normalizeText(polCity?.city_code) || "-",
    pod: normalizeText(row.pod_codes_raw) || "-",
    sizeType: buildSizeTypeLabel(size?.size_code, type?.type_code),
    condition: normalizeText(condition?.condition_code) || "-",
    color: normalizeText(row.color_code) || "-",
    machineType: normalizeText(row.machine_type) || "-",
    quantity: row.planned_qty ?? 0,
    authorizedQty: row.authorized_qty ?? 0,
    remainingQty: row.remaining_qty ?? 0,
    pickedUpQty: row.picked_up_qty ?? 0,
    nonPickedUpQty: row.non_picked_up_qty ?? 0,
    shortfall: computeShortfall(row.planned_qty, row.remaining_qty),
    onhireNo: normalizeText(row.onhire_no) || "-",
    region: normalizeText(polCity?.region) || "-",
    carrier: normalizeText(row.carrier) || "-",
    currency: normalizeText(row.currency) || "-",
    rv: row.rv ?? 0,
  };
}

function displayReleaseStatus(status: string | null | undefined) {
  switch (normalizeText(status).toUpperCase()) {
    case "CREATED":
    case "IN_TRANSIT":
      return "Submitted";
    case "ON_HOLD":
      return "On hold";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return normalizeText(status) || "-";
  }
}

function parsePodCandidates(value: string | null | undefined) {
  return normalizeText(value)
    .split("/")
    .map((segment) => normalizeText(segment).toUpperCase())
    .filter(Boolean);
}

function formatCityLabel(row: { city_code?: string | null; city_name?: string | null } | null) {
  if (!row) return "-";
  const code = normalizeText(row.city_code);
  const name = normalizeText(row.city_name);
  if (code && name) return `${code} · ${name}`;
  return code || name || "-";
}

function mapReleaseHistory(
  rows: TransferOrderHistoryRecord[],
  pickedUpCounts: Map<string, number>
): OneWayPlanReleaseHistoryRow[] {
  return rows.map((row) => {
    const releaseQty = row.release_qty ?? 0;
    const pu = pickedUpCounts.get(row.id) ?? 0;
    return {
      id: row.id,
      releaseNumber: normalizeText(row.order_no) || "-",
      releaseStatus: displayReleaseStatus(row.status),
      releaseDate: row.release_date,
      pod: formatCityLabel(first(row.pod)),
      releaseQty,
      pu,
      npu: Math.max(0, releaseQty - pu),
    };
  });
}

export async function getOneWayPlanManagement(
  params: Partial<OneWayPlanManagementQuery> = {}
): Promise<OneWayPlanManagementResult> {
  noStore();

  const filters: OneWayPlanManagementQuery = {
    ...EMPTY_ONE_WAY_PLAN_QUERY,
    ...params,
    page: Math.max(1, Number(params.page ?? EMPTY_ONE_WAY_PLAN_QUERY.page)),
    pageSize: Math.max(1, Number(params.pageSize ?? EMPTY_ONE_WAY_PLAN_QUERY.pageSize)),
    sortBy: (params.sortBy ?? EMPTY_ONE_WAY_PLAN_QUERY.sortBy) as OneWayPlanManagementSortBy,
    sortDirection: (params.sortDirection ??
      EMPTY_ONE_WAY_PLAN_QUERY.sortDirection) as "asc" | "desc",
  };

  const regionCityIds = filters.region ? await resolveRegionCityIds(filters.region) : null;
  const resolvedFilters: ResolvedOneWayPlanFilters = {
    ...filters,
    regionCityIds,
  };

  const supabase = createServerSupabaseClient();

  let dataQuery = supabase
    .from("one_way_plan")
    .select(buildSelectColumns(), { count: "exact" })
    .eq("conversion_status", "OPEN");

  dataQuery = applyFilters(dataQuery, resolvedFilters);
  dataQuery = applySort(dataQuery, resolvedFilters.sortBy, resolvedFilters.sortDirection);

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  const [{ data, count, error }, summaryResult] = await Promise.all([
    dataQuery.range(from, to),
    (async () => {
      let summaryQuery = supabase
        .from("one_way_plan")
        .select("status, planned_qty, remaining_qty")
        .eq("conversion_status", "OPEN");
      summaryQuery = applyFilters(summaryQuery, resolvedFilters);
      return summaryQuery;
    })(),
  ]);

  if (error) throw new Error(error.message);
  if (summaryResult.error) throw new Error(summaryResult.error.message);

  const rows = (((data ?? []) as unknown) as OneWayPlanRowRecord[]).map(mapRow);
  const summaryRows = ((summaryResult.data ?? []) as unknown) as OneWayPlanSummaryRecord[];

  return {
    rows,
    totalCount: count ?? 0,
    page: filters.page,
    pageSize: filters.pageSize,
    filters,
    summary: {
      totalPlans: count ?? 0,
      approvedPlans: summaryRows.filter((row) => normalizeText(row.status) === "APPROVED").length,
      onHoldPlans: summaryRows.filter((row) => normalizeText(row.status) === "HOLD").length,
      totalShortfallQty: summaryRows.reduce(
        (sum, row) => sum + computeShortfall(row.planned_qty, row.remaining_qty),
        0
      ),
    },
  };
}

export async function getOneWayPlanDetail(planId: string): Promise<OneWayPlanDetail | null> {
  noStore();

  const normalizedPlanId = normalizeText(planId);
  if (!normalizedPlanId) return null;

  const supabase = createServerSupabaseClient();
  const { data: detailRow, error } = await supabase
    .from("one_way_plan")
    .select(buildDetailSelectColumns())
    .eq("id", normalizedPlanId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!detailRow) return null;

  const row = detailRow as unknown as OneWayPlanDetailRecord;
  const lessee = first(row.lessee);
  const depot = first(row.depot);
  const polCity = first(row.pol_city);
  const size = first(row.size);
  const type = first(row.type);
  const condition = first(row.condition);
  const sizeType = buildSizeTypeLabel(size?.size_code, type?.type_code);
  const conditionCode = normalizeText(condition?.condition_code) || "-";
  const polCode = normalizeText(polCity?.city_code) || "-";
  const depotCode = normalizeText(depot?.depot_code) || "-";
  const region = normalizeText(polCity?.region) || "-";
  const color = normalizeText(row.color_code) || "-";
  const machineType = normalizeText(row.machine_type) || "-";

  const [matchedRows, transferOrdersResult] = await Promise.all([
    depotCode === "-"
      ? Promise.resolve([])
      : getDispatchReleaseSelectableContainers({
          region,
          city: polCode,
          depot: depotCode,
          sizeType,
          condition: conditionCode,
          color,
          machineType,
        }),
    supabase
      .from("transfer_order")
      .select(
        `
          id,
          order_no,
          status,
          release_date,
          release_qty,
          pod:cities!transfer_order_pod_city_id_fkey(city_code, city_name)
        `
      )
      .eq("one_way_plan_id", normalizedPlanId)
      .order("created_at", { ascending: false }),
  ]);

  if (transferOrdersResult.error) throw new Error(transferOrdersResult.error.message);

  const releaseRows = ((transferOrdersResult.data ?? []) as unknown) as TransferOrderHistoryRecord[];
  const releaseIds = releaseRows.map((release) => release.id).filter(Boolean);
  const transferOutEventsResult =
    releaseIds.length === 0
      ? { data: [] as TransferOutEventHistoryRecord[], error: null }
      : await supabase
          .from("container_event")
          .select("business_id, container_id")
          .eq("business_type", "TRANSFER")
          .eq("event_type", "TRANSFER_OUT")
          .eq("is_void", false)
          .in("business_id", releaseIds);

  if (transferOutEventsResult.error) {
    throw new Error(transferOutEventsResult.error.message);
  }

  const transferOutEvents =
    ((transferOutEventsResult.data ?? []) as unknown) as TransferOutEventHistoryRecord[];
  const pickedUpCounts = new Map<string, number>();
  for (const event of transferOutEvents) {
    const businessId = normalizeText(event.business_id);
    const containerId = normalizeText(event.container_id);
    if (!businessId || !containerId) continue;
    pickedUpCounts.set(businessId, (pickedUpCounts.get(businessId) ?? 0) + 1);
  }

  const releasedQty = releaseRows
    .filter((release) => normalizeText(release.status).toUpperCase() !== "CANCELLED")
    .reduce((sum, release) => sum + (release.release_qty ?? 0), 0);
  const matchedQty = matchedRows.length;

  return {
    id: row.id,
    planId: normalizeText(row.plan_id) || "-",
    status: (normalizeText(row.status) || "SUBMITTED") as OneWayPlanStatus,
    conversionStatus: normalizeConversionStatus(row.conversion_status),
    applyDate: row.apply_date,
    availabilityDate: row.availability_date,
    arrangedDispatchDate: row.arranged_dispatch_date,
    lesseeLabel: buildLesseeLabel(lessee),
    depotCode,
    polCode,
    pod: normalizeText(row.pod_codes_raw) || "-",
    sizeType,
    condition: conditionCode,
    color,
    machineType,
    onhireNo: normalizeText(row.onhire_no) || "-",
    shipperRequestId: normalizeText(row.shipper_request_id) || "-",
    quantity: row.planned_qty ?? 0,
    authorizedQty: row.authorized_qty ?? 0,
    remainingQty: row.remaining_qty ?? 0,
    pickedUpQty: row.picked_up_qty ?? 0,
    nonPickedUpQty: row.non_picked_up_qty ?? 0,
    matchedQty,
    releasedQty,
    shortfall: computePlanningShortfall(row.planned_qty, matchedQty, releasedQty),
    pickupCharge: row.pickup_charge ?? 0,
    freeDays: row.free_days ?? 0,
    perDiem: row.per_diem ?? 0,
    dpp: row.dpp ?? 0,
    carrier: normalizeText(row.carrier) || "-",
    currency: normalizeText(row.currency) || "-",
    rv: row.rv ?? 0,
    remarks: normalizeText(row.remarks) || "-",
    region,
    releaseHistory: mapReleaseHistory(releaseRows, pickedUpCounts),
  };
}

export async function getOneWayPlanEditDraft(planId: string): Promise<OneWayPlanEditDraft | null> {
  noStore();

  const normalizedPlanId = normalizeText(planId);
  if (!normalizedPlanId) return null;

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("one_way_plan")
    .select(buildEditSelectColumns())
    .eq("id", normalizedPlanId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as unknown as OneWayPlanEditRecord;
  const releaseResult = await supabase
    .from("transfer_order")
    .select("id, status, release_qty")
    .eq("one_way_plan_id", normalizedPlanId);

  if (releaseResult.error) throw new Error(releaseResult.error.message);

  const releaseRows = (releaseResult.data ?? []) as Array<{
    id: string | null;
    status: string | null;
    release_qty: number | null;
  }>;
  const activeReleaseQty = releaseRows
    .filter((release) => normalizeText(release.status).toUpperCase() !== "CANCELLED")
    .reduce((sum, release) => sum + (release.release_qty ?? 0), 0);

  return {
    id: row.id,
    planId: normalizeText(row.plan_id) || "-",
    status: (normalizeText(row.status) || "SUBMITTED") as OneWayPlanStatus,
    conversionStatus: normalizeConversionStatus(row.conversion_status),
    applyDate: normalizeText(row.apply_date),
    availabilityDate: normalizeText(row.availability_date),
    arrangedDispatchDate: normalizeText(row.arranged_dispatch_date),
    lesseeId: normalizeText(row.lessee_id),
    lesseeLabel: buildLesseeLabel(first(row.lessee)),
    onhireNo: normalizeText(row.onhire_no),
    shipperRequestId: normalizeText(row.shipper_request_id),
    depotId: normalizeText(row.depot_id),
    depotCode: normalizeText(first(row.depot)?.depot_code) || "-",
    polCityId: normalizeText(row.pol_city_id),
    polCode: normalizeText(first(row.pol_city)?.city_code) || "-",
    pod: normalizeText(row.pod_codes_raw),
    sizeCodeId: normalizeText(row.size_code_id),
    typeCodeId: normalizeText(row.type_code_id),
    conditionCodeId: normalizeText(row.condition_code_id),
    condition: normalizeText(first(row.condition)?.condition_code) || "-",
    color: normalizeText(row.color_code),
    machineType: normalizeText(row.machine_type),
    quantity: row.planned_qty ?? 0,
    authorizedQty: row.authorized_qty ?? 0,
    remainingQty: row.remaining_qty ?? 0,
    pickedUpQty: row.picked_up_qty ?? 0,
    nonPickedUpQty: row.non_picked_up_qty ?? 0,
    pickupCharge: row.pickup_charge ?? 0,
    freeDays: row.free_days ?? 0,
    perDiem: row.per_diem ?? 0,
    dpp: row.dpp ?? 0,
    carrier: normalizeText(row.carrier),
    currency: normalizeText(row.currency) || "USD",
    rv: row.rv ?? 0,
    remarks: normalizeText(row.remarks),
    releasedQty: activeReleaseQty,
    hasRelease: releaseRows.length > 0,
  };
}

export async function getOneWayPlanReleaseSourceDetail(
  planId: string
): Promise<OneWayPlanReleaseSourceDetail | null> {
  noStore();

  const normalizedPlanId = normalizeText(planId);
  if (!normalizedPlanId) return null;

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("one_way_plan")
    .select(
      `
        id,
        plan_id,
        status,
        conversion_status,
        lessee_id,
        pod_codes_raw,
        color_code,
        machine_type,
        planned_qty,
        pickup_charge,
        free_days,
        per_diem,
        dpp,
        onhire_no,
        carrier,
        currency,
        rv,
        lessee:lessees!one_way_plan_lessee_id_fkey(company_name, legal_company_name, lessee_code),
        depot:depots!one_way_plan_depot_id_fkey(depot_code, depot_name),
        pol_city:cities!one_way_plan_pol_city_id_fkey(city_code, city_name, region),
        size:container_size_codes!one_way_plan_size_code_id_fkey(size_code),
        type:container_type_codes!one_way_plan_type_code_id_fkey(type_code),
        condition:container_condition_codes!one_way_plan_condition_code_id_fkey(condition_code)
      `
    )
    .eq("id", normalizedPlanId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as unknown as OneWayPlanReleaseSourceRecord;
  const lessee = first(row.lessee);
  const depot = first(row.depot);
  const polCity = first(row.pol_city);
  const size = first(row.size);
  const type = first(row.type);
  const condition = first(row.condition);
  const region = normalizeText(polCity?.region) || "-";
  const cityCode = normalizeText(polCity?.city_code) || "-";
  const depotCode = normalizeText(depot?.depot_code) || "-";
  const sizeType = buildSizeTypeLabel(size?.size_code, type?.type_code);
  const conditionCode = normalizeText(condition?.condition_code) || "-";
  const color = normalizeText(row.color_code) || "-";
  const machineType = normalizeText(row.machine_type) || "-";

  return {
    id: row.id,
    planId: normalizeText(row.plan_id) || "-",
    status: (normalizeText(row.status) || "SUBMITTED") as OneWayPlanStatus,
    conversionStatus: normalizeConversionStatus(row.conversion_status),
    lesseeId: normalizeText(row.lessee_id),
    lesseeLabel: buildLesseeLabel(lessee),
    region,
    cityCode,
    depotCode,
    depotName: normalizeText(depot?.depot_name) || "-",
    sizeType,
    condition: conditionCode,
    color,
    machineType,
    quantity: row.planned_qty ?? 0,
    carrier: normalizeText(row.carrier),
    currency: normalizeText(row.currency) || "USD",
    pickupCharge: row.pickup_charge ?? 0,
    dpp: row.dpp ?? 0,
    freeDays: row.free_days ?? 0,
    rv: row.rv ?? 0,
    dailyRent: row.per_diem ?? 0,
    onhireNo: normalizeText(row.onhire_no),
    pod: normalizeText(row.pod_codes_raw),
    podCandidates: parsePodCandidates(row.pod_codes_raw),
    bucketId: [region, cityCode, depotCode, sizeType, conditionCode, color, machineType].join("|"),
  };
}

export async function getOneWayPlanFilterOptions(): Promise<OneWayPlanFilterOptions> {
  noStore();

  const supabase = createServerSupabaseClient();
  const [
    regionsResult,
    lesseesResult,
    depotsResult,
    citiesResult,
    sizesResult,
    typesResult,
    conditionsResult,
    colorsResult,
    machineTypesResult,
  ] = await Promise.all([
    supabase.from("cities").select("region").not("region", "is", null).order("region", { ascending: true }),
    supabase
      .from("lessees")
      .select("id, company_name, legal_company_name, lessee_code")
      .order("company_name", { ascending: true }),
    supabase
      .from("depots")
      .select("id, depot_code, depot_name, city_id")
      .order("depot_code", { ascending: true }),
    supabase.from("cities").select("id, city_code, city_name, region").order("city_code", { ascending: true }),
    supabase.from("container_size_codes").select("id, size_code").order("size_code", { ascending: true }),
    supabase.from("container_type_codes").select("id, type_code").order("type_code", { ascending: true }),
    supabase
      .from("container_condition_codes")
      .select("id, condition_code")
      .order("condition_code", { ascending: true }),
    supabase.from("ral_color_codes").select("color_code").order("color_code", { ascending: true }),
    supabase
      .from("one_way_plan")
      .select("machine_type")
      .not("machine_type", "is", null)
      .order("machine_type", { ascending: true }),
  ]);

  for (const result of [
    regionsResult,
    lesseesResult,
    depotsResult,
    citiesResult,
    sizesResult,
    typesResult,
    conditionsResult,
    colorsResult,
    machineTypesResult,
  ]) {
    if (result.error) throw new Error(result.error.message);
  }

  const regionOptions = Array.from(
    new Set(
      ((((regionsResult.data ?? []) as unknown) as RegionRow[]))
        .map((row) => normalizeText(row.region))
        .filter(Boolean)
    )
  ).map<OneWayPlanAutocompleteOption>((region) => ({
    value: region,
    label: region,
    searchText: region,
  }));

  const lesseeOptions = ((((lesseesResult.data ?? []) as unknown) as LesseeRow[])).map<OneWayPlanAutocompleteOption>(
    (row) => ({
      value: row.id,
      label:
        normalizeText(row.company_name) ||
        normalizeText(row.legal_company_name) ||
        normalizeText(row.lessee_code) ||
        row.id,
      secondaryLabel: normalizeText(row.lessee_code) || undefined,
      searchText: `${row.company_name ?? ""} ${row.legal_company_name ?? ""} ${
        row.lessee_code ?? ""
      }`.trim(),
    })
  );

  const depotOptions = ((((depotsResult.data ?? []) as unknown) as DepotRow[])).map<OneWayPlanAutocompleteOption>(
    (row) => ({
      value: row.id,
      label: normalizeText(row.depot_code) || row.id,
      secondaryLabel: normalizeText(row.depot_name) || undefined,
      searchText: `${row.depot_code ?? ""} ${row.depot_name ?? ""}`.trim(),
    })
  );

  const polCityOptions = ((((citiesResult.data ?? []) as unknown) as CityRow[])).map<OneWayPlanAutocompleteOption>(
    (row) => ({
      value: row.id,
      label: normalizeText(row.city_code) || row.id,
      secondaryLabel: normalizeText(row.city_name) || undefined,
      searchText: `${row.city_code ?? ""} ${row.city_name ?? ""} ${row.region ?? ""}`.trim(),
    })
  );

  const sizes = ((sizesResult.data ?? []) as unknown) as SizeRow[];
  const types = ((typesResult.data ?? []) as unknown) as TypeRow[];
  const sizeTypeOptions: OneWayPlanAutocompleteOption[] = [];
  for (const size of sizes) {
    for (const type of types) {
      if (!size.id || !type.id) continue;
      sizeTypeOptions.push({
        value: `${size.id}::${type.id}`,
        label: buildSizeTypeLabel(size.size_code, type.type_code),
        searchText: `${size.size_code ?? ""} ${type.type_code ?? ""}`.trim(),
      });
    }
  }

  const conditionOptions = ((((conditionsResult.data ?? []) as unknown) as ConditionRow[])).map<OneWayPlanAutocompleteOption>(
    (row) => ({
      value: row.id,
      label: normalizeText(row.condition_code) || row.id,
      searchText: normalizeText(row.condition_code),
    })
  );

  const colorOptions = ((((colorsResult.data ?? []) as unknown) as ColorRow[]))
    .map((row) => normalizeText(row.color_code))
    .filter(Boolean)
    .map<OneWayPlanAutocompleteOption>((color) => ({
      value: color,
      label: color,
      searchText: color,
    }));

  const machineTypeOptions = Array.from(
    new Set(
      (((machineTypesResult.data ?? []) as Array<{ machine_type: string | null }>))
        .map((row) => normalizeText(row.machine_type))
        .filter(Boolean)
    )
  ).map<OneWayPlanAutocompleteOption>((machineType) => ({
    value: machineType,
    label: machineType,
    searchText: machineType,
  }));

  return {
    regions: regionOptions,
    lessees: lesseeOptions,
    depots: depotOptions,
    polCities: polCityOptions,
    sizeTypes: sizeTypeOptions,
    conditions: conditionOptions,
    colors: colorOptions,
    machineTypes: machineTypeOptions,
  };
}

export async function getOneWayPlanFormOptions(): Promise<OneWayPlanFormOptions> {
  noStore();

  const supabase = createServerSupabaseClient();
  const [
    lesseesResult,
    depotsResult,
    citiesResult,
    sizesResult,
    typesResult,
    conditionsResult,
    colorsResult,
  ] = await Promise.all([
    supabase
      .from("lessees")
      .select("id, company_name, legal_company_name, lessee_code")
      .order("company_name", { ascending: true }),
    supabase
      .from("depots")
      .select("id, depot_code, depot_name, city_id")
      .order("depot_code", { ascending: true }),
    supabase.from("cities").select("id, city_code, city_name, region").order("city_code", { ascending: true }),
    supabase.from("container_size_codes").select("id, size_code").order("size_code", { ascending: true }),
    supabase.from("container_type_codes").select("id, type_code").order("type_code", { ascending: true }),
    supabase
      .from("container_condition_codes")
      .select("id, condition_code")
      .order("condition_code", { ascending: true }),
    supabase.from("ral_color_codes").select("color_code").order("color_code", { ascending: true }),
  ]);

  for (const result of [
    lesseesResult,
    depotsResult,
    citiesResult,
    sizesResult,
    typesResult,
    conditionsResult,
    colorsResult,
  ]) {
    if (result.error) throw new Error(result.error.message);
  }

  return {
    lessees: ((((lesseesResult.data ?? []) as unknown) as LesseeRow[])).map((row) => ({
      value: row.id,
      label:
        normalizeText(row.company_name) ||
        normalizeText(row.legal_company_name) ||
        normalizeText(row.lessee_code) ||
        row.id,
      secondaryLabel: normalizeText(row.lessee_code) || undefined,
      searchText: `${row.company_name ?? ""} ${row.legal_company_name ?? ""} ${
        row.lessee_code ?? ""
      }`.trim(),
    })),
    depots: ((((depotsResult.data ?? []) as unknown) as DepotRow[]))
      .filter((row) => normalizeText(row.city_id))
      .map(
        (row): OneWayPlanDepotOption => ({
          value: row.id,
          label: normalizeText(row.depot_code) || row.id,
          secondaryLabel: normalizeText(row.depot_name) || undefined,
          searchText: `${row.depot_code ?? ""} ${row.depot_name ?? ""}`.trim(),
          cityId: normalizeText(row.city_id),
        })
      ),
    polCities: ((((citiesResult.data ?? []) as unknown) as CityRow[])).map((row) => ({
      value: row.id,
      label: normalizeText(row.city_code) || row.id,
      secondaryLabel: normalizeText(row.city_name) || undefined,
      searchText: `${row.city_code ?? ""} ${row.city_name ?? ""} ${row.region ?? ""}`.trim(),
    })),
    podCityCodes: ((((citiesResult.data ?? []) as unknown) as CityRow[]))
      .map((row) => normalizeText(row.city_code).toUpperCase())
      .filter(Boolean),
    sizes: ((((sizesResult.data ?? []) as unknown) as SizeRow[])).map((row) => ({
      value: row.id,
      label: normalizeText(row.size_code) || row.id,
      searchText: normalizeText(row.size_code),
    })),
    types: ((((typesResult.data ?? []) as unknown) as TypeRow[])).map((row) => ({
      value: row.id,
      label: normalizeText(row.type_code) || row.id,
      searchText: normalizeText(row.type_code),
    })),
    conditions: ((((conditionsResult.data ?? []) as unknown) as ConditionRow[])).map((row) => ({
      value: row.id,
      label: normalizeText(row.condition_code) || row.id,
      searchText: normalizeText(row.condition_code),
    })),
    colors: ((((colorsResult.data ?? []) as unknown) as ColorRow[]))
      .map((row) => normalizeText(row.color_code))
      .filter(Boolean)
      .map((color) => ({
        value: color,
        label: color,
        searchText: color,
      })),
  };
}

function requireValue(value: string, label: string) {
  if (!normalizeText(value)) {
    throw new Error(`${label} is required.`);
  }
}

function requireNonNegativeNumber(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be 0 or greater.`);
  }
}

export async function createOneWayPlan(
  input: OneWayPlanCreateInput
): Promise<OneWayPlanCreateResult> {
  const status = input.status;
  if (status !== "SUBMITTED" && status !== "APPROVED") {
    throw new Error("Status must be SUBMITTED or APPROVED.");
  }

  requireValue(input.lesseeId, "Lessee");
  requireValue(input.depotId, "Depot Code");
  requireValue(input.polCityId, "POL");
  const normalizedPod = normalizePodCodes(input.pod, await getValidCityCodes());
  requireValue(normalizedPod, "POD");
  requireValue(input.sizeCodeId, "Size Code");
  requireValue(input.typeCodeId, "Type Code");
  requireValue(input.conditionCodeId, "Condition");
  requireValue(input.color, "Color");
  requireValue(input.carrier, "Carrier");
  requireValue(input.currency, "Currency");

  requireNonNegativeNumber(input.quantity, "Quantity");
  requireNonNegativeNumber(input.authorizedQty, "Authorized Qty");
  requireNonNegativeNumber(input.remainingQty, "Remaining Qty");
  requireNonNegativeNumber(input.pickedUpQty, "Picked Up Qty");
  requireNonNegativeNumber(input.nonPickedUpQty, "Non Picked Up Qty");
  requireNonNegativeNumber(input.pickupCharge, "Pick-up Charge");
  requireNonNegativeNumber(input.freeDays, "Free Days");
  requireNonNegativeNumber(input.perDiem, "Per Diem");
  requireNonNegativeNumber(input.dpp, "DPP");
  requireNonNegativeNumber(input.rv, "RV");

  const supabase = createServerSupabaseClient();
  const payload = {
    status,
    offer_id: null,
    status_date: null,
    apply_date: normalizeText(input.applyDate) || null,
    availability_date: normalizeText(input.availabilityDate) || null,
    arranged_dispatch_date: normalizeText(input.arrangedDispatchDate) || null,
    lessee_id: input.lesseeId,
    depot_id: input.depotId,
    pol_city_id: input.polCityId,
    pod_codes_raw: normalizedPod,
    size_code_id: input.sizeCodeId,
    type_code_id: input.typeCodeId,
    condition_code_id: input.conditionCodeId,
    color_code: normalizeText(input.color),
    machine_type: normalizeText(input.machineType) || null,
    planned_qty: input.quantity,
    authorized_qty: input.authorizedQty,
    remaining_qty: input.remainingQty,
    picked_up_qty: input.pickedUpQty,
    non_picked_up_qty: input.nonPickedUpQty,
    pickup_charge: input.pickupCharge,
    free_days: input.freeDays,
    per_diem: input.perDiem,
    dpp: input.dpp,
    carrier: normalizeText(input.carrier),
    currency: normalizeText(input.currency).toUpperCase() || null,
    rv: input.rv,
    shipper_request_id: normalizeText(input.shipperRequestId) || null,
    onhire_no: normalizeText(input.onhireNo) || null,
    remarks: normalizeText(input.remarks) || null,
  };

  const { data, error } = await supabase
    .from("one_way_plan")
    .insert(payload)
    .select("id, plan_id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dispatch/one-way-planning");

  return {
    id: data.id,
    planId: data.plan_id ?? "-",
  };
}

export async function updateOneWayPlan(
  input: OneWayPlanUpdateInput
): Promise<OneWayPlanUpdateResult> {
  const supabase = createServerSupabaseClient();
  const normalizedId = normalizeText(input.id);
  if (!normalizedId) throw new Error("Plan id is required.");

  const { data, error } = await supabase
    .from("one_way_plan")
    .select(buildEditSelectColumns())
    .eq("id", normalizedId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("One way plan not found.");

  const current = data as unknown as OneWayPlanEditRecord;
  const currentStatus = (normalizeText(current.status) || "SUBMITTED") as OneWayPlanStatus;
  const nextStatus = input.status;
  if (!["SUBMITTED", "APPROVED", "REJECTED", "HOLD", "COMPLETED", "CANCELLED"].includes(nextStatus)) {
    throw new Error("Invalid status.");
  }

  const releaseResult = await supabase
    .from("transfer_order")
    .select("id, status, release_qty")
    .eq("one_way_plan_id", normalizedId);

  if (releaseResult.error) throw new Error(releaseResult.error.message);

  const releaseRows = (releaseResult.data ?? []) as Array<{
    id: string | null;
    status: string | null;
    release_qty: number | null;
  }>;
  const hasRelease = releaseRows.length > 0;
  const releasedQty = releaseRows
    .filter((release) => normalizeText(release.status).toUpperCase() !== "CANCELLED")
    .reduce((sum, release) => sum + (release.release_qty ?? 0), 0);

  if (currentStatus === "CANCELLED") {
    throw new Error("Cancelled plans are read-only.");
  }

  const normalizedPod = normalizePodCodes(input.pod, await getValidCityCodes());

  if (currentStatus === "COMPLETED") {
    if (nextStatus !== currentStatus) throw new Error("Completed plans can only update remarks.");
    if (
      normalizeText(input.applyDate) !== normalizeText(current.apply_date) ||
      normalizeText(input.availabilityDate) !== normalizeText(current.availability_date) ||
      normalizeText(input.arrangedDispatchDate) !== normalizeText(current.arranged_dispatch_date) ||
      normalizeText(input.lesseeId) !== normalizeText(current.lessee_id) ||
      normalizeText(input.onhireNo) !== normalizeText(current.onhire_no) ||
      normalizeText(input.shipperRequestId) !== normalizeText(current.shipper_request_id) ||
      normalizeText(input.depotId) !== normalizeText(current.depot_id) ||
      normalizeText(input.polCityId) !== normalizeText(current.pol_city_id) ||
      normalizedPod !== normalizeText(current.pod_codes_raw) ||
      normalizeText(input.sizeCodeId) !== normalizeText(current.size_code_id) ||
      normalizeText(input.typeCodeId) !== normalizeText(current.type_code_id) ||
      normalizeText(input.conditionCodeId) !== normalizeText(current.condition_code_id) ||
      normalizeText(input.color) !== normalizeText(current.color_code) ||
      normalizeText(input.machineType) !== normalizeText(current.machine_type) ||
      input.quantity !== (current.planned_qty ?? 0) ||
      input.authorizedQty !== (current.authorized_qty ?? 0) ||
      input.remainingQty !== (current.remaining_qty ?? 0) ||
      input.pickedUpQty !== (current.picked_up_qty ?? 0) ||
      input.nonPickedUpQty !== (current.non_picked_up_qty ?? 0) ||
      input.pickupCharge !== (current.pickup_charge ?? 0) ||
      input.freeDays !== (current.free_days ?? 0) ||
      input.perDiem !== (current.per_diem ?? 0) ||
      input.dpp !== (current.dpp ?? 0) ||
      normalizeText(input.carrier) !== normalizeText(current.carrier) ||
      normalizeText(input.currency).toUpperCase() !== normalizeText(current.currency).toUpperCase() ||
      input.rv !== (current.rv ?? 0)
    ) {
      throw new Error("Completed plans can only update remarks.");
    }
  } else {
    requireValue(input.lesseeId, "Lessee");
    requireValue(input.polCityId, "POL");
    requireValue(normalizedPod, "POD");
    requireValue(input.sizeCodeId, "Size/Type");
    requireValue(input.typeCodeId, "Size/Type");
    requireValue(input.conditionCodeId, "Condition");
    requireValue(input.color, "Color");
    requireValue(input.carrier, "Carrier");
    requireValue(input.currency, "Currency");

    requireNonNegativeNumber(input.quantity, "Quantity");
    requireNonNegativeNumber(input.authorizedQty, "Authorized Qty");
    requireNonNegativeNumber(input.remainingQty, "Remaining Qty");
    requireNonNegativeNumber(input.pickedUpQty, "Picked Up Qty");
    requireNonNegativeNumber(input.nonPickedUpQty, "Non Picked Up Qty");
    requireNonNegativeNumber(input.pickupCharge, "Pick-up Charge");
    requireNonNegativeNumber(input.freeDays, "Free Days");
    requireNonNegativeNumber(input.perDiem, "Per Diem");
    requireNonNegativeNumber(input.dpp, "DPP");
    requireNonNegativeNumber(input.rv, "RV");

    if (hasRelease) {
      if (
        normalizeText(input.depotId) !== normalizeText(current.depot_id) ||
        normalizeText(input.polCityId) !== normalizeText(current.pol_city_id) ||
        normalizeText(input.sizeCodeId) !== normalizeText(current.size_code_id) ||
        normalizeText(input.typeCodeId) !== normalizeText(current.type_code_id) ||
        normalizeText(input.conditionCodeId) !== normalizeText(current.condition_code_id) ||
        normalizeText(input.color) !== normalizeText(current.color_code) ||
        normalizeText(input.machineType) !== normalizeText(current.machine_type)
      ) {
        throw new Error("Depot, POL, Size/Type, Condition, Color, and Machine Type cannot change after releases exist.");
      }
      if (input.quantity < releasedQty) {
        throw new Error("Quantity cannot be less than Released Qty.");
      }
    }
  }

  const payload = {
    status: nextStatus,
    apply_date: normalizeText(input.applyDate) || null,
    availability_date: normalizeText(input.availabilityDate) || null,
    arranged_dispatch_date: normalizeText(input.arrangedDispatchDate) || null,
    lessee_id: input.lesseeId,
    depot_id: normalizeText(input.depotId) || null,
    pol_city_id: input.polCityId,
    pod_codes_raw: normalizedPod,
    size_code_id: input.sizeCodeId,
    type_code_id: input.typeCodeId,
    condition_code_id: input.conditionCodeId,
    color_code: normalizeText(input.color),
    machine_type: normalizeText(input.machineType) || null,
    planned_qty: input.quantity,
    authorized_qty: input.authorizedQty,
    remaining_qty: input.remainingQty,
    picked_up_qty: input.pickedUpQty,
    non_picked_up_qty: input.nonPickedUpQty,
    pickup_charge: input.pickupCharge,
    free_days: input.freeDays,
    per_diem: input.perDiem,
    dpp: input.dpp,
    carrier: normalizeText(input.carrier),
    currency: normalizeText(input.currency).toUpperCase() || null,
    rv: input.rv,
    shipper_request_id: normalizeText(input.shipperRequestId) || null,
    onhire_no: normalizeText(input.onhireNo) || null,
    remarks: normalizeText(input.remarks) || null,
  };

  const updateResult = await supabase
    .from("one_way_plan")
    .update(payload)
    .eq("id", normalizedId)
    .select("id, plan_id")
    .single();

  if (updateResult.error) throw new Error(updateResult.error.message);

  revalidatePath("/dispatch/one-way-planning");
  revalidatePath(`/dispatch/one-way-planning/${normalizedId}`);
  revalidatePath(`/dispatch/one-way-planning/${normalizedId}/edit`);

  return {
    id: updateResult.data.id,
    planId: updateResult.data.plan_id ?? "-",
  };
}

export async function previewOneWayPlanImport(
  formData: FormData
): Promise<OneWayPlanImportPreviewResult> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("Please select an Excel file.");
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new Error("Only .xlsx files are supported.");
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), "ew-erp-one-way-import-"));
  const filePath = path.join(tempDir, file.name);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const rawRows = await parseOneWayOffersWorkbook(filePath);
    const lookups = await getImportLookups();
    const existingOfferIds = await getExistingOneWayPlanLesseeRequestIds(
      rawRows.map((row) => row.offerId)
    );
    const seenOfferIdsInWorkbook = new Set<string>();
    const rows = rawRows.map((row) =>
      buildImportPreviewRow(row, lookups, { existingOfferIds, seenOfferIdsInWorkbook })
    );
    const validRows = rows.filter((row) => row.isValid).length;
    const duplicateRows = rows.filter((row) => row.skipReason).length;
    const importableRows = rows.filter((row) => row.isValid && row.willImport).length;

    return {
      fileName: file.name,
      totalRows: rows.length,
      validRows,
      invalidRows: rows.length - validRows,
      duplicateRows,
      importableRows,
      rows,
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export async function importOneWayPlanRows(
  rows: OneWayPlanImportPreviewRow[]
): Promise<OneWayPlanImportResult> {
  if (!rows.length) throw new Error("No preview rows to import.");
  if (rows.some((row) => !row.isValid || !row.prepared)) {
    throw new Error("Import is blocked until all preview rows are valid.");
  }

  const supabase = createServerSupabaseClient();
  const importableRows = rows.filter((row) => row.willImport);
  const existingOfferIds = await getExistingOneWayPlanLesseeRequestIds(
    importableRows.map((row) => row.prepared?.shipperRequestId ?? "")
  );
  const finalRows = importableRows.filter(
    (row) => !existingOfferIds.has(normalizeText(row.prepared?.shipperRequestId))
  );

  const payload = finalRows.map((row) => ({
    status: row.prepared!.status,
    offer_id: null,
    status_date: null,
    apply_date: normalizeText(row.prepared!.applyDate) || null,
    availability_date: normalizeText(row.prepared!.availabilityDate) || null,
    arranged_dispatch_date: null,
    lessee_id: row.prepared!.lesseeId,
    depot_id: row.prepared!.depotId,
    pol_city_id: row.prepared!.polCityId,
    pod_codes_raw: row.prepared!.pod,
    size_code_id: row.prepared!.sizeCodeId,
    type_code_id: row.prepared!.typeCodeId,
    condition_code_id: row.prepared!.conditionCodeId,
    color_code: row.prepared!.color,
    machine_type: row.prepared!.machineType,
    planned_qty: row.prepared!.quantity,
    authorized_qty: row.prepared!.authorizedQty,
    remaining_qty: row.prepared!.remainingQty,
    picked_up_qty: row.prepared!.pickedUpQty,
    non_picked_up_qty: row.prepared!.nonPickedUpQty,
    pickup_charge: row.prepared!.pickupCharge,
    free_days: row.prepared!.freeDays,
    per_diem: row.prepared!.perDiem,
    dpp: row.prepared!.dpp,
    carrier: row.prepared!.carrier,
    currency: row.prepared!.currency,
    rv: row.prepared!.rv,
    shipper_request_id: normalizeText(row.prepared!.shipperRequestId) || null,
    onhire_no: normalizeText(row.prepared!.onhireNo) || null,
    remarks: normalizeText(row.prepared!.remarks) || null,
    source_file_name: null,
    source_sheet_name: row.prepared!.sourceSheetName,
    source_row_number: row.prepared!.sourceRowNumber,
  }));

  if (payload.length > 0) {
    const { error } = await supabase.from("one_way_plan").insert(payload);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/dispatch/one-way-planning");
  revalidatePath("/dispatch/one-way-planning/import");

  return {
    insertedCount: payload.length,
    skippedCount: rows.length - payload.length,
  };
}
