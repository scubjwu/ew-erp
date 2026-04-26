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
  purchaseType: "",
  supplier: "",
  purchaseOrderNo: "",
  sizeType: "",
  condition: "",
  color: "",
  containerNumber: "",
  containerNumberStart: "",
  containerNumberEnd: "",
  estimatedOfflineDate: "",
  offlineDate: "",
  daysInDepot: "",
  viewMode: "detail",
  rangeGrouping: "po_item",
  page: 1,
  pageSize: 20,
};

export default async function DepotInventoryPage() {
  const [initial, filterOptions] = await Promise.all([
    getDepotInventory(INITIAL_QUERY),
    getDepotInventoryFilterOptions(),
  ]);

  return <DepotInventoryDashboard initial={initial} filterOptions={filterOptions} />;
}
