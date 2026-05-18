import {
  getDepotDispatchSummary,
  getDepotInventoryFilterOptions,
} from "@/app/depot-inventory/actions";
import { DepotDispatchSummaryDashboard } from "@/components/depot-inventory/depot-dispatch-summary-dashboard";
import type { DepotDispatchSummaryQuery } from "@/types/depot-inventory";

export const metadata = {
  title: "Summary for Dispatch — EW ERP",
  description: "Grouped dispatch-planning summary for depot inventory.",
};

export const dynamic = "force-dynamic";

const INITIAL_QUERY: DepotDispatchSummaryQuery = {
  region: "",
  city: "",
  depot: "",
  owner: "",
  sizeType: "",
  condition: "",
  color: "",
  machineType: "",
  page: 1,
  pageSize: 20,
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function DepotDispatchSummaryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const initialQuery: DepotDispatchSummaryQuery = {
    ...INITIAL_QUERY,
    region: firstValue(resolvedSearchParams.region),
    city: firstValue(resolvedSearchParams.city),
    depot: firstValue(resolvedSearchParams.depot),
    owner: firstValue(resolvedSearchParams.owner),
    sizeType: firstValue(resolvedSearchParams.sizeType),
    condition: firstValue(resolvedSearchParams.condition),
    color: firstValue(resolvedSearchParams.color),
    machineType: firstValue(resolvedSearchParams.machineType),
    page: Math.max(1, Number(firstValue(resolvedSearchParams.page) || INITIAL_QUERY.page)),
    pageSize: Math.max(
      1,
      Number(firstValue(resolvedSearchParams.pageSize) || INITIAL_QUERY.pageSize)
    ),
  };

  const [initial, filterOptions] = await Promise.all([
    getDepotDispatchSummary(initialQuery),
    getDepotInventoryFilterOptions(),
  ]);

  return <DepotDispatchSummaryDashboard initial={initial} filterOptions={filterOptions} />;
}
