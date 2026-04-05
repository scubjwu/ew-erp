"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  PurchaseBankInformationSnapshot,
  PurchaseFinanceRecord,
  PurchaseMaterialType,
  PurchaseOrderDraftInput,
  PurchaseOrderContainer,
  PurchaseOrderDetail,
  PurchaseOrderItem,
  PurchaseOrderItemContainersDetail,
  PurchaseOrderMaterialTypeRow,
  PurchasePaymentMode,
  PurchaseOrderStatus,
  PurchaseOrderSummary,
  PurchaseType,
} from "@/types/purchase";
import {
  computeLineAmount,
  sanitizeMaterialTypesForSubmit,
  shouldShowEstimatedOfflineTime,
  shouldShowMaterialTypes,
  shouldShowVendorReleaseFields,
} from "@/app/purchase/po-management/create-helpers";
import {
  applyQuickFilterDates,
  firstPurchaseItemByOrder,
  groupPurchaseItemsByOrder,
  normalizeRalLikeSearch,
  rowMatchesAnyPurchaseItem,
  type PurchaseQuickFilter,
} from "@/app/purchase/po-management/query-helpers";

export type PurchaseManagementSortBy =
  | "orderDate"
  | "orderNo"
  | "status"
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

export type PurchaseAutocompleteOption = {
  value: string;
  label: string;
  secondaryLabel?: string;
  searchText?: string;
};

export type PurchaseColorOption = PurchaseAutocompleteOption;

export type PurchaseFilterOptions = {
  vendors: PurchaseAutocompleteOption[];
  locations: PurchaseAutocompleteOption[];
  sizeTypes: PurchaseAutocompleteOption[];
  conditions: PurchaseAutocompleteOption[];
  colors: PurchaseColorOption[];
  statuses: PurchaseOrderStatus[];
};

export type PurchaseDraftSupplierOption = PurchaseAutocompleteOption & {
  id: string;
  vendorCode: string | null;
  vendorName: string | null;
  settlementPaymentTerm: string | null;
  settlementCreditDays: number | null;
  settlementCreditLimit: number | null;
  settlementAdvancePaymentPercentage: number | null;
  settlementBalanceTriggerEvent: string | null;
  settlementCurrency: string | null;
  settlementPrepaymentPool: boolean | null;
  settlementPrepaymentThreshold: number | null;
  settlementCurrentPrepaidBalance: number | null;
  vendorBankInformation: PurchaseBankInformationSnapshot | null;
};

export type PurchaseDraftOwnerOption = {
  id: string;
  label: string;
};

export type PurchaseDraftBuyerOption = {
  id: string;
  label: string;
};

export type PurchaseDraftLocationOption = {
  id: string;
  code: string;
  name: string;
};

export type PurchaseDraftDepotOption = {
  id: string;
  code: string;
  name: string;
  cityId: string | null;
};

export type PurchaseDraftSizeCodeOption = {
  id: string;
  code: string;
};

export type PurchaseDraftTypeCodeOption = {
  id: string;
  code: string;
};

export type PurchaseDraftConditionOption = {
  id: string;
  code: string;
};

export type PurchaseDraftMaterialVendorOption = {
  id: string;
  vendorCode: string | null;
  vendorName: string | null;
  materialCategory: PurchaseMaterialType | null;
  isDefaultVendor: boolean;
};

