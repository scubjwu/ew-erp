import { notFound } from "next/navigation";

import { getDispatchReleaseDetail } from "@/app/dispatch/actions";
import {
  getDepotDispatchSummary,
  getDepotInventoryFilterOptions,
  getVendorReleaseSelectorRows,
} from "@/app/depot-inventory/actions";
import { DispatchReleaseBuilder } from "@/components/dispatch/dispatch-release-builder";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  DepotDispatchSummaryQuery,
  DepotDispatchSummaryRow,
  DepotInventoryAutocompleteOption,
} from "@/types/depot-inventory";
import type { DispatchReleaseEditInitialData } from "@/types/dispatch-release";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Edit Dispatch Release — EW ERP",
  description: "Edit an existing dispatch release.",
};

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

function normalizeBucketContextValue(value: string) {
  const trimmed = value.trim();
  return trimmed === "-" ? "" : trimmed;
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
    normalizeBucketContextValue(row.region) === normalizeBucketContextValue(context.region) &&
    normalizeBucketContextValue(row.city) === normalizeBucketContextValue(context.city) &&
    normalizeBucketContextValue(row.depot) === normalizeBucketContextValue(context.depot) &&
    normalizeBucketContextValue(row.sizeType) === normalizeBucketContextValue(context.sizeType) &&
    normalizeBucketContextValue(row.condition) === normalizeBucketContextValue(context.condition) &&
    normalizeBucketContextValue(row.color) === normalizeBucketContextValue(context.color) &&
    normalizeBucketContextValue(row.machineType) === normalizeBucketContextValue(context.machineType)
  );
}

function formatMoneyInput(value: number) {
  return value.toFixed(2);
}

function isMissingDispatchReleaseError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  return (
    message.includes("PGRST116") ||
    message.includes("JSON object requested, multiple (or no) rows returned") ||
    message.includes("0 rows")
  );
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

  return (data ?? []).flatMap((row) => {
    const value = row.id ?? "";
    if (!value) return [];
    return [
      {
        value,
        label: row.company_name ?? row.legal_company_name ?? row.lessee_code ?? value,
        searchText: `${row.company_name ?? ""} ${row.legal_company_name ?? ""} ${row.lessee_code ?? ""}`,
        secondaryLabel: row.lessee_code ?? undefined,
      },
    ];
  });
}

function buildFallbackBucket(
  detail: Awaited<ReturnType<typeof getDispatchReleaseDetail>>["order"],
  vendorRemainingQty = 0
) {
  const fallbackQty = detail.releaseSource === "VENDOR_REF" ? Math.max(0, vendorRemainingQty) : 0;
  return {
    id: `edit-${detail.id}`,
    region: detail.sourceRegion,
    city: detail.sourceCity,
    depot: detail.sourceDepot,
    sizeType: detail.sizeType,
    condition: detail.condition,
    color: detail.color,
    machineType: detail.machineType,
    hasFactoryOrder: detail.releaseSource === "INTERNAL_FACTORY",
    hasNewOrUsedPurchase: detail.releaseSource !== "INTERNAL_FACTORY",
    depotInventoryQty: fallbackQty,
    pendingOutboundQty: 0,
    availableDepotQty: fallbackQty,
    plannedDispatchQty: 0,
    plannableDepotQty: fallbackQty,
    pendingOfflineQty: 0,
    totalPlannableQty: fallbackQty,
    totalAvailableQty: fallbackQty,
    earliestEstimatedOfflineDate: null,
    earliestFreedayExpiryDate: null,
    shortageAlert: false,
  } satisfies DepotDispatchSummaryRow;
}

