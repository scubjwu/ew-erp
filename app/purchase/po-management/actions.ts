"use server";

import { unstable_noStore as noStore } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  PurchaseOrderStatus,
  PurchaseOrderSummary,
  PurchaseType,
} from "@/types/purchase";
import {
  applyQuickFilterDates,
  firstPurchaseItemByOrder,
  groupPurchaseItemsByOrder,
  rowMatchesAnyPurchaseItem,
  type PurchaseQuickFilter,
} from "@/app/purchase/po-management/query-helpers";

export type PurchaseManagementSortBy =
  | "orderDate"
  | "orderNo"
  | "vendor"
  | "location"
  | "sizeType"
  | "condition"
  | "color"
  | "plannedQty"
  | "availableQty"
  | "remainingQty"
  | "cancelledQty"
  | "prepaidBalance";

export type PurchaseManagementSortDirection = "asc" | "desc";

export type PurchaseOrderManagementQuery = {
  vendorId?: string;
  locationCityId?: string;
  color?: string;
  sizeType?: string;
  conditionId?: string;
  orderDateFrom?: string;
  orderDateTo?: string;
  orderStatus?: string;
  quickFilter?: PurchaseQuickFilter;
  sortBy?: PurchaseManagementSortBy;
  sortDirection?: PurchaseManagementSortDirection;
  page: number;
  pageSize: number;
};

export type PurchaseOrderManagementSummary = {
  totalOrders: number;
  totalPlannedQty: number;
  totalAvailableQty: number;
  totalRemainingQty: number;
  totalCancelledQty: number;
  prepaidBalance: number;
};

export type PurchaseOrderManagementResult = {
  rows: PurchaseOrderManagementRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: {
    vendorId: string;
    locationCityId: string;
    color: string;
    sizeType: string;
    conditionId: string;
    orderDateFrom: string;
    orderDateTo: string;
    orderStatus: string;
    quickFilter: PurchaseQuickFilter;
  };
  summary: PurchaseOrderManagementSummary;
  sort: {
    sortBy: PurchaseManagementSortBy;
    sortDirection: PurchaseManagementSortDirection;
  };
};

export type PurchaseOrderManagementRow = PurchaseOrderSummary & {
  locationLabel: string | null;
  vendorLabel: string | null;
  sizeTypeLabel: string | null;
  conditionLabel: string | null;
  prepaidBalance: number;
  cancelledQty: number;
  remainingQty: number;
};

export type PurchaseVendorOption = {
  id: string;
  vendor_code: string;
  company_name: string | null;
  legal_company_name: string | null;
};

export type PurchaseLocationOption = {
  id: string;
  city_code: string;
  city_name: string;
};

export type PurchaseConditionOption = {
  id: string;
  condition_code: string;
  condition_name: string;
};

export type PurchaseColorOption = {
  value: string;
};

export type PurchaseSizeTypeOption = {
  value: string;
  sizeId: string;
  typeId: string;
  label: string;
};

export type PurchaseFilterOptions = {
  vendors: PurchaseVendorOption[];
  locations: PurchaseLocationOption[];
  conditions: PurchaseConditionOption[];
  colors: PurchaseColorOption[];
  sizeTypes: PurchaseSizeTypeOption[];
  statuses: PurchaseOrderStatus[];
};

