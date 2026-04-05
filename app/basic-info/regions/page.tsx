import {
  getRegionCodes,
  getRegionFilterOptions,
  type RegionCodesQuery,
} from "@/app/basic-info/regions/actions";
import { RegionCodesDashboard } from "@/components/basic-info/region-codes-dashboard";

export const metadata = {
  title: "Region Codes — EW ERP",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function RegionCodesPage() {
  const initialParams: RegionCodesQuery = {
    q: "",
    sortBy: "regionCode",
    sortDirection: "asc",
    page: 1,
    pageSize: PAGE_SIZE,
  };

  const [initial, filterOptions] = await Promise.all([
    getRegionCodes(initialParams),
    getRegionFilterOptions(),
  ]);

  return <RegionCodesDashboard initial={initial} pageSize={PAGE_SIZE} filterOptions={filterOptions} />;
}
