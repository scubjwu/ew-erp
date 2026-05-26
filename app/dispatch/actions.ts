"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";

import {
  getDepotDispatchSummary,
  getDispatchReleaseSelectableContainers,
  getVendorReleaseSelectorRows,
} from "@/app/depot-inventory/actions";
import {
  buildTransferFinancePackage,
  buildTransferInvoiceDrafts,
} from "@/lib/dispatch-release-finance";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  FinancialExchangeRateInput,
  FinancialExchangeRateRow,
  TransferBusinessCostDraft,
  TransferBusinessRevenueDraft,
  TransferFinanceOrderSnapshot,
  TransferFinancePackage,
  TransferFinanceRecordDraft,
  TransferFinanceItemSnapshot,
} from "@/types/dispatch-finance";
import type {
  DispatchReleaseManagementQuery,
  DispatchReleaseManagementResult,
  DispatchReleaseManagementRow,
  DispatchReleaseCancelInput,
  DispatchReleaseHoldInput,
  DispatchReleasePersistInput,
  DispatchReleasePersistResult,
  DispatchReleaseUpdateInput,
  DispatchReleaseVendorDocument,
} from "@/types/dispatch-release";

const BASE_CURRENCY = "USD";
const DISPATCH_RELEASE_CURRENCIES = new Set([
  "USD",
  "CNY",
  "HKD",
  "EUR",
  "JPY",
  "SGD",
  "AUD",
  "CAD",
  "GBP",
  "RUB",
]);

type CodeRow = {
  id: string;
  code: string;
};

type TransferOrderDetail = {
  id: string;
  orderNo: string;
  status: string;
  transferType: string;
  releaseSource: string | null;
  sourcePurchaseOrderId: string | null;
  sourcePurchaseOrderItemId: string | null;
  vendorReleaseNumber: string | null;
  dispatchVendorId: string | null;
  releaseDate: string | null;
  polCode: string | null;
  dispatchPlanNo: string | null;
  carrierPlanNo: string | null;
  onhireNo: string | null;
  podCode: string | null;
  carrier: string | null;
  dispatchArrangeDate: string | null;
  remark: string | null;
  releaseQty: number;
  assignedQty: number;
  unassignedQty: number;
  pickedUpQty: number;
  nonPickedUpQty: number;
  pickupCharge: number;
  dpp: number;
  freeDays: number;
  rv: number;
  dailyRent: number;
  headerCurrency: string;
  itemCostCurrency: string;
  truckingCost: number;
  handlingFee: number;
  repairCostTotal: number;
  damageClaimTotal: number;
  truckingCostTotalInHeaderCurrency: number;
  repairCostTotalInHeaderCurrency: number;
  damageClaimTotalInHeaderCurrency: number;
  totalCost: number;
  totalRevenue: number;
  lesseeName: string;
  polLabel: string;
  podLabel: string;
  depotLabel: string;
  selfPickupDepotLabel: string;
  holdReason: string | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  sizeType: string;
  condition: string;
  color: string;
  machineType: string;
  sourceRegion: string;
  sourceCity: string;
  sourceDepot: string;
  containerSelectionMode: string | null;
};

type TransferItemDetail = {
  id: string;
  itemStatus: string;
  containerId: string;
  containerNumber: string;
  pickupDate: string | null;
  pickedUp: boolean;
  truckingCost: number;
  truckingCostCurrency: string;
  repairCost: number;
  repairCostCurrency: string;
  damageClaim: number;
  damageClaimCurrency: string;
  remark: string | null;
};

type TransferAttachmentDetail = DispatchReleaseVendorDocument & {
  inherited: boolean;
};

type TransferFinanceSummaryLine = {
  id: string;
  kind: "COST" | "REVENUE" | "RECORD";
  code: string;
  amount: number;
  occurDate: string | null;
  remark: string | null;
};

type TransferOrderMutationRow = {
  id: string;
  order_no: string | null;
  status: string | null;
  transfer_type: string | null;
  release_source: string | null;
  vendor_release_number: string | null;
  source_purchase_order_id: string | null;
  source_purchase_order_item_id: string | null;
  dispatch_vendor_id: string | null;
  release_date: string | null;
  pol_city_id: string | null;
  pod_city_id: string | null;
  dispatch_plan_no: string | null;
  carrier_plan_no: string | null;
  onhire_no: string | null;
  carrier: string | null;
  dispatch_arrange_date: string | null;
  self_pickup_depot_id: string | null;
  box_selection_mode: string | null;
  release_qty: number | null;
  assigned_qty: number | null;
  unassigned_qty: number | null;
  pickup_charge: number | null;
  dpp: number | null;
  free_days: number | null;
  rv: number | null;
  daily_rent: number | null;
  header_currency: string | null;
  item_cost_currency: string | null;
  trucking_cost: number | null;
  handling_fee: number | null;
  repair_cost_total: number | null;
  damage_claim_total: number | null;
  trucking_cost_total_in_header_currency: number | null;
  repair_cost_total_in_header_currency: number | null;
  damage_claim_total_in_header_currency: number | null;
  total_cost: number | null;
  total_revenue: number | null;
  remark: string | null;
  hold_reason: string | null;
  cancel_reason: string | null;
  cancelled_at: string | null;
};

type TransferItemMutationRow = {
  id: string;
  item_status: string | null;
  delivery_date: string | null;
  trucking_cost: number | null;
  trucking_cost_currency: string | null;
  repair_cost: number | null;
  repair_cost_currency: string | null;
  damage_claim: number | null;
  damage_claim_currency: string | null;
  remark: string | null;
  container:
    | {
        id?: string | null;
        container_number?: string | null;
      }
    | Array<{
        id?: string | null;
        container_number?: string | null;
      }>
    | null;
};

type ResolvedSelectedContainer = {
  transferItemId?: string;
  containerId: string | null;
  containerNumber: string;
  purchaseOrderId: string;
  purchaseOrderItemId: string;
  pickupDate: string | null;
  truckingCost: number;
  truckingCostCurrency: string;
  repairCost: number;
  repairCostCurrency: string;
  damageClaim: number;
  damageClaimCurrency: string;
  remark: string | null;
};

type PurchaseOrderItemWritebackRow = {
  id: string;
  purchase_order_id: string | null;
  location_city_id: string | null;
  depot_id: string | null;
  container_size_code_id: string | null;
  container_type_code_id: string | null;
  container_condition_code_id: string | null;
  color: string | null;
  flp: boolean | null;
  lbx: boolean | null;
  locking_bars_count: number | null;
  vents_count: number | null;
  machine_type: string | null;
  yom: number | null;
  planned_pod: string | null;
  tare_weight: number | null;
  maximum_weight: number | null;
  csc_number: string | null;
  planned_qty: number | null;
  unit_price: number | null;
  financial_cost: number | null;
  purchase_order:
    | {
        owner_id?: string | null;
        purchase_date?: string | null;
      }
    | Array<{
        owner_id?: string | null;
        purchase_date?: string | null;
      }>
    | null;
};

type PurchaseOrderContainerWritebackRow = {
  id: string;
  purchase_order_item_id: string | null;
  container_id: string | null;
  container_number: string | null;
  offline_date: string | null;
  container_status: string | null;
  item_status: string | null;
};

export type DispatchReleaseDetailResult = {
  order: TransferOrderDetail;
  items: TransferItemDetail[];
  attachments: TransferAttachmentDetail[];
  finance: TransferFinanceSummaryLine[];
  invoiceDrafts: {
    payable: Array<ReturnType<typeof buildTransferInvoiceDrafts>>;
    receivable: Array<ReturnType<typeof buildTransferInvoiceDrafts>>;
  };
};

type FinancialExchangeRateDbRow = {
  id: string;
  rate_date: string;
  from_currency: string;
  to_currency: string;
  exchange_rate: number;
  is_active: boolean;
  remark: string | null;
  created_at: string;
  updated_at: string;
};

type DispatchReleaseManagementOrderRow = {
  id: string;
  order_no: string | null;
  status: string | null;
  onhire_no: string | null;
  vendor_release_number: string | null;
  release_qty: number | null;
  source_purchase_order_item_id: string | null;
  pol: { city_code?: string | null } | { city_code?: string | null }[] | null;
  pod: { city_code?: string | null } | { city_code?: string | null }[] | null;
  dispatch_vendor:
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
};

type DispatchReleaseManagementSourceItemRow = {
  id: string;
  color: string | null;
  machine_type: string | null;
  location?:
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
  depot?:
    | {
        depot_code?: string | null;
        depot_name?: string | null;
      }
    | Array<{
        depot_code?: string | null;
        depot_name?: string | null;
      }>
    | null;
  size:
    | {
        size_code?: string | null;
      }
    | Array<{ size_code?: string | null }>
    | null;
  type:
    | {
        type_code?: string | null;
      }
    | Array<{ type_code?: string | null }>
    | null;
  condition:
    | {
        condition_code?: string | null;
      }
    | Array<{ condition_code?: string | null }>
    | null;
};

const COST_CODES = ["TRU", "HDL", "REP"] as const;
const REVENUE_CODES = ["PUC", "RPR", "DMR"] as const;

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function normalizeBucketFilterValue(value: string | null | undefined) {
  const normalized = normalizeText(value);
  return normalized === "-" ? "" : normalized;
}

function extractCityCode(value: string | null | undefined) {
  const normalized = normalizeBucketFilterValue(value);
  if (!normalized) return "";
  const firstSegment = normalized.split("·")[0]?.trim() ?? "";
  const codeCandidate = firstSegment || normalized;
  return codeCandidate.split(/\s+/)[0]?.trim().toUpperCase() ?? "";
}

function normalizedBucketMatch(value: string | null | undefined) {
  return normalizeBucketFilterValue(value).toUpperCase();
}

function extractBucketCode(value: string | null | undefined) {
  const normalized = normalizeBucketFilterValue(value);
  if (!normalized) return "";
  const firstSegment = normalized.split("·")[0]?.trim() ?? "";
  const codeCandidate = firstSegment || normalized;
  return codeCandidate.split(/\s+/)[0]?.trim().toUpperCase() ?? "";
}

function buildDepotBucketLabel(depotCode: string | null | undefined, depotName: string | null | undefined) {
  const code = normalizeBucketFilterValue(depotCode);
  const name = normalizeBucketFilterValue(depotName);
  if (code && name) return `${code} · ${name}`;
  return code || name;
}

function matchesDepotBucketValue(
  depotCode: string | null | undefined,
  depotName: string | null | undefined,
  bucketDepot: string | null | undefined
) {
  const bucketValue = normalizeBucketFilterValue(bucketDepot);
  if (!bucketValue) return true;

  const normalizedBucket = normalizedBucketMatch(bucketValue);
  const normalizedDepotCode = normalizedBucketMatch(depotCode);
  const normalizedDepotName = normalizedBucketMatch(depotName);
  const normalizedDepotLabel = normalizedBucketMatch(buildDepotBucketLabel(depotCode, depotName));
  const bucketCode = extractBucketCode(bucketValue);

  return (
    normalizedDepotCode === normalizedBucket ||
    normalizedDepotName === normalizedBucket ||
    normalizedDepotLabel === normalizedBucket ||
    (!!bucketCode && normalizedDepotCode === bucketCode)
  );
}

function matchesBucketRowContext(
  row: {
    region: string | null | undefined;
    city: string | null | undefined;
    depot: string | null | undefined;
    sizeType: string | null | undefined;
    condition: string | null | undefined;
    color: string | null | undefined;
    machineType: string | null | undefined;
  },
  bucket: {
    region: string | null | undefined;
    city: string | null | undefined;
    depot: string | null | undefined;
    sizeType: string | null | undefined;
    condition: string | null | undefined;
    color: string | null | undefined;
    machineType: string | null | undefined;
  }
) {
  const rowDepotCode = extractBucketCode(row.depot);
  const rowDepotName = normalizeBucketFilterValue(row.depot)
    .split("·")
    .slice(1)
    .join("·")
    .trim();
  const bucketDepotCode = extractBucketCode(bucket.depot);
  const bucketDepotName = normalizeBucketFilterValue(bucket.depot)
    .split("·")
    .slice(1)
    .join("·")
    .trim();

  return (
    normalizedBucketMatch(row.region) === normalizedBucketMatch(bucket.region) &&
    extractCityCode(row.city) === extractCityCode(bucket.city) &&
    (matchesDepotBucketValue(rowDepotCode || row.depot, rowDepotName || row.depot, bucket.depot) ||
      matchesDepotBucketValue(bucketDepotCode || bucket.depot, bucketDepotName || bucket.depot, row.depot)) &&
    normalizedBucketMatch(row.sizeType) === normalizedBucketMatch(bucket.sizeType) &&
    normalizedBucketMatch(row.condition) === normalizedBucketMatch(bucket.condition) &&
    normalizedBucketMatch(row.color) === normalizedBucketMatch(bucket.color) &&
    normalizedBucketMatch(row.machineType) === normalizedBucketMatch(bucket.machineType)
  );
}

function normalizeContainerNumber(value: string | null | undefined) {
  return normalizeText(value).toUpperCase();
}