export type PurchaseDraftFormOptions = {
  suppliers: PurchaseDraftSupplierOption[];
  owners: PurchaseDraftOwnerOption[];
  buyers: PurchaseDraftBuyerOption[];
  locations: PurchaseDraftLocationOption[];
  depots: PurchaseDraftDepotOption[];
  sizeCodes: PurchaseDraftSizeCodeOption[];
  typeCodes: PurchaseDraftTypeCodeOption[];
  conditions: PurchaseDraftConditionOption[];
  colors: string[];
  materialVendors: PurchaseDraftMaterialVendorOption[];
  existingOrderNumbers: string[];
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
  settlement_credit_limit: number | null;
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
  location_code?: string | null;
  location_name?: string | null;
  size_code?: string | null;
  type_code?: string | null;
  condition_code?: string | null;
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

type PurchaseOrderItemDetailRowRaw = {
  id: string;
  purchase_order_id: string;
  line_no: number;
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
  offline_date: string | null;
  planned_qty: number | null;
  unit_price: number | null;
  financial_cost: number | null;
  settlement_price: number | null;
  line_amount: number | null;
  remark: string | null;
  created_at: string;
  updated_at: string;
  location?: {
    id: string;
    city_code: string;
    city_name: string;
  } | null;
  depot?: {
    id: string;
    depot_code: string;
    depot_name: string;
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

type PurchaseOrderContainerRowRaw = {
  id: string;
  purchase_order_id: string;
  purchase_order_item_id: string | null;
  container_number: string | null;
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
  offline_date: string | null;
  purchase_price: number | null;
  financial_cost: number | null;
  container_status: string | null;
  remark: string | null;
  created_at: string;
  updated_at: string;
  location?: {
    id: string;
    city_code: string;
    city_name: string;
  } | null;
  depot?: {
    id: string;
    depot_code: string;
    depot_name: string;
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

type PurchaseMaterialTypeRowRaw = {
  id: string;
  purchase_order_id: string;
  material_type: PurchaseOrderMaterialTypeRow["materialType"];
  material_vendor_id: string | null;
  material_vendor_name_snapshot: string | null;
  material_vendor_code_snapshot: string | null;
  created_at: string;
  updated_at: string;
  material_vendor?: {
    id: string;
    vendor_code: string | null;
    company_name: string | null;
    legal_company_name: string | null;
  } | null;
};

type PurchaseFinanceRecordRaw = {
  id: string;
  purchase_order_id: string;
  order_no: string;
  supplier_id: string | null;
  payment_mode: string | null;
  contract_number: string | null;
  invoice_number: string | null;
  payment_account: string | null;
  due_date: string | null;
  settlement_payment_term: string | null;
  settlement_credit_days: number | null;
  settlement_credit_limit: number | null;
  settlement_advance_payment_percentage: number | null;
  settlement_balance_trigger_event: string | null;
  settlement_currency: string | null;
  settlement_prepayment_pool: boolean | null;
  settlement_prepayment_threshold: number | null;
  settlement_current_prepaid_balance: number | null;
  vendor_bank_information: Record<string, unknown> | null;
  grand_total: number | null;
  total_amount_paid: number | null;
  total_amount_unpaid: number | null;
  finance_status: PurchaseFinanceRecord["financeStatus"];
  created_at: string;
  updated_at: string;
};

function normalizeText(value?: string) {
  return value?.trim() ?? "";
}

function toNumber(value: number | string | null | undefined) {
  if (value == null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compareString(a: string | null | undefined, b: string | null | undefined) {
  return (a ?? "").localeCompare(b ?? "", undefined, { sensitivity: "base" });
}

function includesText(haystack?: string | null, needle?: string | null) {
  const normalizedNeedle = normalizeText(needle).toLowerCase();
  if (!normalizedNeedle) return true;
  return normalizeText(haystack).toLowerCase().includes(normalizedNeedle);
}

function normalizePurchasePaymentMode(value: string | null | undefined): PurchasePaymentMode | null {
  if (!value) return null;
  if (value === "DEPOSIT_BALANCE") return "ADVANCE_PAYMENT";
  if (value === "VENDOR_CREDIT") return "CREDIT";
  if (value === "PREPAYMENT" || value === "ADVANCE_PAYMENT" || value === "CREDIT") {
    return value;
  }
  return null;
}

function getOrderDateValue(value: string | null | undefined) {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function mapPurchaseOrderItem(row: PurchaseOrderItemDetailRowRaw): PurchaseOrderItem {
  return {
    id: row.id,
    purchaseOrderId: row.purchase_order_id,
    lineNo: row.line_no,
    locationCityId: row.location_city_id,
    depotId: row.depot_id,
    containerSizeCodeId: row.container_size_code_id,
    containerTypeCodeId: row.container_type_code_id,
    containerConditionCodeId: row.container_condition_code_id,
    color: row.color,
    flp: Boolean(row.flp),
    lbx: Boolean(row.lbx),
    lockingBarsCount: row.locking_bars_count,
    ventsCount: row.vents_count,
    machineType: row.machine_type,
    yom: row.yom,
    offlineDate: row.offline_date,
    plannedQty: toNumber(row.planned_qty),
    unitPrice: row.unit_price,
    financialCost: row.financial_cost,
    settlementPrice: row.settlement_price,
    lineAmount: row.line_amount,
    remark: row.remark,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    location: row.location ?? null,
    depot: row.depot ?? null,
    size: row.size ?? null,
    type: row.type ?? null,
    condition: row.condition ?? null,
  };
}

function mapPurchaseOrderContainer(row: PurchaseOrderContainerRowRaw): PurchaseOrderContainer {
  return {
    id: row.id,
    purchaseOrderId: row.purchase_order_id,
    purchaseOrderItemId: row.purchase_order_item_id,
    containerNumber: row.container_number,
    locationCityId: row.location_city_id,
    depotId: row.depot_id,
    containerSizeCodeId: row.container_size_code_id,
    containerTypeCodeId: row.container_type_code_id,
    containerConditionCodeId: row.container_condition_code_id,
    color: row.color,
    flp: Boolean(row.flp),
    lbx: Boolean(row.lbx),
    lockingBarsCount: row.locking_bars_count,
    ventsCount: row.vents_count,
    machineType: row.machine_type,
    yom: row.yom,
    offlineDate: row.offline_date,
    purchasePrice: row.purchase_price,
    financialCost: row.financial_cost,
    containerStatus: row.container_status,
    remark: row.remark,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    location: row.location ?? null,
    depot: row.depot ?? null,
    size: row.size ?? null,
    type: row.type ?? null,
    condition: row.condition ?? null,
  };
}

function mapPurchaseMaterialTypeRow(
  row: PurchaseMaterialTypeRowRaw
): PurchaseOrderMaterialTypeRow {
  return {
    id: row.id,
    purchaseOrderId: row.purchase_order_id,
    materialType: row.material_type,
    materialVendorId: row.material_vendor_id,
    materialVendorNameSnapshot: row.material_vendor_name_snapshot,
    materialVendorCodeSnapshot: row.material_vendor_code_snapshot,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    materialVendor: row.material_vendor ?? null,
  };
}

function mapPurchaseFinanceRecord(row: PurchaseFinanceRecordRaw): PurchaseFinanceRecord {
  return {
    id: row.id,
    purchaseOrderId: row.purchase_order_id,
    orderNo: row.order_no,
    supplierId: row.supplier_id,
    paymentMode: normalizePurchasePaymentMode(row.payment_mode),
    contractNumber: row.contract_number,
    invoiceNumber: row.invoice_number,
    paymentAccount: row.payment_account,
    dueDate: row.due_date,
    settlementPaymentTerm: row.settlement_payment_term,
    settlementCreditDays: row.settlement_credit_days,
    settlementCreditLimit: row.settlement_credit_limit,
    settlementAdvancePaymentPercentage: row.settlement_advance_payment_percentage,
    settlementBalanceTriggerEvent: row.settlement_balance_trigger_event,
    settlementCurrency: row.settlement_currency,
    settlementPrepaymentPool: row.settlement_prepayment_pool,
    settlementPrepaymentThreshold: row.settlement_prepayment_threshold,
    settlementCurrentPrepaidBalance: row.settlement_current_prepaid_balance,
    vendorBankInformation: row.vendor_bank_information,
    grandTotal: toNumber(row.grand_total),
    totalAmountPaid: toNumber(row.total_amount_paid),
    totalAmountUnpaid: toNumber(row.total_amount_unpaid),
    financeStatus: row.finance_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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
  const locationLabel = firstItem?.location?.city_code ?? null;
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
    remark: row.remark,
    exchangeRate: row.exchange_rate,
    orderStatus: row.order_status,
    inboundStatus: row.inbound_status as PurchaseOrderSummary["inboundStatus"],
    paymentMode: normalizePurchasePaymentMode(row.payment_mode),
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
    settlementCreditLimit: row.settlement_credit_limit,
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
    primaryLocation: firstItem?.location?.city_code ?? null,
    primarySizeCode: sizeCode,
    primaryTypeCode: typeCode,
    primaryConditionCode: firstItem?.condition?.condition_code ?? null,
    primaryColor: firstItem?.color ?? null,
    locationLabel,
    vendorLabel,
    sizeTypeLabel,
    conditionLabel: firstItem?.condition?.condition_code ?? null,
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
      case "status":
        result = compareString(left.orderStatus, right.orderStatus);
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
        settlement_credit_limit,
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
  return (((data ?? []) as unknown) as PurchaseItemRowRaw[]).map((row) => ({
    ...row,
    location_code: row.location?.city_code ?? null,
    location_name: row.location?.city_name ?? null,
    size_code: row.size?.size_code ?? null,
    type_code: row.type?.type_code ?? null,
    condition_code: row.condition?.condition_code ?? null,
  }));
}

async function loadRalColorCodes() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("ral_color_codes")
    .select("color_code")
    .order("color_code", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{ color_code: string }>).map((row) => row.color_code);
}

function dedupeAutocompleteOptions(options: PurchaseAutocompleteOption[]) {
  const unique = new Map<string, PurchaseAutocompleteOption>();
  for (const option of options) {
    if (!option.value) continue;
    if (!unique.has(option.value)) {
      unique.set(option.value, option);
    }
  }
  return Array.from(unique.values());
}

async function loadVendorFilterOptions(): Promise<PurchaseAutocompleteOption[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("purchase_order")
    .select(
      `
        supplier:vendors!purchase_order_supplier_id_vendors_fkey(
          id,
          vendor_code,
          company_name,
          legal_company_name
        )
      `
    )
    .not("supplier_id", "is", null);

  if (error) throw new Error(error.message);

  const options = ((data ?? []) as Array<{ supplier?: PurchaseOrderRowRaw["supplier"] }>).flatMap((row) => {
      const supplier = row.supplier;
      if (!supplier) return [];
      const value =
        supplier.vendor_code ??
        supplier.company_name ??
        supplier.legal_company_name ??
        supplier.id;
      const secondaryLabel = supplier.company_name ?? supplier.legal_company_name ?? undefined;
      return [
        {
          value,
          label: supplier.vendor_code ?? secondaryLabel ?? value,
          secondaryLabel,
          searchText: [
            supplier.vendor_code,
            supplier.company_name,
            supplier.legal_company_name,
          ]
            .filter(Boolean)
            .join(" "),
        },
      ];
    }) as PurchaseAutocompleteOption[];

  return dedupeAutocompleteOptions(options).sort((left, right) =>
    `${left.label} ${left.secondaryLabel ?? ""}`.localeCompare(
      `${right.label} ${right.secondaryLabel ?? ""}`,
      undefined,
      { sensitivity: "base" }
    )
  );
}

async function loadLocationFilterOptions(): Promise<PurchaseAutocompleteOption[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("purchase_order_item")
    .select("location:cities(id, city_code, city_name)")
    .not("location_city_id", "is", null);

  if (error) throw new Error(error.message);

  const options = ((data ?? []) as Array<{ location?: PurchaseItemRowRaw["location"] }>).flatMap((row) => {
      const location = row.location;
      if (!location?.city_code) return [];
      return [
        {
          value: location.city_code,
          label: location.city_code,
          secondaryLabel: location.city_name,
          searchText: `${location.city_code} ${location.city_name}`,
        },
      ];
    }) as PurchaseAutocompleteOption[];

  return dedupeAutocompleteOptions(options).sort((left, right) =>
    left.label.localeCompare(right.label, undefined, { sensitivity: "base" })
  );
}

async function loadSizeTypeFilterOptions(): Promise<PurchaseAutocompleteOption[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("purchase_order_item")
    .select(
      `
        size:container_size_codes(id, size_code),
        type:container_type_codes(id, type_code)
      `
    )
    .not("container_size_code_id", "is", null)
    .not("container_type_code_id", "is", null);

  if (error) throw new Error(error.message);

  const options = ((data ?? []) as Array<{
      size?: Pick<NonNullable<PurchaseItemRowRaw["size"]>, "size_code"> | null;
      type?: Pick<NonNullable<PurchaseItemRowRaw["type"]>, "type_code"> | null;
    }>).flatMap((row) => {
      const sizeCode = row.size?.size_code ?? null;
      const typeCode = row.type?.type_code ?? null;
      if (!sizeCode || !typeCode) return [];
      const combined = `${sizeCode}${typeCode}`;
      return [
        {
          value: combined,
          label: combined,
          searchText: `${sizeCode} ${typeCode} ${combined}`,
        },
      ];
    }) as PurchaseAutocompleteOption[];

  return dedupeAutocompleteOptions(options).sort((left, right) =>
    left.label.localeCompare(right.label, undefined, { sensitivity: "base" })
  );
}

async function loadConditionFilterOptions(): Promise<PurchaseAutocompleteOption[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("purchase_order_item")
    .select("condition:container_condition_codes(id, condition_code)")
    .not("container_condition_code_id", "is", null);

  if (error) throw new Error(error.message);

  const options = ((data ?? []) as Array<{
      condition?: Pick<NonNullable<PurchaseItemRowRaw["condition"]>, "condition_code"> | null;
    }>).flatMap((row) => {
      const code = row.condition?.condition_code ?? null;
      if (!code) return [];
      return [
        {
          value: code,
          label: code,
          searchText: code,
        },
      ];
    }) as PurchaseAutocompleteOption[];

  return dedupeAutocompleteOptions(options).sort((left, right) =>
    left.label.localeCompare(right.label, undefined, { sensitivity: "base" })
  );
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

function filterRowsByBase(
  rows: PurchaseOrderManagementRow[],
  filters: {
    vendorId: string;
  }
) {
  return rows.filter((row) => {
    if (!filters.vendorId) return true;
    const vendorQuery = filters.vendorId;
    return (
      includesText(row.supplier?.vendor_code, vendorQuery) ||
      includesText(row.supplier?.company_name, vendorQuery) ||
      includesText(row.supplier?.legal_company_name, vendorQuery) ||
      includesText(row.vendorLabel, vendorQuery)
    );
  });
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

  const validRalColors = filters.color ? await loadRalColorCodes() : [];
  if (
    filters.color &&
    !validRalColors.some((code) =>
      normalizeRalLikeSearch(code).includes(normalizeRalLikeSearch(filters.color))
    )
  ) {
    return {
      rows: [],
      totalCount: 0,
      page,
      pageSize,
      filters,
      summary: {
        totalOrders: 0,
        totalPlannedQty: 0,
        totalAvailableQty: 0,
        totalRemainingQty: 0,
        totalCancelledQty: 0,
        prepaidBalance: 0,
      },
      sort,
    };
  }

  const baseRows = await loadPurchaseRows(filters);
  const orderIds = baseRows.map((row) => row.id);
  const items = await loadPurchaseItems(orderIds);

  const itemsByOrder = groupPurchaseItemsByOrder(items);
  const firstItems = firstPurchaseItemByOrder(itemsByOrder);

  const mappedRows = baseRows.map((row) => mapPurchaseRow(row, firstItems.get(row.id)));
  const baseFilteredRows = filterRowsByBase(mappedRows, filters);
  const filteredRows = filterRowsByItems(baseFilteredRows, itemsByOrder, filters);
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
  const [vendors, locations, sizeTypes, conditions, colors] = await Promise.all([
    loadVendorFilterOptions(),
    loadLocationFilterOptions(),
    loadSizeTypeFilterOptions(),
    loadConditionFilterOptions(),
    loadRalColorCodes(),
  ]);

  return {
    vendors,
    locations,
    sizeTypes,
    conditions,
    colors: colors.map((value) => ({
      value,
      label: value,
      searchText: value,
    })),
    statuses: ["DRAFT", "CONFIRMED", "PARTIAL_RECEIVED", "COMPLETED", "CANCELLED"],
  };
}

export async function getPurchaseOrderDetail(id: string): Promise<PurchaseOrderDetail | null> {
  noStore();
  const supabase = createServerSupabaseClient();
  const [orderResult, itemsResult, materialTypesResult, financeRecordResult] = await Promise.all([
    supabase
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
          settlement_credit_limit,
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
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("purchase_order_item")
      .select(
        `
          id,
          purchase_order_id,
          line_no,
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
          offline_date,
          planned_qty,
          unit_price,
          financial_cost,
          settlement_price,
          line_amount,
          remark,
          created_at,
          updated_at,
          location:cities(id, city_code, city_name),
          depot:depots(id, depot_code, depot_name),
          size:container_size_codes(id, size_code, size_name),
          type:container_type_codes(id, type_code, type_description),
          condition:container_condition_codes(id, condition_code, condition_name)
        `
      )
      .eq("purchase_order_id", id)
      .order("line_no", { ascending: true }),
    supabase
      .from("purchase_order_material_type")
      .select(
        `
          id,
          purchase_order_id,
          material_type,
          material_vendor_id,
          material_vendor_name_snapshot,
          material_vendor_code_snapshot,
          created_at,
          updated_at,
          material_vendor:material_vendors(id, vendor_code, company_name, legal_company_name)
        `
      )
      .eq("purchase_order_id", id)
      .order("material_type", { ascending: true }),
    supabase
      .from("purchase_finance_record")
      .select(
        `
          id,
          purchase_order_id,
          order_no,
          supplier_id,
          payment_mode,
          contract_number,
          invoice_number,
          payment_account,
          due_date,
          settlement_payment_term,
          settlement_credit_days,
          settlement_credit_limit,
          settlement_advance_payment_percentage,
          settlement_balance_trigger_event,
          settlement_currency,
          settlement_prepayment_pool,
          settlement_prepayment_threshold,
          settlement_current_prepaid_balance,
          vendor_bank_information,
          grand_total,
          total_amount_paid,
          total_amount_unpaid,
          finance_status,
          created_at,
          updated_at
        `
      )
      .eq("purchase_order_id", id)
      .maybeSingle(),
  ]);

  if (orderResult.error) throw new Error(orderResult.error.message);
  if (itemsResult.error) throw new Error(itemsResult.error.message);
  if (materialTypesResult.error) throw new Error(materialTypesResult.error.message);
  if (financeRecordResult.error) throw new Error(financeRecordResult.error.message);

  const order = orderResult.data as PurchaseOrderRowRaw | null;
  if (!order) return null;

  return {
    id: order.id,
    orderNo: order.order_no,
    purchaseType: order.purchase_type,
    supplierId: order.supplier_id,
    ownerId: order.owner_id,
    buyerId: order.buyer_id,
    purchaseDate: order.purchase_date,
    estimatedOfflineTime: order.estimated_offline_time,
    contractNumber: order.contract_number,
    invoiceNumber: order.invoice_number,
    freeday: order.freeday,
    vendorReleaseNumber: order.vendor_release_number,
    vendorReleaseDate: order.vendor_release_date,
    remark: order.remark,
    exchangeRate: order.exchange_rate,
    orderStatus: order.order_status,
    inboundStatus: order.inbound_status as PurchaseOrderDetail["inboundStatus"],
    paymentMode: normalizePurchasePaymentMode(order.payment_mode),
    paymentAccount: order.payment_account,
    dueDate: order.due_date,
    totalPlannedQty: toNumber(order.total_planned_qty),
    totalReceivedQty: toNumber(order.total_received_qty),
    totalAvailableQty: toNumber(order.total_available_qty),
    grandTotal: toNumber(order.grand_total),
    totalAmountPaid: order.total_amount_paid,
    totalAmountUnpaid: order.total_amount_unpaid,
    settlementPaymentTerm: order.settlement_payment_term,
    settlementCreditDays: order.settlement_credit_days,
    settlementCreditLimit: order.settlement_credit_limit,
    settlementAdvancePaymentPercentage: order.settlement_advance_payment_percentage,
    settlementBalanceTriggerEvent: order.settlement_balance_trigger_event,
    settlementCurrency: order.settlement_currency,
    settlementPrepaymentPool: order.settlement_prepayment_pool,
    settlementPrepaymentThreshold: order.settlement_prepayment_threshold,
    settlementCurrentPrepaidBalance: order.settlement_current_prepaid_balance,
    vendorBankInformation: order.vendor_bank_information,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    supplier: order.supplier ?? null,
    owner: order.owner ?? null,
    buyer: order.buyer ?? null,
    items: (((itemsResult.data ?? []) as unknown) as PurchaseOrderItemDetailRowRaw[]).map(
      mapPurchaseOrderItem
    ),
    containers: [],
    materialTypes: (((materialTypesResult.data ?? []) as unknown) as PurchaseMaterialTypeRowRaw[]).map(
      mapPurchaseMaterialTypeRow
    ),
    financeRecord: financeRecordResult.data
      ? mapPurchaseFinanceRecord(
          (financeRecordResult.data as unknown) as PurchaseFinanceRecordRaw
        )
      : null,
  };
}

export async function getPurchaseOrderItemContainers(
  orderId: string,
  itemId: string
): Promise<PurchaseOrderItemContainersDetail | null> {
  noStore();
  const supabase = createServerSupabaseClient();

  const [orderResult, itemResult, containersResult] = await Promise.all([
    supabase
      .from("purchase_order")
      .select("id, order_no")
      .eq("id", orderId)
      .maybeSingle(),
    supabase
      .from("purchase_order_item")
      .select(
        `
          id,
          purchase_order_id,
          line_no,
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
          offline_date,
          planned_qty,
          unit_price,
          financial_cost,
          settlement_price,
          line_amount,
          remark,
          created_at,
          updated_at,
          location:cities(id, city_code, city_name),
          depot:depots(id, depot_code, depot_name),
          size:container_size_codes(id, size_code, size_name),
          type:container_type_codes(id, type_code, type_description),
          condition:container_condition_codes(id, condition_code, condition_name)
        `
      )
      .eq("purchase_order_id", orderId)
      .eq("id", itemId)
      .maybeSingle(),
    supabase
      .from("purchase_order_container")
      .select(
        `
          id,
          purchase_order_id,
          purchase_order_item_id,
          container_number,
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
          offline_date,
          purchase_price,
          financial_cost,
          container_status,
          remark,
          created_at,
          updated_at,
          location:cities(id, city_code, city_name),
          depot:depots(id, depot_code, depot_name),
          size:container_size_codes(id, size_code, size_name),
          type:container_type_codes(id, type_code, type_description),
          condition:container_condition_codes(id, condition_code, condition_name)
        `
      )
      .eq("purchase_order_id", orderId)
      .eq("purchase_order_item_id", itemId)
      .order("container_number", { ascending: true }),
  ]);

  if (orderResult.error) throw new Error(orderResult.error.message);
  if (itemResult.error) throw new Error(itemResult.error.message);
  if (containersResult.error) throw new Error(containersResult.error.message);

  if (!orderResult.data || !itemResult.data) return null;

  return {
    orderId: orderResult.data.id,
    orderNo: orderResult.data.order_no,
    item: mapPurchaseOrderItem(
      (itemResult.data as unknown) as PurchaseOrderItemDetailRowRaw
    ),
    containers: (
      ((containersResult.data ?? []) as unknown) as PurchaseOrderContainerRowRaw[]
    ).map(mapPurchaseOrderContainer),
  };
}

export async function getPurchaseDraftFormOptions(): Promise<PurchaseDraftFormOptions> {
  noStore();
  const supabase = createServerSupabaseClient();
  const [
    suppliersResult,
    ownersResult,
    buyersResult,
    locationsResult,
    depotsResult,
    sizeCodesResult,
    typeCodesResult,
    conditionsResult,
    colorsResult,
    materialVendorsResult,
    orderNosResult,
  ] = await Promise.all([
    supabase
      .from("vendors")
      .select(
        `
          id,
          vendor_code,
          company_name,
          legal_company_name,
          settlement_payment_term,
          settlement_credit_days,
          settlement_credit_limit,
          settlement_advance_payment_percentage,
          settlement_balance_trigger_event,
          settlement_currency,
          settlement_prepayment_pool,
          settlement_prepayment_threshold,
          settlement_current_prepaid_balance,
          bank_name,
          bank_code,
          bank_account_name,
          bank_account_number,
          swift_code,
          bank_address,
          remark
        `
      )
      .order("vendor_code", { ascending: true }),
    supabase
      .from("container_owners")
      .select("id, container_owner_code, company_name, legal_company_name")
      .order("container_owner_code", { ascending: true }),
    supabase.from("users").select("id, user_code, full_name").order("user_code", { ascending: true }),
    supabase.from("cities").select("id, city_code, city_name").order("city_code", { ascending: true }),
    supabase.from("depots").select("id, depot_code, depot_name, city_id").order("depot_code", { ascending: true }),
    supabase
      .from("container_size_codes")
      .select("id, size_code")
      .order("size_code", { ascending: true }),
    supabase
      .from("container_type_codes")
      .select("id, type_code")
      .order("type_code", { ascending: true }),
    supabase
      .from("container_condition_codes")
      .select("id, condition_code")
      .order("condition_code", { ascending: true }),
    supabase.from("ral_color_codes").select("color_code").order("color_code", { ascending: true }),
    supabase
      .from("material_vendors")
      .select("id, vendor_code, company_name, legal_company_name, material_category, is_default_vendor")
      .order("vendor_code", { ascending: true }),
    supabase.from("purchase_order").select("order_no").order("order_no", { ascending: true }),
  ]);

  if (suppliersResult.error) throw new Error(suppliersResult.error.message);
  if (ownersResult.error) throw new Error(ownersResult.error.message);
  if (buyersResult.error) throw new Error(buyersResult.error.message);
  if (locationsResult.error) throw new Error(locationsResult.error.message);
  if (depotsResult.error) throw new Error(depotsResult.error.message);
  if (sizeCodesResult.error) throw new Error(sizeCodesResult.error.message);
  if (typeCodesResult.error) throw new Error(typeCodesResult.error.message);
  if (conditionsResult.error) throw new Error(conditionsResult.error.message);
  if (colorsResult.error) throw new Error(colorsResult.error.message);
  if (materialVendorsResult.error) throw new Error(materialVendorsResult.error.message);
  if (orderNosResult.error) throw new Error(orderNosResult.error.message);

  const suppliers = ((suppliersResult.data ?? []) as Array<{
    id: string;
    vendor_code: string | null;
    company_name: string | null;
    legal_company_name: string | null;
    settlement_payment_term: string | null;
    settlement_credit_days: number | null;
    settlement_credit_limit: number | null;
    settlement_advance_payment_percentage: number | null;
    settlement_balance_trigger_event: string | null;
    settlement_currency: string | null;
    settlement_prepayment_pool: boolean | null;
    settlement_prepayment_threshold: number | null;
    settlement_current_prepaid_balance: number | null;
    bank_name: string | null;
    bank_code: string | null;
    bank_account_name: string | null;
    bank_account_number: string | null;
    swift_code: string | null;
    bank_address: string | null;
    remark: string | null;
  }>).map((vendor) => {
    const vendorName =
      vendor.legal_company_name ?? vendor.company_name ?? vendor.vendor_code ?? vendor.id;
    return {
      id: vendor.id,
      value: vendor.id,
      label: [vendor.vendor_code, vendorName].filter(Boolean).join(" · "),
      secondaryLabel: vendor.company_name && vendor.company_name !== vendorName ? vendor.company_name : undefined,
      searchText: [
        vendor.vendor_code,
        vendor.legal_company_name,
        vendor.company_name,
      ]
        .filter(Boolean)
        .join(" "),
      vendorCode: vendor.vendor_code,
      vendorName,
      settlementPaymentTerm: vendor.settlement_payment_term,
      settlementCreditDays: vendor.settlement_credit_days,
      settlementCreditLimit: vendor.settlement_credit_limit,
      settlementAdvancePaymentPercentage: vendor.settlement_advance_payment_percentage,
      settlementBalanceTriggerEvent: vendor.settlement_balance_trigger_event,
      settlementCurrency: vendor.settlement_currency,
      settlementPrepaymentPool: vendor.settlement_prepayment_pool,
      settlementPrepaymentThreshold: vendor.settlement_prepayment_threshold,
      settlementCurrentPrepaidBalance: vendor.settlement_current_prepaid_balance,
      vendorBankInformation: {
        bank_name: vendor.bank_name,
        bank_code: vendor.bank_code,
        bank_account_name: vendor.bank_account_name,
        bank_account_number: vendor.bank_account_number,
        swift_code: vendor.swift_code,
        bank_address: vendor.bank_address,
        remark: vendor.remark,
      },
    } satisfies PurchaseDraftSupplierOption;
  });

  return {
    suppliers,
    owners: ((ownersResult.data ?? []) as Array<{
      id: string;
      container_owner_code: string | null;
      company_name: string | null;
      legal_company_name: string | null;
    }>).map((owner) => ({
      id: owner.id,
      label: [owner.container_owner_code, owner.legal_company_name ?? owner.company_name].filter(Boolean).join(" · "),
    })),
    buyers: ((buyersResult.data ?? []) as Array<{
      id: string;
      user_code: string | null;
      full_name: string | null;
    }>).map((buyer) => ({
      id: buyer.id,
      label: [buyer.user_code, buyer.full_name].filter(Boolean).join(" · "),
    })),
    locations: ((locationsResult.data ?? []) as Array<{
      id: string;
      city_code: string;
      city_name: string;
    }>).map((location) => ({
      id: location.id,
      code: location.city_code,
      name: location.city_name,
    })),
    depots: ((depotsResult.data ?? []) as Array<{
      id: string;
      depot_code: string;
      depot_name: string;
      city_id: string | null;
    }>).map((depot) => ({
      id: depot.id,
      code: depot.depot_code,
      name: depot.depot_name,
      cityId: depot.city_id,
    })),
    sizeCodes: ((sizeCodesResult.data ?? []) as Array<{ id: string; size_code: string }>).map(
      (size) => ({ id: size.id, code: size.size_code })
    ),
    typeCodes: ((typeCodesResult.data ?? []) as Array<{ id: string; type_code: string }>).map(
      (type) => ({ id: type.id, code: type.type_code })
    ),
    conditions: ((conditionsResult.data ?? []) as Array<{ id: string; condition_code: string }>).map(
      (condition) => ({ id: condition.id, code: condition.condition_code })
    ),
    colors: ((colorsResult.data ?? []) as Array<{ color_code: string }>).map((row) => row.color_code),
    materialVendors: ((materialVendorsResult.data ?? []) as Array<{
      id: string;
      vendor_code: string | null;
      company_name: string | null;
      legal_company_name: string | null;
      material_category: PurchaseMaterialType | null;
      is_default_vendor: boolean | null;
    }>).map((vendor) => ({
      id: vendor.id,
      vendorCode: vendor.vendor_code,
      vendorName: vendor.legal_company_name ?? vendor.company_name,
      materialCategory: vendor.material_category,
      isDefaultVendor: Boolean(vendor.is_default_vendor),
    })),
    existingOrderNumbers: ((orderNosResult.data ?? []) as Array<{ order_no: string }>).map(
      (row) => row.order_no
    ),
  };
}

export async function createPurchaseOrderDraft(input: PurchaseOrderDraftInput): Promise<{
  orderId: string;
  orderNo: string;
}> {
  const supabase = createServerSupabaseClient();

  if (!input.orderNo?.trim()) {
    throw new Error("PO Number is required.");
  }
  if (!input.purchaseType) {
    throw new Error("Purchase Type is required.");
  }
  if (!input.supplierId) {
    throw new Error("Supplier is required.");
  }
  if (!input.ownerId) {
    throw new Error("Owner is required.");
  }
  if (!input.purchaseDate) {
    throw new Error("Purchase Date is required.");
  }
  if (!input.paymentMode) {
    throw new Error("Payment Mode is required.");
  }
  if (input.items.length === 0) {
    throw new Error("At least one purchase item is required.");
  }

  const cleanedMaterialTypes = sanitizeMaterialTypesForSubmit(input.purchaseType, input.materialTypes);
  if (shouldShowMaterialTypes(input.purchaseType) && cleanedMaterialTypes.length === 0) {
    throw new Error("At least one material type is required for factory orders.");
  }

  const colorValues = Array.from(
    new Set(input.items.map((item) => normalizeText(item.color ?? "")).filter(Boolean))
  );
  if (colorValues.length > 0) {
    const { data: validColors, error: colorError } = await supabase
      .from("ral_color_codes")
      .select("color_code")
      .in("color_code", colorValues);
    if (colorError) throw new Error(colorError.message);
    const validColorSet = new Set((validColors ?? []).map((row) => normalizeText(row.color_code)));
    const invalidColor = colorValues.find((value) => !validColorSet.has(normalizeText(value)));
    if (invalidColor) {
      throw new Error(`Invalid RAL color code: ${invalidColor}`);
    }
  }

  const sanitizedOrderInput = {
    order_no: input.orderNo.trim(),
    purchase_type: input.purchaseType,
    supplier_id: input.supplierId,
    owner_id: input.ownerId,
    buyer_id: input.buyerId || null,
    purchase_date: input.purchaseDate,
    estimated_offline_time: shouldShowEstimatedOfflineTime(input.purchaseType)
      ? input.estimatedOfflineTime || null
      : null,
    contract_number: input.contractNumber?.trim() || null,
    invoice_number: input.invoiceNumber?.trim() || null,
    freeday: shouldShowVendorReleaseFields(input.purchaseType) ? input.freeday : null,
    vendor_release_number: shouldShowVendorReleaseFields(input.purchaseType)
      ? input.vendorReleaseNumber?.trim() || null
      : null,
    vendor_release_date: shouldShowVendorReleaseFields(input.purchaseType)
      ? input.vendorReleaseDate || null
      : null,
    payment_mode: input.paymentMode,
    remark: input.remark?.trim() || null,
    order_status: "DRAFT" as const,
  };

  const { data: orderRow, error: orderError } = await supabase
    .from("purchase_order")
    .insert(sanitizedOrderInput)
    .select("id, order_no")
    .single();

  if (orderError) throw new Error(orderError.message);

  const financeUpdate = {
    payment_mode: input.paymentMode,
    payment_account: input.paymentAccount?.trim() || null,
    due_date: input.dueDate || null,
    settlement_payment_term:
      input.paymentMode === "CREDIT" ? input.settlementPaymentTerm?.trim() || null : null,
    settlement_credit_days:
      input.paymentMode === "CREDIT" ? input.settlementCreditDays : null,
    settlement_credit_limit:
      input.paymentMode === "CREDIT" ? input.settlementCreditLimit : null,
    settlement_advance_payment_percentage:
      input.paymentMode === "ADVANCE_PAYMENT"
        ? input.settlementAdvancePaymentPercentage
        : null,
    settlement_balance_trigger_event:
      input.paymentMode === "CREDIT"
        ? input.settlementBalanceTriggerEvent?.trim() || null
        : null,
    settlement_currency: input.settlementCurrency?.trim() || null,
    settlement_current_prepaid_balance: input.settlementCurrentPrepaidBalance,
    vendor_bank_information: input.vendorBankInformation,
  };

  const { error: financeUpdateError } = await supabase
    .from("purchase_order")
    .update(financeUpdate)
    .eq("id", orderRow.id);
  if (financeUpdateError) throw new Error(financeUpdateError.message);

  const itemRows = input.items.map((item, index) => ({
    purchase_order_id: orderRow.id,
    line_no: index + 1,
    location_city_id: item.locationCityId,
    depot_id: item.depotId,
    container_size_code_id: item.containerSizeCodeId,
    container_type_code_id: item.containerTypeCodeId,
    container_condition_code_id: item.containerConditionCodeId,
    color: item.color?.trim() || null,
    flp: item.flp,
    lbx: item.lbx,
    locking_bars_count: item.lockingBarsCount,
    vents_count: item.ventsCount,
    machine_type: item.machineType?.trim() || null,
    yom: item.yom,
    offline_date: item.offlineDate || null,
    planned_qty: item.plannedQty,
    unit_price: item.unitPrice,
    settlement_price: null,
    financial_cost: null,
    line_amount: computeLineAmount(item.plannedQty, item.unitPrice),
    remark: item.remark?.trim() || null,
  }));

  const { error: itemsError } = await supabase.from("purchase_order_item").insert(itemRows);
  if (itemsError) throw new Error(itemsError.message);

  if (shouldShowMaterialTypes(input.purchaseType)) {
    const { error: materialTypesError } = await supabase
      .from("purchase_order_material_type")
      .insert(
        cleanedMaterialTypes.map((row) => ({
          purchase_order_id: orderRow.id,
          material_type: row.materialType,
          material_vendor_id: row.materialVendorId,
        }))
      );
    if (materialTypesError) throw new Error(materialTypesError.message);
  }

  revalidatePath("/purchase/po-management");
  revalidatePath(`/purchase/po-management/${orderRow.id}`);
  revalidatePath("/purchase");

  return {
    orderId: orderRow.id,
    orderNo: orderRow.order_no,
  };
}
