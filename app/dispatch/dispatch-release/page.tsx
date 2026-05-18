import { getDispatchReleaseManagement } from "@/app/dispatch/actions";
import { getDepotInventoryFilterOptions } from "@/app/depot-inventory/actions";
import { DispatchReleaseManagementDashboard } from "@/components/dispatch/dispatch-release-management-dashboard";

export const metadata = {
  title: "Dispatch Release Management — EW ERP",
  description: "Manage dispatch release records.",
};

export const dynamic = "force-dynamic";

export default async function DispatchReleaseManagementPage() {
  const [initial, filterOptions] = await Promise.all([
    getDispatchReleaseManagement(),
    getDepotInventoryFilterOptions(),
  ]);

  return (
    <DispatchReleaseManagementDashboard
      initial={initial}
      filterOptions={filterOptions}
    />
  );
}
