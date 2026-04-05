import {
  DEFAULT_DEPOT_CODES_SORT,
  getDepotCityOptions,
  getDepotCodes,
  type DepotCodesQuery,
} from "@/app/basic-info/depots/actions";
import { DepotCodesDashboard } from "@/components/basic-info/depot-codes-dashboard";

export const metadata = {
  title: "Depot Codes — EW ERP",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function DepotCodesPage() {
  const initialParams: DepotCodesQuery = {
    depotCode: "",
    depotName: "",
    cityId: "",
    depotType: "",
    status: "",
    page: 1,
    pageSize: PAGE_SIZE,
    sortBy: DEFAULT_DEPOT_CODES_SORT.sortBy,
    sortDirection: DEFAULT_DEPOT_CODES_SORT.sortDirection,
  };

  const [initial, cityOptions] = await Promise.all([
    getDepotCodes(initialParams),
    getDepotCityOptions(),
  ]);

  return (
    <DepotCodesDashboard
      initial={initial}
      pageSize={PAGE_SIZE}
      cityOptions={cityOptions}
    />
  );
}
