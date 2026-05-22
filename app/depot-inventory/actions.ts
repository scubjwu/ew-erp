"use server";

import { headers } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  DispatchReleaseSelectableContainerQuery,
  DispatchReleaseSelectableContainerRow,
  DepotInventoryAutocompleteOption,
  DepotInventoryContainerRow,
  DepotDispatchSummaryQuery,
  DepotDispatchSummaryResult,
  DepotDispatchSummaryRow,
  DepotSalesAvailabilityQuery,
  DepotSalesAvailabilityResult,
  DepotSalesAvailabilityRow,
  DepotInventoryDaysBucket,
  DepotInventoryFilterOptions,
  DepotInventoryQuery,
  DepotInventoryRangeGrouping,
  DepotInventoryRangeRow,
  DepotInventoryResult,
  DepotInventoryStatus,
  DepotInventoryViewMode,
  VendorReleaseSelectorRow,
} from "@/types/depot-inventory";
import type { UserRole } from "@/types/system-user";

type BaseContainerRowRaw = {
  id: string;
  purchase_order_id: string;
  purchase_order_item_id: string;
  container_id: string | null;
  container_number: string | null;
  color: string | null;
  flp: boolean | null;
  lbx: boolean | null;
  locking_bars_count: number | null;
  vents_count: number | null;
  machine_type: string | null;
  yom: number | null;
  estimated_offline_date: string | null;
  offline_date: string | null;
  planned_pod: string | null;
  purchase_price: number | null;
  container_status: DepotInventoryStatus | null;
  location?: { city_code: string | null; city_name: string | null; region: string | null } | null;
  depot?: {
    depot_code: string | null;
    depot_name: string | null;
    gate_in_20_cost: number | string | null;
    gate_out_20_cost: number | string | null;
    gate_in_40_cost: number | string | null;
    gate_out_40_cost: number | string | null;
    lift_in_20_cost: number | string | null;
    lift_out_20_cost: number | string | null;
    lift_in_40_cost: number | string | null;
    lift_out_40_cost: number | string | null;
    storage_rate_20: number | string | null;
    storage_rate_40: number | string | null;
    storage_rate_45: number | string | null;
    storage_rate_53: number | string | null;
  } | null;
  size?: { size_code: string | null } | null;
  type?: { type_code: string | null } | null;
  condition?: { condition_code: string | null } | null;
  purchase_order?: {
    order_no: string | null;
    purchase_type: string | null;
    purchase_date: string | null;
    supplier?: {
      vendor_code: string | null;
      company_name: string | null;
      legal_company_name: string | null;
    } | null;
    owner?: {
      container_owner_code: string | null;
      company_name: string | null;
      legal_company_name: string | null;
    } | null;
  } | null;
  item?: {
    vendor_release_number: string | null;
  } | null;
};

type SummaryItemRowRaw = {
  id: string;
  planned_qty: number | null;
  color: string | null;
  flp: boolean | null;
  lbx: boolean | null;
  locking_bars_count: number | null;
  machine_type: string | null;
  estimated_offline_date: string | null;
  offline_date: string | null;
  vendor_release_number: string | null;
  location?: { city_code: string | null; city_name: string | null; region: string | null } | null;
  depot?: { depot_code: string | null; depot_name: string | null } | null;
  size?: { size_code: string | null } | null;
  type?: { type_code: string | null } | null;
  condition?: { condition_code: string | null } | null;
  purchase_order?: {
    purchase_type: string | null;
    order_status: string | null;
    vendor_release_date: string | null;
    freeday: number | null;
    owner?: {
      container_owner_code: string | null;
      company_name: string | null;
      legal_company_name: string | null;
    } | null;
  } | null;
};

type VendorReleaseSelectorRowRaw = {
  purchase_order_item_id: string;
  purchase_order_id: string;
  order_no: string | null;
  purchase_type: string | null;
  line_no: number | null;
  vendor_release_number: string | null;
  vendor_release_date: string | null;
  freeday: number | null;
  offline_date: string | null;
  estimated_offline_date: string | null;
  location_city_code: string | null;
  location_city_name: string | null;
  depot_id: string | null;
  depot_code: string | null;
  depot_name: string | null;
  size_type: string | null;
  condition_code: string | null;
  color: string | null;
  machine_type: string | null;
  source_total_qty: number | null;
  vendor_release_used_qty: number | null;
  remaining_qty: number | null;
  vendor_release_attachment_count: number | null;
  has_vendor_release_attachment: boolean | null;
};

type YardRecordRow = {
  container_id: string;
  enter_time: string;
};

type TransferItemAllocationRow = {
  container_id: string | null;
  item_status: string | null;
  delivery_date?: string | null;
  transfer_order?:
    | { id?: string | null; status: string | null }
    | Array<{ id?: string | null; status: string | null }>
    | null;
};

type DecoratedContainerRow = DepotInventoryContainerRow & {
  supplier: string;
};

type DepotInventoryQueryBuilder = any;

const EMPTY_QUERY: DepotInventoryQuery = {
  region: "",
  location: "",
  depot: "",
  status: "",
  flpValue: "",
  lbxValue: "",
  eodValue: "",
  machineType: "",
  purchaseType: "",
  supplier: "",
  purchaseOrderNo: "",
  releaseNumber: "",
  sizeType: "",
  condition: "",
  color: "",
  containerNumber: "",
  containerNumberStart: "",
  containerNumberEnd: "",
  estimatedOfflineDateStart: "",
  estimatedOfflineDateEnd: "",
  offlineDateStart: "",
  offlineDateEnd: "",
  daysInDepot: "",
  viewMode: "detail",
  rangeGrouping: "po_item",
  page: 1,
  pageSize: 20,
};

const EMPTY_DISPATCH_SUMMARY_QUERY: DepotDispatchSummaryQuery = {
  region: "",
  city: "",
  depot: "",
  owner: "",
  sizeType: "",
  condition: "",
  color: "",
  machineType: "",
  page: 1,
  pageSize: 20,
};

const EMPTY_SALES_AVAILABILITY_QUERY: DepotSalesAvailabilityQuery = {
  region: "",
  city: "",
  depot: "",
  sizeType: "",
  condition: "",
  color: "",
  machineType: "",
  page: 1,
  pageSize: 20,
};

function normalizeText(value?: string | null) {
  return value?.trim() ?? "";
}

function normalizeDispatchReleaseBucketFilterValue(value?: string | null) {
  const trimmed = normalizeText(value);
  return trimmed === "-" ? "" : trimmed;
}

function extractCityCode(value?: string | null) {
  const trimmed = normalizeText(value);
  if (!trimmed || trimmed === "-") return "";
  const firstSegment = trimmed.split("·")[0]?.trim() ?? "";
  const codeCandidate = firstSegment || trimmed;
  return codeCandidate.split(/\s+/)[0]?.trim().toUpperCase() ?? "";
}

function buildDispatchReleaseNumberPrefix(cityValue?: string | null) {
  const cityCode = extractCityCode(cityValue);
  const suffix = cityCode.slice(-3).padStart(3, "X");
  return `D${suffix}`;
}

function normalizeLike(value?: string | null) {
  const trimmed = normalizeText(value);
  if (!trimmed) return null;
  return `%${trimmed}%`;
}

function postgrestLikeOperand(value?: string | null) {
  const trimmed = normalizeText(value);
  if (!trimmed) return null;
  return `%${trimmed.replace(/[%(),]/g, " ")}%`;
}

function toNumber(value: number | string | null | undefined) {
  if (value == null || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dedupeOptions(options: DepotInventoryAutocompleteOption[]) {
  const seen = new Map<string, DepotInventoryAutocompleteOption>();
  for (const option of options) {
    const key = option.value.trim().toUpperCase();
    if (!key || seen.has(key)) continue;
    seen.set(key, option);
  }
  return Array.from(seen.values()).sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
  );
}

function formatDateForUi(value: string | null | undefined) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 10);
}

