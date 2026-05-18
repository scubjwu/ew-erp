export type OneWayPlanStatus =
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "HOLD"
  | "COMPLETED"
  | "CANCELLED";

export type OneWayPlanConversionStatus = "OPEN" | "CONVERTED";

export type OneWayPlanManagementSortBy =
  | "planId"
  | "status"
  | "applyDate"
  | "availabilityDate"
  | "quantity"
  | "remainingQty"
  | "shortfall"
  | "onhireNo";

export type OneWayPlanManagementSortDirection = "asc" | "desc";

export type OneWayPlanAutocompleteOption = {
  value: string;
  label: string;
  searchText?: string;
  secondaryLabel?: string;
};

export type OneWayPlanDepotOption = OneWayPlanAutocompleteOption & {
  cityId: string;
};

export type OneWayPlanManagementQuery = {
  region: string;
  status: OneWayPlanStatus | "";
  lesseeId: string;
  shipperRequestId: string;
  depotId: string;
  polCityId: string;
  podContains: string;
  sizeType: string;
  conditionId: string;
  color: string;
  machineType: string;
  onhireNo: string;
  applyDateFrom: string;
  applyDateTo: string;
  availabilityDateFrom: string;
  availabilityDateTo: string;
  page: number;
  pageSize: number;
  sortBy: OneWayPlanManagementSortBy;
  sortDirection: OneWayPlanManagementSortDirection;
};

export type OneWayPlanManagementRow = {
  id: string;
  planId: string;
  status: OneWayPlanStatus;
  conversionStatus: OneWayPlanConversionStatus;
  shipperRequestId: string;
  applyDate: string | null;
  availabilityDate: string | null;
  lesseeLabel: string;
  depotCode: string;
  polCode: string;
  pod: string;
  sizeType: string;
  condition: string;
  color: string;
  machineType: string;
  quantity: number;
  authorizedQty: number;
  remainingQty: number;
  pickedUpQty: number;
  nonPickedUpQty: number;
  shortfall: number;
  onhireNo: string;
  region: string;
  carrier: string;
  currency: string;
  rv: number;
};

export type OneWayPlanManagementSummary = {
  totalPlans: number;
  approvedPlans: number;
  onHoldPlans: number;
  totalShortfallQty: number;
};

export type OneWayPlanManagementResult = {
  rows: OneWayPlanManagementRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: OneWayPlanManagementQuery;
  summary: OneWayPlanManagementSummary;
};

export type OneWayPlanFilterOptions = {
  regions: OneWayPlanAutocompleteOption[];
  lessees: OneWayPlanAutocompleteOption[];
  depots: OneWayPlanAutocompleteOption[];
  polCities: OneWayPlanAutocompleteOption[];
  sizeTypes: OneWayPlanAutocompleteOption[];
  conditions: OneWayPlanAutocompleteOption[];
  colors: OneWayPlanAutocompleteOption[];
  machineTypes: OneWayPlanAutocompleteOption[];
};

export type OneWayPlanFormOptions = {
  lessees: OneWayPlanAutocompleteOption[];
  depots: OneWayPlanDepotOption[];
  polCities: OneWayPlanAutocompleteOption[];
  podCityCodes: string[];
  sizes: OneWayPlanAutocompleteOption[];
  types: OneWayPlanAutocompleteOption[];
  conditions: OneWayPlanAutocompleteOption[];
  colors: OneWayPlanAutocompleteOption[];
};

export type OneWayPlanCreateInput = {
  status: "SUBMITTED" | "APPROVED";
  applyDate: string;
  availabilityDate: string;
  arrangedDispatchDate: string;
  lesseeId: string;
  onhireNo: string;
  shipperRequestId: string;
  depotId: string;
  polCityId: string;
  pod: string;
  sizeCodeId: string;
  typeCodeId: string;
  conditionCodeId: string;
  color: string;
  machineType: string;
  quantity: number;
  authorizedQty: number;
  remainingQty: number;
  pickedUpQty: number;
  nonPickedUpQty: number;
  pickupCharge: number;
  freeDays: number;
  perDiem: number;
  dpp: number;
  carrier: string;
  currency: string;
  rv: number;
  remarks: string;
};

export type OneWayPlanCreateResult = {
  id: string;
  planId: string;
};

export type OneWayPlanEditDraft = {
  id: string;
  planId: string;
  status: OneWayPlanStatus;
  conversionStatus: OneWayPlanConversionStatus;
  applyDate: string;
  availabilityDate: string;
  arrangedDispatchDate: string;
  lesseeId: string;
  lesseeLabel: string;
  onhireNo: string;
  shipperRequestId: string;
  depotId: string;
  depotCode: string;
  polCityId: string;
  polCode: string;
  pod: string;
  sizeCodeId: string;
  typeCodeId: string;
  conditionCodeId: string;
  condition: string;
  color: string;
  machineType: string;
  quantity: number;
  authorizedQty: number;
  remainingQty: number;
  pickedUpQty: number;
  nonPickedUpQty: number;
  pickupCharge: number;
  freeDays: number;
  perDiem: number;
  dpp: number;
  carrier: string;
  currency: string;
  rv: number;
  remarks: string;
  releasedQty: number;
  hasRelease: boolean;
};

export type OneWayPlanUpdateInput = {
  id: string;
  status: OneWayPlanStatus;
  applyDate: string;
  availabilityDate: string;
  arrangedDispatchDate: string;
  lesseeId: string;
  onhireNo: string;
  shipperRequestId: string;
  depotId: string;
  polCityId: string;
  pod: string;
  sizeCodeId: string;
  typeCodeId: string;
  conditionCodeId: string;
  color: string;
  machineType: string;
  quantity: number;
  authorizedQty: number;
  remainingQty: number;
  pickedUpQty: number;
  nonPickedUpQty: number;
  pickupCharge: number;
  freeDays: number;
  perDiem: number;
  dpp: number;
  carrier: string;
  currency: string;
  rv: number;
  remarks: string;
};

