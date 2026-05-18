import {
  getDepotInventoryFilterOptions,
  getDepotSalesAvailability,
} from "@/app/depot-inventory/actions";
import { DepotSalesAvailabilityDashboard } from "@/components/depot-inventory/depot-sales-availability-dashboard";
import type { DepotSalesAvailabilityQuery } from "@/types/depot-inventory";

export const metadata = {
  title: "Sales Availability — EW ERP",
  description: "Grouped on-yard sales availability for depot inventory.",
};

export const dynamic = "force-dynamic";

const INITIAL_QUERY: DepotSalesAvailabilityQuery = {
  region: "",
  city: "",
  depot: "",
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

export default async function DepotSalesAvailabilityPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const initialQuery: DepotSalesAvailabilityQuery = {
    ...INITIAL_QUERY,
    region: firstValue(resolvedSearchParams.region),
    city: firstValue(resolvedSearchParams.city),
    depot: firstValue(resolvedSearchParams.depot),
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
    getDepotSalesAvailability(initialQuery),
    getDepotInventoryFilterOptions(),
  ]);

  return <DepotSalesAvailabilityDashboard initial={initial} filterOptions={filterOptions} />;
}
