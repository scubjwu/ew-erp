import { DepotInventoryDashboard } from "@/components/depot-inventory/depot-inventory-dashboard";
import { getDepotInventory, getDepotInventoryFilterOptions } from "@/app/depot-inventory/actions";
import type { DepotInventoryQuery } from "@/types/depot-inventory";

export const metadata = {
  title: "Depot Inventory — EW ERP",
  description: "On-yard inventory for purchased and in-yard containers.",
};

export const dynamic = "force-dynamic";

const INITIAL_QUERY: DepotInventoryQuery = {
  region: "",
  location: "",
  depot: "",
  status: "",
  flpValue: "",
  lbxValue: "",
  eodValue: "",
  machineType: "",
  purchaseType: "",
  supplier: "",
  purchaseOrderNo: "",
  releaseNumber: "",
  sizeType: "",
  condition: "",
  color: "",
  containerNumber: "",
  containerNumberStart: "",
  containerNumberEnd: "",
  estimatedOfflineDateStart: "",
  estimatedOfflineDateEnd: "",
  offlineDateStart: "",
  offlineDateEnd: "",
  daysInDepot: "",
  viewMode: "detail",
  rangeGrouping: "po_item",
  page: 1,
  pageSize: 20,
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function DepotInventoryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const initialQuery: DepotInventoryQuery = {
    ...INITIAL_QUERY,
    region: firstValue(resolvedSearchParams.region),
    location: firstValue(resolvedSearchParams.location),
    depot: firstValue(resolvedSearchParams.depot),
    status: (firstValue(resolvedSearchParams.status) as DepotInventoryQuery["status"]) || "",
    flpValue: (firstValue(resolvedSearchParams.flpValue) as DepotInventoryQuery["flpValue"]) || "",
    lbxValue: (firstValue(resolvedSearchParams.lbxValue) as DepotInventoryQuery["lbxValue"]) || "",
    eodValue: (firstValue(resolvedSearchParams.eodValue) as DepotInventoryQuery["eodValue"]) || "",
    machineType: firstValue(resolvedSearchParams.machineType),
    purchaseType: firstValue(resolvedSearchParams.purchaseType),
    supplier: firstValue(resolvedSearchParams.supplier),
    purchaseOrderNo: firstValue(resolvedSearchParams.purchaseOrderNo),
    releaseNumber: firstValue(resolvedSearchParams.releaseNumber),
    sizeType: firstValue(resolvedSearchParams.sizeType),
    condition: firstValue(resolvedSearchParams.condition),
    color: firstValue(resolvedSearchParams.color),
    containerNumber: firstValue(resolvedSearchParams.containerNumber),
    containerNumberStart: firstValue(resolvedSearchParams.containerNumberStart),
    containerNumberEnd: firstValue(resolvedSearchParams.containerNumberEnd),
    estimatedOfflineDateStart: firstValue(resolvedSearchParams.estimatedOfflineDateStart),
    estimatedOfflineDateEnd: firstValue(resolvedSearchParams.estimatedOfflineDateEnd),
    offlineDateStart: firstValue(resolvedSearchParams.offlineDateStart),
    offlineDateEnd: firstValue(resolvedSearchParams.offlineDateEnd),
    daysInDepot:
      (firstValue(resolvedSearchParams.daysInDepot) as DepotInventoryQuery["daysInDepot"]) || "",
    viewMode:
      (firstValue(resolvedSearchParams.viewMode) as DepotInventoryQuery["viewMode"]) || "detail",
    rangeGrouping:
      (firstValue(resolvedSearchParams.rangeGrouping) as DepotInventoryQuery["rangeGrouping"]) || "po_item",
    page: Math.max(1, Number(firstValue(resolvedSearchParams.page) || INITIAL_QUERY.page)),
    pageSize: Math.max(1, Number(firstValue(resolvedSearchParams.pageSize) || INITIAL_QUERY.pageSize)),
  };

  const [initial, filterOptions] = await Promise.all([
    getDepotInventory(initialQuery),
    getDepotInventoryFilterOptions(),
  ]);

  return <DepotInventoryDashboard initial={initial} filterOptions={filterOptions} />;
}
