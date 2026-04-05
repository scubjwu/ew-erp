import {
  getCityLogistics,
  getRegionOptions,
  type CityLogisticsQuery,
} from "@/app/basic-info/cities/actions";
import { CityLogisticsDashboard } from "@/components/basic-info/city-logistics-dashboard";

export const metadata = {
  title: "City Codes — EW ERP",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function CityLogisticsPage() {
  const initialParams: CityLogisticsQuery = {
    cityCode: "",
    cityName: "",
    regionId: "",
    country: "",
    page: 1,
    pageSize: PAGE_SIZE,
    sortBy: "cityCode",
    sortDirection: "asc",
  };

  const [initial, regionOptions] = await Promise.all([
    getCityLogistics(initialParams),
    getRegionOptions(),
  ]);

  return (
    <CityLogisticsDashboard
      initial={initial}
      pageSize={PAGE_SIZE}
      regionOptions={regionOptions}
    />
  );
}
