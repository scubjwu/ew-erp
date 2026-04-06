import {
  getPurchaseFilterOptions,
  getPurchaseOrders,
  type PurchaseOrderManagementQuery,
} from "@/app/purchase/po-management/actions";
import { PurchaseOrdersDashboard } from "@/components/purchase/purchase-orders-dashboard";

export const metadata = {
  title: "PO Management — EW ERP",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function PurchaseOrderManagementPage() {
  const initialParams: PurchaseOrderManagementQuery = {
    vendorId: "",
    locationCityId: "",
    color: "",
    sizeType: "",
    conditionId: "",
    orderDateFrom: "",
    orderDateTo: "",
    orderStatus: "",
    quickFilter: "",
    sortBy: "activityAt",
    sortDirection: "desc",
    page: 1,
    pageSize: PAGE_SIZE,
  };

  const [initial, filterOptions] = await Promise.all([
    getPurchaseOrders(initialParams),
    getPurchaseFilterOptions(),
  ]);

  return (
    <PurchaseOrdersDashboard
      initial={initial}
      pageSize={PAGE_SIZE}
      filterOptions={filterOptions}
    />
  );
}
