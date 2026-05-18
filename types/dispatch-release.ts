export type DispatchReleaseSourceOption =
  | "INTERNAL_FACTORY"
  | "INTERNAL_DEPOT"
  | "VENDOR_REF";

export type DispatchReleaseContainerSelectionMode = "UNSPECIFIED" | "SPECIFIED";

export type DispatchReleaseSpecifiedSelectionMethod =
  | "INVENTORY"
  | "MANUAL"
  | "RANGE";

export type DispatchReleaseSourceBucket = {
  id: string;
  region: string;
  city: string;
  depot: string;
  sizeType: string;
  condition: string;
  color: string;
  machineType: string;
  hasFactoryOrder: boolean;
  hasNewOrUsedPurchase: boolean;
  depotInventoryQty: number;
  pendingOutboundQty: number;
  availableDepotQty: number;
  plannedDispatchQty: number;
  plannableDepotQty: number;
  pendingOfflineQty: number;
  totalPlannableQty: number;
  totalAvailableQty: number;
  earliestEstimatedOfflineDate: string | null;
  shortageAlert: boolean;
};

export type DispatchReleaseDraft = {
  releaseNumber: string;
  dispatchPlanNo: string;
  carrierPlanNo: string;
  dispatchVendor: string;
  onhireNo: string;
  releaseDate: string;
  pol: string;
  pod: string;
  carrier: string;
  pickupCharge: string;
  dpp: string;
  freeDays: string;
  rv: string;
  dailyRent: string;
  headerCurrency: string;
  itemCostCurrency: string;
  truckingCost: string;
  handlingFee: string;
  releaseQty: number;
  releaseMode: string;
  dispatchArrangeDate: string;
  selfPickupDepot: string;
  containerSelectionMode: DispatchReleaseContainerSelectionMode;
  specifiedSelectionMethod: DispatchReleaseSpecifiedSelectionMethod;
  manualContainerNumbers: string;
  rangeStart: string;
  rangeEnd: string;
  remarks: string;
};

export type DispatchReleasePersistSelectedContainerInput = {
  id: string;
  purchaseOrderId: string;
  purchaseOrderItemId: string;
  containerId: string | null;
  containerNumber: string;
  pickupDate?: string | null;
  truckingCost?: number | string | null;
  truckingCostCurrency?: string | null;
  repairCost?: number | string | null;
  repairCostCurrency?: string | null;
  damageClaim?: number | string | null;
  damageClaimCurrency?: string | null;
  remark?: string | null;
};

export type DispatchReleasePersistInput = {
  bucket: DispatchReleaseSourceBucket;
  releaseSource: DispatchReleaseSourceOption;
  oneWayPlanId?: string;
  releaseNumber: string;
  vendorReleaseNumber: string;
  sourcePurchaseOrderId: string;
  sourcePurchaseOrderItemId: string;
  dispatchVendorId: string;
  releaseDate: string;
  polCityCode: string;
  podCityCode: string;
  dispatchPlanNo: string;
  carrierPlanNo: string;
  onhireNo: string;
  carrier: string;
  dispatchArrangeDate: string;
  selfPickupDepotName: string;
  releaseQty: number;
  releaseMode: string;
  containerSelectionMode: DispatchReleaseContainerSelectionMode;
  pickupCharge: string;
  dpp: string;
  freeDays: string;
  rv: string;
  dailyRent: string;
  headerCurrency?: string;
  itemCostCurrency?: string;
  truckingCost: string;
  handlingFee: string;
  remarks: string;
  selectedContainers: DispatchReleasePersistSelectedContainerInput[];
};

export type DispatchReleasePersistResult = {
  transferOrderId: string;
  releaseNumber: string;
  createdTransferItemCount: number;
  createdRevenueCount: number;
  createdCostCount: number;
};

export type DispatchReleaseUpdateInput = DispatchReleasePersistInput & {
  transferOrderId: string;
};

export type DispatchReleaseCancelInput = {
  transferOrderId: string;
  cancelQty?: number | null;
  cancelReason: string;
};

export type DispatchReleaseHoldInput = {
  transferOrderId: string;
  holdReason: string;
};

export type DispatchReleaseVendorDocument = {
  id: string;
  url: string;
  remark: string | null;
};

export type DispatchReleaseEditInitialData = {
  transferOrderId: string;
  releaseSource: DispatchReleaseSourceOption;
  sourcePurchaseOrderId: string;
  sourcePurchaseOrderItemId: string;
  vendorReleaseNumber: string;
  vendorRemainingQty?: number;
  bucket: DispatchReleaseSourceBucket;
  truckingCostTotalInHeaderCurrency: number;
  repairCostTotalInHeaderCurrency: number;
  repairRecoveryTotalInHeaderCurrency: number;
  draft: DispatchReleaseDraft;
  selectedContainers: DispatchReleasePersistSelectedContainerInput[];
  vendorReleaseDocuments: DispatchReleaseVendorDocument[];
};

export type DispatchReleaseManagementSortBy =
  | "releaseNumber"
  | "pol"
  | "pod"
  | "lessee"
  | "onhireNumber"
  | "vendorReleaseNumber"
  | "sizeType"
  | "condition"
  | "color"
  | "machineType"
  | "totalQuantity"
  | "pu"
  | "npu"
  | "status";

export type DispatchReleaseManagementQuery = {
  releaseNumber: string;
  status: string;
  pol: string;
  pod: string;
  lessee: string;
  onhireNumber: string;
  vendorReleaseNumber: string;
  sizeType: string;
  condition: string;
  color: string;
  machineType: string;
  containerNumber: string;
  page: number;
  pageSize: number;
  sortBy: DispatchReleaseManagementSortBy;
  sortDirection: "asc" | "desc";
};

export type DispatchReleaseManagementRow = {
  id: string;
  releaseNumber: string;
  pol: string;
  pod: string;
  lessee: string;
  onhireNumber: string;
  sizeType: string;
  condition: string;
  color: string;
  machineType: string;
  vendorReleaseNumber: string;
  totalQuantity: number;
  pu: number;
  npu: number;
  status: string;
  rawStatus: string;
  containerNumbers: string[];
};

export type DispatchReleaseManagementSummary = {
  totalRelease: number;
  arrangedQuantity: number;
  pu: number;
  npu: number;
  onHoldQuantity: number;
};

export type DispatchReleaseManagementResult = {
  rows: DispatchReleaseManagementRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: DispatchReleaseManagementQuery;
  summary: DispatchReleaseManagementSummary;
};
