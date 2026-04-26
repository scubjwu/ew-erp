"use server";

import { headers } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  DepotInventoryAutocompleteOption,
  DepotInventoryContainerRow,
  DepotInventoryDaysBucket,
  DepotInventoryFilterOptions,
  DepotInventoryQuery,
  DepotInventoryRangeGrouping,
  DepotInventoryRangeRow,
  DepotInventoryResult,
  DepotInventoryStatus,
  DepotInventoryViewMode,
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
};

type YardRecordRow = {
  container_id: string;
  enter_time: string;
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
  purchaseType: "",
  supplier: "",
  purchaseOrderNo: "",
  sizeType: "",
  condition: "",
  color: "",
  containerNumber: "",
  containerNumberStart: "",
  containerNumberEnd: "",
  estimatedOfflineDate: "",
  offlineDate: "",
  daysInDepot: "",
  viewMode: "detail",
  rangeGrouping: "po_item",
  page: 1,
  pageSize: 20,
};

function normalizeText(value?: string | null) {
  return value?.trim() ?? "";
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

function resolveLocationLabel(raw: BaseContainerRowRaw) {
  const code = raw.location?.city_code ?? "";
  const name = raw.location?.city_name ?? "";
  if (code && name) return `${code} · ${name}`;
  return code || name || "-";
}

function resolveRegionLabel(raw: BaseContainerRowRaw) {
  return raw.location?.region ?? "-";
}

function resolveDepotLabel(raw: BaseContainerRowRaw) {
  return raw.depot?.depot_name ?? raw.depot?.depot_code ?? "-";
}

function resolveFlpLbEod(raw: BaseContainerRowRaw) {
  const flp = raw.flp ? "FLP" : "No";
  const lb = raw.lbx ? "LBX" : "No";
  const eod = raw.locking_bars_count === 3 ? "Yes" : "No";
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

  if (filters.estimatedOfflineDate) {
    query = query.eq("estimated_offline_date", filters.estimatedOfflineDate);
  }
  if (filters.offlineDate) {
    query = query.eq("offline_date", filters.offlineDate);
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

function decorateRows(rows: BaseContainerRowRaw[], yardMap: Map<string, string>): DecoratedContainerRow[] {
  return rows.map((row) => {
    const gateInDate = row.container_id ? yardMap.get(row.container_id) ?? null : null;
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
    supplierRows,
    purchaseOrderRows,
    colorRows,
    containerNumberRows,
    sizeTypeRows,
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
      .from("container_condition_codes")
      .select("condition_code")
      .order("condition_code", { ascending: true }),
  ]);

  const errors = [
    regionRows.error,
    locationRows.error,
    depotRows.error,
    supplierRows.error,
    purchaseOrderRows.error,
    colorRows.error,
    containerNumberRows.error,
    sizeTypeRows.error,
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