export type OneWayPlanUpdateResult = {
  id: string;
  planId: string;
};

export type OneWayPlanImportPreviewRawRow = {
  sheetName: string;
  rowNo: number;
  offerId: string;
  status: string;
  statusDate: string;
  applyDate: string;
  availabilityDate: string;
  lessee: string;
  depotCodeRaw: string;
  pol: string;
  pod: string;
  sizeType: string;
  condition: string;
  color: string;
  machineType: string;
  quantity: number;
  authorizedQty: number;
  remainingQty: number;
  pickedUpQty: number;
  nonPickedUpQty: number;
  pickupCharge: number;
  freeDays: number;
  perDiem: number;
  dpp: number;
  shipperRequestId: string;
  onhireNo: string;
  remarks: string;
};

export type OneWayPlanImportPreviewRow = {
  rowNo: number;
  sheetName: string;
  status: string;
  offerId: string;
  statusDate: string;
  applyDate: string;
  availabilityDate: string;
  lessee: string;
  depotCandidates: Array<{ id: string; code: string }>;
  selectedDepotId: string | null;
  selectedDepotCode: string | null;
  canChooseDepot: boolean;
  depotCode: string;
  pol: string;
  pod: string;
  sizeType: string;
  condition: string;
  color: string;
  machineType: string;
  quantity: number;
  authorizedQty: number;
  remainingQty: number;
  pickedUpQty: number;
  nonPickedUpQty: number;
  pickupCharge: number;
  freeDays: number;
  perDiem: number;
  dpp: number;
  shipperRequestId: string;
  onhireNo: string;
  remarks: string;
  validationResult: string;
  isValid: boolean;
  willImport: boolean;
  skipReason: string | null;
  errors: string[];
  prepared: {
    status: OneWayPlanStatus;
    applyDate: string;
    availabilityDate: string;
    lesseeId: string;
    depotId: string | null;
    polCityId: string;
    pod: string;
    sizeCodeId: string;
    typeCodeId: string;
    conditionCodeId: string;
    color: string | null;
    machineType: string | null;
    quantity: number;
    authorizedQty: number;
    remainingQty: number;
    pickedUpQty: number;
    nonPickedUpQty: number;
    pickupCharge: number;
    freeDays: number;
    perDiem: number;
    dpp: number;
    carrier: string;
    currency: string;
    rv: number;
    shipperRequestId: string;
    onhireNo: string;
    remarks: string;
    sourceSheetName: string;
    sourceRowNumber: number;
  } | null;
};

export type OneWayPlanImportPreviewResult = {
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  importableRows: number;
  rows: OneWayPlanImportPreviewRow[];
};

export type OneWayPlanImportResult = {
  insertedCount: number;
  skippedCount: number;
};

export type OneWayPlanReleaseHistoryRow = {
  id: string;
  releaseNumber: string;
  releaseStatus: string;
  releaseDate: string | null;
  pod: string;
  releaseQty: number;
  pu: number;
  npu: number;
};

export type OneWayPlanDetail = {
  id: string;
  planId: string;
  status: OneWayPlanStatus;
  conversionStatus: OneWayPlanConversionStatus;
  applyDate: string | null;
  availabilityDate: string | null;
  arrangedDispatchDate: string | null;
  lesseeLabel: string;
  depotCode: string;
  polCode: string;
  pod: string;
  sizeType: string;
  condition: string;
  color: string;
  machineType: string;
  onhireNo: string;
  shipperRequestId: string;
  quantity: number;
  authorizedQty: number;
  remainingQty: number;
  pickedUpQty: number;
  nonPickedUpQty: number;
  matchedQty: number;
  releasedQty: number;
  shortfall: number;
  pickupCharge: number;
  freeDays: number;
  perDiem: number;
  dpp: number;
  carrier: string;
  currency: string;
  rv: number;
  remarks: string;
  region: string;
  releaseHistory: OneWayPlanReleaseHistoryRow[];
};

export type OneWayPlanReleaseSourceDetail = {
  id: string;
  planId: string;
  status: OneWayPlanStatus;
  conversionStatus: OneWayPlanConversionStatus;
  lesseeId: string;
  lesseeLabel: string;
  region: string;
  cityCode: string;
  depotCode: string;
  depotName: string;
  sizeType: string;
  condition: string;
  color: string;
  machineType: string;
  quantity: number;
  carrier: string;
  currency: string;
  pickupCharge: number;
  dpp: number;
  freeDays: number;
  rv: number;
  dailyRent: number;
  onhireNo: string;
  pod: string;
  podCandidates: string[];
  bucketId: string;
};

export const ONE_WAY_PLAN_STATUSES: OneWayPlanStatus[] = [
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "HOLD",
  "COMPLETED",
  "CANCELLED",
];

export const EMPTY_ONE_WAY_PLAN_QUERY: OneWayPlanManagementQuery = {
  region: "",
  status: "",
  lesseeId: "",
  shipperRequestId: "",
  depotId: "",
  polCityId: "",
  podContains: "",
  sizeType: "",
  conditionId: "",
  color: "",
  machineType: "",
  onhireNo: "",
  applyDateFrom: "",
  applyDateTo: "",
  availabilityDateFrom: "",
  availabilityDateTo: "",
  page: 1,
  pageSize: 20,
  sortBy: "applyDate",
  sortDirection: "desc",
};