function computeFreedayExpiryDate(
  baseDate: string | null | undefined,
  freeday: number | null | undefined
) {
  const normalizedDate = formatDateForUi(baseDate);
  if (!normalizedDate || freeday == null || !Number.isFinite(freeday)) {
    return "";
  }

  const parsed = new Date(`${normalizedDate}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return "";
  parsed.setUTCDate(parsed.getUTCDate() + freeday);
  return parsed.toISOString().slice(0, 10);
}

function resolveNonFactoryReleaseBaseDate(
  vendorReleaseDate: string | null | undefined,
  offlineDate: string | null | undefined,
  estimatedOfflineDate: string | null | undefined
) {
  return (
    formatDateForUi(vendorReleaseDate) ||
    formatDateForUi(offlineDate) ||
    formatDateForUi(estimatedOfflineDate) ||
    ""
  );
}

function sizeTypeLabel(raw: BaseContainerRowRaw) {
  return `${raw.size?.size_code ?? ""}${raw.type?.type_code ?? ""}` || "-";
}

function relationCode(relation: unknown, key: "size_code" | "type_code") {
  if (Array.isArray(relation)) {
    const first = relation[0];
    return typeof first?.[key] === "string" ? first[key] : null;
  }
  const value = typeof relation === "object" && relation != null ? (relation as Record<string, unknown>)[key] : null;
  return typeof value === "string" ? value : null;
}

function normalizeSizeTypeSearch(value?: string | null) {
  return normalizeText(value).replace(/\s+/g, "").toUpperCase();
}

function resolveOwnerLabel(raw: BaseContainerRowRaw) {
  return (
    raw.purchase_order?.owner?.company_name ??
    raw.purchase_order?.owner?.legal_company_name ??
    raw.purchase_order?.owner?.container_owner_code ??
    "-"
  );
}

function resolveSupplierLabel(raw: BaseContainerRowRaw) {
  return (
    raw.purchase_order?.supplier?.company_name ??
    raw.purchase_order?.supplier?.legal_company_name ??
    raw.purchase_order?.supplier?.vendor_code ??
    "-"
  );
}

function resolveReleaseLabel(raw: BaseContainerRowRaw) {
  return raw.item?.vendor_release_number ?? "-";
}

function resolveLocationLabel(raw: BaseContainerRowRaw) {
  const code = raw.location?.city_code ?? "";
  const name = raw.location?.city_name ?? "";
  if (code && name) return `${code} · ${name}`;
  return code || name || "-";
}

function resolveRegionLabel(raw: BaseContainerRowRaw) {
  return raw.location?.region ?? "-";
}

function formatDepotLabel(input: {
  depotCode?: string | null;
  depotName?: string | null;
}) {
  const depotCode = normalizeText(input.depotCode);
  const depotName = normalizeText(input.depotName);

  if (depotCode && depotName) {
    return `${depotCode} · ${depotName}`;
  }

  return depotCode || depotName || "-";
}

function resolveDepotLabel(raw: BaseContainerRowRaw) {
  return formatDepotLabel({
    depotCode: raw.depot?.depot_code,
    depotName: raw.depot?.depot_name,
  });
}

function resolveFlpLbEod(raw: BaseContainerRowRaw) {
  const flp = raw.flp ? "FLP" : "No";
  const lb = raw.lbx ? "LBX" : "No";
  const eod = raw.locking_bars_count === 3 ? "Yes" : "No";
  return `${flp} / ${lb} / ${eod}`;
}

function buildFlpLbEodValue(input: {
  flp?: boolean | null;
  lbx?: boolean | null;
  lockingBarsCount?: number | null;
}) {
  const flp = input.flp ? "FLP" : "No";
  const lb = input.lbx ? "LBX" : "No";
  const eod = input.lockingBarsCount === 3 ? "Yes" : "No";
  return `${flp} / ${lb} / ${eod}`;
}

function storageRateForSize(raw: BaseContainerRowRaw) {
  const size = raw.size?.size_code ?? "";
  if (size === "20") return toNumber(raw.depot?.storage_rate_20);
  if (size === "45") return toNumber(raw.depot?.storage_rate_45);
  if (size === "53") return toNumber(raw.depot?.storage_rate_53);
  return toNumber(raw.depot?.storage_rate_40);
}

function gateLiftCost(raw: BaseContainerRowRaw) {
  const size = raw.size?.size_code ?? "";
  const use20 = size === "20";
  return use20
    ? toNumber(raw.depot?.gate_in_20_cost) +
        toNumber(raw.depot?.gate_out_20_cost) +
        toNumber(raw.depot?.lift_in_20_cost) +
        toNumber(raw.depot?.lift_out_20_cost)
    : toNumber(raw.depot?.gate_in_40_cost) +
        toNumber(raw.depot?.gate_out_40_cost) +
        toNumber(raw.depot?.lift_in_40_cost) +
        toNumber(raw.depot?.lift_out_40_cost);
}

function computeDaysInDepot(gateInDate: string | null) {
  if (!gateInDate) return null;
  const parsed = new Date(gateInDate);
  if (Number.isNaN(parsed.getTime())) return null;
  const start = new Date(parsed);
  start.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  return diff >= 0 ? diff : 0;
}

function resolveBusinessGateInDate(
  row: Pick<
    BaseContainerRowRaw,
    "offline_date" | "estimated_offline_date" | "purchase_order" | "container_id"
  >,
  yardMap: Map<string, string>
) {
  const purchaseType = normalizeText(row.purchase_order?.purchase_type);
  if (purchaseType === "FACTORY_ORDER") {
    return row.offline_date ?? null;
  }
  if (purchaseType === "NEW_CONTAINER" || purchaseType === "USED_CONTAINER") {
    return row.offline_date ?? row.estimated_offline_date ?? null;
  }
  return row.container_id ? yardMap.get(row.container_id) ?? null : null;
}

function joinUnique(values: Array<string | number | null | undefined>) {
  const unique = Array.from(
    new Set(values.map((value) => normalizeText(value == null ? "" : String(value))).filter(Boolean))
  );
  if (unique.length === 0) return "-";
  if (unique.length === 1) return unique[0]!;
  return "Mixed";
}

function buildRange(numbers: string[]) {
  const sorted = [...numbers].sort((a, b) => a.localeCompare(b));
  if (sorted.length === 0) return "-";
  if (sorted.length === 1) return sorted[0]!;
  return `${sorted[0]} - ${sorted[sorted.length - 1]}`;
}

function summaryBucketParts(input: {
  region: string | null | undefined;
  city: string | null | undefined;
  depot: string | null | undefined;
  sizeType: string | null | undefined;
  condition: string | null | undefined;
  color: string | null | undefined;
  machineType: string | null | undefined;
}) {
  return {
    region: normalizeText(input.region) || "-",
    city: normalizeText(input.city) || "-",
    depot: normalizeText(input.depot) || "-",
    sizeType: normalizeText(input.sizeType) || "-",
    condition: normalizeText(input.condition) || "-",
    color: normalizeText(input.color) || "-",
    machineType: normalizeText(input.machineType) || "-",
  };
}

function summaryBucketKey(input: ReturnType<typeof summaryBucketParts>) {
  return [
    input.region,
    input.city,
    input.depot,
    input.sizeType,
    input.condition,
    input.color,
    input.machineType,
  ]
    .map((value) => value.toUpperCase())
    .join("::");
}

function normalizedSummaryBucketMatch(value: string | null | undefined) {
  const normalized = normalizeText(value);
  return (normalized === "-" ? "" : normalized).toUpperCase();
}

function positiveNumber(value: number | null | undefined) {
  return Math.max(0, Number(value ?? 0));
}

function normalizeContainerNumber(value: string | null | undefined) {
  return normalizeText(value).toUpperCase();
}

function firstRelationRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

async function getViewerRole(): Promise<UserRole | null> {
  const incoming = await headers();
  const raw = incoming.get("x-user-role") ?? incoming.get("x-ew-role");
  if (raw === "Admin" || raw === "Sales" || raw === "Operations" || raw === "Finance") {
    return raw;
  }
  return null;
}

function canViewPurchasePrice(role: UserRole | null) {
  if (role == null) return true;
  return role === "Admin" || role === "Finance";
}

function buildBaseRowsQuery(options?: { count?: "exact" | "planned" | "estimated" }) {
  const supabase = createServerSupabaseClient();
  return supabase
    .from("purchase_order_container")
    .select(
      `
        id,
        purchase_order_id,
        purchase_order_item_id,
        container_id,
        container_number,
        color,
        flp,
        lbx,
        locking_bars_count,
        vents_count,
        machine_type,
        yom,
        estimated_offline_date,
        offline_date,
        planned_pod,
        purchase_price,
        container_status,
        location:cities(city_code, city_name, region),
        depot:depots(
          depot_code,
          depot_name,
          gate_in_20_cost,
          gate_out_20_cost,
          gate_in_40_cost,
          gate_out_40_cost,
          lift_in_20_cost,
          lift_out_20_cost,
          lift_in_40_cost,
          lift_out_40_cost,
          storage_rate_20,
          storage_rate_40,
          storage_rate_45,
          storage_rate_53
        ),
        size:container_size_codes(size_code),
        type:container_type_codes(type_code),
        condition:container_condition_codes(condition_code),
        item:purchase_order_item!purchase_order_container_purchase_order_item_id_fkey(
          vendor_release_number
        ),
        purchase_order:purchase_order(
          order_no,
          purchase_type,
          purchase_date,
          supplier:vendors!purchase_order_supplier_id_vendors_fkey(vendor_code, company_name, legal_company_name),
          owner:container_owners!purchase_order_owner_id_fkey(container_owner_code, company_name, legal_company_name)
        )
      `,
      options?.count ? { count: options.count } : undefined
    );
}

function buildDispatchSummaryContainerQuery() {
  const supabase = createServerSupabaseClient();
  return supabase
    .from("purchase_order_container")
    .select(
      `
        id,
        purchase_order_item_id,
        container_id,
        container_number,
        container_status,
        flp,
        lbx,
        locking_bars_count,
        estimated_offline_date,
        offline_date,
        color,
        machine_type,
        location:cities(city_code, city_name, region),
        depot:depots(depot_code, depot_name),
        size:container_size_codes(size_code),
        type:container_type_codes(type_code),
        condition:container_condition_codes(condition_code),
        purchase_order:purchase_order(
          purchase_type,
          order_status,
          vendor_release_date,
          freeday,
          owner:container_owners!purchase_order_owner_id_fkey(container_owner_code, company_name, legal_company_name)
        )
      `
    )
    .in("container_status", ["PURCHASED", "IN_YARD"]);
}

function buildDispatchSummaryItemQuery() {
  const supabase = createServerSupabaseClient();
  return supabase
    .from("purchase_order_item")
    .select(
      `
        id,
        planned_qty,
        color,
        flp,
        lbx,
        locking_bars_count,
        machine_type,
        estimated_offline_date,
        offline_date,
        vendor_release_number,
        location:cities(city_code, city_name, region),
        depot:depots(depot_code, depot_name),
        size:container_size_codes(size_code),
        type:container_type_codes(type_code),
        condition:container_condition_codes(condition_code),
        purchase_order:purchase_order(
          purchase_type,
          order_status,
          vendor_release_date,
          freeday,
          owner:container_owners!purchase_order_owner_id_fkey(container_owner_code, company_name, legal_company_name)
        )
      `
    );
}

function buildSalesAvailabilityContainerQuery() {
  const supabase = createServerSupabaseClient();
  return supabase
    .from("purchase_order_container")
    .select(
      `
        id,
        purchase_order_item_id,
        container_status,
        flp,
        lbx,
        locking_bars_count,
        color,
        machine_type,
        location:cities(city_code, city_name, region),
        depot:depots(depot_code, depot_name),
        size:container_size_codes(size_code),
        type:container_type_codes(type_code),
        condition:container_condition_codes(condition_code)
      `
    )
    .eq("container_status", "IN_YARD");
}

function buildSalesAvailabilityItemQuery() {
  const supabase = createServerSupabaseClient();
  return supabase
    .from("purchase_order_item")
    .select(
      `
        id,
        planned_qty,
        color,
        flp,
        lbx,
        locking_bars_count,
        machine_type,
        location:cities(city_code, city_name, region),
        depot:depots(depot_code, depot_name),
        size:container_size_codes(size_code),
        type:container_type_codes(type_code),
        condition:container_condition_codes(condition_code),
        purchase_order:purchase_order(purchase_type)
      `
    );
}

function applyBaseFilters(
  query: DepotInventoryQueryBuilder,
  filters: DepotInventoryQuery,
  options?: {
    forceFactoryOnly?: boolean;
    matchingDaysContainerIds?: string[] | null;
  }
) {
  const forceFactoryOnly = options?.forceFactoryOnly ?? false;
  const matchingDaysContainerIds = options?.matchingDaysContainerIds ?? null;

  query = query.in("container_status", filters.status ? [filters.status] : ["PURCHASED", "IN_YARD"]);

  if (filters.flpValue) {
    query = query.eq("flp", filters.flpValue === "yes");
  }
  if (filters.lbxValue) {
    query = query.eq("lbx", filters.lbxValue === "yes");
  }
  if (filters.eodValue === "yes") {
    query = query.eq("locking_bars_count", 3);
  } else if (filters.eodValue === "no") {
    query = query.neq("locking_bars_count", 3);
  }

  const purchaseType = forceFactoryOnly ? "FACTORY_ORDER" : filters.purchaseType;
  if (purchaseType) {
    query = query.eq("purchase_order.purchase_type", purchaseType);
  }

  const region = normalizeLike(filters.region);
  if (region) {
    query = query.ilike("location.region", region);
  }

  const location = postgrestLikeOperand(filters.location);
  if (location) {
    query = query.or(
      `city_code.ilike.${location},city_name.ilike.${location}`,
      { foreignTable: "location" }
    );
  }

  const depot = postgrestLikeOperand(filters.depot);
  if (depot) {
    query = query.or(
      `depot_name.ilike.${depot},depot_code.ilike.${depot}`,
      { foreignTable: "depot" }
    );
  }

  const supplier = postgrestLikeOperand(filters.supplier);
  if (supplier) {
    query = query.or(
      `company_name.ilike.${supplier},legal_company_name.ilike.${supplier},vendor_code.ilike.${supplier}`,
      { foreignTable: "purchase_order.supplier" }
    );
  }

  const purchaseOrderNo = normalizeLike(filters.purchaseOrderNo);
  if (purchaseOrderNo) {
    query = query.ilike("purchase_order.order_no", purchaseOrderNo);
  }

  const releaseNumber = normalizeLike(filters.releaseNumber);
  if (releaseNumber) {
    query = query.ilike("item.vendor_release_number", releaseNumber);
  }

  if (filters.sizeType) {
    const sizeType = normalizeSizeTypeSearch(filters.sizeType);
    const sizeMatch = sizeType.match(/^(\d+)/);
    const typeMatch = sizeType.match(/([A-Z]+)$/);
    const sizeCode = sizeMatch?.[1] ?? "";
    const typeCode = typeMatch?.[0] ?? "";
    if (sizeCode) {
      query = query.eq("size.size_code", sizeCode);
    }
    if (typeCode) {
      query = query.ilike("type.type_code", `${typeCode}%`);
    }
  }
  if (filters.condition) {
    query = query.eq("condition.condition_code", filters.condition);
  }

  const machineType = normalizeLike(filters.machineType);
  if (machineType) {
    query = query.ilike("machine_type", machineType);
  }

  const color = normalizeLike(filters.color);
  if (color) {
    query = query.ilike("color", color);
  }

  const containerNumber = normalizeLike(filters.containerNumber);
  if (containerNumber) {
    query = query.ilike("container_number", containerNumber);
  }
  if (filters.containerNumberStart) {
    query = query.gte("container_number", filters.containerNumberStart.trim().toUpperCase());
  }
  if (filters.containerNumberEnd) {
    query = query.lte("container_number", filters.containerNumberEnd.trim().toUpperCase());
  }

  if (filters.estimatedOfflineDateStart) {
    query = query.gte("estimated_offline_date", filters.estimatedOfflineDateStart);
  }
  if (filters.estimatedOfflineDateEnd) {
    query = query.lte("estimated_offline_date", filters.estimatedOfflineDateEnd);
  }
  if (filters.offlineDateStart) {
    query = query.gte("offline_date", filters.offlineDateStart);
  }
  if (filters.offlineDateEnd) {
    query = query.lte("offline_date", filters.offlineDateEnd);
  }

  if (matchingDaysContainerIds) {
    if (matchingDaysContainerIds.length === 0) {
      query = query.in("container_id", ["__none__"]);
    } else {
      query = query.in("container_id", matchingDaysContainerIds);
    }
  }

  return query;
}

function applyDispatchSummaryFilters(
  query: DepotInventoryQueryBuilder,
  filters: Pick<
    DepotDispatchSummaryQuery,
    "region" | "city" | "depot" | "sizeType" | "condition" | "color" | "machineType"
  > & { owner?: string }
) {
  const region = normalizeLike(filters.region);
  if (region) {
    query = query.ilike("location.region", region);
  }

  const city = postgrestLikeOperand(filters.city);
  if (city) {
    query = query.or(`city_code.ilike.${city},city_name.ilike.${city}`, {
      foreignTable: "location",
    });
  }

  const depot = postgrestLikeOperand(filters.depot);
  if (depot) {
    query = query.or(`depot_name.ilike.${depot},depot_code.ilike.${depot}`, {
      foreignTable: "depot",
    });
  }

  const owner = postgrestLikeOperand(filters.owner);
  if (owner) {
    query = query.or(
      `company_name.ilike.${owner},legal_company_name.ilike.${owner},container_owner_code.ilike.${owner}`,
      { foreignTable: "purchase_order.owner" }
    );
  }

  if (filters.sizeType) {
    const sizeType = normalizeSizeTypeSearch(filters.sizeType);
    const sizeMatch = sizeType.match(/^(\d+)/);
    const typeMatch = sizeType.match(/([A-Z]+)$/);
    const sizeCode = sizeMatch?.[1] ?? "";
    const typeCode = typeMatch?.[0] ?? "";
    if (sizeCode) {
      query = query.eq("size.size_code", sizeCode);
    }
    if (typeCode) {
      query = query.ilike("type.type_code", `${typeCode}%`);
    }
  }

  if (filters.condition) {
    query = query.eq("condition.condition_code", filters.condition);
  }

  const color = normalizeLike(filters.color);
  if (color) {
    query = query.ilike("color", color);
  }

  const machineType = normalizeLike(filters.machineType);
  if (machineType) {
    query = query.ilike("machine_type", machineType);
  }

  return query;
}

function applySalesAvailabilityFilters(
  query: DepotInventoryQueryBuilder,
  filters: DepotSalesAvailabilityQuery
) {
  return applyDispatchSummaryFilters(query, filters);
}

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function isoBoundary(date: Date, endOfDay = false) {
  const next = new Date(date);
  if (endOfDay) {
    next.setHours(23, 59, 59, 999);
  } else {
    next.setHours(0, 0, 0, 0);
  }
  return next.toISOString();
}

function bucketBounds(bucket: DepotInventoryDaysBucket) {
  const today = startOfToday();
  if (bucket === "0_7") {
    const from = new Date(today);
    from.setDate(today.getDate() - 7);
    return { from: isoBoundary(from), to: isoBoundary(today, true) };
  }
  if (bucket === "8_15") {
    const from = new Date(today);
    from.setDate(today.getDate() - 15);
    const to = new Date(today);
    to.setDate(today.getDate() - 8);
    return { from: isoBoundary(from), to: isoBoundary(to, true) };
  }
  if (bucket === "16_30") {
    const from = new Date(today);
    from.setDate(today.getDate() - 30);
    const to = new Date(today);
    to.setDate(today.getDate() - 16);
    return { from: isoBoundary(from), to: isoBoundary(to, true) };
  }
  if (bucket === "31_60") {
    const from = new Date(today);
    from.setDate(today.getDate() - 60);
    const to = new Date(today);
    to.setDate(today.getDate() - 31);
    return { from: isoBoundary(from), to: isoBoundary(to, true) };
  }
  if (bucket === "61_plus") {
    const to = new Date(today);
    to.setDate(today.getDate() - 61);
    return { from: null, to: isoBoundary(to, true) };
  }
  return null;
}

async function loadMatchingDaysContainerIds(bucket: DepotInventoryDaysBucket) {
  if (!bucket) return null;
  const bounds = bucketBounds(bucket);
  if (!bounds) return null;

  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("yard_record")
    .select("container_id")
    .eq("record_status", "IN_YARD");

  if (bounds.from) {
    query = query.gte("enter_time", bounds.from);
  }
  if (bounds.to) {
    query = query.lte("enter_time", bounds.to);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return Array.from(
    new Set(
      (data ?? [])
        .map((row) => row.container_id)
        .filter((value): value is string => Boolean(value))
    )
  );
}

async function loadActiveYardRecords(containerIds: string[]) {
  if (containerIds.length === 0) return new Map<string, string>();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("yard_record")
    .select("container_id, enter_time")
    .eq("record_status", "IN_YARD")
    .in("container_id", containerIds)
    .order("enter_time", { ascending: false });
  if (error) throw new Error(error.message);

  const map = new Map<string, string>();
  for (const row of ((data ?? []) as YardRecordRow[])) {
    if (!map.has(row.container_id)) {
      map.set(row.container_id, row.enter_time);
    }
  }
  return map;
}

async function loadActiveTransferAllocatedContainerIds(
  containerIds: string[],
  currentTransferOrderId?: string
) {
  if (containerIds.length === 0) return new Set<string>();

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("transfer_item")
    .select("container_id, item_status, transfer_order(id, status)")
    .in("container_id", containerIds);

  if (error) throw new Error(error.message);

  const activeStatuses = new Set(["CREATED", "PARTIALLY_ASSIGNED", "IN_TRANSIT", "ON_HOLD"]);
  const blocked = new Set<string>();

  for (const row of ((data ?? []) as TransferItemAllocationRow[])) {
    const containerId = normalizeText(row.container_id);
    if (!containerId) continue;
    if (normalizeText(row.item_status) === "CANCELLED") continue;

    const transferOrder = Array.isArray(row.transfer_order)
      ? row.transfer_order[0] ?? null
      : row.transfer_order ?? null;
    if (
      currentTransferOrderId &&
      normalizeText(transferOrder?.id) === normalizeText(currentTransferOrderId)
    ) {
      continue;
    }
    const orderStatus = normalizeText(transferOrder?.status).toUpperCase();
    if (activeStatuses.has(orderStatus)) {
      blocked.add(containerId);
    }
  }

  return blocked;
}

async function loadPickedUpTransferContainerIds(containerIds: string[]) {
  if (containerIds.length === 0) return new Set<string>();

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("transfer_item")
    .select("container_id, item_status, delivery_date, transfer_order(id, status)")
    .in("container_id", containerIds);

  if (error) throw new Error(error.message);

  const activeStatuses = new Set(["CREATED", "PARTIALLY_ASSIGNED", "IN_TRANSIT", "ON_HOLD"]);
  const pickedUp = new Set<string>();

  for (const row of ((data ?? []) as TransferItemAllocationRow[])) {
    const containerId = normalizeText(row.container_id);
    if (!containerId) continue;
    if (normalizeText(row.item_status) === "CANCELLED") continue;
    if (!formatDateForUi(row.delivery_date ?? null)) continue;

    const transferOrder = Array.isArray(row.transfer_order)
      ? row.transfer_order[0] ?? null
      : row.transfer_order ?? null;
    const orderStatus = normalizeText(transferOrder?.status).toUpperCase();
    if (activeStatuses.has(orderStatus)) {
      pickedUp.add(containerId);
    }
  }

  return pickedUp;
}

async function loadCurrentTransferContainerIds(currentTransferOrderId?: string) {
  const normalizedTransferOrderId = normalizeText(currentTransferOrderId);
  if (!normalizedTransferOrderId) return [];

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("transfer_item")
    .select("container_id, item_status")
    .eq("transfer_order_id", normalizedTransferOrderId);

  if (error) throw new Error(error.message);

  return ((data ?? []) as Array<{ container_id: string | null; item_status: string | null }>)
    .filter((row) => normalizeText(row.item_status) !== "CANCELLED")
    .map((row) => normalizeText(row.container_id))
    .filter(Boolean);
}

function decorateRows(rows: BaseContainerRowRaw[], yardMap: Map<string, string>): DecoratedContainerRow[] {
  return rows.map((row) => {
    const gateInDate = resolveBusinessGateInDate(row, yardMap);
    const daysInDepot = computeDaysInDepot(gateInDate);
    const depotCost =
      gateInDate == null
        ? 0
        : gateLiftCost(row) + storageRateForSize(row) * (daysInDepot ?? 0);

    return {
      id: row.id,
      purchaseOrderId: row.purchase_order_id,
      purchaseOrderItemId: row.purchase_order_item_id,
      containerId: row.container_id,
      containerNumber: row.container_number,
      sizeType: sizeTypeLabel(row),
      condition: row.condition?.condition_code ?? "-",
      colorCode: row.color ?? "-",
      yom: row.yom,
      flpLbeod: resolveFlpLbEod(row),
      machineType: row.machine_type ?? "-",
      status: row.container_status ?? "PURCHASED",
      region: resolveRegionLabel(row),
      location: resolveLocationLabel(row),
      depot: resolveDepotLabel(row),
      owner: resolveOwnerLabel(row),
      plannedPod: row.planned_pod ?? "-",
      purchaseType: row.purchase_order?.purchase_type ?? "-",
      purchaseOrderNo: row.purchase_order?.order_no ?? "-",
      estimatedOfflineDate: formatDateForUi(row.estimated_offline_date),
      offlineDate: formatDateForUi(row.offline_date),
      gateInDate: formatDateForUi(gateInDate),
      daysInDepot,
      depotCost,
      purchasePrice: row.purchase_price,
      supplier: resolveSupplierLabel(row),
    };
  });
}

function buildRangeRows(
  rows: DecoratedContainerRow[],
  grouping: DepotInventoryRangeGrouping
): DepotInventoryRangeRow[] {
  const groups = new Map<string, DecoratedContainerRow[]>();
  for (const row of rows) {
    if (row.purchaseType !== "FACTORY_ORDER") continue;
    const effectiveDate =
      grouping === "po_item_effective_date"
        ? row.offlineDate || row.estimatedOfflineDate || "__none__"
        : "__all__";
    const key = `${row.purchaseOrderItemId}::${effectiveDate}`;
    const current = groups.get(key) ?? [];
    current.push(row);
    groups.set(key, current);
  }

  return Array.from(groups.entries())
    .map(([key, members]) => {
      const numbers = members.map((row) => row.containerNumber).filter((value): value is string => Boolean(value));
      const first = members[0]!;
      return {
        id: key,
        purchaseOrderItemId: first.purchaseOrderItemId,
        containerNumberRange: buildRange(numbers),
        sizeType: joinUnique(members.map((row) => row.sizeType)),
        condition: joinUnique(members.map((row) => row.condition)),
        colorCode: joinUnique(members.map((row) => row.colorCode)),
        yom: joinUnique(members.map((row) => (row.yom == null ? null : String(row.yom)))),
        flpLbeod: joinUnique(members.map((row) => row.flpLbeod)),
        machineType: joinUnique(members.map((row) => row.machineType)),
        status: joinUnique(members.map((row) => row.status)),
        region: joinUnique(members.map((row) => row.region)),
        location: joinUnique(members.map((row) => row.location)),
        depot: joinUnique(members.map((row) => row.depot)),
        owner: joinUnique(members.map((row) => row.owner)),
        plannedPod: joinUnique(members.map((row) => row.plannedPod)),
        purchaseType: "FACTORY_ORDER",
        purchaseOrderNo: joinUnique(members.map((row) => row.purchaseOrderNo)),
        estimatedOfflineDate: first.estimatedOfflineDate,
        offlineDate: first.offlineDate,
      };
    })
    .sort((a, b) => a.containerNumberRange.localeCompare(b.containerNumberRange));
}

function paginate<T>(rows: T[], page: number, pageSize: number) {
  const validPage = Math.max(1, Math.floor(page || 1));
  const validPageSize = Math.min(100, Math.max(1, Math.floor(pageSize || 20)));
  const start = (validPage - 1) * validPageSize;
  return {
    page: validPage,
    pageSize: validPageSize,
    rows: rows.slice(start, start + validPageSize),
    totalCount: rows.length,
  };
}

export async function getDepotInventoryFilterOptions(): Promise<DepotInventoryFilterOptions> {
  noStore();
  const supabase = createServerSupabaseClient();

  const [
    regionRows,
    locationRows,
    depotRows,
    ownerRows,
    supplierRows,
    purchaseOrderRows,
    releaseRows,
    colorRows,
    containerNumberRows,
    sizeTypeRows,
    machineTypeRows,
    conditionRows,
  ] = await Promise.all([
    supabase.from("cities").select("region").order("region", { ascending: true }),
    supabase
      .from("cities")
      .select("city_code, city_name")
      .order("city_code", { ascending: true }),
    supabase
      .from("depots")
      .select("depot_code, depot_name")
      .order("depot_name", { ascending: true }),
    supabase
      .from("container_owners")
      .select("container_owner_code, company_name, legal_company_name")
      .order("company_name", { ascending: true })
      .limit(200),
    supabase
      .from("vendors")
      .select("vendor_code, company_name, legal_company_name")
      .order("company_name", { ascending: true })
      .limit(200),
    supabase
      .from("purchase_order")
      .select("order_no")
      .order("purchase_date", { ascending: false })
      .limit(200),
    supabase
      .from("purchase_order_item")
      .select("vendor_release_number")
      .not("vendor_release_number", "is", null)
      .limit(200),
    supabase
      .from("purchase_order_container")
      .select("color")
      .in("container_status", ["PURCHASED", "IN_YARD"])
      .limit(200),
    supabase
      .from("purchase_order_container")
      .select("container_number")
      .in("container_status", ["PURCHASED", "IN_YARD"])
      .order("container_number", { ascending: true })
      .limit(200),
    supabase
      .from("purchase_order_container")
      .select("size:container_size_codes(size_code), type:container_type_codes(type_code)")
      .in("container_status", ["PURCHASED", "IN_YARD"])
      .limit(500),
    supabase
      .from("purchase_order_container")
      .select("machine_type")
      .in("container_status", ["PURCHASED", "IN_YARD"])
      .not("machine_type", "is", null)
      .limit(200),
    supabase
      .from("container_condition_codes")
      .select("condition_code")
      .order("condition_code", { ascending: true }),
  ]);

  const errors = [
    regionRows.error,
    locationRows.error,
    depotRows.error,
    ownerRows.error,
    supplierRows.error,
    purchaseOrderRows.error,
    releaseRows.error,
    colorRows.error,
    containerNumberRows.error,
    sizeTypeRows.error,
    machineTypeRows.error,
    conditionRows.error,
  ].filter(Boolean);
  if (errors.length > 0) {
    throw new Error(errors[0]!.message);
  }

  return {
    regions: dedupeOptions(
      (regionRows.data ?? []).map((row) => ({
        value: row.region ?? "",
        label: row.region ?? "",
        searchText: row.region ?? "",
      }))
    ),
    locations: dedupeOptions(
      (locationRows.data ?? []).map((row) => ({
        value: row.city_code && row.city_name ? `${row.city_code} · ${row.city_name}` : row.city_code ?? row.city_name ?? "",
        label: row.city_code && row.city_name ? `${row.city_code} · ${row.city_name}` : row.city_code ?? row.city_name ?? "",
        searchText: `${row.city_code ?? ""} ${row.city_name ?? ""}`,
      }))
    ),
    depots: dedupeOptions(
      (depotRows.data ?? []).map((row) => ({
        value: row.depot_name ?? row.depot_code ?? "",
        label: row.depot_name ?? row.depot_code ?? "",
        searchText: `${row.depot_name ?? ""} ${row.depot_code ?? ""}`,
        secondaryLabel: row.depot_code ?? undefined,
      }))
    ),
    owners: dedupeOptions(
      (ownerRows.data ?? []).map((row) => ({
        value: row.company_name ?? row.legal_company_name ?? row.container_owner_code ?? "",
        label: row.company_name ?? row.legal_company_name ?? row.container_owner_code ?? "",
        searchText: `${row.company_name ?? ""} ${row.legal_company_name ?? ""} ${row.container_owner_code ?? ""}`,
        secondaryLabel: row.container_owner_code ?? undefined,
      }))
    ),
    suppliers: dedupeOptions(
      (supplierRows.data ?? []).map((row) => ({
        value: row.company_name ?? row.legal_company_name ?? row.vendor_code ?? "",
        label: row.company_name ?? row.legal_company_name ?? row.vendor_code ?? "",
        searchText: `${row.company_name ?? ""} ${row.legal_company_name ?? ""} ${row.vendor_code ?? ""}`,
        secondaryLabel: row.vendor_code ?? undefined,
      }))
    ),
    purchaseOrders: dedupeOptions(
      (purchaseOrderRows.data ?? []).map((row) => ({
        value: row.order_no ?? "",
        label: row.order_no ?? "",
        searchText: row.order_no ?? "",
      }))
    ),
    releases: dedupeOptions(
      (releaseRows.data ?? []).map((row) => ({
        value: row.vendor_release_number ?? "",
        label: row.vendor_release_number ?? "",
        searchText: row.vendor_release_number ?? "",
      }))
    ),
    colors: dedupeOptions(
      (colorRows.data ?? []).map((row) => ({
        value: row.color ?? "",
        label: row.color ?? "",
        searchText: row.color ?? "",
      }))
    ),
    containerNumbers: dedupeOptions(
      (containerNumberRows.data ?? []).map((row) => ({
        value: row.container_number ?? "",
        label: row.container_number ?? "",
        searchText: row.container_number ?? "",
      }))
    ),
    sizeTypes: Array.from(
      new Set(
        (sizeTypeRows.data ?? [])
          .map((row) => {
            const sizeCode = relationCode((row as { size?: unknown }).size, "size_code") ?? "";
            const typeCode = relationCode((row as { type?: unknown }).type, "type_code") ?? "";
            return `${sizeCode}${typeCode}`;
          })
          .filter((value): value is string => Boolean(value) && value !== "-")
      )
    )
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))
      .map((value) => ({
        value,
        label: value,
        searchText: value,
      })),
    machineTypes: dedupeOptions(
      (machineTypeRows.data ?? []).map((row) => ({
        value: row.machine_type ?? "",
        label: row.machine_type ?? "",
        searchText: row.machine_type ?? "",
      }))
    ),
    conditionCodes: Array.from(
      new Set(
        (conditionRows.data ?? [])
          .map((row) => row.condition_code)
          .filter((value): value is string => Boolean(value))
      )
    ),
  };
}

async function getPagedDetailInventory(
  query: DepotInventoryQuery,
  canSeePrice: boolean
): Promise<DepotInventoryResult> {
  const matchingDaysContainerIds = await loadMatchingDaysContainerIds(query.daysInDepot);
  if (matchingDaysContainerIds && matchingDaysContainerIds.length === 0) {
    return {
      rows: [],
      totalCount: 0,
      page: query.page,
      pageSize: query.pageSize,
      filters: query,
      canViewPurchasePrice: canSeePrice,
    };
  }

  const from = (query.page - 1) * query.pageSize;
  const to = from + query.pageSize - 1;
  let baseQuery = buildBaseRowsQuery({ count: "exact" });
  baseQuery = applyBaseFilters(baseQuery, query, { matchingDaysContainerIds });
  baseQuery = baseQuery.order("order_no", { ascending: true, foreignTable: "purchase_order" });
  baseQuery = baseQuery.order("container_number", { ascending: true });

  const { data, error, count } = await baseQuery.range(from, to);
  if (error) throw new Error(error.message);

  const rawRows = (data ?? []) as unknown as BaseContainerRowRaw[];
  const yardMap = await loadActiveYardRecords(
    rawRows.map((row) => row.container_id).filter((value): value is string => Boolean(value))
  );
  const decorated = decorateRows(rawRows, yardMap);
  const rows = canSeePrice
    ? decorated
    : decorated.map((row) => ({
        ...row,
        purchasePrice: null,
      }));

  return {
    rows,
    totalCount: count ?? 0,
    page: query.page,
    pageSize: query.pageSize,
    filters: query,
    canViewPurchasePrice: canSeePrice,
  };
}

async function loadAllFilteredRows(
  query: DepotInventoryQuery,
  options?: { forceFactoryOnly?: boolean }
) {
  const matchingDaysContainerIds = await loadMatchingDaysContainerIds(query.daysInDepot);
  if (matchingDaysContainerIds && matchingDaysContainerIds.length === 0) {
    return [] as DecoratedContainerRow[];
  }

  let baseQuery = buildBaseRowsQuery();
  baseQuery = applyBaseFilters(baseQuery, query, {
    forceFactoryOnly: options?.forceFactoryOnly,
    matchingDaysContainerIds,
  });
  baseQuery = baseQuery.order("order_no", { ascending: true, foreignTable: "purchase_order" });
  baseQuery = baseQuery.order("container_number", { ascending: true });

  const { data, error } = await baseQuery;
  if (error) throw new Error(error.message);

  const rawRows = (data ?? []) as unknown as BaseContainerRowRaw[];
  const yardMap = await loadActiveYardRecords(
    rawRows.map((row) => row.container_id).filter((value): value is string => Boolean(value))
  );
  return decorateRows(rawRows, yardMap);
}

function resolvePlannedDispatchQty() {
  return 0;
}

function resolveReservedQty() {
  return 0;
}

function resolveInvoicedQty() {
  return 0;
}

function shouldCountNonFactoryRemainderInPendingOffline(item: SummaryItemRowRaw) {
  const orderStatus = item.purchase_order?.order_status ?? "";
  if (orderStatus === "DRAFT" || orderStatus === "CANCELLED" || orderStatus === "COMPLETED") {
    return false;
  }

  if (orderStatus === "RELEASED") {
    return false;
  }

  return true;
}

function shouldCountNonFactoryRemainderInDepotInventory(item: SummaryItemRowRaw) {
  const purchaseType = item.purchase_order?.purchase_type ?? "";
  const orderStatus = item.purchase_order?.order_status ?? "";
  if (purchaseType !== "NEW_CONTAINER" && purchaseType !== "USED_CONTAINER") {
    return false;
  }

  return orderStatus === "RELEASED";
}

function shouldTreatReleasedNonFactoryPurchasedRowAsDepotInventory(input: {
  purchaseType?: string | null;
  orderStatus?: string | null;
  containerStatus?: DepotInventoryStatus | null;
}) {
  const purchaseType = input.purchaseType ?? "";
  if (purchaseType !== "NEW_CONTAINER" && purchaseType !== "USED_CONTAINER") {
    return false;
  }

  return input.orderStatus === "RELEASED" && input.containerStatus === "PURCHASED";
}

function buildSummaryBucketPartsFromSummaryItem(item: SummaryItemRowRaw) {
  const city = resolveLocationLabel({
    location: item.location ?? null,
  } as BaseContainerRowRaw);
  const depot = resolveDepotLabel({
    depot: item.depot ?? null,
  } as BaseContainerRowRaw);
  const sizeType = `${item.size?.size_code ?? ""}${item.type?.type_code ?? ""}` || "-";
  const condition = item.condition?.condition_code ?? "-";

  return summaryBucketParts({
    region: item.location?.region,
    city,
    depot,
    sizeType,
    condition,
    color: item.color ?? "-",
    machineType: item.machine_type ?? "-",
  });
}

type OneWayPlanSummaryRowRaw = {
  id: string;
  status: string | null;
  conversion_status?: string | null;
  planned_qty: number | null;
  color_code: string | null;
  machine_type: string | null;
  pol_city?: { city_code: string | null; city_name: string | null; region: string | null } | null;
  depot?: { depot_code: string | null; depot_name: string | null } | null;
  size?: { size_code: string | null } | null;
  type?: { type_code: string | null } | null;
  condition?: { condition_code: string | null } | null;
};

function buildSummaryBucketPartsFromOneWayPlan(plan: OneWayPlanSummaryRowRaw) {
  const cityCode = normalizeText(plan.pol_city?.city_code) || "-";
  const cityName = normalizeText(plan.pol_city?.city_name);
  const sizeType = `${plan.size?.size_code ?? ""}${plan.type?.type_code ?? ""}` || "-";
  const condition = plan.condition?.condition_code ?? "-";

  return summaryBucketParts({
    region: plan.pol_city?.region,
    city: cityName ? `${cityCode} · ${cityName}` : cityCode,
    depot: formatDepotLabel({
      depotCode: plan.depot?.depot_code,
      depotName: plan.depot?.depot_name,
    }),
    sizeType,
    condition,
    color: plan.color_code ?? "-",
    machineType: normalizeText(plan.machine_type) || "-",
  });
}

function matchesDispatchSummaryBucketFilters(
  bucket: ReturnType<typeof summaryBucketParts>,
  filters: Pick<
    DepotDispatchSummaryQuery,
    "region" | "city" | "depot" | "sizeType" | "condition" | "color" | "machineType"
  >
) {
  const normalizedFilterRegion = normalizedSummaryBucketMatch(filters.region);
  if (normalizedFilterRegion && bucket.region.toUpperCase() !== normalizedFilterRegion) {
    return false;
  }

  const normalizedFilterCity = normalizedSummaryBucketMatch(filters.city);
  if (normalizedFilterCity && !bucket.city.toUpperCase().includes(normalizedFilterCity)) {
    return false;
  }

  const normalizedFilterDepot = normalizedSummaryBucketMatch(filters.depot);
  if (normalizedFilterDepot && !bucket.depot.toUpperCase().includes(normalizedFilterDepot)) {
    return false;
  }

  const normalizedFilterSizeType = normalizedSummaryBucketMatch(filters.sizeType);
  if (normalizedFilterSizeType && bucket.sizeType.toUpperCase() !== normalizedFilterSizeType) {
    return false;
  }

  const normalizedFilterCondition = normalizedSummaryBucketMatch(filters.condition);
  if (normalizedFilterCondition && bucket.condition.toUpperCase() !== normalizedFilterCondition) {
    return false;
  }

  const normalizedFilterColor = normalizedSummaryBucketMatch(filters.color);
  if (normalizedFilterColor && !bucket.color.toUpperCase().includes(normalizedFilterColor)) {
    return false;
  }

  const normalizedFilterMachineType = normalizedSummaryBucketMatch(filters.machineType);
  if (normalizedFilterMachineType && !bucket.machineType.toUpperCase().includes(normalizedFilterMachineType)) {
    return false;
  }

  return true;
}

function matchesDispatchSummaryItemFilters(
  item: SummaryItemRowRaw,
  filters: Pick<
    DepotDispatchSummaryQuery,
    "region" | "city" | "depot" | "sizeType" | "condition" | "color" | "machineType"
  >
) {
  return matchesDispatchSummaryBucketFilters(buildSummaryBucketPartsFromSummaryItem(item), filters);
}

async function loadPendingOutboundFallbackSourceItemsByTransferOrderIds(
  transferOrderIds: string[]
) {
  const normalizedOrderIds = Array.from(
    new Set(transferOrderIds.map((value) => normalizeText(value)).filter(Boolean))
  );
  if (normalizedOrderIds.length === 0) {
    return new Map<string, SummaryItemRowRaw>();
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("transfer_item")
    .select(
      `
        transfer_order_id,
        container:container_id(
          purchase_order_container(
            item:purchase_order_item!purchase_order_container_purchase_order_item_id_fkey(
              id,
              color,
              machine_type,
              location:cities(city_code, city_name, region),
              depot:depots(depot_code, depot_name),
              size:container_size_codes(size_code),
              type:container_type_codes(type_code),
              condition:container_condition_codes(condition_code)
            )
          )
        )
      `
    )
    .in("transfer_order_id", normalizedOrderIds)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const sourceItemByOrderId = new Map<string, SummaryItemRowRaw>();
  for (const row of (data ?? []) as Array<{
    transfer_order_id: string | null;
    container:
      | {
          purchase_order_container?:
            | Array<{ item?: SummaryItemRowRaw | SummaryItemRowRaw[] | null }>
            | { item?: SummaryItemRowRaw | SummaryItemRowRaw[] | null }
            | null;
        }
      | Array<{
          purchase_order_container?:
            | Array<{ item?: SummaryItemRowRaw | SummaryItemRowRaw[] | null }>
            | { item?: SummaryItemRowRaw | SummaryItemRowRaw[] | null }
            | null;
        }>
      | null;
  }>) {
    const transferOrderId = normalizeText(row.transfer_order_id);
    if (!transferOrderId || sourceItemByOrderId.has(transferOrderId)) continue;
    const containerRow = firstRelationRow(row.container);
    const purchaseOrderContainer = firstRelationRow(
      containerRow?.purchase_order_container as
        | Array<{ item?: SummaryItemRowRaw | SummaryItemRowRaw[] | null }>
        | { item?: SummaryItemRowRaw | SummaryItemRowRaw[] | null }
        | null
    );
    const sourceItem = firstRelationRow(
      purchaseOrderContainer?.item as SummaryItemRowRaw | SummaryItemRowRaw[] | null
    );
    if (sourceItem) {
      sourceItemByOrderId.set(transferOrderId, sourceItem);
    }
  }

  return sourceItemByOrderId;
}

async function buildPendingOutboundQtyByBucket(filters: DepotDispatchSummaryQuery) {
  const supabase = createServerSupabaseClient();
  const { data: transferOrderData, error: transferOrderError } = await supabase
    .from("transfer_order")
    .select("id, source_purchase_order_item_id, one_way_plan_id, release_source, unassigned_qty, status, release_qty")
    .in("status", ["CREATED", "PARTIALLY_ASSIGNED", "IN_TRANSIT", "ON_HOLD"])
    .in("release_source", ["INTERNAL_FACTORY", "INTERNAL_DEPOT", "VENDOR_REF"])
    .gt("release_qty", 0);

  if (transferOrderError) {
    throw new Error(transferOrderError.message);
  }

  const transferOrders = (transferOrderData ?? []) as Array<{
    id: string | null;
    source_purchase_order_item_id: string | null;
    one_way_plan_id: string | null;
    release_source: string | null;
    unassigned_qty: number | null;
    release_qty: number | null;
    status: string | null;
  }>;

  const orderIds = transferOrders
    .map((row) => normalizeText(row.id))
    .filter((value): value is string => Boolean(value));

  const [
    { data: transferItemData, error: transferItemError },
    fallbackSourceItemByOrderId,
  ] = await Promise.all([
    orderIds.length > 0
      ? supabase
          .from("transfer_item")
          .select("transfer_order_id, item_status, delivery_date")
          .in("transfer_order_id", orderIds)
      : Promise.resolve({ data: [], error: null }),
    loadPendingOutboundFallbackSourceItemsByTransferOrderIds(orderIds),
  ]);

  if (transferItemError) {
    throw new Error(transferItemError.message);
  }

  const undatedSpecifiedCountByOrderId = new Map<string, number>();
  for (const row of (transferItemData ?? []) as Array<{
    transfer_order_id: string | null;
    item_status: string | null;
    delivery_date: string | null;
  }>) {
    const transferOrderId = normalizeText(row.transfer_order_id);
    if (!transferOrderId) continue;
    if (normalizeText(row.item_status).toUpperCase() === "CANCELLED") continue;
    if (formatDateForUi(row.delivery_date ?? null)) continue;
    undatedSpecifiedCountByOrderId.set(
      transferOrderId,
      (undatedSpecifiedCountByOrderId.get(transferOrderId) ?? 0) + 1
    );
  }

  const sourceItemIds = Array.from(
    new Set(
      transferOrders
        .map((row) => normalizeText(row.source_purchase_order_item_id))
        .filter((value): value is string => Boolean(value))
    )
  );
  const oneWayPlanIds = Array.from(
    new Set(
      transferOrders
        .map((row) => normalizeText(row.one_way_plan_id))
        .filter((value): value is string => Boolean(value))
    )
  );

  if (sourceItemIds.length === 0 && fallbackSourceItemByOrderId.size === 0 && oneWayPlanIds.length === 0) {
    return new Map<string, number>();
  }

  const sourceItemData =
    sourceItemIds.length > 0
      ? await (async () => {
          let itemQuery = buildDispatchSummaryItemQuery().in("id", sourceItemIds);
          itemQuery = applyDispatchSummaryFilters(itemQuery, filters);
          const { data, error } = await itemQuery;
          if (error) {
            throw new Error(error.message);
          }
          return data ?? [];
        })()
      : [];

  const sourceItems = ((sourceItemData ?? []) as unknown) as SummaryItemRowRaw[];
  const sourceItemMap = new Map(sourceItems.map((item) => [item.id, item] as const));
  const oneWayPlanMap = new Map<string, OneWayPlanSummaryRowRaw>();
  if (oneWayPlanIds.length > 0) {
    const { data: oneWayPlanData, error: oneWayPlanError } = await supabase
      .from("one_way_plan")
      .select(
        `
        id,
        color_code,
        machine_type,
        pol_city:cities!one_way_plan_pol_city_id_fkey(city_code, city_name, region),
          depot:depots!one_way_plan_depot_id_fkey(depot_code, depot_name),
          size:container_size_codes!one_way_plan_size_code_id_fkey(size_code),
          type:container_type_codes!one_way_plan_type_code_id_fkey(type_code),
          condition:container_condition_codes!one_way_plan_condition_code_id_fkey(condition_code)
        `
      )
      .in("id", oneWayPlanIds)
      .not("depot_id", "is", null);

    if (oneWayPlanError) {
      throw new Error(oneWayPlanError.message);
    }

    for (const plan of ((oneWayPlanData ?? []) as unknown) as OneWayPlanSummaryRowRaw[]) {
      oneWayPlanMap.set(plan.id, plan);
    }
  }
  const pendingOutboundByBucket = new Map<string, number>();

  for (const transferOrder of transferOrders) {
    const transferOrderId = normalizeText(transferOrder.id);
    const oneWayPlanId = normalizeText(transferOrder.one_way_plan_id);
    const sourceItemId = normalizeText(transferOrder.source_purchase_order_item_id);
    const oneWayPlan = oneWayPlanId ? oneWayPlanMap.get(oneWayPlanId) : null;
    const sourceItem =
      (sourceItemId ? sourceItemMap.get(sourceItemId) : null) ??
      (transferOrderId ? fallbackSourceItemByOrderId.get(transferOrderId) : null);

    const pendingQty =
      positiveNumber(transferOrder.unassigned_qty) +
      (transferOrderId ? undatedSpecifiedCountByOrderId.get(transferOrderId) ?? 0 : 0);
    if (pendingQty <= 0) continue;

    let bucketKey = "";
    if (oneWayPlan) {
      const bucket = buildSummaryBucketPartsFromOneWayPlan(oneWayPlan);
      if (!matchesDispatchSummaryBucketFilters(bucket, filters)) continue;
      bucketKey = summaryBucketKey(bucket);
    } else {
      if (!sourceItem) continue;
      if (!matchesDispatchSummaryItemFilters(sourceItem, filters)) continue;
      bucketKey = summaryBucketKey(buildSummaryBucketPartsFromSummaryItem(sourceItem));
    }

    pendingOutboundByBucket.set(
      bucketKey,
      (pendingOutboundByBucket.get(bucketKey) ?? 0) + pendingQty
    );
  }

  return pendingOutboundByBucket;
}

type SummaryAccumulator = {
  region: string;
  city: string;
  depot: string;
  sizeType: string;
  condition: string;
  color: string;
  machineType: string;
  hasFactoryOrder: boolean;
  hasNewOrUsedPurchase: boolean;
  containerInYardQty: number;
  releasedUnnumberedQty: number;
  pendingOfflineQty: number;
  earliestEstimatedOfflineDate: string | null;
  earliestFreedayExpiryDate: string | null;
};

type SalesAccumulator = {
  region: string;
  city: string;
  depot: string;
  sizeType: string;
  condition: string;
  color: string;
  machineType: string;
  flpLbeod: string;
  totalQty: number;
};

async function buildDispatchSummaryRows(filters: DepotDispatchSummaryQuery) {
  let containerQuery = buildDispatchSummaryContainerQuery();
  containerQuery = applyDispatchSummaryFilters(containerQuery, filters);
  containerQuery = containerQuery.order("container_number", { ascending: true });

  let itemQuery = buildDispatchSummaryItemQuery();
  itemQuery = applyDispatchSummaryFilters(itemQuery, filters);

  const oneWayPlanQuery = createServerSupabaseClient()
    .from("one_way_plan")
    .select(
      `
        id,
        status,
        conversion_status,
        planned_qty,
        color_code,
        machine_type,
        pol_city: cities!one_way_plan_pol_city_id_fkey(city_code, city_name, region),
        depot: depots!one_way_plan_depot_id_fkey(depot_code, depot_name),
        size: container_size_codes!one_way_plan_size_code_id_fkey(size_code),
        type: container_type_codes!one_way_plan_type_code_id_fkey(type_code),
        condition: container_condition_codes!one_way_plan_condition_code_id_fkey(condition_code)
      `
    )
    .in("status", ["SUBMITTED", "APPROVED"])
    .eq("conversion_status", "OPEN")
    .not("depot_id", "is", null);

  const [
    { data: containerData, error: containerError },
    { data: itemData, error: itemError },
    { data: oneWayPlanData, error: oneWayPlanError },
  ] = await Promise.all([containerQuery, itemQuery, oneWayPlanQuery]);

  if (containerError) throw new Error(containerError.message);
  if (itemError) throw new Error(itemError.message);
  if (oneWayPlanError) throw new Error(oneWayPlanError.message);

  const containerRows = ((containerData ?? []) as unknown) as Array<{
    id: string;
    purchase_order_item_id: string;
    container_id: string | null;
    container_number: string | null;
    container_status: DepotInventoryStatus | null;
    estimated_offline_date: string | null;
    offline_date: string | null;
    color: string | null;
    machine_type: string | null;
    location?: { city_code: string | null; city_name: string | null; region: string | null } | null;
    depot?: { depot_code: string | null; depot_name: string | null } | null;
    size?: { size_code: string | null } | null;
    type?: { type_code: string | null } | null;
    condition?: { condition_code: string | null } | null;
    purchase_order?: {
      purchase_type: string | null;
      order_status: string | null;
      vendor_release_date: string | null;
      freeday: number | null;
      owner?: {
        container_owner_code: string | null;
        company_name: string | null;
        legal_company_name: string | null;
      } | null;
    } | null;
  }>;
  const itemRows = ((itemData ?? []) as unknown) as SummaryItemRowRaw[];
  const oneWayPlanRows = ((oneWayPlanData ?? []) as unknown) as OneWayPlanSummaryRowRaw[];
  const allSummaryItemIds = Array.from(new Set(itemRows.map((row) => row.id).filter(Boolean)));
  const nonCancelledContainerCountByItem = new Map<string, number>();
  if (allSummaryItemIds.length > 0) {
    const supabase = createServerSupabaseClient();
    const { data: allContainerCountRows, error: allContainerCountError } = await supabase
      .from("purchase_order_container")
      .select("purchase_order_item_id, container_status")
      .in("purchase_order_item_id", allSummaryItemIds)
      .or("container_status.is.null,container_status.neq.CANCELLED");
    if (allContainerCountError) {
      throw new Error(allContainerCountError.message);
    }
    for (const row of (allContainerCountRows ?? []) as Array<{
      purchase_order_item_id: string | null;
      container_status: string | null;
    }>) {
      const itemId = normalizeText(row.purchase_order_item_id);
      if (!itemId) continue;
      nonCancelledContainerCountByItem.set(
        itemId,
        (nonCancelledContainerCountByItem.get(itemId) ?? 0) + 1
      );
    }
  }
  const unresolvedContainerNumbers = Array.from(
    new Set(
      containerRows
        .filter((row) => !normalizeText(row.container_id))
        .map((row) => normalizeContainerNumber(row.container_number))
        .filter(Boolean)
    )
  );
  const resolvedContainerIdByNumber = new Map<string, string>();
  if (unresolvedContainerNumbers.length > 0) {
    const supabase = createServerSupabaseClient();
    const { data: resolvedContainerData, error: resolvedContainerError } = await supabase
      .from("container")
      .select("id, container_number")
      .in("container_number", unresolvedContainerNumbers);
    if (resolvedContainerError) {
      throw new Error(resolvedContainerError.message);
    }
    for (const row of (resolvedContainerData ?? []) as Array<{
      id: string | null;
      container_number: string | null;
    }>) {
      const containerNumber = normalizeContainerNumber(row.container_number);
      const containerId = normalizeText(row.id);
      if (containerNumber && containerId) {
        resolvedContainerIdByNumber.set(containerNumber, containerId);
      }
    }
  }
  const pickedUpTransferContainerIds = await loadPickedUpTransferContainerIds(
    containerRows
      .map((row) => {
        const directContainerId = normalizeText(row.container_id);
        if (directContainerId) return directContainerId;
        const containerNumber = normalizeContainerNumber(row.container_number);
        return containerNumber ? resolvedContainerIdByNumber.get(containerNumber) ?? "" : "";
      })
      .filter((value): value is string => Boolean(value))
  );

  const summaryMap = new Map<string, SummaryAccumulator>();
  const oneWayPlannedQtyByBucket = new Map<string, number>();

  const upsertBucket = (parts: ReturnType<typeof summaryBucketParts>) => {
    const key = summaryBucketKey(parts);
    const existing = summaryMap.get(key);
    if (existing) return existing;
    const created: SummaryAccumulator = {
      region: parts.region,
      city: parts.city,
      depot: parts.depot,
      sizeType: parts.sizeType,
      condition: parts.condition,
      color: parts.color,
      machineType: parts.machineType,
      hasFactoryOrder: false,
      hasNewOrUsedPurchase: false,
      containerInYardQty: 0,
      releasedUnnumberedQty: 0,
      pendingOfflineQty: 0,
      earliestEstimatedOfflineDate: null,
      earliestFreedayExpiryDate: null,
    };
    summaryMap.set(key, created);
    return created;
  };

  const pendingOutboundByBucket = await buildPendingOutboundQtyByBucket(filters);

  if (!normalizeText(filters.owner)) {
    for (const plan of oneWayPlanRows) {
      const bucket = buildSummaryBucketPartsFromOneWayPlan(plan);
      if (!matchesDispatchSummaryBucketFilters(bucket, filters)) {
        continue;
      }

      const bucketKey = summaryBucketKey(bucket);
      oneWayPlannedQtyByBucket.set(
        bucketKey,
        (oneWayPlannedQtyByBucket.get(bucketKey) ?? 0) + positiveNumber(plan.planned_qty)
      );
      upsertBucket(bucket);
    }
  }

  for (const row of containerRows) {
    const city = resolveLocationLabel({
      location: row.location ?? null,
    } as BaseContainerRowRaw);
    const depot = resolveDepotLabel({
      depot: row.depot ?? null,
    } as BaseContainerRowRaw);
    const sizeType = `${row.size?.size_code ?? ""}${row.type?.type_code ?? ""}` || "-";
    const condition = row.condition?.condition_code ?? "-";
    const bucket = upsertBucket(
      summaryBucketParts({
        region: row.location?.region,
        city,
        depot,
        sizeType,
        condition,
        color: row.color ?? "-",
        machineType: row.machine_type ?? "-",
      })
    );

    const purchaseType = row.purchase_order?.purchase_type ?? "";
    if (purchaseType === "FACTORY_ORDER") {
      bucket.hasFactoryOrder = true;
    }
    if (purchaseType === "NEW_CONTAINER" || purchaseType === "USED_CONTAINER") {
      bucket.hasNewOrUsedPurchase = true;
      const expiryDate = computeFreedayExpiryDate(
        resolveNonFactoryReleaseBaseDate(
          row.purchase_order?.vendor_release_date,
          row.offline_date,
          row.estimated_offline_date
        ),
        row.purchase_order?.freeday
      );
      if (expiryDate) {
        if (!bucket.earliestFreedayExpiryDate || expiryDate < bucket.earliestFreedayExpiryDate) {
          bucket.earliestFreedayExpiryDate = expiryDate;
        }
      }
    }

    const resolvedContainerId =
      normalizeText(row.container_id) ||
      resolvedContainerIdByNumber.get(normalizeContainerNumber(row.container_number)) ||
      "";
    const activeTransferPickedUp =
      Boolean(resolvedContainerId) && pickedUpTransferContainerIds.has(resolvedContainerId);
    if (row.container_status === "IN_YARD" && !activeTransferPickedUp) {
      bucket.containerInYardQty += 1;
    }
    if (
      shouldTreatReleasedNonFactoryPurchasedRowAsDepotInventory({
        purchaseType,
        orderStatus: row.purchase_order?.order_status,
        containerStatus: row.container_status,
      })
    ) {
      bucket.containerInYardQty += 1;
      const nextDate = formatDateForUi(row.estimated_offline_date);
      if (nextDate) {
        if (!bucket.earliestEstimatedOfflineDate || nextDate < bucket.earliestEstimatedOfflineDate) {
          bucket.earliestEstimatedOfflineDate = nextDate;
        }
      }
      continue;
    }
    if (row.container_status === "PURCHASED") {
      bucket.pendingOfflineQty += 1;
      const nextDate = formatDateForUi(row.estimated_offline_date);
      if (nextDate) {
        if (!bucket.earliestEstimatedOfflineDate || nextDate < bucket.earliestEstimatedOfflineDate) {
          bucket.earliestEstimatedOfflineDate = nextDate;
        }
      }
    }
  }

  for (const item of itemRows) {
    const purchaseType = item.purchase_order?.purchase_type ?? "";
    if (purchaseType !== "NEW_CONTAINER" && purchaseType !== "USED_CONTAINER") {
      continue;
    }

    const plannedQty = positiveNumber(item.planned_qty);
    const existingCount = nonCancelledContainerCountByItem.get(item.id) ?? 0;
    const remainder = Math.max(0, plannedQty - existingCount);
    if (remainder <= 0) continue;

    const bucket = upsertBucket(buildSummaryBucketPartsFromSummaryItem(item));

    if (purchaseType === "NEW_CONTAINER" || purchaseType === "USED_CONTAINER") {
      bucket.hasNewOrUsedPurchase = true;
      const expiryDate = computeFreedayExpiryDate(
        resolveNonFactoryReleaseBaseDate(
          item.purchase_order?.vendor_release_date,
          item.offline_date,
          item.estimated_offline_date
        ),
        item.purchase_order?.freeday
      );
      if (expiryDate) {
        if (!bucket.earliestFreedayExpiryDate || expiryDate < bucket.earliestFreedayExpiryDate) {
          bucket.earliestFreedayExpiryDate = expiryDate;
        }
      }
    }

    if (shouldCountNonFactoryRemainderInDepotInventory(item)) {
      bucket.releasedUnnumberedQty += remainder;
      continue;
    }

    if (!shouldCountNonFactoryRemainderInPendingOffline(item)) continue;

    bucket.pendingOfflineQty += remainder;
    const nextDate = formatDateForUi(item.estimated_offline_date);
    if (nextDate) {
      if (!bucket.earliestEstimatedOfflineDate || nextDate < bucket.earliestEstimatedOfflineDate) {
        bucket.earliestEstimatedOfflineDate = nextDate;
      }
    }
  }

  const rows: DepotDispatchSummaryRow[] = Array.from(summaryMap.values())
    .map((bucket) => {
      const bucketKey = summaryBucketKey(bucket);
      const depotInventoryQty = bucket.containerInYardQty + bucket.releasedUnnumberedQty;
      const pendingOutboundQty = pendingOutboundByBucket.get(bucketKey) ?? 0;
      const availableDepotQty = Math.max(0, depotInventoryQty - pendingOutboundQty);
      const plannedDispatchQty =
        resolvePlannedDispatchQty() + (oneWayPlannedQtyByBucket.get(bucketKey) ?? 0);
      const plannableDepotQty = Math.max(0, availableDepotQty - plannedDispatchQty);
      const totalPlannableQty = plannableDepotQty + bucket.pendingOfflineQty;
      const totalAvailableQty = availableDepotQty + bucket.pendingOfflineQty;

      return {
        id: summaryBucketKey(bucket),
        region: bucket.region,
        city: bucket.city,
        depot: bucket.depot,
        sizeType: bucket.sizeType,
        condition: bucket.condition,
        color: bucket.color,
        machineType: bucket.machineType,
        hasFactoryOrder: bucket.hasFactoryOrder,
        hasNewOrUsedPurchase: bucket.hasNewOrUsedPurchase,
        depotInventoryQty,
        pendingOutboundQty,
        availableDepotQty,
        plannedDispatchQty,
        plannableDepotQty,
        pendingOfflineQty: bucket.pendingOfflineQty,
        totalPlannableQty,
        totalAvailableQty,
        earliestEstimatedOfflineDate:
          bucket.pendingOfflineQty > 0 ? bucket.earliestEstimatedOfflineDate : null,
        earliestFreedayExpiryDate: bucket.earliestFreedayExpiryDate,
        shortageAlert: plannableDepotQty <= 0 && bucket.pendingOfflineQty <= 0,
      };
    })
    .sort((a, b) =>
      [
        a.region,
        a.city,
        a.depot,
        a.sizeType,
        a.condition,
        a.color,
        a.machineType,
      ]
        .join("|")
        .localeCompare(
          [
            b.region,
            b.city,
            b.depot,
            b.sizeType,
            b.condition,
            b.color,
            b.machineType,
          ].join("|"),
          undefined,
          { sensitivity: "base", numeric: true }
        )
    );

  return rows;
}

function salesBucketKey(input: {
  region: string;
  city: string;
  depot: string;
  sizeType: string;
  condition: string;
  color: string;
  machineType: string;
  flpLbeod: string;
}) {
  return [
    input.region,
    input.city,
    input.depot,
    input.sizeType,
    input.condition,
    input.color,
    input.machineType,
    input.flpLbeod,
  ]
    .map((value) => value.toUpperCase())
    .join("::");
}

async function buildSalesAvailabilityRows(filters: DepotSalesAvailabilityQuery) {
  let containerQuery = buildSalesAvailabilityContainerQuery();
  containerQuery = applySalesAvailabilityFilters(containerQuery, filters);
  containerQuery = containerQuery.order("container_number", { ascending: true });

  let itemQuery = buildSalesAvailabilityItemQuery();
  itemQuery = applySalesAvailabilityFilters(itemQuery, filters);

  const [{ data: containerData, error: containerError }, { data: itemData, error: itemError }] =
    await Promise.all([containerQuery, itemQuery]);

  if (containerError) throw new Error(containerError.message);
  if (itemError) throw new Error(itemError.message);

  const containerRows = ((containerData ?? []) as unknown) as Array<{
    id: string;
    purchase_order_item_id: string;
    container_status: DepotInventoryStatus | null;
    flp: boolean | null;
    lbx: boolean | null;
    locking_bars_count: number | null;
    color: string | null;
    machine_type: string | null;
    location?: { city_code: string | null; city_name: string | null; region: string | null } | null;
    depot?: { depot_code: string | null; depot_name: string | null } | null;
    size?: { size_code: string | null } | null;
    type?: { type_code: string | null } | null;
    condition?: { condition_code: string | null } | null;
  }>;
  const itemRows = ((itemData ?? []) as unknown) as SummaryItemRowRaw[];

  const inYardCountByItem = new Map<string, number>();
  for (const row of containerRows) {
    inYardCountByItem.set(
      row.purchase_order_item_id,
      (inYardCountByItem.get(row.purchase_order_item_id) ?? 0) + 1
    );
  }

  const summaryMap = new Map<string, SalesAccumulator>();

  const upsertBucket = (input: {
    region: string;
    city: string;
    depot: string;
    sizeType: string;
    condition: string;
    color: string;
    machineType: string;
    flpLbeod: string;
  }) => {
    const key = salesBucketKey(input);
    const existing = summaryMap.get(key);
    if (existing) return existing;
    const created: SalesAccumulator = {
      ...input,
      totalQty: 0,
    };
    summaryMap.set(key, created);
    return created;
  };

  for (const row of containerRows) {
    const bucket = upsertBucket({
      region: normalizeText(row.location?.region) || "-",
      city: resolveLocationLabel({ location: row.location ?? null } as BaseContainerRowRaw),
      depot: resolveDepotLabel({ depot: row.depot ?? null } as BaseContainerRowRaw),
      sizeType: `${row.size?.size_code ?? ""}${row.type?.type_code ?? ""}` || "-",
      condition: row.condition?.condition_code ?? "-",
      color: normalizeText(row.color) || "-",
      machineType: normalizeText(row.machine_type) || "-",
      flpLbeod: buildFlpLbEodValue({
        flp: row.flp,
        lbx: row.lbx,
        lockingBarsCount: row.locking_bars_count,
      }),
    });
    bucket.totalQty += 1;
  }

  for (const item of itemRows) {
    const purchaseType = item.purchase_order?.purchase_type ?? "";
    if (purchaseType !== "NEW_CONTAINER" && purchaseType !== "USED_CONTAINER") {
      continue;
    }

    const plannedQty = positiveNumber(item.planned_qty);
    const existingInYardCount = inYardCountByItem.get(item.id) ?? 0;
    const remainder = Math.max(0, plannedQty - existingInYardCount);
    if (remainder <= 0) continue;

    const bucket = upsertBucket({
      region: normalizeText(item.location?.region) || "-",
      city: resolveLocationLabel({ location: item.location ?? null } as BaseContainerRowRaw),
      depot: resolveDepotLabel({ depot: item.depot ?? null } as BaseContainerRowRaw),
      sizeType: `${item.size?.size_code ?? ""}${item.type?.type_code ?? ""}` || "-",
      condition: item.condition?.condition_code ?? "-",
      color: normalizeText(item.color) || "-",
      machineType: normalizeText(item.machine_type) || "-",
      flpLbeod: buildFlpLbEodValue({
        flp: item.flp,
        lbx: item.lbx,
        lockingBarsCount: item.locking_bars_count,
      }),
    });
    bucket.totalQty += remainder;
  }

  const rows: DepotSalesAvailabilityRow[] = Array.from(summaryMap.values())
    .map((bucket) => {
      const reservedQty = resolveReservedQty();
      const invoicedQty = resolveInvoicedQty();
      return {
        id: salesBucketKey(bucket),
        region: bucket.region,
        city: bucket.city,
        depot: bucket.depot,
        sizeType: bucket.sizeType,
        condition: bucket.condition,
        color: bucket.color,
        machineType: bucket.machineType,
        flpLbeod: bucket.flpLbeod,
        totalQty: bucket.totalQty,
        reservedQty,
        invoicedQty,
        availableQty: Math.max(0, bucket.totalQty - reservedQty - invoicedQty),
      };
    })
    .sort((a, b) =>
      [
        a.region,
        a.city,
        a.depot,
        a.sizeType,
        a.condition,
        a.color,
        a.machineType,
        a.flpLbeod,
      ]
        .join("|")
        .localeCompare(
          [
            b.region,
            b.city,
            b.depot,
            b.sizeType,
            b.condition,
            b.color,
            b.machineType,
            b.flpLbeod,
          ].join("|"),
          undefined,
          { sensitivity: "base", numeric: true }
        )
    );

  return rows;
}

export async function getDepotInventory(
  params: Partial<DepotInventoryQuery>
): Promise<DepotInventoryResult> {
  noStore();
  const query: DepotInventoryQuery = {
    ...EMPTY_QUERY,
    ...params,
    page: Math.max(1, Math.floor(params.page || EMPTY_QUERY.page)),
    pageSize: Math.min(100, Math.max(1, Math.floor(params.pageSize || EMPTY_QUERY.pageSize))),
    viewMode: (params.viewMode ?? EMPTY_QUERY.viewMode) as DepotInventoryViewMode,
    rangeGrouping: (params.rangeGrouping ?? EMPTY_QUERY.rangeGrouping) as DepotInventoryRangeGrouping,
    status: (params.status ?? EMPTY_QUERY.status) as DepotInventoryStatus | "",
    daysInDepot: (params.daysInDepot ?? EMPTY_QUERY.daysInDepot) as DepotInventoryDaysBucket,
  };

  const effectiveQuery: DepotInventoryQuery =
    query.viewMode === "range"
      ? {
          ...query,
          purchaseType: "FACTORY_ORDER",
        }
      : query;

  const viewerRole = await getViewerRole();
  const canSeePrice = canViewPurchasePrice(viewerRole);

  if (effectiveQuery.viewMode === "detail") {
    return getPagedDetailInventory(effectiveQuery, canSeePrice);
  }

  const detailRows = await loadAllFilteredRows(effectiveQuery, { forceFactoryOnly: true });

  if (effectiveQuery.viewMode === "range") {
    const paged = paginate(
      buildRangeRows(detailRows, effectiveQuery.rangeGrouping),
      effectiveQuery.page,
      effectiveQuery.pageSize
    );
    return {
      rows: paged.rows,
      totalCount: paged.totalCount,
      page: paged.page,
      pageSize: paged.pageSize,
      filters: effectiveQuery,
      canViewPurchasePrice: canSeePrice,
    };
  }

  const rows = canSeePrice
    ? detailRows
    : detailRows.map((row) => ({
        ...row,
        purchasePrice: null,
      }));

  const paged = paginate(rows, effectiveQuery.page, effectiveQuery.pageSize);
  return {
    rows: paged.rows,
    totalCount: paged.totalCount,
    page: paged.page,
    pageSize: paged.pageSize,
    filters: effectiveQuery,
    canViewPurchasePrice: canSeePrice,
  };
}

export async function exportDepotInventory(
  params: Partial<DepotInventoryQuery>
): Promise<DepotInventoryResult> {
  noStore();

  const query: DepotInventoryQuery = {
    ...EMPTY_QUERY,
    ...params,
    page: 1,
    pageSize: Math.min(10000, Math.max(1, Math.floor(params.pageSize || 10000))),
    viewMode: (params.viewMode ?? EMPTY_QUERY.viewMode) as DepotInventoryViewMode,
    rangeGrouping: (params.rangeGrouping ?? EMPTY_QUERY.rangeGrouping) as DepotInventoryRangeGrouping,
    status: (params.status ?? EMPTY_QUERY.status) as DepotInventoryStatus | "",
    daysInDepot: (params.daysInDepot ?? EMPTY_QUERY.daysInDepot) as DepotInventoryDaysBucket,
  };

  const effectiveQuery: DepotInventoryQuery =
    query.viewMode === "range"
      ? {
          ...query,
          purchaseType: "FACTORY_ORDER",
        }
      : query;

  const viewerRole = await getViewerRole();
  const canSeePrice = canViewPurchasePrice(viewerRole);

  const rows = await loadAllFilteredRows(effectiveQuery, {
    forceFactoryOnly: effectiveQuery.viewMode === "range",
  });

  if (effectiveQuery.viewMode === "range") {
    const groupedRows = buildRangeRows(rows, effectiveQuery.rangeGrouping);
    return {
      rows: groupedRows,
      totalCount: groupedRows.length,
      page: 1,
      pageSize: groupedRows.length,
      filters: effectiveQuery,
      canViewPurchasePrice: canSeePrice,
    };
  }

  return {
    rows: canSeePrice
      ? rows
      : rows.map((row) => ({
          ...row,
          purchasePrice: null,
        })),
    totalCount: rows.length,
    page: 1,
    pageSize: rows.length,
    filters: effectiveQuery,
    canViewPurchasePrice: canSeePrice,
  };
}

export async function getDepotDispatchSummary(
  params: Partial<DepotDispatchSummaryQuery>
): Promise<DepotDispatchSummaryResult> {
  noStore();

  const query: DepotDispatchSummaryQuery = {
    ...EMPTY_DISPATCH_SUMMARY_QUERY,
    ...params,
    page: Math.max(1, Math.floor(params.page || EMPTY_DISPATCH_SUMMARY_QUERY.page)),
    pageSize: Math.min(100, Math.max(1, Math.floor(params.pageSize || EMPTY_DISPATCH_SUMMARY_QUERY.pageSize))),
  };

  const rows = await buildDispatchSummaryRows(query);
  const paged = paginate(rows, query.page, query.pageSize);
  return {
    rows: paged.rows,
    totalCount: paged.totalCount,
    page: paged.page,
    pageSize: paged.pageSize,
    filters: query,
  };
}

export async function exportDepotDispatchSummary(
  params: Partial<DepotDispatchSummaryQuery>
): Promise<DepotDispatchSummaryResult> {
  noStore();

  const query: DepotDispatchSummaryQuery = {
    ...EMPTY_DISPATCH_SUMMARY_QUERY,
    ...params,
    page: 1,
    pageSize: Math.min(10000, Math.max(1, Math.floor(params.pageSize || 10000))),
  };

  const rows = await buildDispatchSummaryRows(query);
  return {
    rows,
    totalCount: rows.length,
    page: 1,
    pageSize: rows.length,
    filters: query,
  };
}

export async function getVendorReleaseSelectorRows(input: {
  region?: string;
  city?: string;
  depot?: string;
  sizeType?: string;
  condition?: string;
  color?: string;
  machineType?: string;
  purchaseOrderItemId?: string;
}): Promise<VendorReleaseSelectorRow[]> {
  noStore();

  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("v_vendor_release_selector_rows")
    .select(
      `
        purchase_order_item_id,
        purchase_order_id,
        order_no,
        purchase_type,
        line_no,
        vendor_release_number,
        vendor_release_date,
        freeday,
        offline_date,
        estimated_offline_date,
        location_city_code,
        location_city_name,
        depot_id,
        depot_code,
        depot_name,
        size_type,
        condition_code,
        color,
        machine_type,
        source_total_qty,
        vendor_release_used_qty,
        remaining_qty,
        vendor_release_attachment_count,
        has_vendor_release_attachment
      `
    )
    .gt("remaining_qty", 0)
    .order("vendor_release_number", { ascending: true })
    .order("order_no", { ascending: true })
    .order("line_no", { ascending: true });

  if (input.purchaseOrderItemId) {
    query = query.eq("purchase_order_item_id", input.purchaseOrderItemId);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  const rows = ((data ?? []) as unknown as VendorReleaseSelectorRowRaw[]).filter((row) => {
    const cityLabel =
      row.location_city_code && row.location_city_name
        ? `${row.location_city_code} · ${row.location_city_name}`
        : row.location_city_code || row.location_city_name || "-";
    const cityCode = row.location_city_code ?? "";
    const depotCode = row.depot_code ?? "";
    const depotName = row.depot_name ?? "";
    const depotLabel =
      depotCode && depotName
        ? `${depotCode} · ${depotName}`
        : depotCode || depotName || "-";

    if (
      input.region &&
      normalizedSummaryBucketMatch(input.region) !== normalizedSummaryBucketMatch(null)
    ) {
      // Region is not currently exposed in the helper view, so skip region-only filtering here.
    }

    return (
      (!input.city ||
        normalizedSummaryBucketMatch(input.city) === normalizedSummaryBucketMatch(cityLabel) ||
        normalizedSummaryBucketMatch(input.city) === normalizedSummaryBucketMatch(cityCode)) &&
      (!input.depot ||
        normalizedSummaryBucketMatch(input.depot) === normalizedSummaryBucketMatch(depotLabel) ||
        normalizedSummaryBucketMatch(input.depot) === normalizedSummaryBucketMatch(depotCode) ||
        normalizedSummaryBucketMatch(input.depot) === normalizedSummaryBucketMatch(depotName)) &&
      (!input.sizeType ||
        normalizedSummaryBucketMatch(input.sizeType) === normalizedSummaryBucketMatch(row.size_type)) &&
      (!input.condition ||
        normalizedSummaryBucketMatch(input.condition) ===
          normalizedSummaryBucketMatch(row.condition_code ?? "-")) &&
      (!input.color ||
        normalizedSummaryBucketMatch(input.color) === normalizedSummaryBucketMatch(row.color ?? "-")) &&
      (!input.machineType ||
        normalizedSummaryBucketMatch(input.machineType) ===
          normalizedSummaryBucketMatch(row.machine_type ?? "-"))
    );
  });

  return rows
    .map((row) => {
      const resolvedReleaseBaseDate = resolveNonFactoryReleaseBaseDate(
        row.vendor_release_date,
        row.offline_date,
        row.estimated_offline_date
      );
      const expiryDate = computeFreedayExpiryDate(resolvedReleaseBaseDate, row.freeday);
      return {
        purchaseOrderItemId: row.purchase_order_item_id,
        purchaseOrderId: row.purchase_order_id,
        orderNo: row.order_no ?? "-",
        purchaseType: row.purchase_type ?? "-",
        lineNo: row.line_no ?? 0,
        vendorReleaseNumber: row.vendor_release_number ?? "-",
        vendorReleaseDate: resolvedReleaseBaseDate || null,
        freeday: row.freeday ?? null,
        expiryDate: expiryDate || null,
        locationCityCode: row.location_city_code ?? "",
        locationCityName: row.location_city_name ?? "",
        depotId: row.depot_id ?? "",
        depotCode: row.depot_code ?? "",
        depotName: row.depot_name ?? row.depot_code ?? "-",
        sizeType: row.size_type ?? "-",
        condition: row.condition_code ?? "-",
        color: row.color ?? "-",
        machineType: row.machine_type ?? "-",
        sourceTotalQty: positiveNumber(row.source_total_qty),
        vendorReleaseUsedQty: positiveNumber(row.vendor_release_used_qty),
        remainingQty: positiveNumber(row.remaining_qty),
        vendorReleaseAttachmentCount: positiveNumber(row.vendor_release_attachment_count),
        hasVendorReleaseAttachment: Boolean(row.has_vendor_release_attachment),
      };
    })
    .sort((a, b) => {
      if (a.expiryDate && b.expiryDate && a.expiryDate !== b.expiryDate) {
        return a.expiryDate.localeCompare(b.expiryDate);
      }
      if (a.expiryDate && !b.expiryDate) return -1;
      if (!a.expiryDate && b.expiryDate) return 1;

      return (
        a.vendorReleaseNumber.localeCompare(b.vendorReleaseNumber, undefined, {
          sensitivity: "base",
          numeric: true,
        }) ||
        a.orderNo.localeCompare(b.orderNo, undefined, {
          sensitivity: "base",
          numeric: true,
        }) ||
        a.lineNo - b.lineNo
      );
    });
}

export async function getDispatchReleaseSelectableContainers(
  input: DispatchReleaseSelectableContainerQuery
): Promise<DispatchReleaseSelectableContainerRow[]> {
  noStore();

  let query = buildBaseRowsQuery()
    .eq("container_status", "IN_YARD")
    .order("container_number", { ascending: true });

  query = applyDispatchSummaryFilters(query, {
    region: normalizeDispatchReleaseBucketFilterValue(input.region),
    city: extractCityCode(input.city),
    depot: normalizeDispatchReleaseBucketFilterValue(input.depot),
    owner: normalizeDispatchReleaseBucketFilterValue(input.owner ?? ""),
    sizeType: normalizeDispatchReleaseBucketFilterValue(input.sizeType),
    condition: normalizeDispatchReleaseBucketFilterValue(input.condition),
    color: normalizeDispatchReleaseBucketFilterValue(input.color),
    machineType: normalizeDispatchReleaseBucketFilterValue(input.machineType),
  });

  if (input.releaseSource === "INTERNAL_FACTORY") {
    query = query.eq("purchase_order.purchase_type", "FACTORY_ORDER");
  }
  if (input.releaseSource === "VENDOR_REF" && input.sourcePurchaseOrderItemId) {
    query = query.eq("purchase_order_item_id", input.sourcePurchaseOrderItemId);
  }

  const [{ data, error }, currentTransferContainerIds] = await Promise.all([
    query,
    loadCurrentTransferContainerIds(input.currentTransferOrderId),
  ]);
  if (error) throw new Error(error.message);

  const rawRows = (data ?? []) as unknown as BaseContainerRowRaw[];
  let mergedRows = rawRows;

  const extraContainerIds = currentTransferContainerIds.filter(
    (containerId) =>
      containerId &&
      !rawRows.some((row) => normalizeText(row.container_id) === containerId)
  );

  if (extraContainerIds.length > 0) {
    let extraQuery = buildBaseRowsQuery()
      .in("container_id", extraContainerIds)
      .order("container_number", { ascending: true });

    extraQuery = applyDispatchSummaryFilters(extraQuery, {
      region: normalizeDispatchReleaseBucketFilterValue(input.region),
      city: extractCityCode(input.city),
      depot: normalizeDispatchReleaseBucketFilterValue(input.depot),
      owner: normalizeDispatchReleaseBucketFilterValue(input.owner ?? ""),
      sizeType: normalizeDispatchReleaseBucketFilterValue(input.sizeType),
      condition: normalizeDispatchReleaseBucketFilterValue(input.condition),
      color: normalizeDispatchReleaseBucketFilterValue(input.color),
      machineType: normalizeDispatchReleaseBucketFilterValue(input.machineType),
    });

    if (input.releaseSource === "INTERNAL_FACTORY") {
      extraQuery = extraQuery.eq("purchase_order.purchase_type", "FACTORY_ORDER");
    }
    if (input.releaseSource === "VENDOR_REF" && input.sourcePurchaseOrderItemId) {
      extraQuery = extraQuery.eq("purchase_order_item_id", input.sourcePurchaseOrderItemId);
    }

    const { data: extraData, error: extraError } = await extraQuery;
    if (extraError) throw new Error(extraError.message);

    const seenRowIds = new Set(rawRows.map((row) => row.id));
    const extraRows = ((extraData ?? []) as unknown as BaseContainerRowRaw[]).filter((row) => {
      if (seenRowIds.has(row.id)) return false;
      seenRowIds.add(row.id);
      return true;
    });
    mergedRows = [...rawRows, ...extraRows];
  }

  const containerIds = mergedRows
    .map((row) => row.container_id)
    .filter((value): value is string => Boolean(value));

  const [yardMap, allocatedContainerIds] = await Promise.all([
    loadActiveYardRecords(containerIds),
    loadActiveTransferAllocatedContainerIds(containerIds, input.currentTransferOrderId),
  ]);

  return mergedRows
    .filter((row) => {
      const containerId = normalizeText(row.container_id);
      const containerNumber = normalizeText(row.container_number);
      if (!containerNumber) return false;
      if (!containerId) return true;
      return !allocatedContainerIds.has(containerId);
    })
    .map((row) => ({
      id: row.id,
      purchaseOrderId: row.purchase_order_id,
      purchaseOrderItemId: row.purchase_order_item_id,
      containerId: row.container_id,
      containerNumber: row.container_number ?? "",
      region: resolveRegionLabel(row),
      city: resolveLocationLabel(row),
      depot: resolveDepotLabel(row),
      owner: resolveOwnerLabel(row),
      sizeType: sizeTypeLabel(row),
      condition: row.condition?.condition_code ?? "-",
      color: row.color ?? "-",
      machineType: row.machine_type ?? "-",
      flpLbeod: resolveFlpLbEod(row),
      purchaseType: row.purchase_order?.purchase_type ?? "-",
      purchaseOrderNo: row.purchase_order?.order_no ?? "-",
      estimatedOfflineDate: formatDateForUi(row.estimated_offline_date),
      gateInDate: formatDateForUi(resolveBusinessGateInDate(row, yardMap)),
    }));
}

export async function getNextDispatchReleaseNumber(cityValue: string): Promise<string> {
  noStore();

  const prefix = buildDispatchReleaseNumberPrefix(cityValue);
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("transfer_order")
    .select("order_no")
    .ilike("order_no", `${prefix}%`)
    .limit(10000);

  if (error) {
    throw new Error(error.message);
  }

  const matchingNumbers = (data ?? [])
    .map((row) => row.order_no ?? "")
    .filter((value): value is string => new RegExp(`^${prefix}\\d{6}$`).test(value));

  let maxSequence = 0;
  for (const value of matchingNumbers) {
    const numericPortion = value.slice(prefix.length);
    const parsed = Number.parseInt(numericPortion, 10);
    if (Number.isFinite(parsed) && parsed > maxSequence) {
      maxSequence = parsed;
    }
  }

  if (maxSequence >= 999999) {
    throw new Error(`Dispatch release numbers for prefix ${prefix} have reached capacity.`);
  }

  return `${prefix}${String(maxSequence + 1).padStart(6, "0")}`;
}

export async function getDepotSalesAvailability(
  params: Partial<DepotSalesAvailabilityQuery>
): Promise<DepotSalesAvailabilityResult> {
  noStore();

  const query: DepotSalesAvailabilityQuery = {
    ...EMPTY_SALES_AVAILABILITY_QUERY,
    ...params,
    page: Math.max(1, Math.floor(params.page || EMPTY_SALES_AVAILABILITY_QUERY.page)),
    pageSize: Math.min(
      100,
      Math.max(1, Math.floor(params.pageSize || EMPTY_SALES_AVAILABILITY_QUERY.pageSize))
    ),
  };

  const rows = await buildSalesAvailabilityRows(query);
  const paged = paginate(rows, query.page, query.pageSize);
  return {
    rows: paged.rows,
    totalCount: paged.totalCount,
    page: paged.page,
    pageSize: paged.pageSize,
    filters: query,
  };
}

export async function exportDepotSalesAvailability(
  params: Partial<DepotSalesAvailabilityQuery>
): Promise<DepotSalesAvailabilityResult> {
  noStore();

  const query: DepotSalesAvailabilityQuery = {
    ...EMPTY_SALES_AVAILABILITY_QUERY,
    ...params,
    page: 1,
    pageSize: Math.min(10000, Math.max(1, Math.floor(params.pageSize || 10000))),
  };

  const rows = await buildSalesAvailabilityRows(query);
  return {
    rows,
    totalCount: rows.length,
    page: 1,
    pageSize: rows.length,
    filters: query,
  };
}
