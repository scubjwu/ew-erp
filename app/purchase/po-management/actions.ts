"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPurchaseOrderEditPermissions } from "@/types/purchase";
import type {
  PurchaseBankInformationSnapshot,
  PurchaseOrderItemAttachmentInput,
  PurchaseOrderItemAttachmentRow,
  PurchaseOrderEditPermissions,
  PurchaseFinanceRecord,
  PurchaseMaterialType,
  PurchaseOrderDraftContainerInput,
  PurchaseOrderDraftInput,
  PurchaseOrderContainerEditPatchInput,
  PurchaseOrderContainer,
  PurchaseOrderDetail,
  PurchaseOrderEditContainerPage,
  PurchaseOrderItem,
  PurchaseOrderItemContainersDetail,
  PurchaseOrderMaterialTypeRow,
  PurchasePaymentMode,
  PurchaseOrderStatus,
  PurchaseOrderSummary,
  PurchaseType,
} from "@/types/purchase";
import {
  buildDefaultDraftContainersForItem,
  computeLineAmount,
  generatePurchaseOrderNumber,
  generateIso6346ContainerNumber,
  getNextPurchaseOrderSequence,
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
  | "activityAt"
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
  usesInternalContainerNumbering: boolean;
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
    uses_internal_container_numbering: boolean;
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
  estimated_offline_date: string | null;
  offline_date: string | null;
  vendor_release_number: string | null;
  planned_pod: string | null;
  tare_weight: number | null;
  maximum_weight: number | null;
  payload_weight: number | null;
  csc_number: string | null;
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
  estimated_offline_date: string | null;
  offline_date: string | null;
  planned_pod: string | null;
  tare_weight: number | null;
  maximum_weight: number | null;
  payload_weight: number | null;
  csc_number: string | null;
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

type PurchaseOrderItemAttachmentRowRaw = {
  id: string;
  purchase_order_item_id: string;
  attachment_type: PurchaseOrderItemAttachmentRow["attachmentType"];
  url: string;
  remark: string | null;
  created_at: string;
  updated_at: string;
};

function normalizeText(value?: string | null) {
  return value?.trim() ?? "";
}

function firstRelation<T>(value?: T | T[] | null): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
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
    estimatedOfflineDate: row.estimated_offline_date,
    offlineDate: row.offline_date,
    vendorReleaseNumber: row.vendor_release_number,
    plannedPod: row.planned_pod,
    tareWeight: row.tare_weight,
    maximumWeight: row.maximum_weight,
    payloadWeight: row.payload_weight,
    cscNumber: row.csc_number,
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
    estimatedOfflineDate: row.estimated_offline_date,
    offlineDate: row.offline_date,
    plannedPod: row.planned_pod,
    tareWeight: row.tare_weight,
    maximumWeight: row.maximum_weight,
    payloadWeight: row.payload_weight,
    cscNumber: row.csc_number,
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

function isCancelledContainerStatus(status: string | null | undefined) {
  return status === "CANCELLED";
}

function isAvailableContainerStatus(status: string | null | undefined) {
  return status === "IN_YARD" || status === "PICKED_UP";
}

function computeContainerNumberRange(
  purchaseType: PurchaseType,
  containers: PurchaseOrderContainer[]
) {
  if (purchaseType !== "FACTORY_ORDER") return null;

  const activeNumbers = containers
    .filter((container) => !isCancelledContainerStatus(container.containerStatus))
    .map((container) => container.containerNumber?.trim() || null)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => left.localeCompare(right));

  if (activeNumbers.length === 0) return null;
  if (activeNumbers.length === 1) return activeNumbers[0];
  return `${activeNumbers[0]} - ${activeNumbers[activeNumbers.length - 1]}`;
}

function getOrderEditPermissions(order: Pick<PurchaseOrderDetail, "purchaseType" | "orderStatus">) {
  return getPurchaseOrderEditPermissions(order.purchaseType, order.orderStatus);
}