function toNumber(value: number | string | null | undefined) {
  if (value == null || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toInteger(value: number | string | null | undefined) {
  return Math.max(0, Math.trunc(toNumber(value)));
}

function resolveBucketCapacityLimit(freshValue: number, currentValue: number) {
  const normalizedFresh = Number.isFinite(freshValue) ? freshValue : 0;
  const normalizedCurrent = Number.isFinite(currentValue) ? currentValue : 0;
  if (normalizedFresh === 0 && normalizedCurrent > 0) {
    return normalizedCurrent;
  }
  return normalizedFresh;
}

function formatDate(value: string | null | undefined) {
  const normalized = normalizeText(value);
  return normalized ? normalized.slice(0, 10) : null;
}

function formatCityLabel(row: { city_code?: string | null; city_name?: string | null } | null) {
  if (!row) return "-";
  const code = normalizeText(row.city_code);
  const name = normalizeText(row.city_name);
  if (code && name) return `${code} · ${name}`;
  return code || name || "-";
}

function firstRelationRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function formatMoney(value: number | string | null | undefined) {
  return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
}

function normalizeDispatchReleaseCurrency(value: string | null | undefined) {
  const normalized = normalizeText(value).toUpperCase();
  if (!normalized) return BASE_CURRENCY;
  if (!DISPATCH_RELEASE_CURRENCIES.has(normalized)) {
    throw new Error(
      `Unsupported currency ${normalized}. Allowed currencies: ${Array.from(
        DISPATCH_RELEASE_CURRENCIES
      ).join(", ")}.`
    );
  }
  return normalized;
}

function mapFinancialExchangeRateRow(
  row: FinancialExchangeRateDbRow
): FinancialExchangeRateRow {
  return {
    id: row.id,
    rateDate: row.rate_date,
    fromCurrency: normalizeDispatchReleaseCurrency(
      row.from_currency
    ) as FinancialExchangeRateInput["fromCurrency"],
    toCurrency: normalizeDispatchReleaseCurrency(
      row.to_currency
    ) as FinancialExchangeRateInput["toCurrency"],
    exchangeRate: toNumber(row.exchange_rate),
    isActive: Boolean(row.is_active),
    remark: row.remark,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildExchangeRateKey(rateDate: string, fromCurrency: string, toCurrency: string) {
  return `${rateDate}|${fromCurrency}|${toCurrency}`;
}

async function loadFinancialExchangeRates(
  requests: Array<{ rateDate: string; fromCurrency: string; toCurrency: string }>
) {
  const requestedPairs = Array.from(
    new Map(
      requests
        .map((pair) => {
          const normalizedRateDate = formatDate(pair.rateDate);
          if (!normalizedRateDate) {
            throw new Error("Release Date is required to resolve financial exchange rates.");
          }
          return {
            rateDate: normalizedRateDate,
          fromCurrency: normalizeDispatchReleaseCurrency(pair.fromCurrency),
          toCurrency: normalizeDispatchReleaseCurrency(pair.toCurrency),
          };
        })
        .filter((pair) => pair.fromCurrency !== pair.toCurrency)
        .map((pair) => [
          buildExchangeRateKey(pair.rateDate, pair.fromCurrency, pair.toCurrency),
          pair,
        ])
    ).values()
  );

  if (requestedPairs.length === 0) {
    return [] as FinancialExchangeRateRow[];
  }

  const supabase = createServerSupabaseClient();
  const maxRateDate = requestedPairs.reduce(
    (latest, pair) => (pair.rateDate > latest ? pair.rateDate : latest),
    requestedPairs[0]?.rateDate ?? ""
  );
  const fromCurrencies = Array.from(new Set(requestedPairs.map((pair) => pair.fromCurrency)));
  const toCurrencies = Array.from(new Set(requestedPairs.map((pair) => pair.toCurrency)));
  const { data, error } = await supabase
    .from("financial_exchange_rate")
    .select(
      "id, rate_date, from_currency, to_currency, exchange_rate, is_active, remark, created_at, updated_at"
    )
    .lte("rate_date", maxRateDate)
    .eq("is_active", true)
    .in("from_currency", fromCurrencies)
    .in("to_currency", toCurrencies)
    .order("rate_date", { ascending: false })
    .order("from_currency", { ascending: true })
    .order("to_currency", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const exchangeRates = ((data ?? []) as FinancialExchangeRateDbRow[]).map(
    mapFinancialExchangeRateRow
  );

  for (const pair of requestedPairs) {
    resolveExchangeRate(pair.rateDate, pair.fromCurrency, pair.toCurrency, exchangeRates);
  }

  return exchangeRates;
}

export async function getFinancialExchangeRatesForDate(rateDate: string) {
  noStore();

  const normalizedRateDate = formatDate(rateDate);
  if (!normalizedRateDate) return [];

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("financial_exchange_rate")
    .select(
      "id, rate_date, from_currency, to_currency, exchange_rate, is_active, remark, created_at, updated_at"
    )
    .lte("rate_date", normalizedRateDate)
    .eq("is_active", true)
    .order("rate_date", { ascending: false })
    .order("from_currency", { ascending: true })
    .order("to_currency", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as FinancialExchangeRateDbRow[]).map(mapFinancialExchangeRateRow);
}

export async function getFinancialExchangeRatesForDates(rateDates: string[]) {
  noStore();

  const normalizedRateDates = Array.from(
    new Set(rateDates.map((rateDate) => formatDate(rateDate)).filter(Boolean))
  ) as string[];
  if (normalizedRateDates.length === 0) return [];
  const maxRateDate = normalizedRateDates.reduce((latest, rateDate) =>
    rateDate > latest ? rateDate : latest
  );

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("financial_exchange_rate")
    .select(
      "id, rate_date, from_currency, to_currency, exchange_rate, is_active, remark, created_at, updated_at"
    )
    .lte("rate_date", maxRateDate)
    .eq("is_active", true)
    .order("rate_date", { ascending: false })
    .order("from_currency", { ascending: true })
    .order("to_currency", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as FinancialExchangeRateDbRow[]).map(mapFinancialExchangeRateRow);
}

function resolveExchangeRate(
  rateDate: string,
  fromCurrency: string,
  toCurrency: string,
  exchangeRates: FinancialExchangeRateRow[]
) {
  const normalizedFrom = normalizeDispatchReleaseCurrency(fromCurrency);
  const normalizedTo = normalizeDispatchReleaseCurrency(toCurrency);
  if (normalizedFrom === normalizedTo) return 1;

  const normalizedRateDate = formatDate(rateDate);
  if (!normalizedRateDate) {
    throw new Error("Release Date is required to resolve financial exchange rates.");
  }

  const matchedRate = exchangeRates.find(
    (row) =>
      row.fromCurrency === normalizedFrom &&
      row.toCurrency === normalizedTo &&
      row.rateDate <= normalizedRateDate
  );
  if (!matchedRate) {
    throw new Error(
      `Financial exchange rate is missing for ${normalizedFrom} -> ${normalizedTo} on ${normalizedRateDate}.`
    );
  }
  return matchedRate.exchangeRate;
}

function convertCurrencyAmount(
  amount: number | string | null | undefined,
  rateDate: string,
  fromCurrency: string,
  toCurrency: string,
  exchangeRates: FinancialExchangeRateRow[]
) {
  const normalizedAmount = formatMoney(amount);
  if (normalizedAmount === 0) return 0;
  const rate = resolveExchangeRate(rateDate, fromCurrency, toCurrency, exchangeRates);
  return formatMoney(normalizedAmount * rate);
}

const EMPTY_DISPATCH_RELEASE_MANAGEMENT_QUERY: DispatchReleaseManagementQuery = {
  releaseNumber: "",
  status: "",
  pol: "",
  pod: "",
  lessee: "",
  onhireNumber: "",
  vendorReleaseNumber: "",
  sizeType: "",
  condition: "",
  color: "",
  machineType: "",
  containerNumber: "",
  page: 1,
  pageSize: 20,
  sortBy: "releaseNumber",
  sortDirection: "desc",
};

function formatLesseeLabel(input: {
  lessee_code?: string | null;
  company_name?: string | null;
  legal_company_name?: string | null;
}) {
  const code = normalizeText(input.lessee_code);
  const name =
    normalizeText(input.company_name) ||
    normalizeText(input.legal_company_name);
  if (code && name) return `${code} · ${name}`;
  return code || name || "-";
}

function formatDispatchReleaseStatus(rawStatus: string | null | undefined) {
  switch (normalizeText(rawStatus)) {
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
      return normalizeText(rawStatus) || "-";
  }
}

function buildDispatchReleaseSizeType(row: DispatchReleaseManagementSourceItemRow | null | undefined) {
  const sizeCode = normalizeText(firstRelationRow(row?.size)?.size_code);
  const typeCode = normalizeText(firstRelationRow(row?.type)?.type_code);
  return `${sizeCode}${typeCode}` || "-";
}

function buildDispatchReleaseCondition(row: DispatchReleaseManagementSourceItemRow | null | undefined) {
  return normalizeText(firstRelationRow(row?.condition)?.condition_code) || "-";
}

function matchesVendorReleaseBucket(
  row: {
    locationCityCode: string;
    depotName: string;
    depotCode: string;
    sizeType: string;
    condition: string;
    color: string;
    machineType: string;
  },
  bucket: DispatchReleasePersistInput["bucket"]
) {
  return (
    normalizedBucketMatch(row.locationCityCode) === normalizedBucketMatch(extractCityCode(bucket.city)) &&
    matchesDepotBucketValue(row.depotCode, row.depotName, bucket.depot) &&
    normalizedBucketMatch(row.sizeType) === normalizedBucketMatch(bucket.sizeType) &&
    normalizedBucketMatch(row.condition) === normalizedBucketMatch(bucket.condition) &&
    normalizedBucketMatch(row.color) === normalizedBucketMatch(bucket.color) &&
    normalizedBucketMatch(row.machineType) === normalizedBucketMatch(bucket.machineType)
  );
}

function buildDispatchReleasePickedUpCounts(
  rows: Array<{ business_id: string | null; container_id: string | null }>
) {
  const counts = new Map<string, number>();
  const seen = new Set<string>();
  for (const row of rows) {
    const transferOrderId = normalizeText(row.business_id);
    const containerId = normalizeText(row.container_id);
    if (!transferOrderId || !containerId) continue;
    const key = `${transferOrderId}:${containerId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    counts.set(transferOrderId, (counts.get(transferOrderId) ?? 0) + 1);
  }
  return counts;
}

function matchesDispatchReleaseManagementRow(
  row: DispatchReleaseManagementRow,
  query: DispatchReleaseManagementQuery
) {
  const contains = (haystack: string, needle: string) =>
    !normalizeText(needle) ||
    normalizeText(haystack).toUpperCase().includes(normalizeText(needle).toUpperCase());

  return (
    contains(row.releaseNumber, query.releaseNumber) &&
    (!normalizeText(query.status) ||
      normalizeText(row.status).toUpperCase() === normalizeText(query.status).toUpperCase()) &&
    contains(row.pol, query.pol) &&
    contains(row.pod, query.pod) &&
    contains(row.lessee, query.lessee) &&
    contains(row.onhireNumber, query.onhireNumber) &&
    contains(row.vendorReleaseNumber, query.vendorReleaseNumber) &&
    contains(row.sizeType, query.sizeType) &&
    contains(row.condition, query.condition) &&
    contains(row.color, query.color) &&
    contains(row.machineType, query.machineType) &&
    (!normalizeText(query.containerNumber) ||
      row.containerNumbers.some((value) =>
        normalizeText(value).toUpperCase().includes(normalizeText(query.containerNumber).toUpperCase())
      ))
  );
}

function compareDispatchReleaseManagementRows(
  left: DispatchReleaseManagementRow,
  right: DispatchReleaseManagementRow,
  sortBy: DispatchReleaseManagementQuery["sortBy"],
  sortDirection: DispatchReleaseManagementQuery["sortDirection"]
) {
  const direction = sortDirection === "asc" ? 1 : -1;
  const compareText = (a: string, b: string) =>
    a.localeCompare(b, undefined, { sensitivity: "base" });
  const compareNumber = (a: number, b: number) => a - b;

  let result = 0;
  switch (sortBy) {
    case "pol":
      result = compareText(left.pol, right.pol);
      break;
    case "pod":
      result = compareText(left.pod, right.pod);
      break;
    case "lessee":
      result = compareText(left.lessee, right.lessee);
      break;
    case "onhireNumber":
      result = compareText(left.onhireNumber, right.onhireNumber);
      break;
    case "vendorReleaseNumber":
      result = compareText(left.vendorReleaseNumber, right.vendorReleaseNumber);
      break;
    case "sizeType":
      result = compareText(left.sizeType, right.sizeType);
      break;
    case "condition":
      result = compareText(left.condition, right.condition);
      break;
    case "color":
      result = compareText(left.color, right.color);
      break;
    case "machineType":
      result = compareText(left.machineType, right.machineType);
      break;
    case "totalQuantity":
      result = compareNumber(left.totalQuantity, right.totalQuantity);
      break;
    case "pu":
      result = compareNumber(left.pu, right.pu);
      break;
    case "npu":
      result = compareNumber(left.npu, right.npu);
      break;
    case "status":
      result = compareText(left.status, right.status);
      break;
    case "releaseNumber":
    default:
      result = compareText(left.releaseNumber, right.releaseNumber);
      break;
  }

  if (result !== 0) return result * direction;
  return compareText(left.releaseNumber, right.releaseNumber) * -1;
}

function requireValue(label: string, value: string | null | undefined) {
  const normalized = normalizeText(value);
  if (!normalized) {
    throw new Error(`${label} is required.`);
  }
  return normalized;
}

async function resolveTransferItemEventDates(
  transferOrderId: string,
  containerIds: string[],
  eventType: "TRANSFER_OUT" | "TRANSFER_IN"
): Promise<Record<string, string | null>> {
  noStore();

  const normalizedIds = Array.from(new Set(containerIds.map((value) => value.trim()).filter(Boolean)));
  if (!transferOrderId.trim() || normalizedIds.length === 0) {
    return {};
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("container_event")
    .select("container_id, event_time")
    .eq("business_type", "TRANSFER")
    .eq("business_id", transferOrderId)
    .eq("event_type", eventType)
    .eq("is_void", false)
    .in("container_id", normalizedIds)
    .order("event_time", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const eventDates: Record<string, string | null> = {};
  for (const containerId of normalizedIds) {
    eventDates[containerId] = null;
  }

  for (const row of data ?? []) {
    const containerId = typeof row.container_id === "string" ? row.container_id : "";
    if (!containerId || eventDates[containerId]) continue;
    eventDates[containerId] =
      typeof row.event_time === "string" && row.event_time.trim() ? row.event_time : null;
  }

  return eventDates;
}

export async function resolveTransferItemPickupDates(
  transferOrderId: string,
  containerIds: string[]
): Promise<Record<string, string | null>> {
  return resolveTransferItemEventDates(transferOrderId, containerIds, "TRANSFER_OUT");
}

export async function resolveTransferItemPickupDate(
  containerId: string,
  transferOrderId: string
): Promise<string | null> {
  const pickupDates = await resolveTransferItemPickupDates(transferOrderId, [containerId]);
  return pickupDates[containerId] ?? null;
}

export async function resolveTransferItemReturnDates(
  transferOrderId: string,
  containerIds: string[]
): Promise<Record<string, string | null>> {
  return resolveTransferItemEventDates(transferOrderId, containerIds, "TRANSFER_IN");
}

export async function resolveTransferItemReturnDate(
  containerId: string,
  transferOrderId: string
): Promise<string | null> {
  const returnDates = await resolveTransferItemReturnDates(transferOrderId, [containerId]);
  return returnDates[containerId] ?? null;
}

async function resolveCityIdsByCode(cityCodes: string[]) {
  const normalizedCodes = Array.from(
    new Set(cityCodes.map((value) => normalizeText(value).toUpperCase()).filter(Boolean))
  );
  if (normalizedCodes.length === 0) {
    return new Map<string, string>();
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("cities")
    .select("id, city_code")
    .in("city_code", normalizedCodes);

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    (data ?? [])
      .map((row) => {
        const code = normalizeText(row.city_code).toUpperCase();
        const id = normalizeText(row.id);
        return code && id ? ([code, id] as const) : null;
      })
      .filter((entry): entry is readonly [string, string] => Boolean(entry))
  );
}

async function resolveDepotIdByNameOrCode(value: string) {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  const supabase = createServerSupabaseClient();
  let { data, error } = await supabase
    .from("depots")
    .select("id")
    .eq("depot_name", normalized)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data?.id) return data.id as string;

  ({ data, error } = await supabase
    .from("depots")
    .select("id")
    .eq("depot_code", normalized)
    .limit(1)
    .maybeSingle());

  if (error) {
    throw new Error(error.message);
  }

  return (data?.id as string | undefined) ?? null;
}

function parseSizeType(value: string) {
  const normalized = normalizeText(value).replace(/\s+/g, "").toUpperCase();
  const sizeMatch = normalized.match(/^(\d+)/);
  const typeCode = normalized.replace(/^\d+/, "");
  return {
    sizeCode: sizeMatch?.[1] ?? "",
    typeCode,
  };
}

type DispatchReleaseFallbackSourceItemRow = {
  transferOrderId: string;
  sourceItem: DispatchReleaseManagementSourceItemRow | null;
};

async function loadFallbackSourceItemsByTransferOrderIds(
  transferOrderIds: string[]
): Promise<Map<string, DispatchReleaseManagementSourceItemRow>> {
  const normalizedOrderIds = Array.from(
    new Set(transferOrderIds.map((value) => normalizeText(value)).filter(Boolean))
  );
  if (normalizedOrderIds.length === 0) {
    return new Map<string, DispatchReleaseManagementSourceItemRow>();
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("transfer_item")
    .select(
      `
        transfer_order_id,
        container:container_id(
          id,
          purchase_order_container(
            purchase_order_item_id,
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

  const sourceItemByOrderId = new Map<string, DispatchReleaseManagementSourceItemRow>();
  for (const row of (data ?? []) as Array<{
    transfer_order_id: string | null;
    container:
      | {
          purchase_order_container?:
            | Array<{
                item?:
                  | DispatchReleaseManagementSourceItemRow
                  | DispatchReleaseManagementSourceItemRow[]
                  | null;
              }>
            | {
                item?:
                  | DispatchReleaseManagementSourceItemRow
                  | DispatchReleaseManagementSourceItemRow[]
                  | null;
              }
            | null;
        }
      | Array<{
          purchase_order_container?:
            | Array<{
                item?:
                  | DispatchReleaseManagementSourceItemRow
                  | DispatchReleaseManagementSourceItemRow[]
                  | null;
              }>
            | {
                item?:
                  | DispatchReleaseManagementSourceItemRow
                  | DispatchReleaseManagementSourceItemRow[]
                  | null;
              }
            | null;
        }>
      | null;
  }>) {
    const transferOrderId = normalizeText(row.transfer_order_id);
    if (!transferOrderId || sourceItemByOrderId.has(transferOrderId)) continue;
    const containerRow = firstRelationRow(row.container);
    const purchaseOrderContainer = firstRelationRow(
      containerRow?.purchase_order_container as
        | Array<{ item?: DispatchReleaseManagementSourceItemRow | DispatchReleaseManagementSourceItemRow[] | null }>
        | { item?: DispatchReleaseManagementSourceItemRow | DispatchReleaseManagementSourceItemRow[] | null }
        | null
    );
    const sourceItem = firstRelationRow(
      purchaseOrderContainer?.item as
        | DispatchReleaseManagementSourceItemRow
        | DispatchReleaseManagementSourceItemRow[]
        | null
    );
    if (sourceItem) {
      sourceItemByOrderId.set(transferOrderId, sourceItem);
    }
  }

  return sourceItemByOrderId;
}

async function resolveSourceItemAnchor(input: DispatchReleasePersistInput) {
  const existingItemId = normalizeText(input.sourcePurchaseOrderItemId);
  const existingOrderId = normalizeText(input.sourcePurchaseOrderId);
  if (existingItemId || existingOrderId) {
    return {
      purchaseOrderItemId: existingItemId,
      purchaseOrderId: existingOrderId,
    };
  }

  if (input.releaseSource === "VENDOR_REF") {
    return {
      purchaseOrderItemId: "",
      purchaseOrderId: "",
    };
  }

  const supabase = createServerSupabaseClient();
  const { sizeCode, typeCode } = parseSizeType(input.bucket.sizeType);
  const cityCode = extractCityCode(input.bucket.city);
  const depotValue = normalizeBucketFilterValue(input.bucket.depot);
  const condition = normalizeBucketFilterValue(input.bucket.condition);
  const color = normalizeBucketFilterValue(input.bucket.color);
  const machineType = normalizeBucketFilterValue(input.bucket.machineType);
  const purchaseTypes =
    input.releaseSource === "INTERNAL_FACTORY"
      ? ["FACTORY_ORDER"]
      : ["NEW_CONTAINER", "USED_CONTAINER", "FACTORY_ORDER"];

  const { data, error } = await supabase
    .from("purchase_order_item")
    .select(
      `
        id,
        purchase_order_id,
        purchase_order!inner(purchase_type),
        location:cities!inner(city_code),
        depot:depots!inner(depot_name, depot_code),
        size:container_size_codes!inner(size_code),
        type:container_type_codes!inner(type_code),
        condition:container_condition_codes!inner(condition_code),
        color,
        machine_type
      `
    )
    .limit(200);

  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data ?? []) as Array<{
    id: string | null;
    purchase_order_id: string | null;
    purchase_order?:
      | { purchase_type?: string | null }
      | Array<{ purchase_type?: string | null }>
      | null;
    location?: { city_code?: string | null } | Array<{ city_code?: string | null }> | null;
    depot?:
      | { depot_name?: string | null; depot_code?: string | null }
      | Array<{ depot_name?: string | null; depot_code?: string | null }>
      | null;
    size?: { size_code?: string | null } | Array<{ size_code?: string | null }> | null;
    type?: { type_code?: string | null } | Array<{ type_code?: string | null }> | null;
    condition?:
      | { condition_code?: string | null }
      | Array<{ condition_code?: string | null }>
      | null;
    color?: string | null;
    machine_type?: string | null;
  }>).filter((row) => {
    const purchaseType = normalizeText(
      Array.isArray(row.purchase_order)
        ? row.purchase_order[0]?.purchase_type
        : row.purchase_order?.purchase_type
    );
    if (!purchaseTypes.includes(purchaseType)) return false;

    const rowCityCode = normalizeText(
      Array.isArray(row.location) ? row.location[0]?.city_code : row.location?.city_code
    ).toUpperCase();
    if (cityCode && rowCityCode !== cityCode) return false;

    const rowDepotName = normalizeBucketFilterValue(
      Array.isArray(row.depot) ? row.depot[0]?.depot_name : row.depot?.depot_name
    );
    const rowDepotCode = normalizeBucketFilterValue(
      Array.isArray(row.depot) ? row.depot[0]?.depot_code : row.depot?.depot_code
    );
    if (!matchesDepotBucketValue(rowDepotCode, rowDepotName, depotValue)) {
      return false;
    }

    const rowSizeCode = normalizeText(
      Array.isArray(row.size) ? row.size[0]?.size_code : row.size?.size_code
    );
    if (sizeCode && rowSizeCode !== sizeCode) return false;

    const rowTypeCode = normalizeText(
      Array.isArray(row.type) ? row.type[0]?.type_code : row.type?.type_code
    );
    if (typeCode && rowTypeCode !== typeCode) return false;

    const rowCondition = normalizeBucketFilterValue(
      Array.isArray(row.condition)
        ? row.condition[0]?.condition_code
        : row.condition?.condition_code
    );
    if (condition && rowCondition !== condition) return false;

    const rowColor = normalizeBucketFilterValue(row.color);
    if (color && rowColor !== color) return false;

    const rowMachineType = normalizeBucketFilterValue(row.machine_type);
    if (machineType && rowMachineType !== machineType) return false;

    return true;
  });

  const matched = rows
    .map((row) => ({
      purchaseOrderItemId: normalizeText(row.id),
      purchaseOrderId: normalizeText(row.purchase_order_id),
      purchaseType: normalizeText(
        Array.isArray(row.purchase_order)
          ? row.purchase_order[0]?.purchase_type
          : row.purchase_order?.purchase_type
      ),
    }))
    .filter((row) => row.purchaseOrderItemId && row.purchaseOrderId)
    .sort((a, b) => {
      const aScore =
        input.releaseSource === "INTERNAL_FACTORY"
          ? a.purchaseType === "FACTORY_ORDER"
            ? 0
            : 1
          : a.purchaseType === "NEW_CONTAINER" || a.purchaseType === "USED_CONTAINER"
          ? 0
          : 1;
      const bScore =
        input.releaseSource === "INTERNAL_FACTORY"
          ? b.purchaseType === "FACTORY_ORDER"
            ? 0
            : 1
          : b.purchaseType === "NEW_CONTAINER" || b.purchaseType === "USED_CONTAINER"
          ? 0
          : 1;
      return aScore - bScore;
    })[0];

  return {
    purchaseOrderItemId: matched?.purchaseOrderItemId ?? "",
    purchaseOrderId: matched?.purchaseOrderId ?? "",
  };
}

async function resolveFinancialCodeIds() {
  const supabase = createServerSupabaseClient();
  const [{ data: costData, error: costError }, { data: revenueData, error: revenueError }] =
    await Promise.all([
      supabase.from("cost_codes").select("id, cost_code").in("cost_code", [...COST_CODES]),
      supabase
        .from("revenue_codes")
        .select("id, revenue_code")
        .in("revenue_code", [...REVENUE_CODES]),
    ]);

  if (costError) throw new Error(costError.message);
  if (revenueError) throw new Error(revenueError.message);

  const costMap = new Map<string, string>(
    ((costData ?? []) as Array<{ id: string; cost_code: string | null }>)
      .map((row) => {
        const code = normalizeText(row.cost_code).toUpperCase();
        return code && row.id ? ([code, row.id] as const) : null;
      })
      .filter((entry): entry is readonly [string, string] => Boolean(entry))
  );
  const revenueMap = new Map<string, string>(
    ((revenueData ?? []) as Array<{ id: string; revenue_code: string | null }>)
      .map((row) => {
        const code = normalizeText(row.revenue_code).toUpperCase();
        return code && row.id ? ([code, row.id] as const) : null;
      })
      .filter((entry): entry is readonly [string, string] => Boolean(entry))
  );

  for (const code of COST_CODES) {
    if (!costMap.has(code)) {
      throw new Error(`Missing cost code ${code}.`);
    }
  }
  for (const code of REVENUE_CODES) {
    if (!revenueMap.has(code)) {
      throw new Error(`Missing revenue code ${code}.`);
    }
  }

  return { costMap, revenueMap };
}

async function ensureUniqueReleaseNumber(releaseNumber: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("transfer_order")
    .select("id")
    .eq("order_no", releaseNumber)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data?.id) {
    throw new Error(`Release Number ${releaseNumber} already exists.`);
  }
}

async function getFreshBucketRow(input: DispatchReleasePersistInput) {
  const filteredSummary = await getDepotDispatchSummary({
    region: normalizeBucketFilterValue(input.bucket.region),
    city: extractCityCode(input.bucket.city),
    depot: normalizeBucketFilterValue(input.bucket.depot),
    owner: "",
    sizeType: normalizeBucketFilterValue(input.bucket.sizeType),
    condition: normalizeBucketFilterValue(input.bucket.condition),
    color: normalizeBucketFilterValue(input.bucket.color),
    machineType: normalizeBucketFilterValue(input.bucket.machineType),
    page: 1,
    pageSize: 1000,
  });

  const matched =
    filteredSummary.rows.find((row) => row.id === input.bucket.id) ??
    filteredSummary.rows.find((row) => matchesBucketRowContext(row, input.bucket));

  if (matched) {
    return matched;
  }

  const unfilteredSummary = await getDepotDispatchSummary({
    region: "",
    city: "",
    depot: "",
    owner: "",
    sizeType: "",
    condition: "",
    color: "",
    machineType: "",
    page: 1,
    pageSize: 5000,
  });

  const fallbackMatched =
    unfilteredSummary.rows.find((row) => row.id === input.bucket.id) ??
    unfilteredSummary.rows.find((row) => matchesBucketRowContext(row, input.bucket));

  if (!fallbackMatched) {
    throw new Error("The selected dispatch availability bucket is no longer available.");
  }

  return fallbackMatched;
}

async function validateReleaseCapacity(input: DispatchReleasePersistInput) {
  const freshBucket = await getFreshBucketRow(input);
  if (input.releaseSource === "INTERNAL_FACTORY") {
    const effectiveLimit = resolveBucketCapacityLimit(
      freshBucket.totalAvailableQty,
      input.bucket.totalAvailableQty
    );
    if (input.releaseQty > effectiveLimit) {
      throw new Error(`Release Qty cannot exceed total available qty ${effectiveLimit}.`);
    }
  }

  if (input.releaseSource === "INTERNAL_DEPOT") {
    const effectiveLimit = resolveBucketCapacityLimit(
      freshBucket.availableDepotQty,
      input.bucket.availableDepotQty
    );
    if (input.releaseQty > effectiveLimit) {
      throw new Error(`Release Qty cannot exceed available depot qty ${effectiveLimit}.`);
    }
  }

  if (input.releaseSource === "VENDOR_REF") {
    const rows = await getVendorReleaseSelectorRows({
      purchaseOrderItemId: input.sourcePurchaseOrderItemId,
    });
    const vendorRow = rows.find((row) => row.purchaseOrderItemId === input.sourcePurchaseOrderItemId);
    if (!vendorRow) {
      throw new Error("The selected vendor release source is no longer available.");
    }
    if (!matchesVendorReleaseBucket(vendorRow, input.bucket)) {
      throw new Error("The selected vendor release source no longer matches the current dispatch bucket.");
    }
    const effectiveLimit = vendorRow.remainingQty;
    if (input.releaseQty > effectiveLimit) {
      throw new Error(`Release Qty cannot exceed vendor-release source limit ${effectiveLimit}.`);
    }
  }

  return freshBucket;
}

async function validateUpdatedReleaseCapacity(
  currentOrder: TransferOrderMutationRow,
  input: DispatchReleaseUpdateInput
) {
  const freshBucket = await getFreshBucketRow(input);
  const currentUnassignedQty = toInteger(currentOrder.unassigned_qty);

  if (input.releaseSource === "INTERNAL_FACTORY") {
    const effectiveLimit =
      resolveBucketCapacityLimit(freshBucket.totalAvailableQty, input.bucket.totalAvailableQty) +
      currentUnassignedQty;
    if (input.releaseQty > effectiveLimit) {
      throw new Error(`Release Qty cannot exceed total available qty ${effectiveLimit}.`);
    }
  }

  if (input.releaseSource === "INTERNAL_DEPOT") {
    const effectiveLimit =
      resolveBucketCapacityLimit(freshBucket.availableDepotQty, input.bucket.availableDepotQty) +
      currentUnassignedQty;
    if (input.releaseQty > effectiveLimit) {
      throw new Error(`Release Qty cannot exceed available depot qty ${effectiveLimit}.`);
    }
  }

  if (input.releaseSource === "VENDOR_REF") {
    const rows = await getVendorReleaseSelectorRows({
      purchaseOrderItemId:
        normalizeText(input.sourcePurchaseOrderItemId) ||
        normalizeText(currentOrder.source_purchase_order_item_id),
    });
    const sourcePurchaseOrderItemId =
      normalizeText(input.sourcePurchaseOrderItemId) ||
      normalizeText(currentOrder.source_purchase_order_item_id);
    const vendorRow = rows.find((row) => row.purchaseOrderItemId === sourcePurchaseOrderItemId);
    if (!vendorRow) {
      throw new Error("The selected vendor release source is no longer available.");
    }
    if (!matchesVendorReleaseBucket(vendorRow, input.bucket)) {
      throw new Error("The selected vendor release source no longer matches the current dispatch bucket.");
    }
    const effectiveLimit = vendorRow.remainingQty + currentUnassignedQty;
    if (input.releaseQty > effectiveLimit) {
      throw new Error(`Release Qty cannot exceed vendor-release source limit ${effectiveLimit}.`);
    }
  }

  return freshBucket;
}

async function resolveSelectedContainerIds(input: DispatchReleasePersistInput) {
  if (input.containerSelectionMode === "UNSPECIFIED") {
    return [] as ResolvedSelectedContainer[];
  }

  const eligibleRows = await getDispatchReleaseSelectableContainers({
    region: input.bucket.region,
    city: input.bucket.city,
    depot: input.bucket.depot,
    sizeType: input.bucket.sizeType,
    condition: input.bucket.condition,
    color: input.bucket.color,
    machineType: input.bucket.machineType,
    releaseSource: input.releaseSource,
    sourcePurchaseOrderItemId:
      input.releaseSource === "VENDOR_REF" ? input.sourcePurchaseOrderItemId : "",
  });

  const eligibleByNumber = new Map(
    eligibleRows.map((row) => [normalizeContainerNumber(row.containerNumber), row] as const)
  );

  const normalizedSelections = input.selectedContainers.map((row) => ({
    ...row,
    normalizedNumber: normalizeContainerNumber(row.containerNumber),
  }));

  if (normalizedSelections.length > input.releaseQty) {
    throw new Error(
      `Specified container count ${normalizedSelections.length} cannot exceed Release Qty ${input.releaseQty}.`
    );
  }

  const duplicateCheck = new Set<string>();
  const allowVendorManualCandidates =
    input.releaseSource === "VENDOR_REF" &&
    normalizeText(input.sourcePurchaseOrderId) &&
    normalizeText(input.sourcePurchaseOrderItemId);
  for (const row of normalizedSelections) {
    if (!row.normalizedNumber) {
      throw new Error("Every selected container must include a container number.");
    }
    if (duplicateCheck.has(row.normalizedNumber)) {
      throw new Error(`Duplicate selected container ${row.containerNumber}.`);
    }
    duplicateCheck.add(row.normalizedNumber);
    if (!eligibleByNumber.has(row.normalizedNumber) && !allowVendorManualCandidates) {
      throw new Error(`Container ${row.containerNumber} is no longer eligible for this release.`);
    }
  }

  const missingContainerNumbers = normalizedSelections
    .filter((row) => !normalizeText(row.containerId))
    .map((row) => row.normalizedNumber);

  const resolvedContainerIdByNumber = new Map<string, string>();
  if (missingContainerNumbers.length > 0) {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("container")
      .select("id, container_number")
      .in("container_number", missingContainerNumbers);

    if (error) {
      throw new Error(error.message);
    }

    for (const row of data ?? []) {
      const containerNumber = normalizeContainerNumber(row.container_number);
      const containerId = normalizeText(row.id);
      if (containerNumber && containerId) {
        resolvedContainerIdByNumber.set(containerNumber, containerId);
      }
    }
  }

  return normalizedSelections.map((row) => {
    const eligible = eligibleByNumber.get(row.normalizedNumber);
    if (!eligible && !allowVendorManualCandidates) {
      throw new Error(`Container ${row.containerNumber} is no longer eligible for this release.`);
    }
    const pickupDate = formatDate(row.pickupDate);
    const containerId =
      normalizeText(row.containerId) ||
      resolvedContainerIdByNumber.get(row.normalizedNumber) ||
      null;
    const purchaseOrderId =
      normalizeText(eligible?.purchaseOrderId) ||
      normalizeText(input.sourcePurchaseOrderId) ||
      normalizeText(row.purchaseOrderId);
    const purchaseOrderItemId =
      normalizeText(eligible?.purchaseOrderItemId) ||
      normalizeText(input.sourcePurchaseOrderItemId) ||
      normalizeText(row.purchaseOrderItemId);
    if (!purchaseOrderId || !purchaseOrderItemId) {
      throw new Error(`Container ${row.containerNumber} could not be linked to the source PO item.`);
    }
    const allowDeferredMasterContainerCreation =
      Boolean(purchaseOrderId && purchaseOrderItemId) || allowVendorManualCandidates;
    if (!containerId && !allowDeferredMasterContainerCreation) {
      throw new Error(`Container ${row.containerNumber} could not be linked to a master container record.`);
    }
    return {
      containerId,
      containerNumber: eligible?.containerNumber || row.containerNumber,
      purchaseOrderId,
      purchaseOrderItemId,
      pickupDate,
      truckingCost: formatMoney(row.truckingCost),
      truckingCostCurrency: normalizeDispatchReleaseCurrency(row.truckingCostCurrency),
      repairCost: formatMoney(row.repairCost),
      repairCostCurrency: normalizeDispatchReleaseCurrency(row.repairCostCurrency),
      damageClaim: formatMoney(row.damageClaim),
      damageClaimCurrency: normalizeDispatchReleaseCurrency(row.damageClaimCurrency),
      remark: normalizeText(row.remark) || null,
    };
  });
}

function buildFinanceSnapshots(
  transferOrderId: string,
  input: DispatchReleasePersistInput,
  transferItems: Array<{
    id: string;
    containerId: string;
    pickupDate: string | null;
    truckingCost: number;
    truckingCostCurrency: string;
    repairCost: number;
    repairCostCurrency: string;
    damageClaim: number;
    damageClaimCurrency: string;
  }>
): {
  orderSnapshot: TransferFinanceOrderSnapshot;
  itemSnapshots: TransferFinanceItemSnapshot[];
  financePackage: TransferFinancePackage;
} {
  const orderSnapshot: TransferFinanceOrderSnapshot = {
    id: transferOrderId,
    dispatchVendorId: normalizeText(input.dispatchVendorId) || null,
    releaseDate: input.releaseDate,
    pickupCharge: input.pickupCharge,
    dpp: input.dpp,
    freeDays: input.freeDays,
    rv: input.rv,
    dailyRent: input.dailyRent,
    headerCurrency: normalizeDispatchReleaseCurrency(input.headerCurrency),
    itemCostCurrency: normalizeDispatchReleaseCurrency(input.itemCostCurrency),
    truckingCost: input.truckingCost,
    handlingFee: input.handlingFee,
    currency: normalizeDispatchReleaseCurrency(input.headerCurrency),
  };

  const itemSnapshots: TransferFinanceItemSnapshot[] = transferItems.map((item) => ({
    id: item.id,
    containerId: item.containerId,
    pickupDate: item.pickupDate,
    truckingCost: item.truckingCost,
    truckingCostCurrency: item.truckingCostCurrency,
    repairCost: item.repairCost,
    repairCostCurrency: item.repairCostCurrency,
    damageClaim: item.damageClaim,
    damageClaimCurrency: item.damageClaimCurrency,
  }));

  const financePackage = buildTransferFinancePackage(orderSnapshot, itemSnapshots);
  return { orderSnapshot, itemSnapshots, financePackage };
}

type TransferFinancePackageWithConversions = {
  costs: TransferBusinessCostDraft[];
  revenues: TransferBusinessRevenueDraft[];
  financeRecords: TransferFinanceRecordDraft[];
  totalCost: number;
  totalRevenue: number;
  truckingCostTotalInHeaderCurrency: number;
  repairCostTotalInHeaderCurrency: number;
  damageClaimTotalInHeaderCurrency: number;
};

async function enrichTransferFinancePackageWithExchangeRates(
  transferOrder: TransferFinanceOrderSnapshot,
  financePackage: TransferFinancePackage
): Promise<TransferFinancePackageWithConversions> {
  const headerCurrency = normalizeDispatchReleaseCurrency(transferOrder.headerCurrency);
  const exchangeRates = await loadFinancialExchangeRates([
    ...financePackage.costs
      .filter((row) => formatMoney(row.amount) !== 0)
      .map((row) => ({
        rateDate: row.occurDate,
        fromCurrency: row.currency,
        toCurrency: BASE_CURRENCY,
      })),
    ...financePackage.revenues
      .filter((row) => formatMoney(row.amount) !== 0)
      .map((row) => ({
        rateDate: row.occurDate,
        fromCurrency: row.currency,
        toCurrency: BASE_CURRENCY,
      })),
    ...financePackage.costs
      .filter(
        (row) =>
          formatMoney(row.amount) !== 0 &&
          (row.sourceField === "trucking_cost" || row.sourceField === "repair_cost")
      )
      .map((row) => ({
        rateDate: row.occurDate,
        fromCurrency: row.currency,
        toCurrency: headerCurrency,
      })),
    ...financePackage.revenues
      .filter((row) => formatMoney(row.amount) !== 0 && row.sourceField === "damage_claim")
      .map((row) => ({
        rateDate: row.occurDate,
        fromCurrency: row.currency,
        toCurrency: headerCurrency,
      })),
  ]);

  const costs = financePackage.costs.map((row) => ({
    ...row,
    baseCurrencyAmount: convertCurrencyAmount(
      row.amount,
      row.occurDate,
      row.currency,
      BASE_CURRENCY,
      exchangeRates
    ),
  }));

  const revenues = financePackage.revenues.map((row) => ({
    ...row,
    baseCurrencyAmount: convertCurrencyAmount(
      row.amount,
      row.occurDate,
      row.currency,
      BASE_CURRENCY,
      exchangeRates
    ),
  }));

  const payableBaseTotals = new Map<string, number>();
  for (const row of costs) {
    const currency = normalizeDispatchReleaseCurrency(row.currency);
    payableBaseTotals.set(
      currency,
      formatMoney((payableBaseTotals.get(currency) ?? 0) + row.baseCurrencyAmount)
    );
  }

  const receivableBaseTotals = new Map<string, number>();
  for (const row of revenues) {
    const currency = normalizeDispatchReleaseCurrency(row.currency);
    receivableBaseTotals.set(
      currency,
      formatMoney((receivableBaseTotals.get(currency) ?? 0) + row.baseCurrencyAmount)
    );
  }

  const financeRecords = financePackage.financeRecords.map((row) => ({
    ...row,
    baseCurrencyAmount:
      row.recordType === "PAYABLE"
        ? payableBaseTotals.get(normalizeDispatchReleaseCurrency(row.currency)) ?? 0
        : receivableBaseTotals.get(normalizeDispatchReleaseCurrency(row.currency)) ?? 0,
  }));

  const truckingCostTotalInHeaderCurrency = formatMoney(
    costs
      .filter((row) => row.sourceField === "trucking_cost")
      .reduce(
        (sum, row) =>
          sum +
          convertCurrencyAmount(
            row.amount,
            row.occurDate,
            row.currency,
            headerCurrency,
            exchangeRates
          ),
        0
      )
  );

  const repairCostTotalInHeaderCurrency = formatMoney(
    costs
      .filter((row) => row.sourceField === "repair_cost")
      .reduce(
        (sum, row) =>
          sum +
          convertCurrencyAmount(
            row.amount,
            row.occurDate,
            row.currency,
            headerCurrency,
            exchangeRates
          ),
        0
      )
  );

  const damageClaimTotalInHeaderCurrency = formatMoney(
    revenues
      .filter((row) => row.sourceField === "damage_claim")
      .reduce(
        (sum, row) =>
          sum +
          convertCurrencyAmount(
            row.amount,
            row.occurDate,
            row.currency,
            headerCurrency,
            exchangeRates
          ),
        0
      )
  );

  return {
    ...financePackage,
    costs,
    revenues,
    financeRecords,
    truckingCostTotalInHeaderCurrency,
    repairCostTotalInHeaderCurrency,
    damageClaimTotalInHeaderCurrency,
  };
}

function buildFinanceSnapshotsFromOrderRow(
  order: TransferOrderMutationRow,
  transferItems: Array<{
    id: string;
    containerId: string;
    pickupDate: string | null;
    truckingCost: number;
    truckingCostCurrency: string;
    repairCost: number;
    repairCostCurrency: string;
    damageClaim: number;
    damageClaimCurrency: string;
  }>
) {
  const truckingCostTotal = formatMoney(
    transferItems.reduce((sum, item) => sum + item.truckingCost, 0)
  );
  const effectiveTruckingCost =
    truckingCostTotal !== 0 ? truckingCostTotal : formatMoney(order.trucking_cost);
  const orderSnapshot: TransferFinanceOrderSnapshot = {
    id: order.id,
    dispatchVendorId: normalizeText(order.dispatch_vendor_id) || null,
    releaseDate: formatDate(order.release_date),
    pickupCharge: formatMoney(order.pickup_charge),
    dpp: formatMoney(order.dpp),
    freeDays: toInteger(order.free_days),
    rv: formatMoney(order.rv),
    dailyRent: formatMoney(order.daily_rent),
    headerCurrency: normalizeDispatchReleaseCurrency(order.header_currency),
    itemCostCurrency: normalizeDispatchReleaseCurrency(order.item_cost_currency),
    truckingCost: effectiveTruckingCost,
    handlingFee: formatMoney(order.handling_fee),
    currency: normalizeDispatchReleaseCurrency(order.header_currency),
  };

  const itemSnapshots: TransferFinanceItemSnapshot[] = transferItems.map((item) => ({
    id: item.id,
    containerId: item.containerId,
    pickupDate: item.pickupDate,
    truckingCost: item.truckingCost,
    truckingCostCurrency: item.truckingCostCurrency,
    repairCost: item.repairCost,
    repairCostCurrency: item.repairCostCurrency,
    damageClaim: item.damageClaim,
    damageClaimCurrency: item.damageClaimCurrency,
  }));

  const financePackage = buildTransferFinancePackage(orderSnapshot, itemSnapshots);
  return { orderSnapshot, itemSnapshots, financePackage };
}

async function insertBusinessCosts(
  rows: TransferBusinessCostDraft[],
  costCodeIdByCode: Map<string, string>
) {
  if (rows.length === 0) return [] as Array<{ id: string }>;
  const supabase = createServerSupabaseClient();
  const payload = rows.map((row) => ({
    business_type: row.businessType,
    business_id: row.businessId,
    container_id: row.containerId,
    cost_code_id: costCodeIdByCode.get(row.costCode) ?? null,
    amount: row.amount,
    base_currency_amount: row.baseCurrencyAmount,
    currency: row.currency,
    occur_date: row.occurDate,
    remark: row.remark,
  }));

  const { data, error } = await supabase.from("business_cost").insert(payload).select("id");
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as Array<{ id: string }>;
}

async function insertBusinessRevenues(
  rows: TransferBusinessRevenueDraft[],
  revenueCodeIdByCode: Map<string, string>
) {
  if (rows.length === 0) return [] as Array<{ id: string }>;
  const supabase = createServerSupabaseClient();
  const payload = rows.map((row) => ({
    business_type: row.businessType,
    business_id: row.businessId,
    container_id: row.containerId,
    revenue_code_id: revenueCodeIdByCode.get(row.revenueCode) ?? null,
    revenue_type: row.revenueType ?? null,
    amount: row.amount,
    base_currency_amount: row.baseCurrencyAmount,
    currency: row.currency,
    occur_date: row.occurDate,
    remark: row.remark,
  }));

  const { data, error } = await supabase.from("business_revenue").insert(payload).select("id");
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as Array<{ id: string }>;
}

async function insertFinanceRecords(rows: TransferFinanceRecordDraft[]) {
  if (rows.length === 0) return;
  const supabase = createServerSupabaseClient();
  const payload = rows.map((row) => ({
    business_type: row.businessType,
    business_id: row.businessId,
    record_type: row.recordType,
    counterparty_type: row.counterpartyType,
    counterparty_id: row.counterpartyId,
    amount: row.amount,
    base_currency_amount: row.baseCurrencyAmount,
    currency: row.currency,
    status: row.status,
    due_date: row.dueDate,
    paid_amount: row.paidAmount,
    remark: row.remark,
  }));
  const { error } = await supabase.from("finance_record").insert(payload);
  if (error) {
    throw new Error(error.message);
  }
}

async function deleteTransferFinanceArtifacts(transferOrderId: string) {
  const supabase = createServerSupabaseClient();
  const [{ error: costError }, { error: revenueError }, { error: recordError }] =
    await Promise.all([
      supabase.from("business_cost").delete().eq("business_type", "TRANSFER").eq("business_id", transferOrderId),
      supabase.from("business_revenue").delete().eq("business_type", "TRANSFER").eq("business_id", transferOrderId),
      supabase.from("finance_record").delete().eq("business_type", "TRANSFER").eq("business_id", transferOrderId),
    ]);

  if (costError) throw new Error(costError.message);
  if (revenueError) throw new Error(revenueError.message);
  if (recordError) throw new Error(recordError.message);
}

async function rebuildTransferFinanceArtifacts(
  order: TransferOrderMutationRow,
  transferItems: Array<{
    id: string;
    containerId: string;
    pickupDate: string | null;
    truckingCost: number;
    truckingCostCurrency: string;
    repairCost: number;
    repairCostCurrency: string;
    damageClaim: number;
    damageClaimCurrency: string;
  }>
) {
  const { costMap, revenueMap } = await resolveFinancialCodeIds();
  const { financePackage, orderSnapshot } = buildFinanceSnapshotsFromOrderRow(order, transferItems);
  const convertedFinancePackage = await enrichTransferFinancePackageWithExchangeRates(
    orderSnapshot,
    financePackage
  );
  await deleteTransferFinanceArtifacts(order.id);
  await insertBusinessCosts(convertedFinancePackage.costs, costMap);
  await insertBusinessRevenues(convertedFinancePackage.revenues, revenueMap);
  await insertFinanceRecords(convertedFinancePackage.financeRecords);

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("transfer_order")
    .update({
      trucking_cost: formatMoney(
        transferItems.reduce((sum, item) => sum + item.truckingCost, 0)
      ) || formatMoney(order.trucking_cost),
      repair_cost_total: formatMoney(
        transferItems.reduce((sum, item) => sum + item.repairCost, 0)
      ),
      damage_claim_total: formatMoney(
        transferItems.reduce((sum, item) => sum + item.damageClaim, 0)
      ),
      trucking_cost_total_in_header_currency:
        convertedFinancePackage.truckingCostTotalInHeaderCurrency,
      repair_cost_total_in_header_currency:
        convertedFinancePackage.repairCostTotalInHeaderCurrency,
      damage_claim_total_in_header_currency:
        convertedFinancePackage.damageClaimTotalInHeaderCurrency,
      total_cost: convertedFinancePackage.totalCost,
      total_revenue: convertedFinancePackage.totalRevenue,
    })
    .eq("id", order.id);

  if (error) {
    throw new Error(error.message);
  }
}

function revalidateDispatchReleasePaths(transferOrderId: string) {
  revalidatePath("/dispatch/dispatch-release");
  revalidatePath(`/dispatch/dispatch-release/${transferOrderId}`);
  revalidatePath("/depot-inventory/summary-for-dispatch");
}

function revalidateVendorSourcePurchasePaths(
  purchaseOrderId: string | null | undefined,
  purchaseOrderItemId: string | null | undefined
) {
  const normalizedOrderId = normalizeText(purchaseOrderId);
  const normalizedItemId = normalizeText(purchaseOrderItemId);
  if (!normalizedOrderId) return;

  revalidatePath("/purchase");
  revalidatePath("/purchase/po-management");
  revalidatePath(`/purchase/po-management/${normalizedOrderId}`);

  if (normalizedItemId) {
    revalidatePath(
      `/purchase/po-management/${normalizedOrderId}/items/${normalizedItemId}/containers`
    );
  }
}

async function loadTransferOrderForMutation(transferOrderId: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("transfer_order")
    .select(
      `
        id,
        order_no,
        status,
        transfer_type,
        release_source,
        vendor_release_number,
        source_purchase_order_id,
        source_purchase_order_item_id,
        dispatch_vendor_id,
        release_date,
        pol_city_id,
        pod_city_id,
        dispatch_plan_no,
        carrier_plan_no,
        onhire_no,
        carrier,
        dispatch_arrange_date,
        self_pickup_depot_id,
        box_selection_mode,
        release_qty,
        assigned_qty,
        unassigned_qty,
        pickup_charge,
        dpp,
        free_days,
        rv,
        daily_rent,
        header_currency,
        item_cost_currency,
        trucking_cost,
        handling_fee,
        repair_cost_total,
        damage_claim_total,
        trucking_cost_total_in_header_currency,
        repair_cost_total_in_header_currency,
        damage_claim_total_in_header_currency,
        total_cost,
        total_revenue,
        remark,
        hold_reason,
        cancel_reason,
        cancelled_at
      `
    )
    .eq("id", transferOrderId)
    .single();

  if (error) throw new Error(error.message);
  return data as TransferOrderMutationRow;
}

async function loadTransferItemsForMutation(transferOrderId: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("transfer_item")
    .select(
      `
        id,
        item_status,
        delivery_date,
        trucking_cost,
        trucking_cost_currency,
        repair_cost,
        repair_cost_currency,
        damage_claim,
        damage_claim_currency,
        remark,
        container:container_id(id, container_number)
      `
    )
    .eq("transfer_order_id", transferOrderId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as TransferItemMutationRow[];
}

async function getPickedUpContainerIdsForTransferOrder(transferOrderId: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("container_event")
    .select("container_id")
    .eq("business_type", "TRANSFER")
    .eq("business_id", transferOrderId)
    .eq("event_type", "TRANSFER_OUT")
    .eq("is_void", false);

  if (error) throw new Error(error.message);
  return new Set(
    (data ?? [])
      .map((row) => normalizeText(row.container_id))
      .filter(Boolean)
  );
}

async function inheritVendorReleaseAttachments(transferOrderId: string, sourcePurchaseOrderItemId: string) {
  if (!normalizeText(sourcePurchaseOrderItemId)) return 0;
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("purchase_order_item_attachment_links")
    .select("id, url, remark")
    .eq("purchase_order_item_id", sourcePurchaseOrderItemId)
    .eq("attachment_type", "VENDOR_RELEASE");

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Array<{ id: string; url: string | null; remark: string | null }>;
  if (rows.length === 0) return 0;

  const payload = rows
    .filter((row) => normalizeText(row.url))
    .map((row) => ({
      transfer_order_id: transferOrderId,
      source_purchase_order_item_attachment_id: row.id,
      url: row.url,
      remark: row.remark,
      inherited: true,
    }));

  if (payload.length === 0) return 0;
  const { error: insertError } = await supabase.from("transfer_order_attachment_links").insert(payload);
  if (insertError) {
    throw new Error(insertError.message);
  }
  return payload.length;
}

async function writeBackVendorReleaseContainers(
  transferOrderId: string,
  selectedContainers: ResolvedSelectedContainer[],
  sourcePurchaseOrderId: string,
  sourcePurchaseOrderItemId: string,
  validateOnly = false
) {
  const normalizedOrderId = normalizeText(sourcePurchaseOrderId);
  const normalizedItemId = normalizeText(sourcePurchaseOrderItemId);
  if (!normalizedOrderId || !normalizedItemId || selectedContainers.length === 0) {
    return {
      touchedRows: [] as Array<{
        id: string;
        container_id: string | null;
        container_number: string | null;
        offline_date: string | null;
        container_status: string | null;
        item_status: string | null;
      }>,
      insertedRowIds: [] as string[],
    };
  }

  const supabase = createServerSupabaseClient();
  const [{ data: itemRow, error: itemError }, { data: existingRows, error: existingError }] =
    await Promise.all([
      supabase
        .from("purchase_order_item")
        .select(
          `
            id,
            purchase_order_id,
            location_city_id,
            depot_id,
            container_size_code_id,
            container_type_code_id,
            container_condition_code_id,
            color,
            flp,
            lbx,
            locking_bars_count,
            vents_count,
            machine_type,
            yom,
            planned_pod,
            tare_weight,
            maximum_weight,
            csc_number,
            planned_qty,
            unit_price,
            financial_cost,
            purchase_order:purchase_order_id(owner_id, purchase_date)
          `
        )
        .eq("id", normalizedItemId)
        .eq("purchase_order_id", normalizedOrderId)
        .single(),
      supabase
        .from("purchase_order_container")
        .select(
          "id, purchase_order_item_id, container_id, container_number, offline_date, container_status, item_status"
        )
        .eq("purchase_order_id", normalizedOrderId)
        .eq("purchase_order_item_id", normalizedItemId)
        .or("container_status.is.null,container_status.neq.CANCELLED")
        .order("created_at", { ascending: true })
        .order("id", { ascending: true }),
    ]);

  if (itemError) throw new Error(itemError.message);
  if (existingError) throw new Error(existingError.message);

  const item = itemRow as PurchaseOrderItemWritebackRow;
  const activeRows = (existingRows ?? []) as PurchaseOrderContainerWritebackRow[];
  const plannedQty = toInteger(item.planned_qty);
  if (selectedContainers.length > plannedQty) {
    throw new Error(
      `Selected container count ${selectedContainers.length} exceeds PO item planned quantity ${plannedQty}.`
    );
  }

  const existingRowByContainerNumber = new Map<string, PurchaseOrderContainerWritebackRow>();
  const existingRowByContainerId = new Map<string, PurchaseOrderContainerWritebackRow>();
  for (const row of activeRows) {
    const containerNumber = normalizeContainerNumber(row.container_number);
    const containerId = normalizeText(row.container_id);
    if (containerNumber && !existingRowByContainerNumber.has(containerNumber)) {
      existingRowByContainerNumber.set(containerNumber, row);
    }
    if (containerId && !existingRowByContainerId.has(containerId)) {
      existingRowByContainerId.set(containerId, row);
    }
  }

  const matchedRowIds = new Set<string>();
  const selectedContainerNumbers = new Set<string>();
  for (const row of selectedContainers) {
    const containerNumber = normalizeContainerNumber(row.containerNumber);
    const containerId = normalizeText(row.containerId);
    if (!containerNumber) {
      throw new Error("Every selected container must include a container number.");
    }
    if (selectedContainerNumbers.has(containerNumber)) {
      throw new Error(`Container ${row.containerNumber} is duplicated in this release selection.`);
    }
    selectedContainerNumbers.add(containerNumber);

    const matchedExistingRow =
      existingRowByContainerNumber.get(containerNumber) ??
      (containerId ? existingRowByContainerId.get(containerId) : undefined);
    if (!matchedExistingRow) continue;

    const existingContainerNumber = normalizeContainerNumber(matchedExistingRow.container_number);
    const existingContainerId = normalizeText(matchedExistingRow.container_id);
    if (
      (existingContainerNumber && existingContainerNumber !== containerNumber) ||
      (containerId && existingContainerId && existingContainerId !== containerId)
    ) {
      throw new Error(`Container ${row.containerNumber} already exists on the source PO item.`);
    }
    matchedRowIds.add(matchedExistingRow.id);
  }

  const availableBlankRows = activeRows.filter(
    (row) => !matchedRowIds.has(row.id) && !normalizeContainerNumber(row.container_number)
  );
  const unmatchedSelectedCount = Math.max(0, selectedContainers.length - matchedRowIds.size);
  const requiredNewRows = Math.max(0, unmatchedSelectedCount - availableBlankRows.length);
  const resultingRowCount = activeRows.length + requiredNewRows;
  if (resultingRowCount > plannedQty) {
    throw new Error(
      `Source PO item can only hold ${plannedQty} containers; ${selectedContainers.length} new containers would exceed that limit.`
    );
  }

  const insertedRowIds: string[] = [];
  if (validateOnly) {
    return {
      touchedRows: [] as Array<{
        id: string;
        container_id: string | null;
        container_number: string | null;
        offline_date: string | null;
        container_status: string | null;
        item_status: string | null;
      }>,
      insertedRowIds,
    };
  }
  if (requiredNewRows > 0) {
    const insertPayload = Array.from({ length: requiredNewRows }, () => ({
      purchase_order_id: normalizedOrderId,
      purchase_order_item_id: normalizedItemId,
      location_city_id: item.location_city_id,
      depot_id: item.depot_id,
      container_size_code_id: item.container_size_code_id,
      container_type_code_id: item.container_type_code_id,
      container_condition_code_id: item.container_condition_code_id,
      color: item.color,
      flp: item.flp,
      lbx: item.lbx,
      locking_bars_count: item.locking_bars_count,
      vents_count: item.vents_count,
      machine_type: item.machine_type,
      yom: item.yom,
      offline_date: null,
      planned_pod: item.planned_pod,
      tare_weight: item.tare_weight,
      maximum_weight: item.maximum_weight,
      csc_number: item.csc_number,
      purchase_price: item.unit_price,
      financial_cost: item.financial_cost,
      item_status: "BOX_NO_ASSIGNED",
      container_status: "PURCHASED",
      container_number: null,
      remark: `Auto-created from dispatch release ${transferOrderId}`,
    }));

    const { data: insertedRows, error: insertError } = await supabase
      .from("purchase_order_container")
      .insert(insertPayload)
      .select("id, purchase_order_item_id, container_id, container_number, offline_date, container_status, item_status");

    if (insertError) throw new Error(insertError.message);
    for (const row of (insertedRows ?? []) as PurchaseOrderContainerWritebackRow[]) {
      insertedRowIds.push(row.id);
      activeRows.push(row);
    }
  }

  const writableRows = activeRows.filter(
    (row) => !matchedRowIds.has(row.id) && !normalizeContainerNumber(row.container_number)
  );
  if (writableRows.length < unmatchedSelectedCount) {
    throw new Error("Source PO item does not have enough writable container rows.");
  }

  const touchedRows: Array<{
    id: string;
    container_id: string | null;
    container_number: string | null;
    offline_date: string | null;
    container_status: string | null;
    item_status: string | null;
  }> = [];

  let writableIndex = 0;
  for (let index = 0; index < selectedContainers.length; index += 1) {
    const selected = selectedContainers[index];
    const targetRow =
      existingRowByContainerNumber.get(normalizeContainerNumber(selected.containerNumber)) ??
      (normalizeText(selected.containerId)
        ? existingRowByContainerId.get(normalizeText(selected.containerId))
        : undefined) ??
      writableRows[writableIndex++];

    if (!targetRow) {
      throw new Error("Source PO item does not have enough writable container rows.");
    }
    touchedRows.push({
      id: targetRow.id,
      container_id: targetRow.container_id,
      container_number: targetRow.container_number,
      offline_date: targetRow.offline_date,
      container_status: targetRow.container_status,
      item_status: targetRow.item_status,
    });
    const { error: updateError } = await supabase
      .from("purchase_order_container")
      .update({
        container_id: selected.containerId,
        container_number: normalizeContainerNumber(selected.containerNumber),
        item_status: "INBOUND",
        container_status: "PICKED_UP",
      })
      .eq("id", targetRow.id);
    if (updateError) throw new Error(updateError.message);
  }

  return { touchedRows, insertedRowIds };
}

async function rollbackVendorReleaseContainerWriteback(
  touchedRows: Array<{
    id: string;
    container_id: string | null;
    container_number: string | null;
    offline_date: string | null;
    container_status: string | null;
    item_status: string | null;
  }>,
  insertedRowIds: string[]
) {
  if (touchedRows.length === 0 && insertedRowIds.length === 0) return;
  const supabase = createServerSupabaseClient();

  for (const row of touchedRows) {
    const { error } = await supabase
      .from("purchase_order_container")
      .update({
        container_id: row.container_id,
        container_number: row.container_number,
        offline_date: row.offline_date,
        container_status: row.container_status,
        item_status: row.item_status,
      })
      .eq("id", row.id);
    if (error) {
      throw new Error(error.message);
    }
  }

  if (insertedRowIds.length > 0) {
    const { error } = await supabase
      .from("purchase_order_container")
      .delete()
      .in("id", insertedRowIds);
    if (error) {
      throw new Error(error.message);
    }
  }
}

async function ensureVendorReleaseMasterContainers(
  selectedContainers: ResolvedSelectedContainer[],
  sourcePurchaseOrderId: string,
  sourcePurchaseOrderItemId: string
) {
  const normalizedOrderId = normalizeText(sourcePurchaseOrderId);
  const normalizedItemId = normalizeText(sourcePurchaseOrderItemId);
  if (!normalizedOrderId || !normalizedItemId || selectedContainers.length === 0) {
    return {
      selectedContainers,
      insertedContainerIds: [] as string[],
    };
  }

  const missingNumbers = Array.from(
    new Set(
      selectedContainers
        .filter((row) => !normalizeText(row.containerId))
        .map((row) => normalizeContainerNumber(row.containerNumber))
        .filter(Boolean)
    )
  );
  if (missingNumbers.length === 0) {
    return {
      selectedContainers,
      insertedContainerIds: [] as string[],
    };
  }

  const supabase = createServerSupabaseClient();
  const [{ data: existingContainers, error: existingError }, { data: itemRow, error: itemError }] =
    await Promise.all([
      supabase.from("container").select("id, container_number").in("container_number", missingNumbers),
      supabase
        .from("purchase_order_item")
        .select(
          `
            id,
            depot_id,
            container_size_code_id,
            container_type_code_id,
            container_condition_code_id,
            color,
            flp,
            lbx,
            locking_bars_count,
            vents_count,
            machine_type,
            yom,
            unit_price,
            purchase_order:purchase_order_id(owner_id, purchase_date)
          `
        )
        .eq("id", normalizedItemId)
        .eq("purchase_order_id", normalizedOrderId)
        .single(),
    ]);

  if (existingError) throw new Error(existingError.message);
  if (itemError) throw new Error(itemError.message);

  const item = itemRow as PurchaseOrderItemWritebackRow;
  const existingIdByNumber = new Map<string, string>();
  for (const row of existingContainers ?? []) {
    const number = normalizeContainerNumber(row.container_number);
    const id = normalizeText(row.id);
    if (number && id) existingIdByNumber.set(number, id);
  }

  const rowsToInsert = missingNumbers.filter((number) => !existingIdByNumber.has(number));
  const insertedContainerIds: string[] = [];

  if (rowsToInsert.length > 0) {
    const purchaseOrder = firstRelationRow(item.purchase_order);
    const insertPayload = rowsToInsert.map((containerNumber) => ({
      container_number: containerNumber,
      color: normalizeText(item.color) || null,
      machine_type: normalizeText(item.machine_type) || null,
      yom: item.yom ?? null,
      flp: Boolean(item.flp),
      lbx: Boolean(item.lbx),
      locking_bars: toInteger(item.locking_bars_count) > 0,
      vents: toInteger(item.vents_count) > 0,
      manufacture_date: item.yom ? `${item.yom}-01-01` : null,
      owner_type: "OWN",
      owner_id: normalizeText(purchaseOrder?.owner_id) || null,
      lifecycle_stage: "IN_YARD",
      status: "AVAILABLE",
      current_depot_id: normalizeText(item.depot_id) || null,
      purchase_date: normalizeText(purchaseOrder?.purchase_date) || null,
      purchase_price: item.unit_price,
      container_type_code_id: item.container_type_code_id,
      container_condition_code_id: item.container_condition_code_id,
      container_size_code_id: item.container_size_code_id,
    }));

    const { data: insertedRows, error: insertError } = await supabase
      .from("container")
      .insert(insertPayload)
      .select("id, container_number");

    if (insertError) throw new Error(insertError.message);

    for (const row of insertedRows ?? []) {
      const number = normalizeContainerNumber(row.container_number);
      const id = normalizeText(row.id);
      if (number && id) {
        existingIdByNumber.set(number, id);
        insertedContainerIds.push(id);
      }
    }
  }

  const nextSelectedContainers = selectedContainers.map((row) => {
    if (normalizeText(row.containerId)) return row;
    const containerId = existingIdByNumber.get(normalizeContainerNumber(row.containerNumber)) ?? null;
    if (!containerId) {
      throw new Error(`Container ${row.containerNumber} could not be linked to a master container record.`);
    }
    return {
      ...row,
      containerId,
    };
  });

  return {
    selectedContainers: nextSelectedContainers,
    insertedContainerIds,
  };
}

async function backfillPurchaseOrderContainerIds(
  selectedContainers: ResolvedSelectedContainer[],
  purchaseOrderId: string,
  purchaseOrderItemId: string
) {
  const normalizedOrderId = normalizeText(purchaseOrderId);
  const normalizedItemId = normalizeText(purchaseOrderItemId);
  if (!normalizedOrderId || !normalizedItemId || selectedContainers.length === 0) {
    return;
  }

  const supabase = createServerSupabaseClient();
  for (const selected of selectedContainers) {
    const containerId = normalizeText(selected.containerId);
    const containerNumber = normalizeContainerNumber(selected.containerNumber);
    if (!containerId || !containerNumber) continue;

    const { error } = await supabase
      .from("purchase_order_container")
      .update({ container_id: containerId })
      .eq("purchase_order_id", normalizedOrderId)
      .eq("purchase_order_item_id", normalizedItemId)
      .eq("container_number", containerNumber)
      .is("container_id", null);

    if (error) {
      throw new Error(error.message);
    }
  }
}

async function syncSelectedSourceContainerStatuses(
  selectedContainers: ResolvedSelectedContainer[]
) {
  const candidates = selectedContainers.filter(
    (selected) =>
      Boolean(selected.pickupDate) &&
      Boolean(normalizeText(selected.purchaseOrderId)) &&
      Boolean(normalizeText(selected.purchaseOrderItemId)) &&
      Boolean(normalizeContainerNumber(selected.containerNumber))
  );

  if (candidates.length === 0) {
    return;
  }

  const supabase = createServerSupabaseClient();
  for (const selected of candidates) {
    const containerId = normalizeText(selected.containerId);
    const containerNumber = normalizeContainerNumber(selected.containerNumber);
    const { data: candidateRows, error: candidateRowsError } = await supabase
      .from("purchase_order_container")
      .select("id, container_id, container_number, container_status")
      .eq("purchase_order_id", normalizeText(selected.purchaseOrderId))
      .eq("purchase_order_item_id", normalizeText(selected.purchaseOrderItemId));
    if (candidateRowsError) {
      throw new Error(candidateRowsError.message);
    }

    const targetIds = ((candidateRows ?? []) as Array<{
      id: string | null;
      container_id: string | null;
      container_number: string | null;
      container_status: string | null;
    }>)
      .filter((row) => normalizeText(row.container_status).toUpperCase() !== "CANCELLED")
      .filter((row) => {
        const rowContainerId = normalizeText(row.container_id);
        const rowContainerNumber = normalizeContainerNumber(row.container_number);
        if (containerId && rowContainerId === containerId) return true;
        if (containerNumber && rowContainerNumber === containerNumber) return true;
        return false;
      })
      .map((row) => normalizeText(row.id))
      .filter(Boolean);
    if (targetIds.length === 0) {
      continue;
    }

    const { error } = await supabase
      .from("purchase_order_container")
      .update({ container_status: "PICKED_UP" })
      .in("id", targetIds);

    if (error) {
      throw new Error(error.message);
    }
  }
}

async function ensureSelectedMasterContainers(
  selectedContainers: ResolvedSelectedContainer[]
) {
  const groups = new Map<string, ResolvedSelectedContainer[]>();
  for (const selected of selectedContainers) {
    if (normalizeText(selected.containerId)) continue;
    const purchaseOrderId = normalizeText(selected.purchaseOrderId);
    const purchaseOrderItemId = normalizeText(selected.purchaseOrderItemId);
    if (!purchaseOrderId || !purchaseOrderItemId) continue;
    const key = `${purchaseOrderId}::${purchaseOrderItemId}`;
    const existing = groups.get(key) ?? [];
    existing.push(selected);
    groups.set(key, existing);
  }

  if (groups.size === 0) {
    return {
      selectedContainers,
      insertedContainerIds: [] as string[],
    };
  }

  const selectedByKey = new Map(
    selectedContainers.map((row) => [
      `${normalizeText(row.purchaseOrderId)}::${normalizeText(row.purchaseOrderItemId)}::${normalizeContainerNumber(
        row.containerNumber
      )}`,
      row,
    ] as const)
  );

  const insertedContainerIds: string[] = [];

  for (const [groupKey, rows] of groups) {
    const [purchaseOrderId, purchaseOrderItemId] = groupKey.split("::");
    const ensured = await ensureVendorReleaseMasterContainers(rows, purchaseOrderId, purchaseOrderItemId);
    insertedContainerIds.push(...ensured.insertedContainerIds);
    await backfillPurchaseOrderContainerIds(
      ensured.selectedContainers,
      purchaseOrderId,
      purchaseOrderItemId
    );

    for (const ensuredRow of ensured.selectedContainers) {
      selectedByKey.set(
        `${purchaseOrderId}::${purchaseOrderItemId}::${normalizeContainerNumber(
          ensuredRow.containerNumber
        )}`,
        ensuredRow
      );
    }
  }

  return {
    selectedContainers: selectedContainers.map(
      (row) =>
        selectedByKey.get(
          `${normalizeText(row.purchaseOrderId)}::${normalizeText(
            row.purchaseOrderItemId
          )}::${normalizeContainerNumber(row.containerNumber)}`
        ) ?? row
    ),
    insertedContainerIds,
  };
}

async function hydrateSelectedContainerIdsFromMaster(
  selectedContainers: ResolvedSelectedContainer[]
) {
  const missingNumbers = Array.from(
    new Set(
      selectedContainers
        .filter((row) => !normalizeText(row.containerId))
        .map((row) => normalizeContainerNumber(row.containerNumber))
        .filter(Boolean)
    )
  );

  if (missingNumbers.length === 0) {
    return selectedContainers;
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("container")
    .select("id, container_number")
    .in("container_number", missingNumbers);

  if (error) {
    throw new Error(error.message);
  }

  const containerIdByNumber = new Map<string, string>();
  for (const row of data ?? []) {
    const containerNumber = normalizeContainerNumber(row.container_number);
    const containerId = normalizeText(row.id);
    if (containerNumber && containerId) {
      containerIdByNumber.set(containerNumber, containerId);
    }
  }

  return selectedContainers.map((row) => {
    if (normalizeText(row.containerId)) return row;
    const containerId = containerIdByNumber.get(
      normalizeContainerNumber(row.containerNumber)
    );
    return containerId
      ? {
          ...row,
          containerId,
        }
      : row;
  });
}

export async function getPurchaseOrderItemVendorReleaseDocuments(
  sourcePurchaseOrderItemId: string
): Promise<DispatchReleaseVendorDocument[]> {
  const normalizedSourceItemId = normalizeText(sourcePurchaseOrderItemId);
  if (!normalizedSourceItemId) return [];

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("purchase_order_item_attachment_links")
    .select("id, url, remark")
    .eq("purchase_order_item_id", normalizedSourceItemId)
    .eq("attachment_type", "VENDOR_RELEASE")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as Array<{
    id: string;
    url: string | null;
    remark: string | null;
  }>)
    .filter((row) => normalizeText(row.url))
    .map((row) => ({
      id: row.id,
      url: row.url ?? "",
      remark: row.remark,
    }));
}

export async function getDispatchReleaseManagement(
  input?: Partial<DispatchReleaseManagementQuery>
): Promise<DispatchReleaseManagementResult> {
  noStore();

  const query: DispatchReleaseManagementQuery = {
    ...EMPTY_DISPATCH_RELEASE_MANAGEMENT_QUERY,
    ...input,
    page: Math.max(1, input?.page ?? EMPTY_DISPATCH_RELEASE_MANAGEMENT_QUERY.page),
    pageSize: Math.max(
      1,
      input?.pageSize ?? EMPTY_DISPATCH_RELEASE_MANAGEMENT_QUERY.pageSize
    ),
    sortBy: input?.sortBy ?? EMPTY_DISPATCH_RELEASE_MANAGEMENT_QUERY.sortBy,
    sortDirection:
      input?.sortDirection ?? EMPTY_DISPATCH_RELEASE_MANAGEMENT_QUERY.sortDirection,
  };

  const supabase = createServerSupabaseClient();
  const { data: orderData, error: orderError } = await supabase
    .from("transfer_order")
    .select(
      `
        id,
        order_no,
        status,
        onhire_no,
        vendor_release_number,
        release_qty,
        source_purchase_order_item_id,
        pol:cities!transfer_order_pol_city_id_fkey(city_code),
        pod:cities!transfer_order_pod_city_id_fkey(city_code),
        dispatch_vendor:lessees(company_name, legal_company_name, lessee_code)
      `
    )
    .eq("transfer_type", "ONE_WAY_LEASE")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (orderError) {
    throw new Error(orderError.message);
  }

  const orderRows = (orderData ?? []) as DispatchReleaseManagementOrderRow[];
  const orderIds = orderRows.map((row) => row.id).filter(Boolean);
  const sourceItemIds = Array.from(
    new Set(
      orderRows
        .map((row) => normalizeText(row.source_purchase_order_item_id))
        .filter(Boolean)
    )
  );

  const [
    { data: sourceItemData, error: sourceItemError },
    { data: transferItemData, error: transferItemError },
    { data: transferOutData, error: transferOutError },
    fallbackSourceItemByOrderId,
  ] = await Promise.all([
    sourceItemIds.length > 0
      ? supabase
          .from("purchase_order_item")
          .select(
            `
              id,
              color,
              machine_type,
              size:container_size_codes(size_code),
              type:container_type_codes(type_code),
              condition:container_condition_codes(condition_code)
            `
          )
          .in("id", sourceItemIds)
      : Promise.resolve({ data: [], error: null }),
    orderIds.length > 0
      ? supabase
          .from("transfer_item")
          .select(
            `
              transfer_order_id,
              container_id,
              delivery_date,
              container:container_id(container_number)
            `
          )
          .in("transfer_order_id", orderIds)
      : Promise.resolve({ data: [], error: null }),
    orderIds.length > 0
      ? supabase
          .from("container_event")
          .select("business_id, container_id")
          .eq("business_type", "TRANSFER")
          .eq("event_type", "TRANSFER_OUT")
          .eq("is_void", false)
          .in("business_id", orderIds)
      : Promise.resolve({ data: [], error: null }),
    loadFallbackSourceItemsByTransferOrderIds(orderIds),
  ]);

  if (sourceItemError) throw new Error(sourceItemError.message);
  if (transferItemError) throw new Error(transferItemError.message);
  if (transferOutError) throw new Error(transferOutError.message);

  const sourceItemById = new Map(
    ((sourceItemData ?? []) as DispatchReleaseManagementSourceItemRow[]).map((row) => [
      row.id,
      row,
    ])
  );

  const containerNumbersByOrderId = new Map<string, string[]>();
  const pickupDateContainerIdsByOrderId = new Map<string, Set<string>>();
  for (const row of (transferItemData ?? []) as Array<{
    transfer_order_id: string | null;
    container_id: string | null;
    delivery_date: string | null;
    container:
      | { container_number?: string | null }
      | Array<{ container_number?: string | null }>
      | null;
  }>) {
    const transferOrderId = normalizeText(row.transfer_order_id);
    if (!transferOrderId) continue;
    const containerNumber = normalizeText(
      firstRelationRow(row.container)?.container_number
    );
    if (!containerNumber) continue;
    const existing = containerNumbersByOrderId.get(transferOrderId) ?? [];
    existing.push(containerNumber);
    containerNumbersByOrderId.set(transferOrderId, existing);

    const containerId = normalizeText(row.container_id);
    if (containerId && formatDate(row.delivery_date)) {
      const picked = pickupDateContainerIdsByOrderId.get(transferOrderId) ?? new Set<string>();
      picked.add(containerId);
      pickupDateContainerIdsByOrderId.set(transferOrderId, picked);
    }
  }

  const pickedUpCounts = buildDispatchReleasePickedUpCounts(
    (transferOutData ?? []) as Array<{ business_id: string | null; container_id: string | null }>
  );

  const allRows: DispatchReleaseManagementRow[] = orderRows.map((row) => {
    const sourceItem =
      sourceItemById.get(normalizeText(row.source_purchase_order_item_id)) ??
      fallbackSourceItemByOrderId.get(row.id) ??
      null;
    const releaseNumber = normalizeText(row.order_no) || "-";
    const pol = normalizeText(firstRelationRow(row.pol)?.city_code) || "-";
    const pod = normalizeText(firstRelationRow(row.pod)?.city_code) || "-";
    const lessee = formatLesseeLabel(firstRelationRow(row.dispatch_vendor) ?? {});
    const onhireNumber = normalizeText(row.onhire_no) || "-";
    const vendorReleaseNumber = normalizeText(row.vendor_release_number) || "-";
    const totalQuantity = toInteger(row.release_qty);
    const pu = Math.max(
      pickedUpCounts.get(row.id) ?? 0,
      pickupDateContainerIdsByOrderId.get(row.id)?.size ?? 0
    );
    const npu = Math.max(0, totalQuantity - pu);

    return {
      id: row.id,
      releaseNumber,
      pol,
      pod,
      lessee,
      onhireNumber,
      sizeType: buildDispatchReleaseSizeType(sourceItem),
      condition: buildDispatchReleaseCondition(sourceItem),
      color: normalizeBucketFilterValue(sourceItem?.color) || "-",
      machineType: normalizeBucketFilterValue(sourceItem?.machine_type) || "-",
      vendorReleaseNumber,
      totalQuantity,
      pu,
      npu,
      status: formatDispatchReleaseStatus(row.status),
      rawStatus: normalizeText(row.status),
      containerNumbers: Array.from(
        new Set(containerNumbersByOrderId.get(row.id) ?? [])
      ).sort((left, right) => left.localeCompare(right)),
    };
  });

  const filteredRows = allRows
    .filter((row) => matchesDispatchReleaseManagementRow(row, query))
    .sort((left, right) =>
      compareDispatchReleaseManagementRows(
        left,
        right,
        query.sortBy,
        query.sortDirection
      )
    );

  const summary = {
    totalRelease: filteredRows.length,
    arrangedQuantity: filteredRows.reduce(
      (sum, row) => sum + row.totalQuantity,
      0
    ),
    pu: filteredRows.reduce((sum, row) => sum + row.pu, 0),
    npu: filteredRows.reduce((sum, row) => sum + row.npu, 0),
    onHoldQuantity: filteredRows.reduce(
      (sum, row) => sum + (row.rawStatus === "ON_HOLD" ? row.totalQuantity : 0),
      0
    ),
  };

  const totalCount = filteredRows.length;
  const from = (query.page - 1) * query.pageSize;
  const to = from + query.pageSize;

  return {
    rows: filteredRows.slice(from, to),
    totalCount,
    page: query.page,
    pageSize: query.pageSize,
    filters: query,
    summary,
  };
}

async function countPickedUpContainersForTransferOrder(transferOrderId: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("container_event")
    .select("container_id")
    .eq("business_type", "TRANSFER")
    .eq("business_id", transferOrderId)
    .eq("event_type", "TRANSFER_OUT")
    .eq("is_void", false);

  if (error) {
    throw new Error(error.message);
  }

  return new Set(
    (data ?? [])
      .map((row) =>
        typeof row.container_id === "string" ? row.container_id.trim() : ""
      )
      .filter(Boolean)
  ).size;
}

export async function holdDispatchRelease(
  transferOrderId: string | DispatchReleaseHoldInput
) {
  const effectiveInput: DispatchReleaseHoldInput =
    typeof transferOrderId === "string"
      ? { transferOrderId, holdReason: "On hold" }
      : transferOrderId;

  const supabase = createServerSupabaseClient();
  const { data: currentRow, error: currentError } = await supabase
    .from("transfer_order")
    .select("id, status")
    .eq("id", effectiveInput.transferOrderId)
    .single();

  if (currentError) {
    throw new Error(currentError.message);
  }

  const status = normalizeText(currentRow.status);
  if (status !== "CREATED" && status !== "IN_TRANSIT") {
    throw new Error("Only submitted releases can be put on hold.");
  }

  const holdReason = requireValue("Hold Reason", effectiveInput.holdReason);

  const { error: updateError } = await supabase
    .from("transfer_order")
    .update({ status: "ON_HOLD", hold_reason: holdReason })
    .eq("id", effectiveInput.transferOrderId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidateDispatchReleasePaths(effectiveInput.transferOrderId);
}

export async function resumeDispatchRelease(transferOrderId: string) {
  const supabase = createServerSupabaseClient();
  const { data: currentRow, error: currentError } = await supabase
    .from("transfer_order")
    .select("id, status")
    .eq("id", transferOrderId)
    .single();

  if (currentError) {
    throw new Error(currentError.message);
  }

  const status = normalizeText(currentRow.status);
  if (status !== "ON_HOLD") {
    throw new Error("Only on-hold releases can be resumed.");
  }

  const pickedUpCount = await countPickedUpContainersForTransferOrder(transferOrderId);
  const nextStatus = pickedUpCount > 0 ? "IN_TRANSIT" : "CREATED";

  const { error: updateError } = await supabase
    .from("transfer_order")
    .update({ status: nextStatus })
    .eq("id", transferOrderId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidateDispatchReleasePaths(transferOrderId);
}

async function resolveSelectedContainerIdsForUpdate(
  currentOrder: TransferOrderMutationRow,
  currentItems: TransferItemMutationRow[],
  input: DispatchReleaseUpdateInput
) {
  if (input.containerSelectionMode === "UNSPECIFIED") {
    return [] as ResolvedSelectedContainer[];
  }

  const eligibleRows = await getDispatchReleaseSelectableContainers({
    region: input.bucket.region,
    city: input.bucket.city,
    depot: input.bucket.depot,
    sizeType: input.bucket.sizeType,
    condition: input.bucket.condition,
    color: input.bucket.color,
    machineType: input.bucket.machineType,
    releaseSource: input.releaseSource,
    sourcePurchaseOrderItemId:
      input.releaseSource === "VENDOR_REF"
        ? normalizeText(input.sourcePurchaseOrderItemId) ||
          normalizeText(currentOrder.source_purchase_order_item_id)
        : "",
  });

  const eligibleByNumber = new Map(
    eligibleRows.map((row) => [normalizeContainerNumber(row.containerNumber), row] as const)
  );
  const currentActiveByNumber = new Map(
    currentItems
      .filter((row) => normalizeText(row.item_status) !== "CANCELLED")
      .map((row) => {
        const container = firstRelationRow(row.container);
        return [
          normalizeContainerNumber(container?.container_number),
          {
            transferItemId: row.id,
            containerId: normalizeText(container?.id),
            containerNumber: normalizeText(container?.container_number),
            pickupDate: formatDate(row.delivery_date),
            truckingCost: formatMoney(row.trucking_cost),
            truckingCostCurrency: normalizeDispatchReleaseCurrency(row.trucking_cost_currency),
            repairCost: formatMoney(row.repair_cost),
            repairCostCurrency: normalizeDispatchReleaseCurrency(row.repair_cost_currency),
            damageClaim: formatMoney(row.damage_claim),
            damageClaimCurrency: normalizeDispatchReleaseCurrency(row.damage_claim_currency),
            remark: row.remark,
          },
        ] as const;
      })
      .filter((entry) => entry[0] && entry[1].containerId)
  );

  const normalizedSelections = input.selectedContainers.map((row) => ({
    ...row,
    normalizedNumber: normalizeContainerNumber(row.containerNumber),
  }));
  const allowVendorManualCandidates =
    input.releaseSource === "VENDOR_REF" &&
    (normalizeText(input.sourcePurchaseOrderItemId) ||
      normalizeText(currentOrder.source_purchase_order_item_id)) &&
    (normalizeText(input.sourcePurchaseOrderId) ||
      normalizeText(currentOrder.source_purchase_order_id));

  if (normalizedSelections.length > input.releaseQty) {
    throw new Error(
      `Specified container count ${normalizedSelections.length} cannot exceed Release Qty ${input.releaseQty}.`
    );
  }

  const duplicateCheck = new Set<string>();
  for (const row of normalizedSelections) {
    if (!row.normalizedNumber) {
      throw new Error("Every selected container must include a container number.");
    }
    if (duplicateCheck.has(row.normalizedNumber)) {
      throw new Error(`Duplicate selected container ${row.containerNumber}.`);
    }
    duplicateCheck.add(row.normalizedNumber);
    if (
      !eligibleByNumber.has(row.normalizedNumber) &&
      !currentActiveByNumber.has(row.normalizedNumber) &&
      !allowVendorManualCandidates
    ) {
      throw new Error(`Container ${row.containerNumber} is no longer eligible for this release.`);
    }
  }

  const missingContainerNumbers = normalizedSelections
    .filter(
      (row) =>
        !normalizeText(row.containerId) &&
        !normalizeText(currentActiveByNumber.get(row.normalizedNumber)?.containerId)
    )
    .map((row) => row.normalizedNumber);

  const resolvedContainerIdByNumber = new Map<string, string>();
  if (missingContainerNumbers.length > 0) {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("container")
      .select("id, container_number")
      .in("container_number", missingContainerNumbers);

    if (error) {
      throw new Error(error.message);
    }

    for (const row of data ?? []) {
      const containerNumber = normalizeContainerNumber(row.container_number);
      const containerId = normalizeText(row.id);
      if (containerNumber && containerId) {
        resolvedContainerIdByNumber.set(containerNumber, containerId);
      }
    }
  }

  return normalizedSelections.map((row) => {
    const currentActive = currentActiveByNumber.get(row.normalizedNumber);
    const eligible = eligibleByNumber.get(row.normalizedNumber);
    const pickupDate = currentActive?.pickupDate || formatDate(row.pickupDate);
    if (
      currentActive?.pickupDate &&
      formatDate(row.pickupDate) &&
      formatDate(row.pickupDate) !== currentActive.pickupDate
    ) {
      throw new Error(`Pickup Date for ${row.containerNumber} cannot be changed after save.`);
    }
    const containerId =
      normalizeText(row.containerId) ||
      currentActive?.containerId ||
      resolvedContainerIdByNumber.get(row.normalizedNumber) ||
      null;
    const purchaseOrderId =
      currentActive?.containerId
        ? normalizeText(eligible?.purchaseOrderId) ||
          normalizeText(currentOrder.source_purchase_order_id) ||
          normalizeText(input.sourcePurchaseOrderId) ||
          normalizeText(row.purchaseOrderId)
        : normalizeText(eligible?.purchaseOrderId) ||
          normalizeText(input.sourcePurchaseOrderId) ||
          normalizeText(currentOrder.source_purchase_order_id) ||
          normalizeText(row.purchaseOrderId);
    const purchaseOrderItemId =
      normalizeText(eligible?.purchaseOrderItemId) ||
      normalizeText(input.sourcePurchaseOrderItemId) ||
      normalizeText(currentOrder.source_purchase_order_item_id) ||
      normalizeText(row.purchaseOrderItemId);
    if (!purchaseOrderId || !purchaseOrderItemId) {
      throw new Error(`Container ${row.containerNumber} could not be linked to the source PO item.`);
    }
    const allowDeferredMasterContainerCreation =
      Boolean(purchaseOrderId && purchaseOrderItemId) || allowVendorManualCandidates;
    if (!containerId && !allowDeferredMasterContainerCreation) {
      throw new Error(`Container ${row.containerNumber} could not be linked to a master container record.`);
    }
    return {
      transferItemId: currentActive?.transferItemId,
      containerId,
      containerNumber:
        currentActive?.containerNumber || eligible?.containerNumber || row.containerNumber,
      purchaseOrderId,
      purchaseOrderItemId,
      pickupDate,
      truckingCost:
        currentActive?.truckingCost ?? formatMoney(row.truckingCost),
      truckingCostCurrency:
        currentActive?.truckingCostCurrency ??
        normalizeDispatchReleaseCurrency(row.truckingCostCurrency),
      repairCost: formatMoney(row.repairCost),
      repairCostCurrency: normalizeDispatchReleaseCurrency(row.repairCostCurrency),
      damageClaim: formatMoney(row.damageClaim),
      damageClaimCurrency: normalizeDispatchReleaseCurrency(row.damageClaimCurrency),
      remark: normalizeText(row.remark) || null,
    };
  });
}

export async function updateDispatchRelease(
  input: DispatchReleaseUpdateInput
): Promise<DispatchReleasePersistResult> {
  noStore();

  const transferOrderId = requireValue("Dispatch Release", input.transferOrderId);
  const currentOrder = await loadTransferOrderForMutation(transferOrderId);
  const currentStatus = normalizeText(currentOrder.status);
  if (!["CREATED", "IN_TRANSIT", "ON_HOLD"].includes(currentStatus)) {
    throw new Error("Only active dispatch releases can be edited.");
  }

  const releaseDate = requireValue("Release Date", input.releaseDate);
  const dispatchVendorId = requireValue("Lessee", input.dispatchVendorId);
  const polCityCode = requireValue("POL", input.polCityCode).toUpperCase();
  const podCityCode = requireValue("POD", input.podCityCode).toUpperCase();
  if (input.releaseQty <= 0) {
    throw new Error("Release Qty must be greater than 0.");
  }

  const [currentItems, pickedUpContainerIds] = await Promise.all([
    loadTransferItemsForMutation(transferOrderId),
    getPickedUpContainerIdsForTransferOrder(transferOrderId),
  ]);

  await validateUpdatedReleaseCapacity(currentOrder, input);
  let selectedContainers = await resolveSelectedContainerIdsForUpdate(currentOrder, currentItems, input);
  let insertedMasterContainerIds: string[] = [];
  if (selectedContainers.some((row) => !normalizeText(row.containerId))) {
    const ensured = await ensureSelectedMasterContainers(selectedContainers);
    selectedContainers = await hydrateSelectedContainerIdsFromMaster(
      ensured.selectedContainers
    );
    insertedMasterContainerIds = ensured.insertedContainerIds;
  }
  let vendorWritebackCandidates =
    input.releaseSource === "VENDOR_REF" ? selectedContainers : [];

  if (
    input.releaseSource === "VENDOR_REF" &&
    vendorWritebackCandidates.length > 0 &&
    (normalizeText(input.sourcePurchaseOrderId) ||
      normalizeText(currentOrder.source_purchase_order_id)) &&
    (normalizeText(input.sourcePurchaseOrderItemId) ||
      normalizeText(currentOrder.source_purchase_order_item_id))
  ) {
    await writeBackVendorReleaseContainers(
      transferOrderId,
      vendorWritebackCandidates,
      normalizeText(input.sourcePurchaseOrderId) ||
        normalizeText(currentOrder.source_purchase_order_id),
      normalizeText(input.sourcePurchaseOrderItemId) ||
        normalizeText(currentOrder.source_purchase_order_item_id),
      true
    );
  }

  const activeCurrentItems = currentItems.filter(
    (row) => normalizeText(row.item_status) !== "CANCELLED"
  );
  const lockedCurrentItems = activeCurrentItems.filter((row) => {
    const container = firstRelationRow(row.container);
    return Boolean(normalizeContainerNumber(container?.container_number) && formatDate(row.delivery_date));
  });
  const currentActiveByNumber = new Map(
    activeCurrentItems.map((row) => {
      const container = firstRelationRow(row.container);
      return [normalizeContainerNumber(container?.container_number), row] as const;
    })
  );
  const desiredByNumber = new Map(
    selectedContainers.map((row) => [normalizeContainerNumber(row.containerNumber), row] as const)
  );

  const lockedMissing = lockedCurrentItems.filter((row) => {
    const container = firstRelationRow(row.container);
    return !desiredByNumber.has(normalizeContainerNumber(container?.container_number));
  });
  if (lockedMissing.length > 0) {
    throw new Error("Saved container numbers and dates cannot be removed after save.");
  }

  const toRemove = activeCurrentItems.filter((row) => {
    const container = firstRelationRow(row.container);
    return !desiredByNumber.has(normalizeContainerNumber(container?.container_number));
  });
  const blockedRemovals = toRemove.filter((row) => {
    const container = firstRelationRow(row.container);
    return pickedUpContainerIds.has(normalizeText(container?.id));
  });
  if (blockedRemovals.length > 0) {
    throw new Error("Picked-up containers cannot be removed from the release.");
  }

  const cityIdByCode = await resolveCityIdsByCode([polCityCode, podCityCode]);
  const polCityId = cityIdByCode.get(polCityCode);
  const podCityId = cityIdByCode.get(podCityCode);
  if (!polCityId) throw new Error(`POL city code ${polCityCode} could not be resolved.`);
  if (!podCityId) throw new Error(`POD city code ${podCityCode} could not be resolved.`);

  if (
    input.releaseSource === "VENDOR_REF" &&
    (normalizeText(input.sourcePurchaseOrderId) ||
      normalizeText(currentOrder.source_purchase_order_id)) &&
    (normalizeText(input.sourcePurchaseOrderItemId) ||
      normalizeText(currentOrder.source_purchase_order_item_id)) &&
    selectedContainers.some((row) => !normalizeText(row.containerId))
  ) {
    const ensured = await ensureVendorReleaseMasterContainers(
      selectedContainers,
      normalizeText(input.sourcePurchaseOrderId) ||
        normalizeText(currentOrder.source_purchase_order_id),
      normalizeText(input.sourcePurchaseOrderItemId) ||
        normalizeText(currentOrder.source_purchase_order_item_id)
    );
    selectedContainers = ensured.selectedContainers;
    vendorWritebackCandidates = ensured.selectedContainers;
  }

  const selfPickupDepotId = await resolveDepotIdByNameOrCode(input.selfPickupDepotName);
  const assignedQty = selectedContainers.length;
  const unassignedQty = input.releaseQty - assignedQty;
  if (unassignedQty < 0) {
    throw new Error("Release Qty cannot be less than the number of specified containers.");
  }

  const supabase = createServerSupabaseClient();
  const { error: updateOrderError } = await supabase
    .from("transfer_order")
    .update({
      source_purchase_order_id:
        normalizeText(input.sourcePurchaseOrderId) ||
        normalizeText(currentOrder.source_purchase_order_id) ||
        null,
      source_purchase_order_item_id:
        normalizeText(input.sourcePurchaseOrderItemId) ||
        normalizeText(currentOrder.source_purchase_order_item_id) ||
        null,
      vendor_release_number: normalizeText(input.vendorReleaseNumber) || null,
      dispatch_plan_no: normalizeText(input.dispatchPlanNo) || null,
      carrier_plan_no: normalizeText(input.carrierPlanNo) || null,
      dispatch_vendor_id: dispatchVendorId,
      onhire_no: normalizeText(input.onhireNo) || null,
      release_date: releaseDate,
      pol_city_id: polCityId,
      pod_city_id: podCityId,
      carrier: normalizeText(input.carrier) || null,
      dispatch_arrange_date: formatDate(input.dispatchArrangeDate),
      self_pickup_depot_id: selfPickupDepotId,
      box_selection_mode: input.containerSelectionMode,
      release_qty: input.releaseQty,
      assigned_qty: assignedQty,
      unassigned_qty: unassignedQty,
      pickup_charge: formatMoney(input.pickupCharge),
      dpp: formatMoney(input.dpp),
      free_days: toInteger(input.freeDays),
      rv: formatMoney(input.rv),
      daily_rent: formatMoney(input.dailyRent),
      header_currency: normalizeDispatchReleaseCurrency(input.headerCurrency),
      item_cost_currency: normalizeDispatchReleaseCurrency(input.itemCostCurrency),
      trucking_cost: formatMoney(input.truckingCost),
      handling_fee: formatMoney(input.handlingFee),
      remark: normalizeText(input.remarks) || null,
    })
    .eq("id", transferOrderId);

  if (updateOrderError) throw new Error(updateOrderError.message);

  for (const row of toRemove) {
    const { error } = await supabase
      .from("transfer_item")
      .update({ item_status: "CANCELLED" })
      .eq("id", row.id);
    if (error) throw new Error(error.message);
  }

  const desiredByContainerId = new Map(
    selectedContainers
      .filter((row): row is ResolvedSelectedContainer & { containerId: string } => Boolean(normalizeText(row.containerId)))
      .map((row) => [normalizeText(row.containerId), row] as const)
  );
  const activeCurrentByContainerId = new Map(
    activeCurrentItems.map((row) => {
      const container = firstRelationRow(row.container);
      return [normalizeText(container?.id), row] as const;
    })
  );

  const newItemsPayload: Array<{
    transfer_order_id: string;
    container_id: string;
    item_status: string;
    delivery_date: string | null;
    trucking_cost: number;
    trucking_cost_currency: string;
    repair_cost: number;
    repair_cost_currency: string;
    damage_claim: number;
    damage_claim_currency: string;
    remark: string | null;
  }> = [];

  for (const selected of selectedContainers) {
    const selectedContainerId = normalizeText(selected.containerId);
    const currentItem = activeCurrentByContainerId.get(selectedContainerId);
    if (!currentItem) {
      if (!selectedContainerId) {
        throw new Error(`Container ${selected.containerNumber} could not be linked to a master container record.`);
      }
      const nextItemStatus = selected.pickupDate ? "IN_TRANSIT" : "PLANNED";
      newItemsPayload.push({
        transfer_order_id: transferOrderId,
        container_id: selectedContainerId,
        item_status: nextItemStatus,
        delivery_date: selected.pickupDate,
        trucking_cost: selected.truckingCost,
        trucking_cost_currency: normalizeDispatchReleaseCurrency(selected.truckingCostCurrency),
        repair_cost: selected.repairCost,
        repair_cost_currency: normalizeDispatchReleaseCurrency(selected.repairCostCurrency),
        damage_claim: selected.damageClaim,
        damage_claim_currency: normalizeDispatchReleaseCurrency(selected.damageClaimCurrency),
        remark: selected.remark,
      });
      continue;
    }
    if (formatDate(currentItem.delivery_date) && formatDate(currentItem.delivery_date) !== selected.pickupDate) {
      throw new Error(`Pickup Date for ${selected.containerNumber} cannot be changed after save.`);
    }
    const nextDeliveryDate = formatDate(currentItem.delivery_date) || selected.pickupDate;
    const nextItemStatus = nextDeliveryDate ? "IN_TRANSIT" : "PLANNED";
    const { error } = await supabase
      .from("transfer_item")
      .update({
        item_status: nextItemStatus,
        delivery_date: nextDeliveryDate,
        trucking_cost: selected.truckingCost,
        trucking_cost_currency: normalizeDispatchReleaseCurrency(selected.truckingCostCurrency),
        repair_cost: selected.repairCost,
        repair_cost_currency: normalizeDispatchReleaseCurrency(selected.repairCostCurrency),
        damage_claim: selected.damageClaim,
        damage_claim_currency: normalizeDispatchReleaseCurrency(selected.damageClaimCurrency),
        remark: selected.remark,
      })
      .eq("id", currentItem.id);
    if (error) throw new Error(error.message);
  }

  if (newItemsPayload.length > 0) {
    const { error } = await supabase.from("transfer_item").insert(newItemsPayload);
    if (error) throw new Error(error.message);
  }

  await syncSelectedSourceContainerStatuses(selectedContainers);

  if (
    input.releaseSource === "VENDOR_REF" &&
    vendorWritebackCandidates.length > 0 &&
    (normalizeText(input.sourcePurchaseOrderId) ||
      normalizeText(currentOrder.source_purchase_order_id)) &&
    (normalizeText(input.sourcePurchaseOrderItemId) ||
      normalizeText(currentOrder.source_purchase_order_item_id))
  ) {
    await writeBackVendorReleaseContainers(
      transferOrderId,
      vendorWritebackCandidates,
      normalizeText(input.sourcePurchaseOrderId) ||
        normalizeText(currentOrder.source_purchase_order_id),
      normalizeText(input.sourcePurchaseOrderItemId) ||
        normalizeText(currentOrder.source_purchase_order_item_id)
    );
  }

  const refreshedOrder = await loadTransferOrderForMutation(transferOrderId);
  const refreshedItems = await loadTransferItemsForMutation(transferOrderId);
  const activeFinanceItems = refreshedItems
    .filter((row) => normalizeText(row.item_status) !== "CANCELLED")
    .map((row) => {
      const container = firstRelationRow(row.container);
      return {
        id: row.id,
        containerId: normalizeText(container?.id),
        pickupDate: formatDate(row.delivery_date),
        truckingCost: formatMoney(row.trucking_cost),
        truckingCostCurrency: normalizeDispatchReleaseCurrency(row.trucking_cost_currency),
        repairCost: formatMoney(row.repair_cost),
        repairCostCurrency: normalizeDispatchReleaseCurrency(row.repair_cost_currency),
        damageClaim: formatMoney(row.damage_claim),
        damageClaimCurrency: normalizeDispatchReleaseCurrency(row.damage_claim_currency),
      };
    })
    .filter((row) => row.containerId);

  await rebuildTransferFinanceArtifacts(refreshedOrder, activeFinanceItems);
  revalidateDispatchReleasePaths(transferOrderId);
  if (normalizeText(currentOrder.release_source) === "VENDOR_REF") {
    revalidateVendorSourcePurchasePaths(
      normalizeText(input.sourcePurchaseOrderId) ||
        normalizeText(currentOrder.source_purchase_order_id),
      normalizeText(input.sourcePurchaseOrderItemId) ||
        normalizeText(currentOrder.source_purchase_order_item_id)
    );
  }

  return {
    transferOrderId,
    releaseNumber: normalizeText(refreshedOrder.order_no),
    createdTransferItemCount: newItemsPayload.length,
    createdRevenueCount: 0,
    createdCostCount: 0,
  };
}

export async function cancelDispatchRelease(input: DispatchReleaseCancelInput) {
  noStore();

  const transferOrderId = requireValue("Dispatch Release", input.transferOrderId);
  const cancelReason = requireValue("Cancel Reason", input.cancelReason);
  const currentOrder = await loadTransferOrderForMutation(transferOrderId);
  const currentStatus = normalizeText(currentOrder.status);
  if (!["CREATED", "IN_TRANSIT", "ON_HOLD"].includes(currentStatus)) {
    throw new Error("Only active dispatch releases can be cancelled.");
  }

  const [currentItems, pickedUpContainerIds] = await Promise.all([
    loadTransferItemsForMutation(transferOrderId),
    getPickedUpContainerIdsForTransferOrder(transferOrderId),
  ]);

  const activeItems = currentItems.filter((row) => normalizeText(row.item_status) !== "CANCELLED");
  const activeUnpickedItems = activeItems.filter((row) => {
    const container = firstRelationRow(row.container);
    return !pickedUpContainerIds.has(normalizeText(container?.id));
  });
  const maxCancellableQty = toInteger(currentOrder.unassigned_qty) + activeUnpickedItems.length;
  if (maxCancellableQty <= 0) {
    throw new Error("No cancellable quantity remains on this release.");
  }

  const requestedCancelQty = input.cancelQty == null ? maxCancellableQty : toInteger(input.cancelQty);
  if (requestedCancelQty <= 0) {
    throw new Error("Cancel quantity must be greater than 0.");
  }
  if (requestedCancelQty > maxCancellableQty) {
    throw new Error(`Cancel quantity cannot exceed remaining cancellable quantity ${maxCancellableQty}.`);
  }

  const cancelFromUnassigned = Math.min(requestedCancelQty, toInteger(currentOrder.unassigned_qty));
  const remainingQtyToCancel = requestedCancelQty - cancelFromUnassigned;
  const itemIdsToCancel = activeUnpickedItems.slice(0, remainingQtyToCancel).map((row) => row.id);
  const isFullCancel = requestedCancelQty === maxCancellableQty;

  const supabase = createServerSupabaseClient();
  if (itemIdsToCancel.length > 0) {
    const { error } = await supabase
      .from("transfer_item")
      .update({ item_status: "CANCELLED" })
      .in("id", itemIdsToCancel);
    if (error) throw new Error(error.message);
  }

  const nextAssignedQty = Math.max(0, toInteger(currentOrder.assigned_qty) - itemIdsToCancel.length);
  const nextUnassignedQty = Math.max(0, toInteger(currentOrder.unassigned_qty) - cancelFromUnassigned);
  const nextReleaseQty = Math.max(0, toInteger(currentOrder.release_qty) - requestedCancelQty);

  const { error: updateOrderError } = await supabase
    .from("transfer_order")
    .update({
      release_qty: nextReleaseQty,
      assigned_qty: nextAssignedQty,
      unassigned_qty: nextUnassignedQty,
      status: isFullCancel ? "CANCELLED" : currentStatus,
      cancel_reason: cancelReason,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", transferOrderId);

  if (updateOrderError) throw new Error(updateOrderError.message);

  const refreshedOrder = await loadTransferOrderForMutation(transferOrderId);
  const refreshedItems = await loadTransferItemsForMutation(transferOrderId);
  const activeFinanceItems = refreshedItems
    .filter((row) => normalizeText(row.item_status) !== "CANCELLED")
    .map((row) => {
      const container = firstRelationRow(row.container);
      return {
        id: row.id,
        containerId: normalizeText(container?.id),
        pickupDate: formatDate(row.delivery_date),
        truckingCost: formatMoney(row.trucking_cost),
        truckingCostCurrency: normalizeDispatchReleaseCurrency(row.trucking_cost_currency),
        repairCost: formatMoney(row.repair_cost),
        repairCostCurrency: normalizeDispatchReleaseCurrency(row.repair_cost_currency),
        damageClaim: formatMoney(row.damage_claim),
        damageClaimCurrency: normalizeDispatchReleaseCurrency(row.damage_claim_currency),
      };
    })
    .filter((row) => row.containerId);

  await rebuildTransferFinanceArtifacts(refreshedOrder, activeFinanceItems);
  revalidateDispatchReleasePaths(transferOrderId);

  return {
    transferOrderId,
    releaseNumber: normalizeText(refreshedOrder.order_no),
    createdTransferItemCount: 0,
    createdRevenueCount: 0,
    createdCostCount: 0,
  };
}

export async function createDispatchRelease(
  input: DispatchReleasePersistInput
): Promise<DispatchReleasePersistResult> {
  noStore();

  const releaseNumber = requireValue("Release Number", input.releaseNumber);
  const dispatchVendorId = requireValue("Lessee", input.dispatchVendorId);
  const releaseDate = requireValue("Release Date", input.releaseDate);
  const polCityCode = requireValue("POL", input.polCityCode).toUpperCase();
  const podCityCode = requireValue("POD", input.podCityCode).toUpperCase();
  if (input.releaseQty <= 0) {
    throw new Error("Release Qty must be greater than 0.");
  }

  await ensureUniqueReleaseNumber(releaseNumber);
  const freshBucket = await validateReleaseCapacity(input);
  const sourceAnchor = await resolveSourceItemAnchor(input);

  let selectedContainers = await resolveSelectedContainerIds(input);
  if (input.containerSelectionMode === "SPECIFIED" && selectedContainers.length > input.releaseQty) {
    throw new Error("Specified container selection cannot exceed Release Qty.");
  }
  if (
    input.releaseSource === "VENDOR_REF" &&
    normalizeText(sourceAnchor.purchaseOrderId) &&
    normalizeText(sourceAnchor.purchaseOrderItemId) &&
    selectedContainers.length > 0
  ) {
    await writeBackVendorReleaseContainers(
      "__validate__",
      selectedContainers,
      sourceAnchor.purchaseOrderId,
      sourceAnchor.purchaseOrderItemId,
      true
    );
  }

  const cityIdByCode = await resolveCityIdsByCode([polCityCode, podCityCode]);
  const polCityId = cityIdByCode.get(polCityCode);
  const podCityId = cityIdByCode.get(podCityCode);
  if (!polCityId) {
    throw new Error(`POL city code ${polCityCode} could not be resolved.`);
  }
  if (!podCityId) {
    throw new Error(`POD city code ${podCityCode} could not be resolved.`);
  }

  const [fromDepotId, selfPickupDepotId] = await Promise.all([
    resolveDepotIdByNameOrCode(freshBucket.depot),
    resolveDepotIdByNameOrCode(input.selfPickupDepotName),
  ]);

  const repairCostTotal = selectedContainers.reduce((sum, row) => sum + row.repairCost, 0);
  const damageClaimTotal = selectedContainers.reduce((sum, row) => sum + row.damageClaim, 0);
  const assignedQty = input.containerSelectionMode === "SPECIFIED" ? selectedContainers.length : 0;
  const unassignedQty =
    input.containerSelectionMode === "UNSPECIFIED"
      ? input.releaseQty
      : Math.max(0, input.releaseQty - selectedContainers.length);

  const supabase = createServerSupabaseClient();
  const orderPayload = {
    order_no: releaseNumber,
    transfer_type: "ONE_WAY_LEASE",
    one_way_plan_id: normalizeText(input.oneWayPlanId) || null,
    from_depot_id: fromDepotId,
    to_depot_id: null,
    customer_id: null,
    status: "CREATED",
    departure_time: null,
    arrival_time: null,
    total_cost: 0,
    total_revenue: 0,
    remark: normalizeText(input.remarks) || null,
    release_source: input.releaseSource,
    source_purchase_order_id: sourceAnchor.purchaseOrderId || null,
    source_purchase_order_item_id: sourceAnchor.purchaseOrderItemId || null,
    vendor_release_number: normalizeText(input.vendorReleaseNumber) || null,
    dispatch_plan_no: normalizeText(input.dispatchPlanNo) || null,
    carrier_plan_no: normalizeText(input.carrierPlanNo) || null,
    dispatch_vendor_id: dispatchVendorId,
    onhire_no: normalizeText(input.onhireNo) || null,
    release_date: releaseDate,
    pol_city_id: polCityId,
    pod_city_id: podCityId,
    carrier: normalizeText(input.carrier) || null,
    dispatch_arrange_date: formatDate(input.dispatchArrangeDate),
    self_pickup_depot_id: selfPickupDepotId,
    box_selection_mode: input.containerSelectionMode,
    release_qty: input.releaseQty,
    assigned_qty: assignedQty,
    unassigned_qty: unassignedQty,
    pickup_charge: formatMoney(input.pickupCharge),
    dpp: formatMoney(input.dpp),
    free_days: toInteger(input.freeDays),
    rv: formatMoney(input.rv),
    daily_rent: formatMoney(input.dailyRent),
    header_currency: normalizeDispatchReleaseCurrency(input.headerCurrency),
    item_cost_currency: normalizeDispatchReleaseCurrency(input.itemCostCurrency),
    trucking_cost: formatMoney(input.truckingCost),
    handling_fee: formatMoney(input.handlingFee),
    repair_cost_total: formatMoney(repairCostTotal),
    damage_claim_total: formatMoney(damageClaimTotal),
  };

  const { data: insertedOrder, error: orderError } = await supabase
    .from("transfer_order")
    .insert(orderPayload)
    .select("id")
    .single();

  if (orderError) {
    throw new Error(orderError.message);
  }

  const transferOrderId = insertedOrder.id as string;
  let createdTransferItems: Array<{
    id: string;
    containerId: string;
    pickupDate: string | null;
    truckingCost: number;
    truckingCostCurrency: string;
    repairCost: number;
    repairCostCurrency: string;
    damageClaim: number;
    damageClaimCurrency: string;
  }> = [];
  let createdCostRows: Array<{ id: string }> = [];
  let createdRevenueRows: Array<{ id: string }> = [];
  let insertedMasterContainerIds: string[] = [];
  let vendorWritebackTouchedRows: Array<{
    id: string;
    container_id: string | null;
    container_number: string | null;
    offline_date: string | null;
    container_status: string | null;
    item_status: string | null;
  }> = [];
  let vendorWritebackInsertedRowIds: string[] = [];

  try {
    if (selectedContainers.some((row) => !normalizeText(row.containerId))) {
      const ensured = await ensureSelectedMasterContainers(selectedContainers);
      selectedContainers = await hydrateSelectedContainerIdsFromMaster(
        ensured.selectedContainers
      );
      insertedMasterContainerIds = ensured.insertedContainerIds;
    }

    if (selectedContainers.length > 0) {
      const itemPayload = selectedContainers.map((row) => ({
        transfer_order_id: transferOrderId,
        container_id: row.containerId,
        item_status: row.pickupDate ? "IN_TRANSIT" : "PLANNED",
        delivery_date: row.pickupDate,
        trucking_cost: row.truckingCost,
        trucking_cost_currency: normalizeDispatchReleaseCurrency(row.truckingCostCurrency),
        repair_cost: row.repairCost,
        repair_cost_currency: normalizeDispatchReleaseCurrency(row.repairCostCurrency),
        damage_claim: row.damageClaim,
        damage_claim_currency: normalizeDispatchReleaseCurrency(row.damageClaimCurrency),
        remark: row.remark,
      }));
          const { data: insertedItems, error: itemError } = await supabase
        .from("transfer_item")
        .insert(itemPayload)
        .select("id, container_id, delivery_date, trucking_cost, trucking_cost_currency, repair_cost, repair_cost_currency, damage_claim, damage_claim_currency");

      if (itemError) {
        throw new Error(itemError.message);
      }

      createdTransferItems = ((insertedItems ?? []) as Array<{
        id: string;
        container_id: string;
        delivery_date: string | null;
        trucking_cost: number | null;
        trucking_cost_currency: string | null;
        repair_cost: number | null;
        repair_cost_currency: string | null;
        damage_claim: number | null;
        damage_claim_currency: string | null;
      }>).map((row) => ({
        id: row.id,
        containerId: row.container_id,
        pickupDate: formatDate(row.delivery_date),
        truckingCost: formatMoney(row.trucking_cost),
        truckingCostCurrency: normalizeDispatchReleaseCurrency(row.trucking_cost_currency),
        repairCost: formatMoney(row.repair_cost),
        repairCostCurrency: normalizeDispatchReleaseCurrency(row.repair_cost_currency),
        damageClaim: formatMoney(row.damage_claim),
        damageClaimCurrency: normalizeDispatchReleaseCurrency(row.damage_claim_currency),
      }));
    }

    await syncSelectedSourceContainerStatuses(selectedContainers);

    if (input.releaseSource === "VENDOR_REF" && normalizeText(input.sourcePurchaseOrderItemId)) {
      await inheritVendorReleaseAttachments(transferOrderId, input.sourcePurchaseOrderItemId);
    }

    if (
      input.releaseSource === "VENDOR_REF" &&
      normalizeText(sourceAnchor.purchaseOrderId) &&
      normalizeText(sourceAnchor.purchaseOrderItemId) &&
      selectedContainers.length > 0
    ) {
      const writebackResult = await writeBackVendorReleaseContainers(
        transferOrderId,
        selectedContainers,
        sourceAnchor.purchaseOrderId,
        sourceAnchor.purchaseOrderItemId
      );
      vendorWritebackTouchedRows = writebackResult.touchedRows;
      vendorWritebackInsertedRowIds = writebackResult.insertedRowIds;
    }

    const { costMap, revenueMap } = await resolveFinancialCodeIds();
    const { financePackage, orderSnapshot } = buildFinanceSnapshots(
      transferOrderId,
      input,
      createdTransferItems
    );
    const convertedFinancePackage = await enrichTransferFinancePackageWithExchangeRates(
      orderSnapshot,
      financePackage
    );

    [createdCostRows, createdRevenueRows] = await Promise.all([
      insertBusinessCosts(convertedFinancePackage.costs, costMap),
      insertBusinessRevenues(convertedFinancePackage.revenues, revenueMap),
    ]);
    await insertFinanceRecords(convertedFinancePackage.financeRecords);

    const { error: updateTotalsError } = await supabase
      .from("transfer_order")
      .update({
        trucking_cost_total_in_header_currency:
          convertedFinancePackage.truckingCostTotalInHeaderCurrency,
        repair_cost_total_in_header_currency:
          convertedFinancePackage.repairCostTotalInHeaderCurrency,
        damage_claim_total_in_header_currency:
          convertedFinancePackage.damageClaimTotalInHeaderCurrency,
        total_cost: convertedFinancePackage.totalCost,
        total_revenue: convertedFinancePackage.totalRevenue,
      })
      .eq("id", transferOrderId);

    if (updateTotalsError) {
      throw new Error(updateTotalsError.message);
    }

    const oneWayPlanId = normalizeText(input.oneWayPlanId);
    if (oneWayPlanId) {
      const { data: convertedPlan, error: convertPlanError } = await supabase
        .from("one_way_plan")
        .update({ conversion_status: "CONVERTED" })
        .eq("id", oneWayPlanId)
        .eq("conversion_status", "OPEN")
        .select("id")
        .maybeSingle();

      if (convertPlanError) {
        throw new Error(convertPlanError.message);
      }
      if (!convertedPlan) {
        throw new Error("The source one way plan is no longer open for conversion.");
      }
    }

    revalidatePath("/depot-inventory/summary-for-dispatch");
    revalidatePath("/dispatch/dispatch-release");
    revalidatePath(`/dispatch/dispatch-release/${transferOrderId}`);
    revalidatePath("/dispatch/one-way-planning");
    if (normalizeText(input.oneWayPlanId)) {
      revalidatePath(`/dispatch/one-way-planning/${normalizeText(input.oneWayPlanId)}`);
      revalidatePath(`/dispatch/one-way-planning/${normalizeText(input.oneWayPlanId)}/edit`);
    }
    if (input.releaseSource === "VENDOR_REF") {
      revalidateVendorSourcePurchasePaths(
        sourceAnchor.purchaseOrderId,
        sourceAnchor.purchaseOrderItemId
      );
    }

    return {
      transferOrderId,
      releaseNumber,
      createdTransferItemCount: createdTransferItems.length,
      createdRevenueCount: createdRevenueRows.length,
      createdCostCount: createdCostRows.length,
    };
  } catch (error) {
    if (vendorWritebackTouchedRows.length > 0 || vendorWritebackInsertedRowIds.length > 0) {
      await rollbackVendorReleaseContainerWriteback(
        vendorWritebackTouchedRows,
        vendorWritebackInsertedRowIds
      );
    }
    if (insertedMasterContainerIds.length > 0) {
      await supabase.from("container").delete().in("id", insertedMasterContainerIds);
    }
    if (createdCostRows.length > 0) {
      await supabase.from("business_cost").delete().in(
        "id",
        createdCostRows.map((row) => row.id)
      );
    }
    if (createdRevenueRows.length > 0) {
      await supabase.from("business_revenue").delete().in(
        "id",
        createdRevenueRows.map((row) => row.id)
      );
    }
    await supabase
      .from("finance_record")
      .delete()
      .eq("business_type", "TRANSFER")
      .eq("business_id", transferOrderId);
    await supabase.from("transfer_order_attachment_links").delete().eq("transfer_order_id", transferOrderId);
    await supabase.from("transfer_item").delete().eq("transfer_order_id", transferOrderId);
    await supabase.from("transfer_order").delete().eq("id", transferOrderId);
    throw error;
  }
}

export async function getDispatchReleaseDetail(
  transferOrderId: string
): Promise<DispatchReleaseDetailResult> {
  noStore();

  const supabase = createServerSupabaseClient();
  const { data: orderRow, error: orderError } = await supabase
    .from("transfer_order")
    .select(
      `
        id,
        order_no,
        status,
        transfer_type,
        release_source,
        source_purchase_order_id,
        source_purchase_order_item_id,
        vendor_release_number,
        dispatch_vendor_id,
        release_date,
        dispatch_plan_no,
        carrier_plan_no,
        onhire_no,
        hold_reason,
        cancel_reason,
        cancelled_at,
        carrier,
        dispatch_arrange_date,
        remark,
        box_selection_mode,
        release_qty,
        assigned_qty,
        unassigned_qty,
        pickup_charge,
        dpp,
        free_days,
        rv,
        daily_rent,
        header_currency,
        item_cost_currency,
        trucking_cost,
        handling_fee,
        repair_cost_total,
        damage_claim_total,
        trucking_cost_total_in_header_currency,
        repair_cost_total_in_header_currency,
        damage_claim_total_in_header_currency,
        total_cost,
        total_revenue,
        dispatch_vendor_id,
        dispatch_vendor:lessees(company_name, legal_company_name, lessee_code),
        pol:cities!transfer_order_pol_city_id_fkey(city_code, city_name),
        pod:cities!transfer_order_pod_city_id_fkey(city_code, city_name),
        from_depot:depots!transfer_order_from_depot_id_fkey(
          depot_name,
          depot_code,
          city:cities(city_code, city_name, region)
        ),
        self_pickup_depot:depots!transfer_order_self_pickup_depot_id_fkey(depot_name, depot_code),
        source_item:purchase_order_item!transfer_order_source_purchase_order_item_id_fkey(
          id,
          color,
          machine_type,
          location:cities(city_code, city_name, region),
          depot:depots(depot_code, depot_name),
          size:container_size_codes(size_code),
          type:container_type_codes(type_code),
          condition:container_condition_codes(condition_code)
        )
      `
    )
    .eq("id", transferOrderId)
    .single();

  if (orderError) {
    throw new Error(orderError.message);
  }

  const [{ data: itemRows, error: itemError }, { data: attachmentRows, error: attachmentError }, { data: costRows, error: costError }, { data: revenueRows, error: revenueError }, { data: financeRows, error: financeError }, { data: transferOutRows, error: transferOutError }] =
    await Promise.all([
      supabase
        .from("transfer_item")
        .select(
      `
            id,
            item_status,
            delivery_date,
            trucking_cost,
            trucking_cost_currency,
            repair_cost,
            repair_cost_currency,
            damage_claim,
            damage_claim_currency,
            remark,
            container:container_id(id, container_number)
          `
        )
        .eq("transfer_order_id", transferOrderId)
        .order("created_at", { ascending: true }),
      supabase
        .from("transfer_order_attachment_links")
        .select("id, url, remark, inherited")
        .eq("transfer_order_id", transferOrderId)
        .order("created_at", { ascending: true }),
      supabase
        .from("business_cost")
        .select("id, amount, currency, occur_date, remark, cost_codes:cost_code_id(cost_code)")
        .eq("business_type", "TRANSFER")
        .eq("business_id", transferOrderId)
        .order("occur_date", { ascending: true }),
      supabase
        .from("business_revenue")
        .select("id, amount, currency, occur_date, remark, revenue_codes:revenue_code_id(revenue_code)")
        .eq("business_type", "TRANSFER")
        .eq("business_id", transferOrderId)
        .order("occur_date", { ascending: true }),
      supabase
        .from("finance_record")
        .select("id, record_type, amount, due_date, remark")
        .eq("business_type", "TRANSFER")
        .eq("business_id", transferOrderId)
        .order("created_at", { ascending: true }),
      supabase
        .from("container_event")
        .select("container_id")
        .eq("business_type", "TRANSFER")
        .eq("business_id", transferOrderId)
        .eq("event_type", "TRANSFER_OUT")
        .eq("is_void", false),
    ]);

  if (itemError) throw new Error(itemError.message);
  if (attachmentError) throw new Error(attachmentError.message);
  if (costError) throw new Error(costError.message);
  if (revenueError) throw new Error(revenueError.message);
  if (financeError) throw new Error(financeError.message);
  if (transferOutError) throw new Error(transferOutError.message);

  const sourceItemFromOrder = firstRelationRow(
    orderRow.source_item as
      | DispatchReleaseManagementSourceItemRow
      | DispatchReleaseManagementSourceItemRow[]
      | null
  );
  const fallbackSourceItemByOrderId = await loadFallbackSourceItemsByTransferOrderIds([
    transferOrderId,
  ]);
  const sourceItem =
    sourceItemFromOrder ?? fallbackSourceItemByOrderId.get(transferOrderId) ?? null;
  const fromDepot = firstRelationRow(
    (orderRow as { from_depot?: unknown }).from_depot as
      | {
          depot_name?: string | null;
          depot_code?: string | null;
          city?:
            | { city_code?: string | null; city_name?: string | null; region?: string | null }
            | Array<{ city_code?: string | null; city_name?: string | null; region?: string | null }>
            | null;
        }
      | Array<{
          depot_name?: string | null;
          depot_code?: string | null;
          city?:
            | { city_code?: string | null; city_name?: string | null; region?: string | null }
            | Array<{ city_code?: string | null; city_name?: string | null; region?: string | null }>
            | null;
        }>
      | null
  );
  const fromDepotCity = firstRelationRow(fromDepot?.city);
  const pickedUpContainerIds = new Set(
    ((transferOutRows ?? []) as Array<{ container_id: string | null }>)
      .map((row) => normalizeText(row.container_id))
      .filter(Boolean)
  );
  const pickedUpQty = pickedUpContainerIds.size;
  const releaseQty = toInteger(orderRow.release_qty);
  const nonPickedUpQty = Math.max(0, releaseQty - pickedUpQty);
  const sourceItemLocation = firstRelationRow(sourceItem?.location);
  const sourceItemDepot = firstRelationRow(sourceItem?.depot);
  const sourceCityLabel = formatCityLabel(sourceItemLocation);
  const fallbackCityLabel = formatCityLabel(fromDepotCity);

  const financeOrderSnapshot: TransferFinanceOrderSnapshot = {
    id: transferOrderId,
    dispatchVendorId: normalizeText(orderRow.dispatch_vendor_id) || null,
    releaseDate: orderRow.release_date,
    pickupCharge: orderRow.pickup_charge,
    dpp: orderRow.dpp,
    freeDays: orderRow.free_days,
    rv: orderRow.rv,
    dailyRent: orderRow.daily_rent,
    headerCurrency: normalizeDispatchReleaseCurrency(orderRow.header_currency),
    itemCostCurrency: normalizeDispatchReleaseCurrency(orderRow.item_cost_currency),
    truckingCost: orderRow.trucking_cost,
    handlingFee: orderRow.handling_fee,
    currency: normalizeDispatchReleaseCurrency(orderRow.header_currency),
  };

  const itemSnapshots: TransferFinanceItemSnapshot[] = ((itemRows ?? []) as unknown as Array<{
    id: string;
    delivery_date: string | null;
    trucking_cost: number | null;
    trucking_cost_currency: string | null;
    repair_cost: number | null;
    repair_cost_currency: string | null;
    damage_claim: number | null;
    damage_claim_currency: string | null;
    container: Array<{ id: string | null }> | { id: string | null } | null;
  }>).map((row) => ({
    id: row.id,
    containerId: Array.isArray(row.container) ? row.container[0]?.id ?? null : row.container?.id ?? null,
    pickupDate: formatDate(row.delivery_date),
    truckingCost: row.trucking_cost,
    truckingCostCurrency: normalizeDispatchReleaseCurrency(row.trucking_cost_currency),
    repairCost: row.repair_cost,
    repairCostCurrency: normalizeDispatchReleaseCurrency(row.repair_cost_currency),
    damageClaim: row.damage_claim,
    damageClaimCurrency: normalizeDispatchReleaseCurrency(row.damage_claim_currency),
  }));
  const mappedCostRows = ((costRows ?? []) as unknown as Array<{
    id: string;
    amount: number;
    occur_date: string | null;
    remark: string | null;
    currency: string | null;
    cost_codes: Array<{ cost_code: string | null }> | { cost_code: string | null } | null;
  }>).map((row) => {
    const costCode = (
      normalizeText(
        Array.isArray(row.cost_codes) ? row.cost_codes[0]?.cost_code : row.cost_codes?.cost_code
      ) || "TRU"
    ) as TransferBusinessCostDraft["costCode"];
    return {
      id: row.id,
      businessType: "TRANSFER" as const,
      businessId: transferOrderId,
      containerId: null,
      costCode,
      amount: formatMoney(row.amount),
      baseCurrencyAmount: formatMoney(row.amount),
      currency: normalizeDispatchReleaseCurrency(row.currency),
      occurDate: formatDate(row.occur_date) ?? formatDate(orderRow.release_date) ?? "",
      remark: row.remark,
      sourceField:
        costCode === "HDL"
          ? ("handling_fee" as const)
          : costCode === "REP"
            ? ("repair_cost" as const)
            : ("trucking_cost" as const),
    };
  });
  const mappedRevenueRows = ((revenueRows ?? []) as unknown as Array<{
    id: string;
    amount: number;
    occur_date: string | null;
    remark: string | null;
    currency: string | null;
    revenue_codes:
      | Array<{ revenue_code: string | null }>
      | { revenue_code: string | null }
      | null;
  }>).map((row) => {
    const revenueCode = (
      normalizeText(
        Array.isArray(row.revenue_codes)
          ? row.revenue_codes[0]?.revenue_code
          : row.revenue_codes?.revenue_code
      ) || "PUC"
    ) as TransferBusinessRevenueDraft["revenueCode"];
    return {
      id: row.id,
      businessType: "TRANSFER" as const,
      businessId: transferOrderId,
      containerId: null,
      revenueCode,
      revenueType: null,
      amount: formatMoney(row.amount),
      baseCurrencyAmount: formatMoney(row.amount),
      currency: normalizeDispatchReleaseCurrency(row.currency),
      occurDate: formatDate(row.occur_date) ?? formatDate(orderRow.release_date) ?? "",
      remark: row.remark,
      sourceField: revenueCode === "RPR" ? ("damage_claim" as const) : ("pickup_charge" as const),
    };
  });
  const buildInvoiceDraftPackages = <
    T extends { currency: string }
  >(
    rows: T[],
    invoiceType: "PAYABLE" | "RECEIVABLE",
    buildArgs: (groupedRows: T[], currency: string) => Parameters<typeof buildTransferInvoiceDrafts>[0]
  ) =>
    Array.from(new Set(rows.map((row) => normalizeDispatchReleaseCurrency(row.currency)))).map((currency) => {
      const groupedRows = rows.filter(
        (row) => normalizeDispatchReleaseCurrency(row.currency) === currency
      );
      return buildTransferInvoiceDrafts(buildArgs(groupedRows, currency));
    });

  const invoiceDrafts = {
    payable: buildInvoiceDraftPackages(mappedCostRows, "PAYABLE", (groupedRows, currency) => ({
      transferOrder: financeOrderSnapshot,
      invoiceType: "PAYABLE",
      invoiceNo: `${orderRow.order_no}-PAY-${currency}`,
      costRows: groupedRows,
    })),
    receivable: buildInvoiceDraftPackages(mappedRevenueRows, "RECEIVABLE", (groupedRows, currency) => ({
      transferOrder: financeOrderSnapshot,
      invoiceType: "RECEIVABLE",
      invoiceNo: `${orderRow.order_no}-REC-${currency}`,
      revenueRows: groupedRows,
    })),
  };

  return {
    order: {
      id: orderRow.id,
      orderNo: orderRow.order_no,
      status: orderRow.status,
      transferType: orderRow.transfer_type,
      releaseSource: orderRow.release_source,
      sourcePurchaseOrderId: orderRow.source_purchase_order_id,
      sourcePurchaseOrderItemId: orderRow.source_purchase_order_item_id,
      vendorReleaseNumber: orderRow.vendor_release_number,
      dispatchVendorId: orderRow.dispatch_vendor_id,
      releaseDate: formatDate(orderRow.release_date),
      polCode: normalizeText(firstRelationRow(orderRow.pol)?.city_code) || null,
      dispatchPlanNo: orderRow.dispatch_plan_no,
      carrierPlanNo: orderRow.carrier_plan_no,
      onhireNo: orderRow.onhire_no,
      podCode: normalizeText(firstRelationRow(orderRow.pod)?.city_code) || null,
      carrier: orderRow.carrier,
      dispatchArrangeDate: formatDate(orderRow.dispatch_arrange_date),
      remark: orderRow.remark,
      releaseQty,
      assignedQty: toInteger(orderRow.assigned_qty),
      unassignedQty: toInteger(orderRow.unassigned_qty),
      pickedUpQty,
      nonPickedUpQty,
      pickupCharge: formatMoney(orderRow.pickup_charge),
      dpp: formatMoney(orderRow.dpp),
      freeDays: toInteger(orderRow.free_days),
      rv: formatMoney(orderRow.rv),
      dailyRent: formatMoney(orderRow.daily_rent),
      headerCurrency: normalizeDispatchReleaseCurrency(orderRow.header_currency),
      itemCostCurrency: normalizeDispatchReleaseCurrency(orderRow.item_cost_currency),
      truckingCost: formatMoney(orderRow.trucking_cost),
      handlingFee: formatMoney(orderRow.handling_fee),
      repairCostTotal: formatMoney(orderRow.repair_cost_total),
      damageClaimTotal: formatMoney(orderRow.damage_claim_total),
      truckingCostTotalInHeaderCurrency: formatMoney(
        orderRow.trucking_cost_total_in_header_currency
      ),
      repairCostTotalInHeaderCurrency: formatMoney(
        orderRow.repair_cost_total_in_header_currency
      ),
      damageClaimTotalInHeaderCurrency: formatMoney(
        orderRow.damage_claim_total_in_header_currency
      ),
      totalCost: formatMoney(orderRow.total_cost),
      totalRevenue: formatMoney(orderRow.total_revenue),
      lesseeName: formatLesseeLabel(firstRelationRow(orderRow.dispatch_vendor) ?? {}),
      polLabel: formatCityLabel(firstRelationRow(orderRow.pol)),
      podLabel: formatCityLabel(firstRelationRow(orderRow.pod)),
      depotLabel:
        normalizeText(firstRelationRow(orderRow.self_pickup_depot)?.depot_name) ||
        normalizeText(firstRelationRow(orderRow.self_pickup_depot)?.depot_code) ||
        "-",
      selfPickupDepotLabel:
        normalizeText(firstRelationRow(orderRow.self_pickup_depot)?.depot_name) ||
        normalizeText(firstRelationRow(orderRow.self_pickup_depot)?.depot_code) ||
        "-",
      holdReason: normalizeText(orderRow.hold_reason) || null,
      cancelReason: normalizeText(orderRow.cancel_reason) || null,
      cancelledAt: orderRow.cancelled_at,
      sizeType: buildDispatchReleaseSizeType(sourceItem),
      condition: buildDispatchReleaseCondition(sourceItem),
      color: normalizeBucketFilterValue(sourceItem?.color) || "-",
      machineType: normalizeBucketFilterValue(sourceItem?.machine_type) || "-",
      sourceRegion:
        normalizeText(sourceItemLocation?.region) ||
        normalizeText(fromDepotCity?.region) ||
        "-",
      sourceCity:
        sourceCityLabel !== "-" ? sourceCityLabel : fallbackCityLabel,
      sourceDepot:
        buildDepotBucketLabel(
          normalizeText(sourceItemDepot?.depot_code) ||
            normalizeText(fromDepot?.depot_code) ||
            null,
          normalizeText(sourceItemDepot?.depot_name) ||
            normalizeText(fromDepot?.depot_name) ||
            null
        ) ||
        "-",
      containerSelectionMode: normalizeText(orderRow.box_selection_mode) || null,
    },
    items: ((itemRows ?? []) as unknown as Array<{
      id: string;
      item_status: string;
      delivery_date: string | null;
      trucking_cost: number | null;
      trucking_cost_currency: string | null;
      repair_cost: number | null;
      repair_cost_currency: string | null;
      damage_claim: number | null;
      damage_claim_currency: string | null;
      remark: string | null;
      container:
        | Array<{ id: string | null; container_number: string | null }>
        | { id: string | null; container_number: string | null }
        | null;
    }>).map((row) => ({
      id: row.id,
      itemStatus: row.item_status,
      containerId: Array.isArray(row.container) ? row.container[0]?.id ?? "" : row.container?.id ?? "",
      containerNumber: Array.isArray(row.container)
        ? row.container[0]?.container_number ?? "-"
        : row.container?.container_number ?? "-",
      pickupDate: formatDate(row.delivery_date),
      pickedUp: pickedUpContainerIds.has(
        Array.isArray(row.container) ? row.container[0]?.id ?? "" : row.container?.id ?? ""
      ),
      truckingCost: formatMoney(row.trucking_cost),
      truckingCostCurrency: normalizeDispatchReleaseCurrency(row.trucking_cost_currency),
      repairCost: formatMoney(row.repair_cost),
      repairCostCurrency: normalizeDispatchReleaseCurrency(row.repair_cost_currency),
      damageClaim: formatMoney(row.damage_claim),
      damageClaimCurrency: normalizeDispatchReleaseCurrency(row.damage_claim_currency),
      remark: row.remark,
    })),
    attachments: ((attachmentRows ?? []) as Array<{
      id: string;
      url: string;
      remark: string | null;
      inherited: boolean | null;
    }>).map((row) => ({
      id: row.id,
      url: row.url,
      remark: row.remark,
      inherited: Boolean(row.inherited),
    })),
    finance: [
      ...((costRows ?? []) as unknown as Array<{
        id: string;
        amount: number;
        occur_date: string | null;
        remark: string | null;
        cost_codes: Array<{ cost_code: string | null }> | { cost_code: string | null } | null;
      }>).map((row) => ({
        id: row.id,
        kind: "COST" as const,
        code:
          normalizeText(
            Array.isArray(row.cost_codes) ? row.cost_codes[0]?.cost_code : row.cost_codes?.cost_code
          ) || "-",
        amount: formatMoney(row.amount),
        occurDate: formatDate(row.occur_date),
        remark: row.remark,
      })),
      ...((revenueRows ?? []) as unknown as Array<{
        id: string;
        amount: number;
        occur_date: string | null;
        remark: string | null;
        revenue_codes:
          | Array<{ revenue_code: string | null }>
          | { revenue_code: string | null }
          | null;
      }>).map((row) => ({
        id: row.id,
        kind: "REVENUE" as const,
        code:
          normalizeText(
            Array.isArray(row.revenue_codes)
              ? row.revenue_codes[0]?.revenue_code
              : row.revenue_codes?.revenue_code
          ) || "-",
        amount: formatMoney(row.amount),
        occurDate: formatDate(row.occur_date),
        remark: row.remark,
      })),
      ...((financeRows ?? []) as Array<{
        id: string;
        record_type: string;
        amount: number;
        due_date: string | null;
        remark: string | null;
      }>).map((row) => ({
        id: row.id,
        kind: "RECORD" as const,
        code: normalizeText(row.record_type) || "-",
        amount: formatMoney(row.amount),
        occurDate: formatDate(row.due_date),
        remark: row.remark,
      })),
    ],
    invoiceDrafts,
  };
}
