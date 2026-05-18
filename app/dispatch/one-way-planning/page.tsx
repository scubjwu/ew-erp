import { getOneWayPlanFilterOptions, getOneWayPlanManagement } from "@/app/dispatch/one-way-planning/actions";
import { OneWayPlanningDashboard } from "@/components/dispatch/one-way-planning-dashboard";
import {
  EMPTY_ONE_WAY_PLAN_QUERY,
  type OneWayPlanManagementQuery,
} from "@/types/one-way-planning";

export const metadata = {
  title: "One Way Planning — EW ERP",
  description: "Manage one way planning records.",
};

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function OneWayPlanningPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = (await searchParams) ?? {};
  const initialQuery: OneWayPlanManagementQuery = {
    ...EMPTY_ONE_WAY_PLAN_QUERY,
    region: firstValue(resolved.region),
    status: firstValue(resolved.status) as OneWayPlanManagementQuery["status"],
    lesseeId: firstValue(resolved.lesseeId),
    shipperRequestId: firstValue(resolved.shipperRequestId),
    depotId: firstValue(resolved.depotId),
    polCityId: firstValue(resolved.polCityId),
    podContains: firstValue(resolved.podContains),
    sizeType: firstValue(resolved.sizeType),
    conditionId: firstValue(resolved.conditionId),
    color: firstValue(resolved.color),
    machineType: firstValue(resolved.machineType),
    onhireNo: firstValue(resolved.onhireNo),
    applyDateFrom: firstValue(resolved.applyDateFrom),
    applyDateTo: firstValue(resolved.applyDateTo),
    availabilityDateFrom: firstValue(resolved.availabilityDateFrom),
    availabilityDateTo: firstValue(resolved.availabilityDateTo),
    page: Math.max(1, Number(firstValue(resolved.page) || EMPTY_ONE_WAY_PLAN_QUERY.page)),
    pageSize: Math.max(
      1,
      Number(firstValue(resolved.pageSize) || EMPTY_ONE_WAY_PLAN_QUERY.pageSize)
    ),
    sortBy: (firstValue(resolved.sortBy) ||
      EMPTY_ONE_WAY_PLAN_QUERY.sortBy) as OneWayPlanManagementQuery["sortBy"],
    sortDirection: (firstValue(resolved.sortDirection) ||
      EMPTY_ONE_WAY_PLAN_QUERY.sortDirection) as OneWayPlanManagementQuery["sortDirection"],
  };

  const [initial, filterOptions] = await Promise.all([
    getOneWayPlanManagement(initialQuery),
    getOneWayPlanFilterOptions(),
  ]);

  return <OneWayPlanningDashboard initial={initial} filterOptions={filterOptions} />;
}
