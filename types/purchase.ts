export type PurchaseType = "FACTORY_ORDER" | "USED_CONTAINER" | "NEW_CONTAINER";

export type PurchaseOrderStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "PARTIAL_RECEIVED"
  | "COMPLETED"
  | "CANCELLED";

export type PurchaseInboundStatus = "NOT_STARTED" | "PARTIAL" | "COMPLETED";

export type PurchasePaymentMode = "DEPOSIT_BALANCE" | "PREPAYMENT" | "VENDOR_CREDIT";

export type PurchaseMaterialType =
  | "油漆"
  | "密封胶"
  | "胶条"
  | "地板"
  | "贴标"
  | "角件"
  | "锁杆"
  | "底漆";

export interface PurchaseVendorRef {
  id: string;
  vendor_code: string | null;
  company_name: string | null;
  legal_company_name: string | null;
}

export interface PurchaseOwnerRef {
  id: string;
  container_owner_code: string | null;
  company_name: string | null;
  legal_company_name: string | null;
}

export interface PurchaseBuyerRef {
  id: string;
  user_code: string | null;
  full_name: string | null;
}

export interface PurchaseLocationRef {
  id: string;
  city_code: string;
  city_name: string;
}

export interface PurchaseDepotRef {
  id: string;
  depot_code: string;
  depot_name: string;
}

export interface PurchaseSizeCodeRef {
  id: string;
  size_code: string;
  size_name: string | null;
}

export interface PurchaseTypeCodeRef {
  id: string;
  type_code: string;
  type_description: string | null;
}

export interface PurchaseConditionRef {
  id: string;
  condition_code: string;
  condition_name: string;
}

export interface PurchaseMaterialVendorRef {
  id: string;
  vendor_code: string | null;
  company_name: string | null;
  legal_company_name: string | null;
}

export interface PurchaseBankInformationSnapshot {
  bank_name?: string | null;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
  swift_code?: string | null;
  bank_address?: string | null;
  remark?: string | null;
  [key: string]: unknown;
}

export interface PurchaseOrderBase {
  id: string;
  orderNo: string;
  purchaseType: PurchaseType;
  supplierId: string | null;
  ownerId: string | null;
  buyerId: string | null;
  purchaseDate: string | null;
  estimatedOfflineTime: string | null;
  contractNumber: string | null;
  invoiceNumber: string | null;
  freeday: number | null;
  vendorReleaseNumber: string | null;
  vendorReleaseDate: string | null;
  remark: string | null;
  exchangeRate: number | null;
  orderStatus: PurchaseOrderStatus;
  inboundStatus: PurchaseInboundStatus | null;
  paymentMode: PurchasePaymentMode | null;
  paymentAccount: string | null;
  dueDate: string | null;
  totalPlannedQty: number;
  totalReceivedQty: number;
  totalAvailableQty: number;
  grandTotal: number;
  totalAmountPaid: number | null;
  totalAmountUnpaid: number | null;
  settlementPaymentTerm: string | null;
  settlementCreditDays: number | null;
  settlementAdvancePaymentPercentage: number | null;
  settlementBalanceTriggerEvent: string | null;
  settlementCurrency: string | null;
  settlementPrepaymentPool: boolean | null;
  settlementPrepaymentThreshold: number | null;
  settlementCurrentPrepaidBalance: number | null;
  vendorBankInformation: PurchaseBankInformationSnapshot | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderSummary extends PurchaseOrderBase {
  supplier?: PurchaseVendorRef | null;
  owner?: PurchaseOwnerRef | null;
  buyer?: PurchaseBuyerRef | null;
  primaryLocation?: string | null;
  primarySizeCode?: string | null;
  primaryTypeCode?: string | null;
  primaryConditionCode?: string | null;
  primaryColor?: string | null;
  remainingQty?: number | null;
  cancelledQty?: number | null;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  lineNo: number;
  locationCityId: string | null;
  depotId: string | null;
  containerSizeCodeId: string | null;
  containerTypeCodeId: string | null;
  containerConditionCodeId: string | null;
  color: string | null;
  flp: boolean;
  lbx: boolean;
  lockingBarsCount: number | null;
  ventsCount: number | null;
  machineType: string | null;
  yom: number | null;
  offlineDate: string | null;
  plannedQty: number;
  unitPrice: number | null;
  financialCost: number | null;
  settlementPrice: number | null;
  lineAmount: number | null;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
  location?: PurchaseLocationRef | null;
  depot?: PurchaseDepotRef | null;
  size?: PurchaseSizeCodeRef | null;
  type?: PurchaseTypeCodeRef | null;
  condition?: PurchaseConditionRef | null;
}

export interface PurchaseOrderContainer {
  id: string;
  purchaseOrderId: string;
  purchaseOrderItemId: string | null;
  containerNumber: string | null;
  locationCityId: string | null;
  depotId: string | null;
  containerSizeCodeId: string | null;
  containerTypeCodeId: string | null;
  containerConditionCodeId: string | null;
  color: string | null;
  flp: boolean;
  lbx: boolean;
  lockingBarsCount: number | null;
  ventsCount: number | null;
  machineType: string | null;
  yom: number | null;
  offlineDate: string | null;
  purchasePrice: number | null;
  financialCost: number | null;
  containerStatus: string | null;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
  location?: PurchaseLocationRef | null;
  depot?: PurchaseDepotRef | null;
  size?: PurchaseSizeCodeRef | null;
  type?: PurchaseTypeCodeRef | null;
  condition?: PurchaseConditionRef | null;
}

export interface PurchaseOrderMaterialTypeRow {
  id: string;
  purchaseOrderId: string;
  materialType: PurchaseMaterialType;
  materialVendorId: string | null;
  materialVendorNameSnapshot: string | null;
  materialVendorCodeSnapshot: string | null;
  materialVendor?: PurchaseMaterialVendorRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseFinanceRecord {
  id: string;
  purchaseOrderId: string;
  orderNo: string;
  supplierId: string | null;
  paymentMode: PurchasePaymentMode | null;
  contractNumber: string | null;
  invoiceNumber: string | null;
  paymentAccount: string | null;
  dueDate: string | null;
  settlementPaymentTerm: string | null;
  settlementCreditDays: number | null;
  settlementAdvancePaymentPercentage: number | null;
  settlementBalanceTriggerEvent: string | null;
  settlementCurrency: string | null;
  settlementPrepaymentPool: boolean | null;
  settlementPrepaymentThreshold: number | null;
  settlementCurrentPrepaidBalance: number | null;
  vendorBankInformation: PurchaseBankInformationSnapshot | null;
  grandTotal: number;
  totalAmountPaid: number;
  totalAmountUnpaid: number;
  financeStatus: "PENDING" | "PARTIALLY_PAID" | "PAID" | "VOID";
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderDetail extends PurchaseOrderBase {
  supplier?: PurchaseVendorRef | null;
  owner?: PurchaseOwnerRef | null;
  buyer?: PurchaseBuyerRef | null;
  items: PurchaseOrderItem[];
  containers: PurchaseOrderContainer[];
  materialTypes: PurchaseOrderMaterialTypeRow[];
  financeRecord: PurchaseFinanceRecord | null;
}

export interface PurchaseOrderItemContainersDetail {
  orderId: string;
  orderNo: string;
  item: PurchaseOrderItem;
  containers: PurchaseOrderContainer[];
}
