import {
  getLessees,
  getLesseeFilterOptions,
  getLesseeRegionOptions,
  type LesseeQuery,
} from "@/app/partners/lessee/actions";
import { LesseesDashboard } from "@/components/lessees/lessees-dashboard";

export const metadata = {
  title: "Lessee — EW ERP",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function LesseePage() {
  const initialParams: LesseeQuery = {
    lesseeCode: "",
    legalCompanyName: "",
    regionQuery: "",
    selectedRegionId: "",
    sortBy: "lesseeCode",
    sortDirection: "asc",
    page: 1,
    pageSize: PAGE_SIZE,
  };

  const [initial, filterOptions, regionOptions] = await Promise.all([
    getLessees(initialParams),
    getLesseeFilterOptions(),
    getLesseeRegionOptions(),
  ]);

  return (
    <LesseesDashboard
      initial={initial}
      pageSize={PAGE_SIZE}
      filterOptions={filterOptions}
      regionOptions={regionOptions}
    />
  );
}
