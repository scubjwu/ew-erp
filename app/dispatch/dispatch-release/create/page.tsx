import {
  getDepotDispatchSummary,
  getDepotInventoryFilterOptions,
} from "@/app/depot-inventory/actions";
import { getOneWayPlanReleaseSourceDetail } from "@/app/dispatch/one-way-planning/actions";
import { DispatchReleaseBuilder } from "@/components/dispatch/dispatch-release-builder";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  DepotInventoryAutocompleteOption,
  DepotDispatchSummaryQuery,
  DepotDispatchSummaryRow,
} from "@/types/depot-inventory";
import type { OneWayPlanReleaseSourceDetail } from "@/types/one-way-planning";

export const metadata = {
  title: "Create Dispatch Release — EW ERP",
  description: "Create dispatch release from dispatch availability buckets.",
};

export const dynamic = "force-dynamic";

const INITIAL_PICKER_QUERY: DepotDispatchSummaryQuery = {
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

function normalizeBucketContextValue(value: string) {
  const trimmed = value.trim();
  return trimmed === "-" ? "" : trimmed;
}

function extractCodeFromLabel(value: string) {
  const normalized = normalizeBucketContextValue(value);
  if (!normalized) return "";
  return normalized.split("·")[0]?.trim() ?? normalized;
}

function matchesContextValue(candidate: string, expected: string) {
  const normalizedExpected = normalizeBucketContextValue(expected);
  if (!normalizedExpected) return true;

  const normalizedCandidate = normalizeBucketContextValue(candidate);
  if (normalizedCandidate === normalizedExpected) return true;

  return extractCodeFromLabel(normalizedCandidate) === extractCodeFromLabel(normalizedExpected);
}

async function getBucketById(bucketId: string): Promise<DepotDispatchSummaryRow | null> {
  if (!bucketId) return null;
  const rows = await getDepotDispatchSummary({
    ...INITIAL_PICKER_QUERY,
    page: 1,
    pageSize: 5000,
  });
  return rows.rows.find((row) => row.id === bucketId) ?? null;
}

async function getLesseeOptions(): Promise<DepotInventoryAutocompleteOption[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("lessees")
    .select("id, lessee_code, company_name, legal_company_name")
    .order("company_name", { ascending: true })
    .limit(200);

  if (error) {
    throw new Error(error.message);
  }

  const deduped = new Map<string, DepotInventoryAutocompleteOption>();
  for (const row of data ?? []) {
    const value = row.id ?? "";
    if (!value) continue;
    const label = row.company_name ?? row.legal_company_name ?? row.lessee_code ?? value;
    deduped.set(value, {
      value,
      label,
      searchText: `${row.company_name ?? ""} ${row.legal_company_name ?? ""} ${row.lessee_code ?? ""}`,
      secondaryLabel: row.lessee_code ?? undefined,
    });
  }

  return Array.from(deduped.values());
}

function matchesBucket(
  row: DepotDispatchSummaryRow,
  context: {
    region: string;
    city: string;
    depot: string;
    sizeType: string;
    condition: string;
    color: string;
    machineType: string;
  }
) {
  return (
    matchesContextValue(row.region, context.region) &&
    matchesContextValue(row.city, context.city) &&
    matchesContextValue(row.depot, context.depot) &&
    matchesContextValue(row.sizeType, context.sizeType) &&
    matchesContextValue(row.condition, context.condition) &&
    matchesContextValue(row.color, context.color) &&
    matchesContextValue(row.machineType, context.machineType)
  );
}

export default async function CreateDispatchReleasePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};

  const initialContext = {
    bucketId: firstValue(params.bucketId),
    releaseSource: firstValue(params.releaseSource),
    oneWayPlanId: firstValue(params.oneWayPlanId),
    region: firstValue(params.region),
    city: firstValue(params.city),
    depot: firstValue(params.depot),
    sizeType: firstValue(params.sizeType),
    condition: firstValue(params.condition),
    color: firstValue(params.color),
    machineType: firstValue(params.machineType),
    sourcePurchaseOrderId: firstValue(params.sourcePurchaseOrderId),
    sourcePurchaseOrderItemId: firstValue(params.sourcePurchaseOrderItemId),
    vendorReleaseNumber: firstValue(params.vendorReleaseNumber),
  };

  const hasBucketContext = Boolean(
    initialContext.region ||
      initialContext.city ||
      initialContext.depot ||
      initialContext.sizeType ||
      initialContext.condition ||
      initialContext.color ||
      initialContext.machineType
  );

  const [initialSummary, filterOptions, lesseeOptions, sourcePlan] = await Promise.all([
    getDepotDispatchSummary(INITIAL_PICKER_QUERY),
    getDepotInventoryFilterOptions(),
    getLesseeOptions(),
    initialContext.oneWayPlanId
      ? getOneWayPlanReleaseSourceDetail(initialContext.oneWayPlanId)
      : Promise.resolve<OneWayPlanReleaseSourceDetail | null>(null),
  ]);

  const effectiveContext = sourcePlan
    ? {
        ...initialContext,
        region: sourcePlan.region === "-" ? "" : sourcePlan.region,
        city: sourcePlan.cityCode === "-" ? "" : sourcePlan.cityCode,
        depot: sourcePlan.depotCode === "-" ? "" : sourcePlan.depotCode,
        sizeType: sourcePlan.sizeType === "-" ? "" : sourcePlan.sizeType,
        condition: sourcePlan.condition === "-" ? "" : sourcePlan.condition,
        color: sourcePlan.color === "-" ? "" : sourcePlan.color,
        machineType: sourcePlan.machineType === "-" ? "" : sourcePlan.machineType,
      }
    : initialContext;

  const preselectedBucketResult = effectiveContext.bucketId
    ? await getBucketById(effectiveContext.bucketId)
    : hasBucketContext || sourcePlan
    ? await getDepotDispatchSummary({
        region: effectiveContext.region,
        city: effectiveContext.city,
        depot: effectiveContext.depot,
        owner: "",
        sizeType: effectiveContext.sizeType,
        condition: effectiveContext.condition,
        color: effectiveContext.color,
        machineType: effectiveContext.machineType,
        page: 1,
        pageSize: 100,
      })
    : null;

  const preselectedBucket =
    effectiveContext.bucketId
      ? (preselectedBucketResult as DepotDispatchSummaryRow | null)
      : ((preselectedBucketResult as Awaited<ReturnType<typeof getDepotDispatchSummary>> | null)?.rows.find((row) =>
          matchesBucket(row, effectiveContext)
        ) ?? null);

  return (
    <DispatchReleaseBuilder
      initialSummary={initialSummary}
      filterOptions={filterOptions}
      lesseeOptions={lesseeOptions}
      initialContext={effectiveContext}
      preselectedBucket={preselectedBucket}
      sourcePlan={sourcePlan}
    />
  );
}
