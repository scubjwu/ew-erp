export type DepotInventoryStatus = "PURCHASED" | "IN_YARD" | "PICKED_UP";

export type DepotInventoryViewMode = "detail" | "range";

export type DepotInventoryRangeGrouping = "po_item" | "po_item_effective_date";

export type DepotInventoryDaysBucket =
  | ""
  | "0_7"
  | "8_15"
  | "16_30"
  | "31_60"
  | "61_plus";

export type DepotInventoryQuery = {
  region: string;
  location: string;
  depot: string;
  status: DepotInventoryStatus | "";
  flpValue?: "" | "yes" | "no";
  lbxValue?: "" | "yes" | "no";
  eodValue?: "" | "yes" | "no";
  machineType: string;
  purchaseType: string;
  supplier: string;
  purchaseOrderNo: string;
  releaseNumber: string;
  sizeType: string;
  condition: string;
  color: string;
  containerNumber: string;
  containerNumberStart: string;
  containerNumberEnd: string;
  estimatedOfflineDateStart: string;
  estimatedOfflineDateEnd: string;
  offlineDateStart: string;
  offlineDateEnd: string;
  daysInDepot: DepotInventoryDaysBucket;
  viewMode: DepotInventoryViewMode;
  rangeGrouping: DepotInventoryRangeGrouping;
  page: number;
  pageSize: number;
};

export type DepotInventoryAutocompleteOption = {
  value: string;
  label: string;
  searchText?: string;
  secondaryLabel?: string;
};

export type DepotInventoryFilterOptions = {
  regions: DepotInventoryAutocompleteOption[];
  locations: DepotInventoryAutocompleteOption[];
  depots: DepotInventoryAutocompleteOption[];
  owners: DepotInventoryAutocompleteOption[];
  suppliers: DepotInventoryAutocompleteOption[];
  purchaseOrders: DepotInventoryAutocompleteOption[];
  releases: DepotInventoryAutocompleteOption[];
  colors: DepotInventoryAutocompleteOption[];
  containerNumbers: DepotInventoryAutocompleteOption[];
  sizeTypes: DepotInventoryAutocompleteOption[];
  machineTypes: DepotInventoryAutocompleteOption[];
  conditionCodes: string[];
};

export type DepotInventoryContainerRow = {
  id: string;
  purchaseOrderId: string;
  purchaseOrderItemId: string;
  containerId: string | null;
  containerNumber: string | null;
  sizeType: string;
  condition: string;
  colorCode: string;
  yom: number | null;
  flpLbeod: string;
  machineType: string;
  status: DepotInventoryStatus;
  region: string;
  location: string;
  depot: string;
  owner: string;
  plannedPod: string;
  purchaseType: string;
  purchaseOrderNo: string;
  estimatedOfflineDate: string | null;
  offlineDate: string | null;
  gateInDate: string | null;
  daysInDepot: number | null;
  depotCost: number;
  purchasePrice: number | null;
};

export type DepotInventoryRangeRow = {
  id: string;
  purchaseOrderItemId: string;
  containerNumberRange: string;
  sizeType: string;
  condition: string;
  colorCode: string;
  yom: string;
  flpLbeod: string;
  machineType: string;
  status: string;
  region: string;
  location: string;
  depot: string;
  owner: string;
  plannedPod: string;
  purchaseType: string;
  purchaseOrderNo: string;
  estimatedOfflineDate: string | null;
  offlineDate: string | null;
};

export type DepotInventoryResult = {
  rows: DepotInventoryContainerRow[] | DepotInventoryRangeRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: DepotInventoryQuery;
  canViewPurchasePrice: boolean;
};

export type DepotDispatchSummaryQuery = {
  region: string;
  city: string;
  depot: string;
  owner: string;
  sizeType: string;
  condition: string;
  color: string;
  machineType: string;
  page: number;
  pageSize: number;
};

export type DepotDispatchSummaryRow = {
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
  earliestFreedayExpiryDate: string | null;
  shortageAlert: boolean;
};

export type DepotDispatchSummaryResult = {
  rows: DepotDispatchSummaryRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: DepotDispatchSummaryQuery;
};

export type VendorReleaseSelectorRow = {
  purchaseOrderItemId: string;
  purchaseOrderId: string;
  orderNo: string;
  purchaseType: string;
  lineNo: number;
  vendorReleaseNumber: string;
  vendorReleaseDate: string | null;
  freeday: number | null;
  expiryDate: string | null;
  locationCityCode: string;
  locationCityName: string;
  depotId: string;
  depotCode: string;
  depotName: string;
  sizeType: string;
  condition: string;
  color: string;
  machineType: string;
  sourceTotalQty: number;
  vendorReleaseUsedQty: number;
  remainingQty: number;
  vendorReleaseAttachmentCount: number;
  hasVendorReleaseAttachment: boolean;
};

export type DispatchReleaseSelectableContainerQuery = {
  region: string;
  city: string;
  depot: string;
  owner?: string;
  sizeType: string;
  condition: string;
  color: string;
  machineType: string;
  releaseSource?: "INTERNAL_FACTORY" | "INTERNAL_DEPOT" | "VENDOR_REF";
  sourcePurchaseOrderItemId?: string;
  currentTransferOrderId?: string;
};

export type DispatchReleaseSelectableContainerRow = {
  id: string;
  purchaseOrderId: string;
  purchaseOrderItemId: string;
  containerId: string | null;
  containerNumber: string;
  region: string;
  city: string;
  depot: string;
  owner: string;
  sizeType: string;
  condition: string;
  color: string;
  machineType: string;
  flpLbeod: string;
  purchaseType: string;
  purchaseOrderNo: string;
  estimatedOfflineDate: string | null;
  gateInDate: string | null;
};

export type DepotSalesAvailabilityQuery = {
  region: string;
  city: string;
  depot: string;
  sizeType: string;
  condition: string;
  color: string;
  machineType: string;
  page: number;
  pageSize: number;
};

export type DepotSalesAvailabilityRow = {
  id: string;
  region: string;
  city: string;
  depot: string;
  sizeType: string;
  condition: string;
  color: string;
  machineType: string;
  flpLbeod: string;
  totalQty: number;
  reservedQty: number;
  invoicedQty: number;
  availableQty: number;
};

export type DepotSalesAvailabilityResult = {
  rows: DepotSalesAvailabilityRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: DepotSalesAvailabilityQuery;
};
