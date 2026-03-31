import { getRegionCodes, type RegionCodesQuery } from "@/app/basic-info/regions/actions";
import { RegionCodesDashboard } from "@/components/basic-info/region-codes-dashboard";

export const metadata = {
  title: "Region Codes — EW ERP",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function RegionCodesPage() {
  const initialParams: RegionCodesQuery = {
    q: "",
    page: 1,
    pageSize: PAGE_SIZE,
  };

  const initial = await getRegionCodes(initialParams);

  return <RegionCodesDashboard initial={initial} pageSize={PAGE_SIZE} />;
}
