export type DepotInventoryStatus = "PURCHASED" | "IN_YARD";

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
  purchaseType: string;
  supplier: string;
  purchaseOrderNo: string;
  sizeType: string;
  condition: string;
  color: string;
  containerNumber: string;
  containerNumberStart: string;
  containerNumberEnd: string;
  estimatedOfflineDate: string;
  offlineDate: string;
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
  suppliers: DepotInventoryAutocompleteOption[];
  purchaseOrders: DepotInventoryAutocompleteOption[];
  colors: DepotInventoryAutocompleteOption[];
  containerNumbers: DepotInventoryAutocompleteOption[];
  sizeTypes: DepotInventoryAutocompleteOption[];
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