type PurchaseOrderRowRaw = {
  id: string;
  order_no: string;
  purchase_type: PurchaseType;
  supplier_id: string | null;
  owner_id: string | null;
  buyer_id: string | null;
  purchase_date: string | null;
  estimated_offline_time: string | null;
  contract_number: string | null;
  invoice_number: string | null;
  freeday: number | null;
  vendor_release_number: string | null;
  vendor_release_date: string | null;
  remark: string | null;
  exchange_rate: number | null;
  order_status: PurchaseOrderStatus;
  inbound_status: string | null;
  payment_mode: string | null;
  payment_account: string | null;
  due_date: string | null;
  total_planned_qty: number | null;
  total_received_qty: number | null;
  total_available_qty: number | null;
  grand_total: number | null;
  total_amount_paid: number | null;
  total_amount_unpaid: number | null;
  settlement_payment_term: string | null;
  settlement_credit_days: number | null;
  settlement_advance_payment_percentage: number | null;
  settlement_balance_trigger_event: string | null;
  settlement_currency: string | null;
  settlement_prepayment_pool: boolean | null;
  settlement_prepayment_threshold: number | null;
  settlement_current_prepaid_balance: number | null;
  vendor_bank_information: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  supplier?: {
    id: string;
    vendor_code: string | null;
    company_name: string | null;
    legal_company_name: string | null;
  } | null;
  owner?: {
    id: string;
    container_owner_code: string | null;
    company_name: string | null;
    legal_company_name: string | null;
  } | null;
  buyer?: {
    id: string;
    user_code: string | null;
    full_name: string | null;
  } | null;
};

type PurchaseItemRowRaw = {
  purchase_order_id: string;
  line_no: number;
  color: string | null;
  location_city_id: string | null;
  container_size_code_id: string | null;
  container_type_code_id: string | null;
  container_condition_code_id: string | null;
  location?: {
    id: string;
    city_code: string;
    city_name: string;
  } | null;
  size?: {
    id: string;
    size_code: string;
    size_name: string | null;
  } | null;
  type?: {
    id: string;
    type_code: string;
    type_description: string | null;
  } | null;
  condition?: {
    id: string;
    condition_code: string;
    condition_name: string;
  } | null;
};

function normalizeText(value?: string) {
  return value?.trim() ?? "";
}

function normalizeLike(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return `%${trimmed}%`;
}