export default async function EditDispatchReleasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let detail;
  try {
    detail = await getDispatchReleaseDetail(id);
  } catch (error) {
    if (isMissingDispatchReleaseError(error)) {
      notFound();
    }
    throw error;
  }

  const bucketContext = {
    region: detail.order.sourceRegion,
    city: detail.order.sourceCity,
    depot: detail.order.sourceDepot,
    sizeType: detail.order.sizeType,
    condition: detail.order.condition,
    color: detail.order.color,
    machineType: detail.order.machineType,
  };

  const [initialSummary, filterOptions, lesseeOptions, exactBucketResult, vendorRows] = await Promise.all([
    getDepotDispatchSummary(INITIAL_PICKER_QUERY),
    getDepotInventoryFilterOptions(),
    getLesseeOptions(),
    getDepotDispatchSummary({
      region: bucketContext.region,
      city: bucketContext.city,
      depot: bucketContext.depot,
      owner: "",
      sizeType: bucketContext.sizeType,
      condition: bucketContext.condition,
      color: bucketContext.color,
      machineType: bucketContext.machineType,
      page: 1,
      pageSize: 100,
    }),
    detail.order.releaseSource === "VENDOR_REF" && detail.order.sourcePurchaseOrderItemId
      ? getVendorReleaseSelectorRows({
          city: bucketContext.city,
          depot: bucketContext.depot,
          sizeType: bucketContext.sizeType,
          condition: bucketContext.condition,
          color: bucketContext.color,
          machineType: bucketContext.machineType,
          purchaseOrderItemId: detail.order.sourcePurchaseOrderItemId,
        })
      : Promise.resolve([]),
  ]);

  const matchedVendorRow =
    detail.order.releaseSource === "VENDOR_REF"
      ? vendorRows.find((row) => row.purchaseOrderItemId === detail.order.sourcePurchaseOrderItemId) ?? null
      : null;
  const vendorRemainingQty = matchedVendorRow?.remainingQty ?? 0;

  const preselectedBucket =
    exactBucketResult.rows.find((row) => matchesBucket(row, bucketContext)) ??
    buildFallbackBucket(detail.order, vendorRemainingQty);

  const activeItems = detail.items.filter((item) => item.itemStatus !== "CANCELLED");
  const editData: DispatchReleaseEditInitialData = {
    transferOrderId: detail.order.id,
    releaseSource:
      (detail.order.releaseSource as DispatchReleaseEditInitialData["releaseSource"]) ??
      "INTERNAL_DEPOT",
    sourcePurchaseOrderId: detail.order.sourcePurchaseOrderId ?? "",
    sourcePurchaseOrderItemId: detail.order.sourcePurchaseOrderItemId ?? "",
    vendorReleaseNumber: detail.order.vendorReleaseNumber ?? "",
    vendorRemainingQty,
    bucket: preselectedBucket,
    truckingCostTotalInHeaderCurrency: detail.order.truckingCostTotalInHeaderCurrency,
    repairCostTotalInHeaderCurrency: detail.order.repairCostTotalInHeaderCurrency,
    repairRecoveryTotalInHeaderCurrency: detail.order.damageClaimTotalInHeaderCurrency,
    draft: {
      releaseNumber: detail.order.orderNo,
      dispatchPlanNo: detail.order.dispatchPlanNo ?? "",
      carrierPlanNo: detail.order.carrierPlanNo ?? "",
      dispatchVendor: detail.order.dispatchVendorId ?? "",
      onhireNo: detail.order.onhireNo ?? "",
      releaseDate: detail.order.releaseDate ?? "",
      pol: detail.order.polCode ?? "",
      pod: detail.order.podCode ?? "",
      carrier: detail.order.carrier ?? "",
      pickupCharge: formatMoneyInput(detail.order.pickupCharge),
      dpp: formatMoneyInput(detail.order.dpp),
      freeDays: String(detail.order.freeDays),
      rv: formatMoneyInput(detail.order.rv),
      dailyRent: formatMoneyInput(detail.order.dailyRent),
      headerCurrency: detail.order.headerCurrency,
      itemCostCurrency: detail.order.itemCostCurrency,
      truckingCost: formatMoneyInput(detail.order.truckingCost),
      handlingFee: formatMoneyInput(detail.order.handlingFee),
      releaseQty: detail.order.releaseQty,
      releaseMode:
        detail.order.selfPickupDepotLabel && detail.order.selfPickupDepotLabel !== "-"
          ? "SELF_PICKUP"
          : "TRUCK_DELIVERY",
      dispatchArrangeDate: detail.order.dispatchArrangeDate ?? "",
      selfPickupDepot:
        detail.order.selfPickupDepotLabel && detail.order.selfPickupDepotLabel !== "-"
          ? detail.order.selfPickupDepotLabel
          : "",
      containerSelectionMode:
        detail.order.containerSelectionMode === "SPECIFIED" || activeItems.length > 0
          ? "SPECIFIED"
          : "UNSPECIFIED",
      specifiedSelectionMethod: "INVENTORY",
      manualContainerNumbers: "",
      rangeStart: "",
      rangeEnd: "",
      remarks: detail.order.remark ?? "",
    },
    selectedContainers: activeItems.map((item) => ({
      id: item.containerId || item.id,
      purchaseOrderId: detail.order.sourcePurchaseOrderId ?? "",
      purchaseOrderItemId: detail.order.sourcePurchaseOrderItemId ?? "",
      containerId: item.containerId,
      containerNumber: item.containerNumber,
      pickupDate: item.pickupDate ?? "",
      truckingCost: item.truckingCost,
      truckingCostCurrency: item.truckingCostCurrency,
      repairCost: item.repairCost,
      repairCostCurrency: item.repairCostCurrency,
      damageClaim: item.damageClaim,
      damageClaimCurrency: item.damageClaimCurrency,
      remark: item.remark,
    })),
    vendorReleaseDocuments:
      detail.order.releaseSource === "VENDOR_REF"
        ? detail.attachments.filter((attachment) => attachment.inherited)
        : [],
  };

  return (
    <DispatchReleaseBuilder
      initialSummary={initialSummary}
      filterOptions={filterOptions}
      lesseeOptions={lesseeOptions}
      initialContext={{
        releaseSource: detail.order.releaseSource ?? "",
        region: bucketContext.region,
        city: bucketContext.city,
        depot: bucketContext.depot,
        sizeType: bucketContext.sizeType,
        condition: bucketContext.condition,
        color: bucketContext.color,
        machineType: bucketContext.machineType,
        sourcePurchaseOrderId: detail.order.sourcePurchaseOrderId ?? "",
        sourcePurchaseOrderItemId: detail.order.sourcePurchaseOrderItemId ?? "",
        vendorReleaseNumber: detail.order.vendorReleaseNumber ?? "",
      }}
      preselectedBucket={preselectedBucket}
      mode="edit"
      editData={editData}
    />
  );
}
