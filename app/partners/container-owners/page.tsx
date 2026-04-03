import {
  getContainerOwnerRegionOptions,
  getContainerOwners,
  type ContainerOwnerQuery,
} from "@/app/partners/container-owners/actions";
import { ContainerOwnersDashboard } from "@/components/container-owners/container-owners-dashboard";

export const metadata = {
  title: "Container Owners — EW ERP",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function ContainerOwnersPage() {
  const initialParams: ContainerOwnerQuery = {
    containerOwnerCode: "",
    legalCompanyName: "",
    regionId: "",
    page: 1,
    pageSize: PAGE_SIZE,
  };

  const [initial, regionOptions] = await Promise.all([
    getContainerOwners(initialParams),
    getContainerOwnerRegionOptions(),
  ]);

  return (
    <ContainerOwnersDashboard
      initial={initial}
      pageSize={PAGE_SIZE}
      regionOptions={regionOptions}
    />
  );
}