function toNumber(value: number | string | null | undefined) {
  if (value == null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compareString(a: string | null | undefined, b: string | null | undefined) {
  return (a ?? "").localeCompare(b ?? "", undefined, { sensitivity: "base" });
}

function getOrderDateValue(value: string | null | undefined) {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function mapPurchaseRow(
  row: PurchaseOrderRowRaw,
  firstItem?: PurchaseItemRowRaw
): PurchaseOrderManagementRow {
  const totalPlannedQty = toNumber(row.total_planned_qty);
  const totalAvailableQty = toNumber(row.total_available_qty);
  const totalReceivedQty = toNumber(row.total_received_qty);
  const prepaidBalance = toNumber(row.settlement_current_prepaid_balance);
  const remainingQty = Math.max(totalPlannedQty - totalAvailableQty - totalReceivedQty, 0);
  const sizeCode = firstItem?.size?.size_code ?? null;
  const typeCode = firstItem?.type?.type_code ?? null;
  const sizeTypeLabel = sizeCode && typeCode ? `${sizeCode}${typeCode}` : null;
  const locationLabel = firstItem?.location
    ? `${firstItem.location.city_code} · ${firstItem.location.city_name}`
    : null;
  const vendorLabel =
    row.supplier?.company_name ??
    row.supplier?.legal_company_name ??
    row.supplier?.vendor_code ??
    null;

  return {
    id: row.id,
    orderNo: row.order_no,
    purchaseType: row.purchase_type,
    supplierId: row.supplier_id,
    ownerId: row.owner_id,
    buyerId: row.buyer_id,
    purchaseDate: row.purchase_date,
    estimatedOfflineTime: row.estimated_offline_time,
    contractNumber: row.contract_number,
    invoiceNumber: row.invoice_number,
    freeday: row.freeday,
    vendorReleaseNumber: row.vendor_release_number,
    vendorReleaseDate: row.vendor_release_date,
    remarks: row.remark,
    exchangeRate: row.exchange_rate,
    orderStatus: row.order_status,
    inboundStatus: row.inbound_status as PurchaseOrderSummary["inboundStatus"],
    paymentMode: row.payment_mode as PurchaseOrderSummary["paymentMode"],
    paymentAccount: row.payment_account,
    dueDate: row.due_date,
    totalPlannedQty,
    totalReceivedQty,
    totalAvailableQty,
    grandTotal: toNumber(row.grand_total),
    totalAmountPaid: row.total_amount_paid,
    totalAmountUnpaid: row.total_amount_unpaid,
    settlementPaymentTerm: row.settlement_payment_term,
    settlementCreditDays: row.settlement_credit_days,
    settlementAdvancePaymentPercentage: row.settlement_advance_payment_percentage,
    settlementBalanceTriggerEvent: row.settlement_balance_trigger_event,
    settlementCurrency: row.settlement_currency,
    settlementPrepaymentPool: row.settlement_prepayment_pool,
    settlementPrepaymentThreshold: row.settlement_prepayment_threshold,
    settlementCurrentPrepaidBalance: row.settlement_current_prepaid_balance,
    vendorBankInformation: row.vendor_bank_information,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    supplier: row.supplier ?? null,
    owner: row.owner ?? null,
    buyer: row.buyer ?? null,
    primaryLocation: firstItem?.location?.city_name ?? null,
    primarySizeCode: sizeCode,
    primaryTypeCode: typeCode,
    primaryConditionCode: firstItem?.condition?.condition_code ?? null,
    primaryColor: firstItem?.color ?? null,
    locationLabel,
    vendorLabel,
    sizeTypeLabel,
    conditionLabel: firstItem?.condition
      ? `${firstItem.condition.condition_code} · ${firstItem.condition.condition_name}`
      : null,
    prepaidBalance,
    cancelledQty: 0,
    remainingQty,
  };
}

function sortRows(
  rows: PurchaseOrderManagementRow[],
  sortBy: PurchaseManagementSortBy,
  sortDirection: PurchaseManagementSortDirection
) {
  const sorted = [...rows];
  sorted.sort((left, right) => {
    let result = 0;
    switch (sortBy) {
      case "orderNo":
        result = compareString(left.orderNo, right.orderNo);
        break;
      case "vendor":
        result = compareString(left.vendorLabel, right.vendorLabel);
        break;
      case "location":
        result = compareString(left.locationLabel, right.locationLabel);
        break;
      case "sizeType":
        result = compareString(left.sizeTypeLabel, right.sizeTypeLabel);
        break;
      case "condition":
        result = compareString(left.conditionLabel, right.conditionLabel);
        break;
      case "color":
        result = compareString(left.primaryColor, right.primaryColor);
        break;
      case "plannedQty":
        result = left.totalPlannedQty - right.totalPlannedQty;
        break;
      case "availableQty":
        result = left.totalAvailableQty - right.totalAvailableQty;
        break;
      case "remainingQty":
        result = left.remainingQty - right.remainingQty;
        break;
      case "cancelledQty":
        result = left.cancelledQty - right.cancelledQty;
        break;
      case "prepaidBalance":
        result = left.prepaidBalance - right.prepaidBalance;
        break;
      case "orderDate":
      default:
        result = getOrderDateValue(left.purchaseDate) - getOrderDateValue(right.purchaseDate);
        break;
    }

    if (result === 0) {
      result = compareString(left.orderNo, right.orderNo);
    }

    return sortDirection === "asc" ? result : -result;
  });
  return sorted;
}

async function loadPurchaseRows(baseFilters: {
  vendorId: string;
  orderDateFrom: string;
  orderDateTo: string;
  orderStatus: string;
}) {
  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("purchase_order")
    .select(
      `
        id,
        order_no,
        purchase_type,
        supplier_id,
        owner_id,
        buyer_id,
        purchase_date,
        estimated_offline_time,
        contract_number,
        invoice_number,
        freeday,
        vendor_release_number,
        vendor_release_date,
        remark,
        exchange_rate,
        order_status,
        inbound_status,
        payment_mode,
        payment_account,
        due_date,
        total_planned_qty,
        total_received_qty,
        total_available_qty,
        grand_total,
        total_amount_paid,
        total_amount_unpaid,
        settlement_payment_term,
        settlement_credit_days,
        settlement_advance_payment_percentage,
        settlement_balance_trigger_event,
        settlement_currency,
        settlement_prepayment_pool,
        settlement_prepayment_threshold,
        settlement_current_prepaid_balance,
        vendor_bank_information,
        created_at,
        updated_at,
        supplier:vendors!purchase_order_supplier_id_vendors_fkey(id, vendor_code, company_name, legal_company_name),
        owner:container_owners!purchase_order_owner_id_fkey(id, container_owner_code, company_name, legal_company_name),
        buyer:users!purchase_order_buyer_id_fkey(id, user_code, full_name)
      `
    );

  if (baseFilters.vendorId) {
    query = query.eq("supplier_id", baseFilters.vendorId);
  }
  if (baseFilters.orderStatus) {
    query = query.eq("order_status", baseFilters.orderStatus);
  }
  if (baseFilters.orderDateFrom) {
    query = query.gte("purchase_date", baseFilters.orderDateFrom);
  }
  if (baseFilters.orderDateTo) {
    query = query.lte("purchase_date", baseFilters.orderDateTo);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown) as PurchaseOrderRowRaw[];
}

async function loadPurchaseItems(orderIds: string[]) {
  if (orderIds.length === 0) return [] as PurchaseItemRowRaw[];
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("purchase_order_item")
    .select(
      `
        purchase_order_id,
        line_no,
        color,
        location_city_id,
        container_size_code_id,
        container_type_code_id,
        container_condition_code_id,
        location:cities(id, city_code, city_name),
        size:container_size_codes(id, size_code, size_name),
        type:container_type_codes(id, type_code, type_description),
        condition:container_condition_codes(id, condition_code, condition_name)
      `
    )
    .in("purchase_order_id", orderIds)
    .order("purchase_order_id", { ascending: true })
    .order("line_no", { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown) as PurchaseItemRowRaw[];
}

function filterRowsByItems(
  rows: PurchaseOrderManagementRow[],
  itemsByOrder: Map<string, PurchaseItemRowRaw[]>,
  filters: {
    locationCityId: string;
    color: string;
    sizeType: string;
    conditionId: string;
  }
) {
  return rows.filter((row) => rowMatchesAnyPurchaseItem(itemsByOrder.get(row.id), filters));
}

export async function getPurchaseOrders(
  params: PurchaseOrderManagementQuery
): Promise<PurchaseOrderManagementResult> {
  noStore();

  const quickDates = applyQuickFilterDates(params.quickFilter ?? "");
  const filters = {
    vendorId: normalizeText(params.vendorId),
    locationCityId: normalizeText(params.locationCityId),
    color: normalizeText(params.color),
    sizeType: normalizeText(params.sizeType),
    conditionId: normalizeText(params.conditionId),
    orderDateFrom: normalizeText(quickDates?.orderDateFrom ?? params.orderDateFrom),
    orderDateTo: normalizeText(quickDates?.orderDateTo ?? params.orderDateTo),
    orderStatus: normalizeText(params.orderStatus),
    quickFilter: (params.quickFilter ?? "") as PurchaseQuickFilter,
  };

  const sort = {
    sortBy: (params.sortBy ?? "orderDate") as PurchaseManagementSortBy,
    sortDirection: (params.sortDirection ?? "desc") as PurchaseManagementSortDirection,
  };

  const page = Math.max(1, Math.floor(params.page || 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(params.pageSize || 10)));

  const baseRows = await loadPurchaseRows(filters);
  const orderIds = baseRows.map((row) => row.id);
  const items = await loadPurchaseItems(orderIds);

  const itemsByOrder = groupPurchaseItemsByOrder(items);
  const firstItems = firstPurchaseItemByOrder(itemsByOrder);

  const mappedRows = baseRows.map((row) => mapPurchaseRow(row, firstItems.get(row.id)));
  const filteredRows = filterRowsByItems(mappedRows, itemsByOrder, filters);
  const sortedRows = sortRows(filteredRows, sort.sortBy, sort.sortDirection);

  const totalCount = sortedRows.length;
  const from = (page - 1) * pageSize;
  const to = from + pageSize;
  const pageRows = sortedRows.slice(from, to);

  const summary = filteredRows.reduce<PurchaseOrderManagementSummary>(
    (acc, row) => ({
      totalOrders: acc.totalOrders + 1,
      totalPlannedQty: acc.totalPlannedQty + row.totalPlannedQty,
      totalAvailableQty: acc.totalAvailableQty + row.totalAvailableQty,
      totalRemainingQty: acc.totalRemainingQty + row.remainingQty,
      totalCancelledQty: acc.totalCancelledQty + row.cancelledQty,
      prepaidBalance: acc.prepaidBalance + row.prepaidBalance,
    }),
    {
      totalOrders: 0,
      totalPlannedQty: 0,
      totalAvailableQty: 0,
      totalRemainingQty: 0,
      totalCancelledQty: 0,
      prepaidBalance: 0,
    }
  );

  return {
    rows: pageRows,
    totalCount,
    page,
    pageSize,
    filters,
    summary,
    sort,
  };
}

export async function exportPurchaseOrders(
  params: Omit<PurchaseOrderManagementQuery, "page" | "pageSize">
): Promise<PurchaseOrderManagementRow[]> {
  noStore();
  const result = await getPurchaseOrders({
    ...params,
    page: 1,
    pageSize: 10000,
  });
  return result.rows;
}

export async function getPurchaseFilterOptions(): Promise<PurchaseFilterOptions> {
  noStore();
  const supabase = createServerSupabaseClient();

  const [{ data: vendors, error: vendorsError }, { data: locations, error: locationsError }, { data: conditions, error: conditionsError }, { data: sizes, error: sizesError }, { data: types, error: typesError }, { data: colors, error: colorsError }] =
    await Promise.all([
      supabase
        .from("vendors")
        .select("id, vendor_code, company_name, legal_company_name")
        .order("vendor_code", { ascending: true }),
      supabase.from("cities").select("id, city_code, city_name").order("city_code", { ascending: true }),
      supabase
        .from("container_condition_codes")
        .select("id, condition_code, condition_name")
        .order("condition_code", { ascending: true }),
      supabase.from("container_size_codes").select("id, size_code, size_name").order("size_code", { ascending: true }),
      supabase
        .from("container_type_codes")
        .select("id, type_code, type_description")
        .order("type_code", { ascending: true }),
      supabase
        .from("purchase_order_item")
        .select("color")
        .not("color", "is", null),
    ]);

  if (vendorsError) throw new Error(vendorsError.message);
  if (locationsError) throw new Error(locationsError.message);
  if (conditionsError) throw new Error(conditionsError.message);
  if (sizesError) throw new Error(sizesError.message);
  if (typesError) throw new Error(typesError.message);
  if (colorsError) throw new Error(colorsError.message);

  const sizeTypes: PurchaseSizeTypeOption[] = [];
  for (const size of sizes ?? []) {
    for (const type of types ?? []) {
      sizeTypes.push({
        value: `${size.id}:${type.id}`,
        sizeId: size.id,
        typeId: type.id,
        label: `${size.size_code}${type.type_code}`,
      });
    }
  }

  const uniqueColors = Array.from(
    new Set(
      ((colors ?? []) as Array<{ color: string | null }>)
        .map((row) => normalizeText(row.color))
        .filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right));

  return {
    vendors: ((vendors ?? []) as PurchaseVendorOption[]),
    locations: ((locations ?? []) as PurchaseLocationOption[]),
    conditions: ((conditions ?? []) as PurchaseConditionOption[]),
    colors: uniqueColors.map((value) => ({ value })),
    sizeTypes,
    statuses: ["DRAFT", "CONFIRMED", "PARTIAL_RECEIVED", "COMPLETED", "CANCELLED"],
  };
}

export async function getPurchaseOrderPreviewById(id: string) {
  noStore();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("purchase_order")
    .select("id, order_no, order_status, purchase_date")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}