function attachItemCancellationCounts(
  purchaseType: PurchaseType,
  items: PurchaseOrderItem[],
  containers: PurchaseOrderContainer[]
) {
  const counts = new Map<
    string,
    {
      cancelledQty: number;
      availableQty: number;
    }
  >();
  const containersByItem = new Map<string, PurchaseOrderContainer[]>();

  for (const container of containers) {
    if (!container.purchaseOrderItemId) continue;
    const current = counts.get(container.purchaseOrderItemId) ?? {
      cancelledQty: 0,
      availableQty: 0,
    };
    if (isCancelledContainerStatus(container.containerStatus)) current.cancelledQty += 1;
    if (isAvailableContainerStatus(container.containerStatus)) current.availableQty += 1;
    counts.set(container.purchaseOrderItemId, current);

    const bucket = containersByItem.get(container.purchaseOrderItemId) ?? [];
    bucket.push(container);
    containersByItem.set(container.purchaseOrderItemId, bucket);
  }

  return items.map((item) => {
    const current = counts.get(item.id) ?? { cancelledQty: 0, availableQty: 0 };
    return {
      ...item,
      containerNumberRange: computeContainerNumberRange(
        purchaseType,
        containersByItem.get(item.id) ?? []
      ),
      cancelledQty: current.cancelledQty,
      remainingQty: Math.max(item.plannedQty - current.availableQty - current.cancelledQty, 0),
    };
  });
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

function mapPurchaseOrderItemAttachmentRow(
  row: PurchaseOrderItemAttachmentRowRaw
): PurchaseOrderItemAttachmentRow {
  return {
    id: row.id,
    purchaseOrderItemId: row.purchase_order_item_id,
    attachmentType: row.attachment_type,
    url: row.url,
    remark: row.remark,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPurchaseRow(
  row: PurchaseOrderRowRaw,
  firstItem?: PurchaseItemRowRaw,
  containers: PurchaseOrderContainer[] = []
): PurchaseOrderManagementRow {
  const totalPlannedQty = toNumber(row.total_planned_qty);
  const totalAvailableQty = toNumber(row.total_available_qty);
  const totalReceivedQty = toNumber(row.total_received_qty);
  const prepaidBalance = toNumber(row.settlement_current_prepaid_balance);
  const cancelledQty = containers.filter((container) =>
    isCancelledContainerStatus(container.containerStatus)
  ).length;
  const availableQty = totalAvailableQty || containers.filter((container) =>
    isAvailableContainerStatus(container.containerStatus)
  ).length;
  const remainingQty = Math.max(totalPlannedQty - availableQty - cancelledQty, 0);
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
    cancelledQty,
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
      case "activityAt":
        result = getOrderDateValue(left.updatedAt) - getOrderDateValue(right.updatedAt);
        break;
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
        owner:container_owners!purchase_order_owner_id_fkey(id, container_owner_code, company_name, legal_company_name, uses_internal_container_numbering),
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

async function loadPurchaseContainers(orderIds: string[]) {
  if (orderIds.length === 0) return [] as PurchaseOrderContainerRowRaw[];
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
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
        planned_pod,
        tare_weight,
        maximum_weight,
        payload_weight,
        csc_number,
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
    .in("purchase_order_id", orderIds)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown) as PurchaseOrderContainerRowRaw[];
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

  type RawSupplier = NonNullable<PurchaseOrderRowRaw["supplier"]>;
  type RawRow = { supplier?: RawSupplier | RawSupplier[] | null };

  const options = ((data ?? []) as RawRow[]).flatMap((row) => {
    const supplier = firstRelation(row.supplier);
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
  });

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

  type RawLocation = NonNullable<PurchaseItemRowRaw["location"]>;
  type RawRow = { location?: RawLocation | RawLocation[] | null };

  const options = ((data ?? []) as RawRow[]).flatMap((row) => {
    const location = firstRelation(row.location);
    if (!location?.city_code) return [];
    return [
      {
        value: location.city_code,
        label: location.city_code,
        secondaryLabel: location.city_name,
        searchText: `${location.city_code} ${location.city_name}`,
      },
    ];
  });

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

  type RawSize = Pick<NonNullable<PurchaseItemRowRaw["size"]>, "size_code">;
  type RawType = Pick<NonNullable<PurchaseItemRowRaw["type"]>, "type_code">;
  type RawRow = {
    size?: RawSize | RawSize[] | null;
    type?: RawType | RawType[] | null;
  };

  const options = ((data ?? []) as RawRow[]).flatMap((row) => {
    const sizeCode = firstRelation(row.size)?.size_code ?? null;
    const typeCode = firstRelation(row.type)?.type_code ?? null;
    if (!sizeCode || !typeCode) return [];
    const combined = `${sizeCode}${typeCode}`;
    return [
      {
        value: combined,
        label: combined,
        searchText: `${sizeCode} ${typeCode} ${combined}`,
      },
    ];
  });

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

  type RawCondition = Pick<NonNullable<PurchaseItemRowRaw["condition"]>, "condition_code">;
  type RawRow = { condition?: RawCondition | RawCondition[] | null };

  const options = ((data ?? []) as RawRow[]).flatMap((row) => {
    const code = firstRelation(row.condition)?.condition_code ?? null;
    if (!code) return [];
    return [
      {
        value: code,
        label: code,
        searchText: code,
      },
    ];
  });

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
    sortBy: (params.sortBy ?? "activityAt") as PurchaseManagementSortBy,
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
  const [items, containerRows] = await Promise.all([
    loadPurchaseItems(orderIds),
    loadPurchaseContainers(orderIds),
  ]);

  const itemsByOrder = groupPurchaseItemsByOrder(items);
  const firstItems = firstPurchaseItemByOrder(itemsByOrder);
  const containersByOrder = new Map<string, PurchaseOrderContainer[]>();
  for (const container of containerRows.map(mapPurchaseOrderContainer)) {
    const current = containersByOrder.get(container.purchaseOrderId) ?? [];
    current.push(container);
    containersByOrder.set(container.purchaseOrderId, current);
  }

  const mappedRows = baseRows.map((row) =>
    mapPurchaseRow(row, firstItems.get(row.id), containersByOrder.get(row.id) ?? [])
  );
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
    statuses: [
      "DRAFT",
      "SUBMITTED",
      "IN_PRODUCTION",
      "PARTIAL_RELEASED",
      "RELEASED",
      "COMPLETED",
      "CANCELLED",
    ],
  };
}

export async function getPurchaseOrderDetail(id: string): Promise<PurchaseOrderDetail | null> {
  noStore();
  const supabase = createServerSupabaseClient();
  const [orderResult, itemsResult, containersResult, materialTypesResult, financeRecordResult] = await Promise.all([
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
          owner:container_owners!purchase_order_owner_id_fkey(id, container_owner_code, company_name, legal_company_name, uses_internal_container_numbering),
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
          estimated_offline_date,
          offline_date,
          vendor_release_number,
          planned_pod,
          tare_weight,
          maximum_weight,
          payload_weight,
          csc_number,
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
          estimated_offline_date,
          offline_date,
          planned_pod,
          tare_weight,
          maximum_weight,
          payload_weight,
          csc_number,
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
      .eq("purchase_order_id", id)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true }),
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
  if (containersResult.error) throw new Error(containersResult.error.message);
  if (materialTypesResult.error) throw new Error(materialTypesResult.error.message);
  if (financeRecordResult.error) throw new Error(financeRecordResult.error.message);

  const order = orderResult.data as PurchaseOrderRowRaw | null;
  if (!order) return null;

  const containers = (
    ((containersResult.data ?? []) as unknown) as PurchaseOrderContainerRowRaw[]
  ).map(mapPurchaseOrderContainer);
  const items = attachItemCancellationCounts(
    order.purchase_type as PurchaseType,
    (((itemsResult.data ?? []) as unknown) as PurchaseOrderItemDetailRowRaw[]).map(
      mapPurchaseOrderItem
    ),
    containers
  );
  let itemAttachments: PurchaseOrderItemAttachmentRow[] = [];
  const itemIds = items.map((item) => item.id);
  if (itemIds.length > 0) {
    const { data: itemAttachmentRows, error: itemAttachmentsError } = await supabase
      .from("purchase_order_item_attachment_links")
      .select("id, purchase_order_item_id, attachment_type, url, remark, created_at, updated_at")
      .in("purchase_order_item_id", itemIds)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
    if (itemAttachmentsError) throw new Error(itemAttachmentsError.message);
    itemAttachments = (
      ((itemAttachmentRows ?? []) as unknown) as PurchaseOrderItemAttachmentRowRaw[]
    ).map(mapPurchaseOrderItemAttachmentRow);
  }

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
    items,
    containers,
    itemAttachments,
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
  itemId: string,
  page = 1,
  pageSize = 20
): Promise<PurchaseOrderItemContainersDetail | null> {
  noStore();
  const supabase = createServerSupabaseClient();
  const safePageSize = Math.min(100, Math.max(10, Math.floor(pageSize) || 20));
  const safePage = Math.max(1, Math.floor(page) || 1);
  const rangeFrom = (safePage - 1) * safePageSize;
  const rangeTo = rangeFrom + safePageSize - 1;

  const [orderResult, itemResult, containersResult] = await Promise.all([
    supabase
      .from("purchase_order")
      .select("id, order_no, purchase_type")
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
          estimated_offline_date,
          offline_date,
          vendor_release_number,
          planned_pod,
          tare_weight,
          maximum_weight,
          payload_weight,
          csc_number,
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
          estimated_offline_date,
          offline_date,
          planned_pod,
          tare_weight,
          maximum_weight,
          payload_weight,
          csc_number,
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
        `,
        { count: "exact" }
      )
      .eq("purchase_order_id", orderId)
      .eq("purchase_order_item_id", itemId)
      .order("container_number", { ascending: true })
      .range(rangeFrom, rangeTo),
  ]);

  if (orderResult.error) throw new Error(orderResult.error.message);
  if (itemResult.error) throw new Error(itemResult.error.message);
  if (containersResult.error) throw new Error(containersResult.error.message);

  if (!orderResult.data || !itemResult.data) return null;

  const containers = (
    ((containersResult.data ?? []) as unknown) as PurchaseOrderContainerRowRaw[]
  ).map(mapPurchaseOrderContainer);
  const item = attachItemCancellationCounts(
    orderResult.data.purchase_type as PurchaseType,
    [mapPurchaseOrderItem((itemResult.data as unknown) as PurchaseOrderItemDetailRowRaw)],
    containers
  )[0];

  return {
    orderId: orderResult.data.id,
    orderNo: orderResult.data.order_no,
    purchaseType: orderResult.data.purchase_type as PurchaseType,
    item,
    containers,
    page: safePage,
    pageSize: safePageSize,
    totalCount: containersResult.count ?? containers.length,
  };
}

const PURCHASE_ORDER_CONTAINER_SELECT = `
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
  estimated_offline_date,
  offline_date,
  planned_pod,
  tare_weight,
  maximum_weight,
  payload_weight,
  csc_number,
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
`;

export async function getPurchaseOrderEditContainerPage(
  orderId: string,
  itemId: string,
  page: number,
  pageSize: number
): Promise<PurchaseOrderEditContainerPage> {
  noStore();
  const supabase = createServerSupabaseClient();
  const safePage = Math.max(1, Math.floor(page || 1));
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize || 20)));
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  const [countResult, rowsResult] = await Promise.all([
    supabase
      .from("purchase_order_container")
      .select("id", { count: "exact", head: true })
      .eq("purchase_order_id", orderId)
      .eq("purchase_order_item_id", itemId)
      .or("container_status.is.null,container_status.neq.CANCELLED"),
    supabase
      .from("purchase_order_container")
      .select(PURCHASE_ORDER_CONTAINER_SELECT)
      .eq("purchase_order_id", orderId)
      .eq("purchase_order_item_id", itemId)
      .or("container_status.is.null,container_status.neq.CANCELLED")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
  ]);

  if (countResult.error) throw new Error(countResult.error.message);
  if (rowsResult.error) throw new Error(rowsResult.error.message);

  return {
    itemId,
    page: safePage,
    pageSize: safePageSize,
    totalCount: countResult.count ?? 0,
    rows: ((((rowsResult.data ?? []) as unknown) as PurchaseOrderContainerRowRaw[]).map(
      mapPurchaseOrderContainer
    )),
  };
}

export async function getPurchaseOrderEditContainersByNumbers(
  orderId: string,
  itemId: string,
  containerNumbers: string[]
): Promise<PurchaseOrderContainer[]> {
  noStore();
  const supabase = createServerSupabaseClient();
  const normalized = Array.from(
    new Set(
      containerNumbers
        .map((value) => trimOrNull(value)?.toUpperCase() ?? null)
        .filter((value): value is string => Boolean(value))
    )
  );
  if (normalized.length === 0) return [];

  const { data, error } = await supabase
    .from("purchase_order_container")
    .select(PURCHASE_ORDER_CONTAINER_SELECT)
    .eq("purchase_order_id", orderId)
    .eq("purchase_order_item_id", itemId)
    .in("container_number", normalized)
    .or("container_status.is.null,container_status.neq.CANCELLED")
    .order("container_number", { ascending: true });

  if (error) throw new Error(error.message);
  return ((((data ?? []) as unknown) as PurchaseOrderContainerRowRaw[]).map(
    mapPurchaseOrderContainer
  ));
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
      .select("id, container_owner_code, company_name, legal_company_name, uses_internal_container_numbering")
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
      uses_internal_container_numbering: boolean | null;
    }>).map((owner) => ({
      id: owner.id,
      label: [owner.container_owner_code, owner.legal_company_name ?? owner.company_name].filter(Boolean).join(" · "),
      usesInternalContainerNumbering: owner.uses_internal_container_numbering === true,
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

export async function getPurchaseOrderEditForm(id: string): Promise<{
  options: PurchaseDraftFormOptions;
  order: PurchaseOrderDetail;
  editPermissions: PurchaseOrderEditPermissions;
}> {
  const [options, order] = await Promise.all([
    getPurchaseDraftFormOptions(),
    getPurchaseOrderDetail(id),
  ]);

  if (!order) {
    throw new Error("Purchase order not found.");
  }
  const editPermissions = getOrderEditPermissions(order);
  if (editPermissions.canEnterEdit || editPermissions.canEditPlannedPod) {
    return {
      options,
      order: {
        ...order,
        containers: [],
      },
      editPermissions,
    };
  }
  throw new Error(`Purchase order ${order.orderNo} cannot be edited in status ${order.orderStatus}.`);
}

async function validateRalColors(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  values: Array<string | null | undefined>
) {
  const colorValues = Array.from(new Set(values.map((value) => normalizeText(value ?? "")).filter(Boolean)));
  if (colorValues.length === 0) return;
  const { data: validColors, error: colorError } = await supabase
    .from("ral_color_codes")
    .select("color_code")
    .in("color_code", colorValues);
  if (colorError) throw new Error(colorError.message);
  const validColorSet = new Set((validColors ?? []).map((row) => normalizeText(row.color_code)));
  const invalidColor = colorValues.find((value) => !validColorSet.has(normalizeText(value)));
  if (invalidColor) throw new Error(`Invalid RAL color code: ${invalidColor}`);
}

function validateManualContainerNumbers(
  args: {
    purchaseType: PurchaseType;
    usesInternalContainerNumbering: boolean;
    containers: Array<{ containerNumber: string | null | undefined }>;
    requireFactoryContainerNumbersOnSubmit?: boolean;
  }
) {
  if (args.purchaseType === "FACTORY_ORDER" && args.usesInternalContainerNumbering) return;
  const invalidContainer = args.containers.find((container) => {
    const containerNumber = trimOrNull(container.containerNumber);
    if (!containerNumber) return false;
    return !/^[A-Z]{4}\d{7}$/.test(containerNumber.toUpperCase());
  });
  if (invalidContainer?.containerNumber) {
    throw new Error("Container Number must match 4 letters followed by 7 digits.");
  }
  if (args.purchaseType === "FACTORY_ORDER" && args.requireFactoryContainerNumbersOnSubmit) {
    const missingContainer = args.containers.find(
      (container) => !trimOrNull(container.containerNumber)
    );
    if (missingContainer) {
      throw new Error("Container Number is required for factory orders when the owner uses manual numbering.");
    }
  }
}

function buildDefaultContainerDraftForItem(
  item: PurchaseOrderDraftInput["items"][number],
  purchaseType: PurchaseType,
  vendorReleaseDate: string | null
): PurchaseOrderDraftContainerInput {
  return (
    buildDefaultDraftContainersForItem({
      itemKey: item.itemKey,
      item: {
        ...item,
        plannedQty: 1,
      },
      purchaseType,
      vendorReleaseDate,
    })[0] ?? {
      itemKey: item.itemKey,
      containerNumber: null,
      color: item.color ?? null,
      flp: item.flp,
      lbx: item.lbx,
      lockingBarsCount: item.lockingBarsCount,
      ventsCount: item.ventsCount,
      machineType: item.machineType ?? null,
      yom: item.yom ?? null,
      estimatedOfflineDate: purchaseType === "FACTORY_ORDER" ? item.estimatedOfflineDate ?? null : null,
      offlineDate: item.offlineDate ?? null,
      tareWeight: item.tareWeight ?? null,
      maximumWeight: item.maximumWeight ?? null,
      cscNumber: item.cscNumber ?? null,
    }
  );
}

async function resolveOwnerUsesInternalContainerNumbering(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  ownerId: string | null | undefined
) {
  if (!ownerId) return false;
  const { data, error } = await supabase
    .from("container_owners")
    .select("uses_internal_container_numbering")
    .eq("id", ownerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.uses_internal_container_numbering === true;
}

function buildOrderFields(
  input: PurchaseOrderDraftInput,
  orderStatus: PurchaseOrderStatus
) {
  return {
    purchase_type: input.purchaseType,
    supplier_id: input.supplierId,
    owner_id: input.ownerId,
    buyer_id: input.buyerId || null,
    purchase_date: input.purchaseDate,
    estimated_offline_time: shouldShowEstimatedOfflineTime(input.purchaseType)
      ? input.estimatedOfflineTime || null
      : null,
    contract_number: trimOrNull(input.contractNumber),
    invoice_number: trimOrNull(input.invoiceNumber),
    freeday: shouldShowVendorReleaseFields(input.purchaseType) ? input.freeday : null,
    vendor_release_date: shouldShowVendorReleaseFields(input.purchaseType)
      ? input.vendorReleaseDate || null
      : null,
    payment_mode: input.paymentMode,
    remark: trimOrNull(input.remark),
    order_status: orderStatus,
  };
}

async function recalculatePurchaseOrderStatus(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  orderId: string
): Promise<PurchaseOrderStatus> {
  const { data, error } = await supabase.rpc("purchase_recalculate_order_status", {
    p_order_id: orderId,
  });
  if (error) throw new Error(error.message);
  return (data ?? "SUBMITTED") as PurchaseOrderStatus;
}

function buildFinanceFields(input: PurchaseOrderDraftInput) {
  return {
    payment_mode: input.paymentMode,
    payment_account: trimOrNull(input.paymentAccount),
    due_date: input.dueDate || null,
    settlement_payment_term: trimOrNull(input.settlementPaymentTerm),
    settlement_credit_days: input.paymentMode === "CREDIT" ? input.settlementCreditDays : null,
    settlement_credit_limit: input.paymentMode === "CREDIT" ? input.settlementCreditLimit : null,
    settlement_advance_payment_percentage:
      input.paymentMode === "ADVANCE_PAYMENT" ? input.settlementAdvancePaymentPercentage : null,
    settlement_balance_trigger_event: trimOrNull(input.settlementBalanceTriggerEvent),
    settlement_currency: trimOrNull(input.settlementCurrency),
    settlement_prepayment_pool:
      input.paymentMode === "PREPAYMENT" || input.paymentMode === "ADVANCE_PAYMENT"
        ? input.settlementPrepaymentPool
        : null,
    settlement_prepayment_threshold:
      input.paymentMode === "PREPAYMENT" || input.paymentMode === "ADVANCE_PAYMENT"
        ? input.settlementPrepaymentThreshold
        : null,
    settlement_current_prepaid_balance: input.settlementCurrentPrepaidBalance,
    vendor_bank_information: input.vendorBankInformation,
  };
}

function buildItemRowsForInsert(
  orderId: string,
  input: PurchaseOrderDraftInput,
  existingItemsByKey?: Map<string, Pick<PurchaseOrderItem, "financialCost">>
) {
  return input.items.map((item, index) => ({
    purchase_order_id: orderId,
    line_no: index + 1,
    location_city_id: item.locationCityId,
    depot_id: item.depotId,
    container_size_code_id: item.containerSizeCodeId,
    container_type_code_id: item.containerTypeCodeId,
    container_condition_code_id: item.containerConditionCodeId,
    color: trimOrNull(item.color),
    flp: item.flp,
    lbx: item.lbx,
    locking_bars_count: item.lockingBarsCount,
    vents_count: item.ventsCount,
    machine_type: trimOrNull(item.machineType),
    yom: item.yom,
    estimated_offline_date:
      input.purchaseType === "FACTORY_ORDER" ? item.estimatedOfflineDate || null : null,
    offline_date: item.offlineDate || null,
    vendor_release_number:
      shouldShowVendorReleaseFields(input.purchaseType) ? trimOrNull(item.vendorReleaseNumber) : null,
    planned_pod: trimOrNull(item.plannedPod),
    tare_weight: item.tareWeight,
    maximum_weight: item.maximumWeight,
    csc_number: trimOrNull(item.cscNumber),
    planned_qty: item.plannedQty,
    unit_price: item.unitPrice,
    settlement_price: item.unitPrice,
    financial_cost: existingItemsByKey?.get(item.itemKey)?.financialCost ?? null,
    line_amount: computeLineAmount(item.plannedQty, item.unitPrice),
    remark: trimOrNull(item.remark),
  }));
}

type SharedContainerFieldsPayload = {
  location_city_id: string | null;
  depot_id: string | null;
  container_size_code_id: string | null;
  container_type_code_id: string | null;
  container_condition_code_id: string | null;
  color: string | null;
  flp: boolean;
  lbx: boolean;
  locking_bars_count: number | null;
  vents_count: number | null;
  machine_type: string | null;
  yom: number | null;
  estimated_offline_date: string | null;
  offline_date: string | null;
  planned_pod: string | null;
  tare_weight: number | null;
  maximum_weight: number | null;
  csc_number: string | null;
  purchase_price: number | null;
  financial_cost: number | null;
};

function buildSharedContainerFieldsFromItem(args: {
  item: PurchaseOrderDraftInput["items"][number];
  purchaseType: PurchaseType;
  financialCost?: number | null;
}): SharedContainerFieldsPayload {
  return {
    location_city_id: args.item.locationCityId,
    depot_id: args.item.depotId,
    container_size_code_id: args.item.containerSizeCodeId,
    container_type_code_id: args.item.containerTypeCodeId,
    container_condition_code_id: args.item.containerConditionCodeId,
    color: trimOrNull(args.item.color),
    flp: args.item.flp,
    lbx: args.item.lbx,
    locking_bars_count: args.item.lockingBarsCount,
    vents_count: args.item.ventsCount,
    machine_type: trimOrNull(args.item.machineType),
    yom: args.item.yom,
    estimated_offline_date:
      args.purchaseType === "FACTORY_ORDER" ? args.item.estimatedOfflineDate || null : null,
    offline_date: args.item.offlineDate || null,
    planned_pod: trimOrNull(args.item.plannedPod),
    tare_weight: args.item.tareWeight,
    maximum_weight: args.item.maximumWeight,
    csc_number: trimOrNull(args.item.cscNumber),
    purchase_price: args.item.unitPrice,
    financial_cost: args.financialCost ?? null,
  };
}

function getChangedSharedContainerFieldKeys(args: {
  currentItem: PurchaseOrderItem;
  nextItem: PurchaseOrderDraftInput["items"][number];
  purchaseType: PurchaseType;
}) {
  const changed = new Set<keyof SharedContainerFieldsPayload>();
  const nextShared = buildSharedContainerFieldsFromItem({
    item: args.nextItem,
    purchaseType: args.purchaseType,
    financialCost: args.currentItem.financialCost,
  });
  const currentShared: SharedContainerFieldsPayload = {
    location_city_id: args.currentItem.locationCityId,
    depot_id: args.currentItem.depotId,
    container_size_code_id: args.currentItem.containerSizeCodeId,
    container_type_code_id: args.currentItem.containerTypeCodeId,
    container_condition_code_id: args.currentItem.containerConditionCodeId,
    color: trimOrNull(args.currentItem.color),
    flp: args.currentItem.flp,
    lbx: args.currentItem.lbx,
    locking_bars_count: args.currentItem.lockingBarsCount,
    vents_count: args.currentItem.ventsCount,
    machine_type: trimOrNull(args.currentItem.machineType),
    yom: args.currentItem.yom,
    estimated_offline_date:
      args.purchaseType === "FACTORY_ORDER" ? args.currentItem.estimatedOfflineDate : null,
    offline_date: args.currentItem.offlineDate,
    planned_pod: trimOrNull(args.currentItem.plannedPod),
    tare_weight: args.currentItem.tareWeight,
    maximum_weight: args.currentItem.maximumWeight,
    csc_number: trimOrNull(args.currentItem.cscNumber),
    purchase_price: args.currentItem.unitPrice,
    financial_cost: args.currentItem.financialCost,
  };

  (Object.keys(nextShared) as Array<keyof SharedContainerFieldsPayload>).forEach((key) => {
    if (currentShared[key] !== nextShared[key]) {
      changed.add(key);
    }
  });

  return changed;
}

async function syncPlannedPodForContainersByItem(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  itemPlannedPods: Array<{ itemId: string; plannedPod: string | null }>
) {
  for (const row of itemPlannedPods) {
    const { error: containerError } = await supabase
      .from("purchase_order_container")
      .update({ planned_pod: row.plannedPod })
      .eq("purchase_order_item_id", row.itemId);
    if (containerError) throw new Error(containerError.message);
  }
}

function buildItemPlannedPodRows(
  inputItems: PurchaseOrderDraftInput["items"],
  resolvedItemIdsByInputKey: Map<string, string>
) {
  return inputItems.flatMap((item) => {
    const itemId = resolvedItemIdsByInputKey.get(item.itemKey);
    if (!itemId) return [];
    return [{ itemId, plannedPod: trimOrNull(item.plannedPod) }];
  });
}

function normalizeMaterialTypesForComparison(
  materialTypes: Array<{
    materialType: PurchaseMaterialType | "" | null | undefined;
    materialVendorId: string | null | undefined;
  }>
) {
  return materialTypes
    .filter((row) => row.materialType)
    .map((row) => ({
      materialType: row.materialType as PurchaseMaterialType,
      materialVendorId: row.materialVendorId ?? null,
    }))
    .sort((left, right) => left.materialType.localeCompare(right.materialType));
}

function materialTypesChanged(
  purchaseType: PurchaseType,
  nextMaterialTypes: PurchaseOrderDraftInput["materialTypes"],
  currentMaterialTypes: PurchaseOrderDetail["materialTypes"]
) {
  const normalizedNext = normalizeMaterialTypesForComparison(
    sanitizeMaterialTypesForSubmit(purchaseType, nextMaterialTypes)
  );
  const normalizedCurrent = normalizeMaterialTypesForComparison(
    currentMaterialTypes.map((row) => ({
      materialType: row.materialType,
      materialVendorId: row.materialVendorId,
    }))
  );

  return JSON.stringify(normalizedNext) !== JSON.stringify(normalizedCurrent);
}

function getContainerEditsById(input: Pick<PurchaseOrderDraftInput, "containerEdits">) {
  return new Map((input.containerEdits ?? []).map((container) => [container.id, container] as const));
}

function sanitizePurchaseOrderItemAttachments(
  attachments: PurchaseOrderItemAttachmentInput[]
): PurchaseOrderItemAttachmentInput[] {
  return attachments.map((attachment, index) => {
    const purchaseOrderItemId = trimOrNull(attachment.purchaseOrderItemId);
    const attachmentType = attachment.attachmentType;
    const url = attachment.url.trim();
    const remark = trimOrNull(attachment.remark);

    if (!purchaseOrderItemId) {
      throw new Error(`Attachment ${index + 1}: PO Item is required.`);
    }
    if (!attachmentType) {
      throw new Error(`Attachment ${index + 1}: Document Type is required.`);
    }
    if (!url) {
      throw new Error(`Attachment ${index + 1}: Attachment URL is required.`);
    }

    return {
      purchaseOrderItemId,
      attachmentType,
      url,
      remark,
    };
  });
}

function normalizeAttachmentsForComparison(
  attachments: Array<{
    purchaseOrderItemId: string | null;
    attachmentType: string | null | undefined;
    url: string | null | undefined;
    remark: string | null | undefined;
  }>
) {
  return attachments
    .map((attachment) => ({
      purchaseOrderItemId: trimOrNull(attachment.purchaseOrderItemId),
      attachmentType: attachment.attachmentType ?? null,
      url: trimOrNull(attachment.url),
      remark: trimOrNull(attachment.remark),
    }))
    .sort((left, right) =>
      `${left.purchaseOrderItemId ?? ""}|${left.attachmentType ?? ""}|${left.url ?? ""}|${left.remark ?? ""}`.localeCompare(
        `${right.purchaseOrderItemId ?? ""}|${right.attachmentType ?? ""}|${right.url ?? ""}|${right.remark ?? ""}`
      )
    );
}

function itemAttachmentsChanged(
  nextAttachments: PurchaseOrderDraftInput["itemAttachments"],
  currentAttachments: PurchaseOrderDetail["itemAttachments"]
) {
  const normalizedNext = normalizeAttachmentsForComparison(nextAttachments);
  const normalizedCurrent = normalizeAttachmentsForComparison(
    currentAttachments.map((attachment) => ({
      purchaseOrderItemId: attachment.purchaseOrderItemId,
      attachmentType: attachment.attachmentType,
      url: attachment.url,
      remark: attachment.remark,
    }))
  );

  return JSON.stringify(normalizedNext) !== JSON.stringify(normalizedCurrent);
}

async function syncPurchaseOrderItemAttachments(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  orderId: string,
  attachments: PurchaseOrderDraftInput["itemAttachments"],
  resolvedItemIdsByInputKey: Map<string, string>
) {
  const sanitizedAttachments = sanitizePurchaseOrderItemAttachments(attachments);
  const { data: existingItems, error: existingItemsError } = await supabase
    .from("purchase_order_item")
    .select("id")
    .eq("purchase_order_id", orderId);
  if (existingItemsError) throw new Error(existingItemsError.message);

  const existingItemIds = (existingItems ?? []).map((row) => row.id as string);
  if (existingItemIds.length > 0) {
    const { error: deleteAttachmentsError } = await supabase
      .from("purchase_order_item_attachment_links")
      .delete()
      .in("purchase_order_item_id", existingItemIds);
    if (deleteAttachmentsError) throw new Error(deleteAttachmentsError.message);
  }

  if (sanitizedAttachments.length === 0) return;

  const attachmentRows = sanitizedAttachments.map((attachment, index) => {
    const resolvedItemId = resolvedItemIdsByInputKey.get(attachment.purchaseOrderItemId ?? "");
    if (!resolvedItemId) {
      throw new Error(`Attachment ${index + 1}: selected PO Item could not be resolved.`);
    }
    return {
      purchase_order_item_id: resolvedItemId,
      attachment_type: attachment.attachmentType,
      url: attachment.url,
      remark: attachment.remark,
    };
  });

  const { error: insertAttachmentsError } = await supabase
    .from("purchase_order_item_attachment_links")
    .insert(attachmentRows);
  if (insertAttachmentsError) throw new Error(insertAttachmentsError.message);
}

async function replaceOrderItemsAndMaterials(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  orderId: string,
  input: PurchaseOrderDraftInput
) {
  const cleanedMaterialTypes = sanitizeMaterialTypesForSubmit(input.purchaseType, input.materialTypes);
  const { data: existingItems, error: existingItemsError } = await supabase
    .from("purchase_order_item")
    .select("id, financial_cost")
    .eq("purchase_order_id", orderId);
  if (existingItemsError) throw new Error(existingItemsError.message);
  const existingItemsByKey = new Map(
    (existingItems ?? []).map((item) => [
      item.id,
      {
        financialCost: item.financial_cost,
      },
    ])
  );

  const { error: deleteMaterialsError } = await supabase
    .from("purchase_order_material_type")
    .delete()
    .eq("purchase_order_id", orderId);
  if (deleteMaterialsError) throw new Error(deleteMaterialsError.message);

  const { error: deleteItemsError } = await supabase
    .from("purchase_order_item")
    .delete()
    .eq("purchase_order_id", orderId);
  if (deleteItemsError) throw new Error(deleteItemsError.message);

  const itemRows = buildItemRowsForInsert(orderId, input, existingItemsByKey);
  const { data: insertedItems, error: itemsError } = await supabase
    .from("purchase_order_item")
    .insert(itemRows)
    .select(
      "id, line_no, location_city_id, depot_id, container_size_code_id, container_type_code_id, container_condition_code_id, unit_price, financial_cost"
    );
  if (itemsError) throw new Error(itemsError.message);

  if (shouldShowMaterialTypes(input.purchaseType)) {
    const { error: materialTypesError } = await supabase
      .from("purchase_order_material_type")
      .insert(
        cleanedMaterialTypes.map((row) => ({
          purchase_order_id: orderId,
          material_type: row.materialType,
          material_vendor_id: row.materialVendorId,
        }))
      );
    if (materialTypesError) throw new Error(materialTypesError.message);
  }

  return new Map(
    input.items.map((item, index) => [
      item.itemKey,
      (insertedItems ?? []).find((row) => row.line_no === index + 1),
    ])
  );
}

function buildContainerPayloadForSubmit(args: {
  input: PurchaseOrderDraftInput;
  orderId: string;
  vendorReleaseDate: string | null;
  usesInternalContainerNumbering: boolean;
  itemByKey: Map<string, {
    id: string;
    location_city_id: string | null;
    depot_id: string | null;
    container_size_code_id: string | null;
    container_type_code_id: string | null;
    container_condition_code_id: string | null;
    unit_price: number | null;
    financial_cost: number | null;
    line_no?: number;
  } | undefined>;
}) {
  return args.input.containers.map((container) => {
    const itemRow = args.itemByKey.get(container.itemKey);
    const itemInput = args.input.items.find((item) => item.itemKey === container.itemKey);
    if (!itemRow?.id) {
      throw new Error(`Container row could not resolve purchase item for key ${container.itemKey}.`);
    }
    if (!itemInput) {
      throw new Error(`Container row could not resolve item input for key ${container.itemKey}.`);
    }

    const sharedFields = buildSharedContainerFieldsFromItem({
      item: itemInput,
      purchaseType: args.input.purchaseType,
      financialCost: itemRow.financial_cost,
    });

    return {
      purchase_order_item_id: itemRow.id,
      ...sharedFields,
      container_number:
        args.input.purchaseType === "FACTORY_ORDER" && args.usesInternalContainerNumbering
          ? null
          : trimOrNull(container.containerNumber),
    };
  });
}

function resolvePurchaseContainerStatuses(args: {
  purchaseType: PurchaseType;
  usesInternalContainerNumbering: boolean;
  offlineDate: string | null | undefined;
  containerNumber: string | null | undefined;
}) {
  const containerStatus =
    args.purchaseType === "FACTORY_ORDER"
      ? args.offlineDate
        ? "IN_YARD"
        : "PURCHASED"
      : trimOrNull(args.containerNumber)
        ? "IN_YARD"
        : "PURCHASED";

  return {
    containerStatus,
    itemStatus: containerStatus === "IN_YARD" ? "INBOUND" : "BOX_NO_ASSIGNED",
  } as const;
}

function ensureFactoryProgressEditPayloadAllowed(
  currentOrder: PurchaseOrderDetail,
  input: PurchaseOrderDraftInput
) {
  if (input.purchaseType !== currentOrder.purchaseType) {
    throw new Error("Purchase Type cannot be changed in the current order status.");
  }
  if (input.supplierId !== currentOrder.supplierId) {
    throw new Error("Supplier cannot be changed in the current order status.");
  }
  if (input.ownerId !== currentOrder.ownerId) {
    throw new Error("Owner cannot be changed in the current order status.");
  }
  if (input.buyerId !== currentOrder.buyerId) {
    throw new Error("Buyer cannot be changed in the current order status.");
  }
  if (input.purchaseDate !== currentOrder.purchaseDate) {
    throw new Error("Purchase Date cannot be changed in the current order status.");
  }
  if (input.estimatedOfflineTime !== currentOrder.estimatedOfflineTime) {
    throw new Error("Estimated Offline Date cannot be changed in the current order status.");
  }
  if (trimOrNull(input.contractNumber) !== trimOrNull(currentOrder.contractNumber)) {
    throw new Error("Contract Number cannot be changed in the current order status.");
  }
  if (trimOrNull(input.invoiceNumber) !== trimOrNull(currentOrder.invoiceNumber)) {
    throw new Error("Invoice Number cannot be changed in the current order status.");
  }
  if (input.freeday !== currentOrder.freeday) {
    throw new Error("Freeday cannot be changed in the current order status.");
  }
  if (input.vendorReleaseDate !== currentOrder.vendorReleaseDate) {
    throw new Error("Vendor Release Date cannot be changed in the current order status.");
  }
  if (trimOrNull(input.remark) !== trimOrNull(currentOrder.remark)) {
    throw new Error("Remark cannot be changed in the current order status.");
  }
  if (input.paymentMode !== currentOrder.paymentMode) {
    throw new Error("Payment Mode cannot be changed in the current order status.");
  }
  if (trimOrNull(input.paymentAccount) !== trimOrNull(currentOrder.paymentAccount)) {
    throw new Error("Payment Account cannot be changed in the current order status.");
  }
  if (input.dueDate !== currentOrder.dueDate) {
    throw new Error("Due Date cannot be changed in the current order status.");
  }
  if (trimOrNull(input.settlementPaymentTerm) !== trimOrNull(currentOrder.settlementPaymentTerm)) {
    throw new Error("Settlement Payment Term cannot be changed in the current order status.");
  }
  if (input.settlementCreditDays !== currentOrder.settlementCreditDays) {
    throw new Error("Settlement Credit Days cannot be changed in the current order status.");
  }
  if (input.settlementCreditLimit !== currentOrder.settlementCreditLimit) {
    throw new Error("Settlement Credit Limit cannot be changed in the current order status.");
  }
  if (
    input.settlementAdvancePaymentPercentage !== currentOrder.settlementAdvancePaymentPercentage
  ) {
    throw new Error("Advance Payment Percentage cannot be changed in the current order status.");
  }
  if (
    trimOrNull(input.settlementBalanceTriggerEvent) !==
    trimOrNull(currentOrder.settlementBalanceTriggerEvent)
  ) {
    throw new Error("Balance Trigger Event cannot be changed in the current order status.");
  }
  if (trimOrNull(input.settlementCurrency) !== trimOrNull(currentOrder.settlementCurrency)) {
    throw new Error("Settlement Currency cannot be changed in the current order status.");
  }
  if (input.settlementPrepaymentPool !== currentOrder.settlementPrepaymentPool) {
    throw new Error("Prepayment Pool cannot be changed in the current order status.");
  }
  if (input.settlementPrepaymentThreshold !== currentOrder.settlementPrepaymentThreshold) {
    throw new Error("Prepayment Threshold cannot be changed in the current order status.");
  }
  if (
    input.settlementCurrentPrepaidBalance !== currentOrder.settlementCurrentPrepaidBalance
  ) {
    throw new Error("Current Prepaid Balance cannot be changed in the current order status.");
  }
  if (
    JSON.stringify(input.vendorBankInformation ?? null) !==
    JSON.stringify(currentOrder.vendorBankInformation ?? null)
  ) {
    throw new Error("Vendor bank information cannot be changed in the current order status.");
  }
  if (materialTypesChanged(input.purchaseType, input.materialTypes, currentOrder.materialTypes)) {
    throw new Error("Material Vendors cannot be changed in the current order status.");
  }
  if (itemAttachmentsChanged(input.itemAttachments, currentOrder.itemAttachments)) {
    throw new Error("Attachments cannot be changed in the current order status.");
  }
  if (input.items.length !== currentOrder.items.length) {
    throw new Error("Purchase items cannot be restructured in the current order status.");
  }

  for (let index = 0; index < currentOrder.items.length; index += 1) {
    const currentItem = currentOrder.items[index];
    const nextItem = input.items[index];
    if (!currentItem || !nextItem || nextItem.itemKey !== currentItem.id) {
      throw new Error("Purchase items cannot be restructured in the current order status.");
    }
    if (nextItem.locationCityId !== currentItem.locationCityId) {
      throw new Error("Location cannot be changed in the current order status.");
    }
    if (nextItem.depotId !== currentItem.depotId) {
      throw new Error("Depot cannot be changed in the current order status.");
    }
    if (nextItem.containerSizeCodeId !== currentItem.containerSizeCodeId) {
      throw new Error("Size/Type cannot be changed in the current order status.");
    }
    if (nextItem.containerTypeCodeId !== currentItem.containerTypeCodeId) {
      throw new Error("Size/Type cannot be changed in the current order status.");
    }
    if (nextItem.containerConditionCodeId !== currentItem.containerConditionCodeId) {
      throw new Error("Condition cannot be changed in the current order status.");
    }
    if (trimOrNull(nextItem.color) !== trimOrNull(currentItem.color)) {
      throw new Error("Color cannot be changed in the current order status.");
    }
    if (nextItem.flp !== currentItem.flp) {
      throw new Error("FLP cannot be changed in the current order status.");
    }
    if (nextItem.lbx !== currentItem.lbx) {
      throw new Error("LBX cannot be changed in the current order status.");
    }
    if (nextItem.lockingBarsCount !== currentItem.lockingBarsCount) {
      throw new Error("Locking Bars cannot be changed in the current order status.");
    }
    if (nextItem.ventsCount !== currentItem.ventsCount) {
      throw new Error("Vents cannot be changed in the current order status.");
    }
    if (trimOrNull(nextItem.machineType) !== trimOrNull(currentItem.machineType)) {
      throw new Error("Machine Type cannot be changed in the current order status.");
    }
    if (nextItem.yom !== currentItem.yom) {
      throw new Error("YOM cannot be changed in the current order status.");
    }
    if (nextItem.plannedQty !== currentItem.plannedQty) {
      throw new Error("Planned Qty cannot be changed in the current order status.");
    }
    if (nextItem.unitPrice !== currentItem.unitPrice) {
      throw new Error("Unit Price cannot be changed in the current order status.");
    }
    if (trimOrNull(nextItem.remark) !== trimOrNull(currentItem.remark)) {
      throw new Error("Item remark cannot be changed in the current order status.");
    }
  }

  if ((input.newContainers?.length ?? 0) > 0) {
    throw new Error("Container rows cannot be restructured in the current order status.");
  }

  const currentContainersByItem = new Map<string, PurchaseOrderContainer[]>();
  for (const container of currentOrder.containers) {
    const key = container.purchaseOrderItemId ?? "";
    const bucket = currentContainersByItem.get(key) ?? [];
    bucket.push(container);
    currentContainersByItem.set(key, bucket);
  }
  const containerEditsById = getContainerEditsById(input);

  for (let index = 0; index < currentOrder.items.length; index += 1) {
    const currentItem = currentOrder.items[index];
    const nextItem = input.items[index];
    if (!currentItem || !nextItem) continue;
    const currentContainers = currentContainersByItem.get(currentItem.id) ?? [];
    for (let containerIndex = 0; containerIndex < currentContainers.length; containerIndex += 1) {
      const currentContainer = currentContainers[containerIndex];
      if (!currentContainer) {
        throw new Error("Container rows cannot be restructured in the current order status.");
      }
      const nextContainer = containerEditsById.get(currentContainer.id);
      if (!nextContainer) {
        continue;
      }
      if (
        "containerNumber" in nextContainer &&
        trimOrNull(nextContainer.containerNumber) !== trimOrNull(currentContainer.containerNumber)
      ) {
        throw new Error("Container Number cannot be changed in the current order status.");
      }
      if (
        "machineType" in nextContainer &&
        trimOrNull(nextContainer.machineType) !== trimOrNull(currentContainer.machineType)
      ) {
        throw new Error("Container Machine Type cannot be changed in the current order status.");
      }
      if ("yom" in nextContainer && nextContainer.yom !== currentContainer.yom) {
        throw new Error("Container YOM cannot be changed in the current order status.");
      }
    }
  }
}

function ensurePlannedPodOnlyPayloadAllowed(
  currentOrder: PurchaseOrderDetail,
  input: PurchaseOrderDraftInput
) {
  if (input.purchaseType !== currentOrder.purchaseType) {
    throw new Error("Purchase Type cannot be changed in the current order status.");
  }
  if (input.supplierId !== currentOrder.supplierId) {
    throw new Error("Supplier cannot be changed in the current order status.");
  }
  if (input.ownerId !== currentOrder.ownerId) {
    throw new Error("Owner cannot be changed in the current order status.");
  }
  if (input.buyerId !== currentOrder.buyerId) {
    throw new Error("Buyer cannot be changed in the current order status.");
  }
  if (input.purchaseDate !== currentOrder.purchaseDate) {
    throw new Error("Purchase Date cannot be changed in the current order status.");
  }
  if (input.estimatedOfflineTime !== currentOrder.estimatedOfflineTime) {
    throw new Error("Estimated Offline Date cannot be changed in the current order status.");
  }
  if (trimOrNull(input.contractNumber) !== trimOrNull(currentOrder.contractNumber)) {
    throw new Error("Contract Number cannot be changed in the current order status.");
  }
  if (trimOrNull(input.invoiceNumber) !== trimOrNull(currentOrder.invoiceNumber)) {
    throw new Error("Invoice Number cannot be changed in the current order status.");
  }
  if (input.freeday !== currentOrder.freeday) {
    throw new Error("Freeday cannot be changed in the current order status.");
  }
  if (input.vendorReleaseDate !== currentOrder.vendorReleaseDate) {
    throw new Error("Vendor Release Date cannot be changed in the current order status.");
  }
  if (trimOrNull(input.remark) !== trimOrNull(currentOrder.remark)) {
    throw new Error("Remark cannot be changed in the current order status.");
  }
  if (input.paymentMode !== currentOrder.paymentMode) {
    throw new Error("Payment Mode cannot be changed in the current order status.");
  }
  if (trimOrNull(input.paymentAccount) !== trimOrNull(currentOrder.paymentAccount)) {
    throw new Error("Payment Account cannot be changed in the current order status.");
  }
  if (input.dueDate !== currentOrder.dueDate) {
    throw new Error("Due Date cannot be changed in the current order status.");
  }
  if (trimOrNull(input.settlementPaymentTerm) !== trimOrNull(currentOrder.settlementPaymentTerm)) {
    throw new Error("Settlement Payment Term cannot be changed in the current order status.");
  }
  if (input.settlementCreditDays !== currentOrder.settlementCreditDays) {
    throw new Error("Settlement Credit Days cannot be changed in the current order status.");
  }
  if (input.settlementCreditLimit !== currentOrder.settlementCreditLimit) {
    throw new Error("Settlement Credit Limit cannot be changed in the current order status.");
  }
  if (
    input.settlementAdvancePaymentPercentage !== currentOrder.settlementAdvancePaymentPercentage
  ) {
    throw new Error("Advance Payment Percentage cannot be changed in the current order status.");
  }
  if (
    trimOrNull(input.settlementBalanceTriggerEvent) !==
    trimOrNull(currentOrder.settlementBalanceTriggerEvent)
  ) {
    throw new Error("Balance Trigger Event cannot be changed in the current order status.");
  }
  if (trimOrNull(input.settlementCurrency) !== trimOrNull(currentOrder.settlementCurrency)) {
    throw new Error("Settlement Currency cannot be changed in the current order status.");
  }
  if (input.settlementPrepaymentPool !== currentOrder.settlementPrepaymentPool) {
    throw new Error("Prepayment Pool cannot be changed in the current order status.");
  }
  if (input.settlementPrepaymentThreshold !== currentOrder.settlementPrepaymentThreshold) {
    throw new Error("Prepayment Threshold cannot be changed in the current order status.");
  }
  if (
    input.settlementCurrentPrepaidBalance !== currentOrder.settlementCurrentPrepaidBalance
  ) {
    throw new Error("Current Prepaid Balance cannot be changed in the current order status.");
  }
  if (
    JSON.stringify(input.vendorBankInformation ?? null) !==
    JSON.stringify(currentOrder.vendorBankInformation ?? null)
  ) {
    throw new Error("Vendor bank information cannot be changed in the current order status.");
  }
  if (materialTypesChanged(input.purchaseType, input.materialTypes, currentOrder.materialTypes)) {
    throw new Error("Material Vendors cannot be changed in the current order status.");
  }
  if (itemAttachmentsChanged(input.itemAttachments, currentOrder.itemAttachments)) {
    throw new Error("Attachments cannot be changed in the current order status.");
  }
  if (input.items.length !== currentOrder.items.length) {
    throw new Error("Purchase items cannot be changed in the current order status.");
  }

  if ((input.newContainers?.length ?? 0) > 0) {
    throw new Error("Container rows cannot be restructured in the current order status.");
  }

  for (let index = 0; index < currentOrder.items.length; index += 1) {
    const currentItem = currentOrder.items[index];
    const nextItem = input.items[index];
    if (!currentItem || !nextItem || nextItem.itemKey !== currentItem.id) {
      throw new Error("Purchase items cannot be changed in the current order status.");
    }

    if (
      currentItem.locationCityId !== nextItem.locationCityId ||
      currentItem.depotId !== nextItem.depotId ||
      currentItem.containerSizeCodeId !== nextItem.containerSizeCodeId ||
      currentItem.containerTypeCodeId !== nextItem.containerTypeCodeId ||
      currentItem.containerConditionCodeId !== nextItem.containerConditionCodeId ||
      trimOrNull(currentItem.color) !== trimOrNull(nextItem.color) ||
      currentItem.flp !== nextItem.flp ||
      currentItem.lbx !== nextItem.lbx ||
      currentItem.lockingBarsCount !== nextItem.lockingBarsCount ||
      currentItem.ventsCount !== nextItem.ventsCount ||
      trimOrNull(currentItem.machineType) !== trimOrNull(nextItem.machineType) ||
      currentItem.yom !== nextItem.yom ||
      currentItem.estimatedOfflineDate !== nextItem.estimatedOfflineDate ||
      currentItem.offlineDate !== nextItem.offlineDate ||
      trimOrNull(currentItem.vendorReleaseNumber) !== trimOrNull(nextItem.vendorReleaseNumber) ||
      currentItem.tareWeight !== nextItem.tareWeight ||
      currentItem.maximumWeight !== nextItem.maximumWeight ||
      trimOrNull(currentItem.cscNumber) !== trimOrNull(nextItem.cscNumber) ||
      currentItem.plannedQty !== nextItem.plannedQty ||
      currentItem.unitPrice !== nextItem.unitPrice ||
      trimOrNull(currentItem.remark) !== trimOrNull(nextItem.remark) ||
      (nextItem.cancelQty ?? 0) !== 0
    ) {
      throw new Error("Only Planned POD can be changed in the current order status.");
    }
  }
}

function ensurePendingEditPayloadMatchesCurrent(
  currentOrder: PurchaseOrderDetail,
  input: PurchaseOrderDraftInput
) {
  if (input.purchaseType !== currentOrder.purchaseType) {
    throw new Error("Purchase Type cannot be changed for submitted purchase orders.");
  }
  if (input.supplierId !== currentOrder.supplierId) {
    throw new Error("Supplier cannot be changed for submitted purchase orders.");
  }
  if (input.ownerId !== currentOrder.ownerId) {
    throw new Error("Owner cannot be changed for submitted purchase orders.");
  }
  if (input.buyerId !== currentOrder.buyerId) {
    throw new Error("Buyer cannot be changed for submitted purchase orders.");
  }
  if (input.items.length !== currentOrder.items.length) {
    throw new Error("Purchase items cannot be restructured for submitted purchase orders.");
  }

  for (let index = 0; index < currentOrder.items.length; index += 1) {
    const currentItem = currentOrder.items[index];
    const nextItem = input.items[index];
    if (!nextItem) throw new Error("Purchase items cannot be restructured for submitted purchase orders.");
    if (
      currentItem.locationCityId !== nextItem.locationCityId ||
      currentItem.depotId !== nextItem.depotId ||
      currentItem.containerConditionCodeId !== nextItem.containerConditionCodeId
    ) {
      throw new Error("Location, Depot, and Condition cannot be changed for submitted purchase orders.");
    }
  }
}

function revalidatePurchasePaths(orderId: string) {
  revalidatePath("/purchase/po-management");
  revalidatePath(`/purchase/po-management/${orderId}`);
  revalidatePath(`/purchase/po-management/${orderId}/edit`);
  revalidatePath("/purchase");
}

export async function createPurchaseOrderDraft(input: PurchaseOrderDraftInput): Promise<{
  orderId: string;
  orderNo: string;
}> {
  const supabase = createServerSupabaseClient();
  const usesInternalContainerNumbering = await resolveOwnerUsesInternalContainerNumbering(
    supabase,
    input.ownerId
  );
  validateManualContainerNumbers({
    purchaseType: input.purchaseType,
    usesInternalContainerNumbering,
    containers: input.containers,
  });

  if (!input.orderNo?.trim()) {
    throw new Error("PO Number is required.");
  }
  if (!input.purchaseType) {
    throw new Error("Purchase Type is required.");
  }
  if (input.items.length === 0) {
    throw new Error("At least one purchase item is required.");
  }

  const cleanedMaterialTypes = sanitizeMaterialTypesForSubmit(input.purchaseType, input.materialTypes);

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

  let resolvedOrderNo = input.orderNo.trim();

  const { data: existingOrderCheck, error: existingOrderCheckError } = await supabase
    .from("purchase_order")
    .select("order_no")
    .eq("order_no", resolvedOrderNo)
    .maybeSingle();
  if (existingOrderCheckError) throw new Error(existingOrderCheckError.message);

  if (existingOrderCheck) {
    let supplierCode: string | null = null;
    let supplierName: string | null = null;

    if (input.supplierId) {
      const { data: supplierRow, error: supplierError } = await supabase
        .from("vendors")
        .select("vendor_code, legal_company_name, company_name")
        .eq("id", input.supplierId)
        .maybeSingle();
      if (supplierError) throw new Error(supplierError.message);
      supplierCode = supplierRow?.vendor_code ?? null;
      supplierName = supplierRow?.legal_company_name ?? supplierRow?.company_name ?? null;
    }

    const abbreviationSource = supplierName || supplierCode;
    const prefixCandidate = generatePurchaseOrderNumber({
      supplierName: abbreviationSource,
      supplierCode: supplierCode,
      purchaseDate: input.purchaseDate,
      sequence: 1,
    }).slice(0, -1);

    const { data: existingOrderNumbers, error: existingOrderNumbersError } = await supabase
      .from("purchase_order")
      .select("order_no")
      .or(`order_no.like.${prefixCandidate}%,order_no.like.PO-${prefixCandidate.slice(2)}%`);
    if (existingOrderNumbersError) throw new Error(existingOrderNumbersError.message);

    const nextSequence = getNextPurchaseOrderSequence({
      existingOrderNumbers: (existingOrderNumbers ?? []).map((row) => row.order_no),
      supplierName: abbreviationSource,
      supplierCode,
      purchaseDate: input.purchaseDate,
    });

    resolvedOrderNo = generatePurchaseOrderNumber({
      supplierName: abbreviationSource,
      supplierCode,
      purchaseDate: input.purchaseDate,
      sequence: nextSequence,
    });
  }

  const sanitizedOrderInput = {
    order_no: resolvedOrderNo,
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
    planned_pod: trimOrNull(item.plannedPod),
    tare_weight: item.tareWeight,
    maximum_weight: item.maximumWeight,
    csc_number: trimOrNull(item.cscNumber),
    planned_qty: item.plannedQty,
    unit_price: item.unitPrice,
    settlement_price: item.unitPrice,
    financial_cost: null,
    line_amount: computeLineAmount(item.plannedQty, item.unitPrice),
    remark: item.remark?.trim() || null,
  }));

  const { data: insertedItems, error: itemsError } = await supabase
    .from("purchase_order_item")
    .insert(itemRows)
    .select("id, line_no");
  if (itemsError) throw new Error(itemsError.message);

  const resolvedItemIdsByInputKey = new Map(
    input.items.flatMap((item, index) => {
      const resolvedItemId = (insertedItems ?? []).find((row) => row.line_no === index + 1)?.id;
      return resolvedItemId ? [[item.itemKey, resolvedItemId] as const] : [];
    })
  );

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

  await syncPurchaseOrderItemAttachments(
    supabase,
    orderRow.id,
    input.itemAttachments,
    resolvedItemIdsByInputKey
  );

  revalidatePath("/purchase/po-management");
  revalidatePath(`/purchase/po-management/${orderRow.id}`);
  revalidatePath("/purchase");

  return {
    orderId: orderRow.id,
    orderNo: orderRow.order_no,
  };
}

function trimOrNull(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function validateSubmitRequiredFields(input: PurchaseOrderDraftInput) {
  if (!input.purchaseType) throw new Error("Purchase Type is required for submit.");
  if (!input.supplierId) throw new Error("Supplier is required for submit.");
  if (!input.ownerId) throw new Error("Owner is required for submit.");
  if (!input.buyerId) throw new Error("Buyer is required for submit.");
  if (!input.purchaseDate) throw new Error("Purchase Date is required for submit.");
  if (!input.paymentMode) throw new Error("Payment Mode is required for submit.");
  if (input.items.length === 0) throw new Error("At least one purchase item is required.");

  input.items.forEach((item, index) => {
    const line = index + 1;
    if (!item.locationCityId) throw new Error(`Item ${line}: Location is required for submit.`);
    if (!item.depotId) throw new Error(`Item ${line}: Depot is required for submit.`);
    if (!item.containerSizeCodeId || !item.containerTypeCodeId) {
      throw new Error(`Item ${line}: Size/Type is required for submit.`);
    }
    if (!item.containerConditionCodeId) {
      throw new Error(`Item ${line}: Condition is required for submit.`);
    }
    if (item.unitPrice == null) throw new Error(`Item ${line}: Unit Price is required for submit.`);
    if (!Number.isFinite(item.plannedQty) || item.plannedQty <= 0) {
      throw new Error(`Item ${line}: Planned Qty must be greater than 0.`);
    }

    if (
      input.purchaseType === "FACTORY_ORDER" ||
      input.purchaseType === "NEW_CONTAINER"
    ) {
      if (!trimOrNull(item.color)) throw new Error(`Item ${line}: Color is required for submit.`);
      if (!item.flp) throw new Error(`Item ${line}: FLP is required for submit.`);
      if (!item.lbx) throw new Error(`Item ${line}: LBX is required for submit.`);
      if (item.lockingBarsCount == null) {
        throw new Error(`Item ${line}: Locking Bars is required for submit.`);
      }
      if (item.ventsCount == null) throw new Error(`Item ${line}: Vents is required for submit.`);
    }
  });

  if (input.purchaseType === "FACTORY_ORDER") {
    const unresolved = sanitizeMaterialTypesForSubmit(input.purchaseType, input.materialTypes).find(
      (row) => !row.materialVendorId
    );
    if (unresolved) {
      throw new Error(`Material Vendor is required for material type ${unresolved.materialType}.`);
    }
  }
}

async function resolveUniqueOrderNo(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  input: PurchaseOrderDraftInput
) {
  let resolvedOrderNo = input.orderNo.trim();

  const { data: existingOrderCheck, error: existingOrderCheckError } = await supabase
    .from("purchase_order")
    .select("order_no")
    .eq("order_no", resolvedOrderNo)
    .maybeSingle();
  if (existingOrderCheckError) throw new Error(existingOrderCheckError.message);

  if (!existingOrderCheck) return resolvedOrderNo;

  let supplierCode: string | null = null;
  let supplierName: string | null = null;

  if (input.supplierId) {
    const { data: supplierRow, error: supplierError } = await supabase
      .from("vendors")
      .select("vendor_code, legal_company_name, company_name")
      .eq("id", input.supplierId)
      .maybeSingle();
    if (supplierError) throw new Error(supplierError.message);
    supplierCode = supplierRow?.vendor_code ?? null;
    supplierName = supplierRow?.legal_company_name ?? supplierRow?.company_name ?? null;
  }

  const abbreviationSource = supplierName || supplierCode;
  const prefixCandidate = generatePurchaseOrderNumber({
    supplierName: abbreviationSource,
    supplierCode,
    purchaseDate: input.purchaseDate,
    sequence: 1,
  }).slice(0, -1);

  const { data: existingOrderNumbers, error: existingOrderNumbersError } = await supabase
    .from("purchase_order")
    .select("order_no")
    .or(`order_no.like.${prefixCandidate}%,order_no.like.PO-${prefixCandidate.slice(2)}%`);
  if (existingOrderNumbersError) throw new Error(existingOrderNumbersError.message);

  const nextSequence = getNextPurchaseOrderSequence({
    existingOrderNumbers: (existingOrderNumbers ?? []).map((row) => row.order_no),
    supplierName: abbreviationSource,
    supplierCode,
    purchaseDate: input.purchaseDate,
  });

  return generatePurchaseOrderNumber({
    supplierName: abbreviationSource,
    supplierCode,
    purchaseDate: input.purchaseDate,
    sequence: nextSequence,
  });
}

export async function createPurchaseOrderSubmit(input: PurchaseOrderDraftInput): Promise<{
  orderId: string;
  orderNo: string;
  orderStatus: PurchaseOrderStatus;
}> {
  const supabase = createServerSupabaseClient();
  const usesInternalContainerNumbering = await resolveOwnerUsesInternalContainerNumbering(
    supabase,
    input.ownerId
  );
  validateManualContainerNumbers({
    purchaseType: input.purchaseType,
    usesInternalContainerNumbering,
    containers: input.containers,
    requireFactoryContainerNumbersOnSubmit: true,
  });

  if (!input.orderNo?.trim()) {
    throw new Error("PO Number is required.");
  }

  validateSubmitRequiredFields(input);

  const cleanedMaterialTypes = sanitizeMaterialTypesForSubmit(
    input.purchaseType,
    input.materialTypes
  );

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
    if (invalidColor) throw new Error(`Invalid RAL color code: ${invalidColor}`);
  }

  const containerCounts = new Map<string, number>();
  for (const row of input.containers) {
    containerCounts.set(row.itemKey, (containerCounts.get(row.itemKey) ?? 0) + 1);
  }
  for (const item of input.items) {
    const expected = Math.max(0, Math.floor(item.plannedQty ?? 0));
    const actual = containerCounts.get(item.itemKey) ?? 0;
    if (expected !== actual) {
      throw new Error(`Item ${item.itemKey}: container count must equal Planned Qty (${expected}).`);
    }
  }

  let orderIdForCleanup: string | null = null;
  try {
    const resolvedOrderNo = await resolveUniqueOrderNo(supabase, input);

    const sanitizedOrderInput = {
      order_no: resolvedOrderNo,
      purchase_type: input.purchaseType,
      supplier_id: input.supplierId,
      owner_id: input.ownerId,
      buyer_id: input.buyerId || null,
      purchase_date: input.purchaseDate,
      estimated_offline_time: shouldShowEstimatedOfflineTime(input.purchaseType)
        ? input.estimatedOfflineTime || null
        : null,
      contract_number: trimOrNull(input.contractNumber),
      invoice_number: trimOrNull(input.invoiceNumber),
      freeday: shouldShowVendorReleaseFields(input.purchaseType) ? input.freeday : null,
      vendor_release_date: shouldShowVendorReleaseFields(input.purchaseType)
        ? input.vendorReleaseDate || null
        : null,
      payment_mode: input.paymentMode,
      remark: trimOrNull(input.remark),
      order_status: "DRAFT" as const,
    };

    const { data: orderRow, error: orderError } = await supabase
      .from("purchase_order")
      .insert(sanitizedOrderInput)
      .select("id, order_no, vendor_release_date")
      .single();
    if (orderError) throw new Error(orderError.message);
    orderIdForCleanup = orderRow.id;

    const financeUpdate = {
      payment_mode: input.paymentMode,
      payment_account: trimOrNull(input.paymentAccount),
      due_date: input.dueDate || null,
      settlement_payment_term: trimOrNull(input.settlementPaymentTerm),
      settlement_credit_days: input.paymentMode === "CREDIT" ? input.settlementCreditDays : null,
      settlement_credit_limit: input.paymentMode === "CREDIT" ? input.settlementCreditLimit : null,
      settlement_advance_payment_percentage:
        input.paymentMode === "ADVANCE_PAYMENT"
          ? input.settlementAdvancePaymentPercentage
          : null,
      settlement_balance_trigger_event: trimOrNull(input.settlementBalanceTriggerEvent),
      settlement_currency: trimOrNull(input.settlementCurrency),
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
      color: trimOrNull(item.color),
      flp: item.flp,
      lbx: item.lbx,
      locking_bars_count: item.lockingBarsCount,
      vents_count: item.ventsCount,
      machine_type: trimOrNull(item.machineType),
      yom: item.yom,
      estimated_offline_date:
        input.purchaseType === "FACTORY_ORDER" ? item.estimatedOfflineDate || null : null,
      offline_date: item.offlineDate || null,
      vendor_release_number:
        shouldShowVendorReleaseFields(input.purchaseType) ? trimOrNull(item.vendorReleaseNumber) : null,
      planned_pod: trimOrNull(item.plannedPod),
      tare_weight: item.tareWeight,
      maximum_weight: item.maximumWeight,
      csc_number: trimOrNull(item.cscNumber),
      planned_qty: item.plannedQty,
      unit_price: item.unitPrice,
      settlement_price: item.unitPrice,
      financial_cost: null,
      line_amount: computeLineAmount(item.plannedQty, item.unitPrice),
      remark: trimOrNull(item.remark),
    }));

    const { data: insertedItems, error: itemsError } = await supabase
      .from("purchase_order_item")
      .insert(itemRows)
      .select(
        "id, line_no, location_city_id, depot_id, container_size_code_id, container_type_code_id, container_condition_code_id, unit_price, financial_cost"
      );
    if (itemsError) throw new Error(itemsError.message);

    const itemByLineNo = new Map(
      (insertedItems ?? []).map((row) => [row.line_no as number, row])
    );
    const itemByKey = new Map(
      input.items.map((item, index) => [item.itemKey, itemByLineNo.get(index + 1)])
    );

    await syncPurchaseOrderItemAttachments(
      supabase,
      orderRow.id,
      input.itemAttachments,
      new Map(
        input.items.flatMap((item, index) => {
          const resolvedItem = itemByLineNo.get(index + 1);
          return resolvedItem?.id ? [[item.itemKey, resolvedItem.id] as const] : [];
        })
      )
    );

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

    const containerPayload = input.containers.map((container) => {
      const itemRow = itemByKey.get(container.itemKey);
      if (!itemRow?.id) {
        throw new Error(`Container row could not resolve purchase item for key ${container.itemKey}.`);
      }

      return {
        purchase_order_item_id: itemRow.id,
        location_city_id: itemRow.location_city_id,
        depot_id: itemRow.depot_id,
        container_size_code_id: itemRow.container_size_code_id,
        container_type_code_id: itemRow.container_type_code_id,
        container_condition_code_id: itemRow.container_condition_code_id,
        color: trimOrNull(container.color),
        flp: container.flp,
        lbx: container.lbx,
        locking_bars_count: container.lockingBarsCount,
        vents_count: container.ventsCount,
        machine_type: trimOrNull(container.machineType),
        yom: container.yom,
      offline_date:
          container.offlineDate || null,
        planned_pod: trimOrNull(
          input.items.find((item) => item.itemKey === container.itemKey)?.plannedPod
        ),
        tare_weight: container.tareWeight,
        maximum_weight: container.maximumWeight,
        csc_number: trimOrNull(container.cscNumber),
        purchase_price: itemRow.unit_price,
        container_number:
          input.purchaseType === "FACTORY_ORDER" && usesInternalContainerNumbering
            ? null
            : trimOrNull(container.containerNumber),
      };
    });

    const { data: submitStatus, error: submitError } = await supabase.rpc(
      "purchase_submit_insert_containers",
      {
        p_order_id: orderRow.id,
        p_containers: containerPayload,
      }
    );
    if (submitError) throw new Error(submitError.message);

    revalidatePath("/purchase/po-management");
    revalidatePath(`/purchase/po-management/${orderRow.id}`);
    revalidatePath("/purchase");

    return {
      orderId: orderRow.id,
      orderNo: orderRow.order_no,
      orderStatus: (submitStatus ?? "SUBMITTED") as PurchaseOrderStatus,
    };
  } catch (error) {
    if (orderIdForCleanup) {
      await supabase.from("purchase_order").delete().eq("id", orderIdForCleanup);
    }
    throw error;
  }
}

export async function updatePurchaseOrderDraft(
  orderId: string,
  input: PurchaseOrderDraftInput
): Promise<{
  orderId: string;
  orderNo: string;
}> {
  const supabase = createServerSupabaseClient();
  const usesInternalContainerNumbering = await resolveOwnerUsesInternalContainerNumbering(
    supabase,
    input.ownerId
  );
  const { data: orderRow, error: orderError } = await supabase
    .from("purchase_order")
    .select("id, order_no, order_status")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) throw new Error(orderError.message);
  if (!orderRow) throw new Error("Purchase order not found.");
  if (orderRow.order_status !== "DRAFT") {
    throw new Error(`Only DRAFT purchase orders can be fully edited. Current status: ${orderRow.order_status}.`);
  }

  if (!input.purchaseType) throw new Error("Purchase Type is required.");
  if (input.items.length === 0) throw new Error("At least one purchase item is required.");
  validateManualContainerNumbers({
    purchaseType: input.purchaseType,
    usesInternalContainerNumbering,
    containers: input.containers,
  });

  await validateRalColors(supabase, [
    ...input.items.map((item) => item.color),
    ...input.containers.map((container) => container.color),
  ]);

  const { error: updateOrderError } = await supabase
    .from("purchase_order")
    .update({
      ...buildOrderFields(input, "DRAFT"),
      order_no: orderRow.order_no,
      ...buildFinanceFields(input),
    })
    .eq("id", orderId);
  if (updateOrderError) throw new Error(updateOrderError.message);

  const { error: deleteContainersError } = await supabase
    .from("purchase_order_container")
    .delete()
    .eq("purchase_order_id", orderId);
  if (deleteContainersError) throw new Error(deleteContainersError.message);

  const resolvedDraftItemRows = await replaceOrderItemsAndMaterials(supabase, orderId, input);
  await syncPurchaseOrderItemAttachments(
    supabase,
    orderId,
    input.itemAttachments,
    new Map(
      Array.from(resolvedDraftItemRows.entries()).flatMap(([itemKey, row]) =>
        row?.id ? [[itemKey, row.id] as const] : []
      )
    )
  );
  revalidatePurchasePaths(orderId);

  return { orderId, orderNo: orderRow.order_no };
}

export async function submitPurchaseOrderDraftUpdate(
  orderId: string,
  input: PurchaseOrderDraftInput
): Promise<{
  orderId: string;
  orderNo: string;
  orderStatus: PurchaseOrderStatus;
}> {
  const supabase = createServerSupabaseClient();
  const usesInternalContainerNumbering = await resolveOwnerUsesInternalContainerNumbering(
    supabase,
    input.ownerId
  );
  const { data: orderRow, error: orderError } = await supabase
    .from("purchase_order")
    .select("id, order_no, order_status, vendor_release_date")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) throw new Error(orderError.message);
  if (!orderRow) throw new Error("Purchase order not found.");
  if (orderRow.order_status !== "DRAFT") {
    throw new Error(`Only DRAFT purchase orders can be submitted from edit. Current status: ${orderRow.order_status}.`);
  }

  validateManualContainerNumbers({
    purchaseType: input.purchaseType,
    usesInternalContainerNumbering,
    containers: input.containers,
    requireFactoryContainerNumbersOnSubmit: true,
  });
  validateSubmitRequiredFields(input);
  await validateRalColors(supabase, [
    ...input.items.map((item) => item.color),
    ...input.containers.map((container) => container.color),
  ]);

  const containerCounts = new Map<string, number>();
  for (const row of input.containers) {
    containerCounts.set(row.itemKey, (containerCounts.get(row.itemKey) ?? 0) + 1);
  }
  for (const item of input.items) {
    const expected = Math.max(0, Math.floor(item.plannedQty ?? 0));
    const actual = containerCounts.get(item.itemKey) ?? 0;
    if (expected !== actual) {
      throw new Error(`Item ${item.itemKey}: container count must equal Planned Qty (${expected}).`);
    }
  }

  const { error: updateOrderError } = await supabase
    .from("purchase_order")
    .update({
      ...buildOrderFields(input, "DRAFT"),
      order_no: orderRow.order_no,
      ...buildFinanceFields(input),
    })
    .eq("id", orderId);
  if (updateOrderError) throw new Error(updateOrderError.message);

  const { error: deleteContainersError } = await supabase
    .from("purchase_order_container")
    .delete()
    .eq("purchase_order_id", orderId);
  if (deleteContainersError) throw new Error(deleteContainersError.message);

  const itemByKey = await replaceOrderItemsAndMaterials(supabase, orderId, input);
  await syncPurchaseOrderItemAttachments(
    supabase,
    orderId,
    input.itemAttachments,
    new Map(
      Array.from(itemByKey.entries()).flatMap(([itemKey, row]) =>
        row?.id ? [[itemKey, row.id] as const] : []
      )
    )
  );
  const containerPayload = buildContainerPayloadForSubmit({
    input,
    orderId,
    vendorReleaseDate:
      shouldShowVendorReleaseFields(input.purchaseType) ? input.vendorReleaseDate ?? null : null,
    usesInternalContainerNumbering,
    itemByKey,
  });

  const { data: submitStatus, error: submitError } = await supabase.rpc(
    "purchase_submit_insert_containers",
    {
      p_order_id: orderId,
      p_containers: containerPayload,
    }
  );
  if (submitError) throw new Error(submitError.message);

  revalidatePurchasePaths(orderId);
  return {
    orderId,
    orderNo: orderRow.order_no,
    orderStatus: (submitStatus ?? "SUBMITTED") as PurchaseOrderStatus,
  };
}

export async function updatePurchaseOrderPending(
  orderId: string,
  input: PurchaseOrderDraftInput
): Promise<{
  orderId: string;
  orderNo: string;
  orderStatus: PurchaseOrderStatus;
}> {
  const supabase = createServerSupabaseClient();
  const usesInternalContainerNumbering = await resolveOwnerUsesInternalContainerNumbering(
    supabase,
    input.ownerId
  );
  let currentOrder = await getPurchaseOrderDetail(orderId);
  if (!currentOrder) throw new Error("Purchase order not found.");
  const editPermissions = getOrderEditPermissions(currentOrder);
  if (
    (!editPermissions.canEnterEdit && !editPermissions.canEditPlannedPod) ||
    currentOrder.orderStatus === "DRAFT"
  ) {
    throw new Error(
      `This purchase order cannot be updated in status ${currentOrder.orderStatus}.`
    );
  }
  if (
    !editPermissions.canSubmitChanges &&
    !(editPermissions.canEditPlannedPod && !editPermissions.canEnterEdit)
  ) {
    throw new Error(`Submit is not allowed for purchase order status ${currentOrder.orderStatus}.`);
  }

  const plannedPodOnlyUpdate = editPermissions.canEditPlannedPod && !editPermissions.canEnterEdit;

  if (plannedPodOnlyUpdate) {
    ensurePlannedPodOnlyPayloadAllowed(currentOrder, input);
    const plannedPodRows = input.items.map((item) => ({
      id: item.itemKey,
      planned_pod: trimOrNull(item.plannedPod),
    }));
    for (const row of plannedPodRows) {
      const { error: updateItemError } = await supabase
        .from("purchase_order_item")
        .update({ planned_pod: row.planned_pod })
        .eq("id", row.id)
        .eq("purchase_order_id", orderId);
      if (updateItemError) throw new Error(updateItemError.message);
    }
    await syncPlannedPodForContainersByItem(
      supabase,
      plannedPodRows.map((row) => ({ itemId: row.id, plannedPod: row.planned_pod }))
    );
    revalidatePurchasePaths(orderId);
    return {
      orderId,
      orderNo: currentOrder.orderNo,
      orderStatus: currentOrder.orderStatus,
    };
  }

  if (editPermissions.requiresAtLeastOneItemOnSubmit && input.items.length === 0) {
    throw new Error("At least one purchase item is required.");
  }
  if (editPermissions.editableFieldSet === "factory_progress_limited") {
    ensureFactoryProgressEditPayloadAllowed(currentOrder, input);
  }

  validateManualContainerNumbers({
    purchaseType: input.purchaseType,
    usesInternalContainerNumbering,
    containers: input.containers,
    requireFactoryContainerNumbersOnSubmit: true,
  });
  if (editPermissions.requiresMandatoryValidationOnSubmit) {
    validateSubmitRequiredFields(input);
  }
  await validateRalColors(supabase, [
    ...input.items.map((item) => item.color),
  ]);

  const partialCancels = input.items
    .map((item) => {
      const cancelQty = item.cancelQty ?? 0;
      return {
        itemKey: item.itemKey,
        cancelQty,
      };
    })
    .filter((item) => item.cancelQty > 0);
  const currentItemsByIdForCancel = new Map(currentOrder.items.map((item) => [item.id, item]));
  for (const item of input.items) {
    const rawCancelQty = item.cancelQty;
    if (rawCancelQty == null || rawCancelQty === 0) continue;
    if (!Number.isInteger(rawCancelQty) || rawCancelQty < 0) {
      throw new Error("Cancel Qty must be a non-negative integer.");
    }
    const currentItem = currentItemsByIdForCancel.get(item.itemKey);
    if (!currentItem) {
      throw new Error("Cancel Qty can only be entered for existing PO items.");
    }
    if (rawCancelQty > Number(currentItem.remainingQty ?? 0)) {
      throw new Error("Cancel Qty cannot exceed Remaining Qty.");
    }
  }
  if (
    partialCancels.length > 0 &&
    (currentOrder.orderStatus === "COMPLETED" ||
      currentOrder.orderStatus === "CANCELLED")
  ) {
    throw new Error(`Cancel Qty is not allowed for purchase order status ${currentOrder.orderStatus}.`);
  }
  if (partialCancels.length > 0) {
    await applyPartialCancelPurchaseOrderItems(
      supabase,
      orderId,
      partialCancels.map((item) => ({
        itemId: item.itemKey,
        cancelQty: item.cancelQty,
      }))
    );
    currentOrder = await getPurchaseOrderDetail(orderId);
    if (!currentOrder) throw new Error("Purchase order not found after partial cancel.");
  }

  const { error: updateOrderError } = await supabase
    .from("purchase_order")
    .update({
      ...buildOrderFields(input, currentOrder.orderStatus),
      order_no: currentOrder.orderNo,
      ...buildFinanceFields(input),
    })
    .eq("id", orderId);
  if (updateOrderError) throw new Error(updateOrderError.message);

  const cleanedMaterialTypes = sanitizeMaterialTypesForSubmit(input.purchaseType, input.materialTypes);
  const { error: deleteMaterialsError } = await supabase
    .from("purchase_order_material_type")
    .delete()
    .eq("purchase_order_id", orderId);
  if (deleteMaterialsError) throw new Error(deleteMaterialsError.message);

  if (shouldShowMaterialTypes(input.purchaseType)) {
    const { error: materialTypesError } = await supabase
      .from("purchase_order_material_type")
      .insert(
        cleanedMaterialTypes.map((row) => ({
          purchase_order_id: orderId,
          material_type: row.materialType,
          material_vendor_id: row.materialVendorId,
        }))
      );
    if (materialTypesError) throw new Error(materialTypesError.message);
  }

  const currentContainers = [...currentOrder.containers].sort((left, right) =>
    Date.parse(left.createdAt) - Date.parse(right.createdAt) || left.id.localeCompare(right.id)
  );
  const currentItemsById = new Map(currentOrder.items.map((item) => [item.id, item]));
  const containersByItem = new Map<string, PurchaseOrderContainer[]>();
  for (const container of currentContainers) {
    if (!container.purchaseOrderItemId) continue;
    const bucket = containersByItem.get(container.purchaseOrderItemId) ?? [];
    bucket.push(container);
    containersByItem.set(container.purchaseOrderItemId, bucket);
  }
  const inputContainerEditsById = new Map(
    (input.containerEdits ?? []).map((container) => [container.id, container] as const)
  );
  const inputNewContainersByItem = new Map<string, PurchaseOrderDraftContainerInput[]>();
  for (const container of input.newContainers ?? []) {
    const bucket = inputNewContainersByItem.get(container.itemKey) ?? [];
    bucket.push(container);
    inputNewContainersByItem.set(container.itemKey, bucket);
  }
  const containersToInsertViaSubmitRpc: Array<{
    purchase_order_item_id: string;
    location_city_id: string | null;
    depot_id: string | null;
    container_size_code_id: string | null;
    container_type_code_id: string | null;
    container_condition_code_id: string | null;
    color: string | null;
    flp: boolean;
    lbx: boolean;
    locking_bars_count: number | null;
    vents_count: number | null;
    machine_type: string | null;
    yom: number | null;
    estimated_offline_date: string | null;
    offline_date: string | null;
    planned_pod: string | null;
    tare_weight: number | null;
    maximum_weight: number | null;
    csc_number: string | null;
    purchase_price: number | null;
    container_number: string | null;
  }> = [];

  const retainedItemIds = new Set<string>();
  const resolvedItemIdsByInputKey = new Map<string, string>();
  const currentMaxLineNo = Math.max(0, ...currentOrder.items.map((item) => item.lineNo ?? 0));
  const temporaryLineNoBase = currentMaxLineNo + input.items.length + 100;

  const deletedItemIds = currentOrder.items
    .map((item) => item.id)
    .filter((itemId) => !input.items.some((nextItem) => nextItem.itemKey === itemId));

  if (deletedItemIds.length > 0) {
    const { error: deleteContainersError } = await supabase
      .from("purchase_order_container")
      .delete()
      .in("purchase_order_item_id", deletedItemIds);
    if (deleteContainersError) throw new Error(deleteContainersError.message);

    const { error: deleteItemsError } = await supabase
      .from("purchase_order_item")
      .delete()
      .in("id", deletedItemIds);
    if (deleteItemsError) throw new Error(deleteItemsError.message);
  }

  for (let index = 0; index < input.items.length; index += 1) {
    const nextItem = input.items[index];
    if (!nextItem) continue;
    const currentItem = currentItemsById.get(nextItem.itemKey);

    const itemPayload = {
      line_no: temporaryLineNoBase + index,
      location_city_id: nextItem.locationCityId,
      depot_id: nextItem.depotId,
      container_size_code_id: nextItem.containerSizeCodeId,
      container_type_code_id: nextItem.containerTypeCodeId,
      container_condition_code_id: nextItem.containerConditionCodeId,
      color: trimOrNull(nextItem.color),
      flp: nextItem.flp,
      lbx: nextItem.lbx,
      locking_bars_count: nextItem.lockingBarsCount,
      vents_count: nextItem.ventsCount,
      machine_type: trimOrNull(nextItem.machineType),
      yom: nextItem.yom,
      estimated_offline_date:
        input.purchaseType === "FACTORY_ORDER" ? nextItem.estimatedOfflineDate || null : null,
      offline_date: nextItem.offlineDate || null,
      vendor_release_number:
        shouldShowVendorReleaseFields(input.purchaseType) ? trimOrNull(nextItem.vendorReleaseNumber) : null,
      planned_pod: trimOrNull(nextItem.plannedPod),
      tare_weight: nextItem.tareWeight,
      maximum_weight: nextItem.maximumWeight,
      csc_number: trimOrNull(nextItem.cscNumber),
      planned_qty: nextItem.plannedQty,
      unit_price: nextItem.unitPrice,
      settlement_price: nextItem.unitPrice,
      financial_cost: currentItem?.financialCost ?? null,
      line_amount: computeLineAmount(nextItem.plannedQty, nextItem.unitPrice),
      remark: trimOrNull(nextItem.remark),
    };

    if (currentItemsById.has(nextItem.itemKey)) {
      const existingItemId = nextItem.itemKey;
      const { error: updateItemError } = await supabase
        .from("purchase_order_item")
        .update(itemPayload)
        .eq("id", existingItemId);
      if (updateItemError) throw new Error(updateItemError.message);
      retainedItemIds.add(existingItemId);
      resolvedItemIdsByInputKey.set(nextItem.itemKey, existingItemId);
      continue;
    }

    const { data: insertedItem, error: insertItemError } = await supabase
      .from("purchase_order_item")
      .insert({
        purchase_order_id: orderId,
        ...itemPayload,
      })
      .select("id")
      .single();
    if (insertItemError) throw new Error(insertItemError.message);
    retainedItemIds.add(insertedItem.id);
    resolvedItemIdsByInputKey.set(nextItem.itemKey, insertedItem.id);
  }

  for (let index = 0; index < input.items.length; index += 1) {
    const nextItem = input.items[index];
    if (!nextItem) continue;
    const resolvedItemId = resolvedItemIdsByInputKey.get(nextItem.itemKey);
    if (!resolvedItemId) {
      throw new Error(`Purchase item could not be resolved for key ${nextItem.itemKey}.`);
    }

    const { error: resequenceItemError } = await supabase
      .from("purchase_order_item")
      .update({ line_no: index + 1 })
      .eq("id", resolvedItemId);
    if (resequenceItemError) throw new Error(resequenceItemError.message);
  }

  for (const nextItem of input.items) {
    const resolvedItemId = resolvedItemIdsByInputKey.get(nextItem.itemKey);
    const currentItem = currentItemsById.get(nextItem.itemKey);
    if (!resolvedItemId) {
      throw new Error(`Purchase item could not be resolved for key ${nextItem.itemKey}.`);
    }

    const existingForItem = containersByItem.get(resolvedItemId) ?? [];
    const activeExistingForItem = existingForItem.filter(
      (container) => !isCancelledContainerStatus(container.containerStatus)
    );
    const cancelledExistingCount = existingForItem.length - activeExistingForItem.length;

    const desiredActiveCount = Math.max(
      0,
      Math.floor(nextItem.plannedQty ?? 0) - cancelledExistingCount
    );

    const retainedExistingCount = Math.min(desiredActiveCount, activeExistingForItem.length);
    const sharedFields = buildSharedContainerFieldsFromItem({
      item: nextItem,
      purchaseType: input.purchaseType,
      financialCost: currentItem?.financialCost ?? null,
    });
    const changedSharedFieldKeys = currentItem
      ? getChangedSharedContainerFieldKeys({
          currentItem,
          nextItem,
          purchaseType: input.purchaseType,
        })
      : new Set<keyof SharedContainerFieldsPayload>();
    for (let index = 0; index < retainedExistingCount; index += 1) {
      const existingContainer = activeExistingForItem[index];
      if (!existingContainer) continue;
      const nextContainer = inputContainerEditsById.get(existingContainer.id);
      const mergedSharedFields: SharedContainerFieldsPayload = {
        location_city_id: changedSharedFieldKeys.has("location_city_id")
          ? sharedFields.location_city_id
          : existingContainer.locationCityId,
        depot_id: changedSharedFieldKeys.has("depot_id")
          ? sharedFields.depot_id
          : existingContainer.depotId,
        container_size_code_id: changedSharedFieldKeys.has("container_size_code_id")
          ? sharedFields.container_size_code_id
          : existingContainer.containerSizeCodeId,
        container_type_code_id: changedSharedFieldKeys.has("container_type_code_id")
          ? sharedFields.container_type_code_id
          : existingContainer.containerTypeCodeId,
        container_condition_code_id: changedSharedFieldKeys.has("container_condition_code_id")
          ? sharedFields.container_condition_code_id
          : existingContainer.containerConditionCodeId,
        color: changedSharedFieldKeys.has("color")
          ? sharedFields.color
          : trimOrNull(existingContainer.color),
        flp: changedSharedFieldKeys.has("flp") ? sharedFields.flp : existingContainer.flp,
        lbx: changedSharedFieldKeys.has("lbx") ? sharedFields.lbx : existingContainer.lbx,
        locking_bars_count: changedSharedFieldKeys.has("locking_bars_count")
          ? sharedFields.locking_bars_count
          : existingContainer.lockingBarsCount,
        vents_count: changedSharedFieldKeys.has("vents_count")
          ? sharedFields.vents_count
          : existingContainer.ventsCount,
        machine_type: changedSharedFieldKeys.has("machine_type")
          ? sharedFields.machine_type
          : trimOrNull(nextContainer?.machineType ?? existingContainer.machineType),
        yom: changedSharedFieldKeys.has("yom")
          ? sharedFields.yom
          : nextContainer?.yom ?? existingContainer.yom,
        estimated_offline_date: changedSharedFieldKeys.has("estimated_offline_date")
          ? sharedFields.estimated_offline_date
          : input.purchaseType === "FACTORY_ORDER"
            ? (nextContainer?.estimatedOfflineDate ?? existingContainer.estimatedOfflineDate)
            : null,
        offline_date: changedSharedFieldKeys.has("offline_date")
          ? sharedFields.offline_date
          : nextContainer?.offlineDate ?? existingContainer.offlineDate,
        planned_pod: changedSharedFieldKeys.has("planned_pod")
          ? sharedFields.planned_pod
          : trimOrNull(existingContainer.plannedPod),
        tare_weight: changedSharedFieldKeys.has("tare_weight")
          ? sharedFields.tare_weight
          : nextContainer?.tareWeight ?? existingContainer.tareWeight,
        maximum_weight: changedSharedFieldKeys.has("maximum_weight")
          ? sharedFields.maximum_weight
          : nextContainer?.maximumWeight ?? existingContainer.maximumWeight,
        csc_number: changedSharedFieldKeys.has("csc_number")
          ? sharedFields.csc_number
          : trimOrNull(nextContainer?.cscNumber ?? existingContainer.cscNumber),
        purchase_price: changedSharedFieldKeys.has("purchase_price")
          ? sharedFields.purchase_price
          : existingContainer.purchasePrice,
        financial_cost: changedSharedFieldKeys.has("financial_cost")
          ? sharedFields.financial_cost
          : existingContainer.financialCost,
      };
      const offlineDate = changedSharedFieldKeys.has("offline_date")
        ? sharedFields.offline_date
        : (nextContainer?.offlineDate ?? existingContainer.offlineDate ?? null);
      const containerNumber =
        input.purchaseType === "FACTORY_ORDER" && usesInternalContainerNumbering
          ? existingContainer.containerNumber ?? null
          : trimOrNull(nextContainer?.containerNumber ?? existingContainer.containerNumber);
      const { containerStatus, itemStatus } = resolvePurchaseContainerStatuses({
        purchaseType: input.purchaseType,
        usesInternalContainerNumbering,
        offlineDate,
        containerNumber,
      });

      const containerPayload = {
        purchase_order_id: orderId,
        purchase_order_item_id: resolvedItemId,
        ...mergedSharedFields,
        offline_date: offlineDate,
        container_number: containerNumber,
        item_status: itemStatus,
        container_status: containerStatus,
      };

      const { error: updateContainerError } = await supabase
        .from("purchase_order_container")
        .update(containerPayload)
        .eq("id", existingContainer.id);
      if (updateContainerError) throw new Error(updateContainerError.message);
    }

    if (desiredActiveCount < activeExistingForItem.length) {
      const removableIds = activeExistingForItem
        .slice(desiredActiveCount)
        .map((container) => container.id);
      if (removableIds.length > 0) {
        const { error: deleteContainerError } = await supabase
          .from("purchase_order_container")
          .delete()
          .in("id", removableIds);
        if (deleteContainerError) throw new Error(deleteContainerError.message);
      }
    }

    const appendedDrafts = inputNewContainersByItem.get(nextItem.itemKey) ?? [];
    const newContainerCount = Math.max(0, desiredActiveCount - activeExistingForItem.length);
    for (let index = 0; index < newContainerCount; index += 1) {
      const nextContainer =
        appendedDrafts[index] ??
        buildDefaultContainerDraftForItem(
          nextItem,
          input.purchaseType,
          shouldShowVendorReleaseFields(input.purchaseType) ? input.vendorReleaseDate ?? null : null
        );
      const offlineDate = sharedFields.offline_date;

      containersToInsertViaSubmitRpc.push({
        purchase_order_item_id: resolvedItemId,
        ...sharedFields,
        offline_date: offlineDate,
        container_number:
          input.purchaseType === "FACTORY_ORDER" && usesInternalContainerNumbering
            ? null
            : trimOrNull(nextContainer.containerNumber),
      });
    }
  }

  if (containersToInsertViaSubmitRpc.length > 0) {
    const { error: submitInsertError } = await supabase.rpc(
      "purchase_submit_insert_containers",
      {
        p_order_id: orderId,
        p_containers: containersToInsertViaSubmitRpc,
      }
    );
    if (submitInsertError) throw new Error(submitInsertError.message);
  }

  await syncPlannedPodForContainersByItem(
    supabase,
    buildItemPlannedPodRows(input.items, resolvedItemIdsByInputKey)
  );

  await syncPurchaseOrderItemAttachments(
    supabase,
    orderId,
    input.itemAttachments,
    resolvedItemIdsByInputKey
  );

  const nextStatus = await recalculatePurchaseOrderStatus(supabase, orderId);

  revalidatePurchasePaths(orderId);
  return {
    orderId,
    orderNo: currentOrder.orderNo,
    orderStatus: nextStatus,
  };
}

export async function submitPurchaseOrderPending(
  orderId: string,
  input: PurchaseOrderDraftInput
): Promise<{
  orderId: string;
  orderNo: string;
  orderStatus: PurchaseOrderStatus;
}> {
  return updatePurchaseOrderPending(orderId, input);
}

export async function cancelPurchaseOrder(orderId: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { data: orderRow, error: orderError } = await supabase
    .from("purchase_order")
    .select("id, order_status")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) throw new Error(orderError.message);
  if (!orderRow) throw new Error("Purchase order not found.");
  if (orderRow.order_status === "COMPLETED") {
    throw new Error("Completed purchase orders cannot be cancelled.");
  }
  if (orderRow.order_status === "CANCELLED") {
    revalidatePurchasePaths(orderId);
    return;
  }

  const { error: containersError } = await supabase
    .from("purchase_order_container")
    .update({
      container_status: "CANCELLED",
      item_status: "CANCELLED",
    })
    .eq("purchase_order_id", orderId);
  if (containersError) throw new Error(containersError.message);

  const { error: orderUpdateError } = await supabase
    .from("purchase_order")
    .update({ order_status: "CANCELLED" })
    .eq("id", orderId);
  if (orderUpdateError) throw new Error(orderUpdateError.message);

  revalidatePurchasePaths(orderId);
}

export async function partialCancelPurchaseOrderItems(
  orderId: string,
  items: Array<{ itemId: string; cancelQty: number }>
): Promise<void> {
  const supabase = createServerSupabaseClient();
  await applyPartialCancelPurchaseOrderItems(supabase, orderId, items);
  revalidatePurchasePaths(orderId);
}

async function applyPartialCancelPurchaseOrderItems(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  orderId: string,
  items: Array<{ itemId: string; cancelQty: number }>
): Promise<void> {
  const { data: orderRow, error: orderError } = await supabase
    .from("purchase_order")
    .select("id, order_status, purchase_type")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) throw new Error(orderError.message);
  if (!orderRow) throw new Error("Purchase order not found.");
  if (orderRow.order_status === "COMPLETED" || orderRow.order_status === "CANCELLED") {
    throw new Error("This purchase order can no longer be partially cancelled.");
  }

  for (const item of items) {
    const cancelQty = Math.max(0, Math.floor(item.cancelQty ?? 0));
    if (cancelQty === 0) continue;
    const { error: cancelError } = await supabase.rpc(
      "purchase_partial_cancel_item_containers",
      {
        p_order_id: orderId,
        p_item_id: item.itemId,
        p_cancel_qty: cancelQty,
      }
    );
    if (cancelError) throw new Error(cancelError.message);
  }

  await recalculatePurchaseOrderStatus(supabase, orderId);
}
