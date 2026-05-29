type SummaryBucketLike = {
  region: string;
  city: string;
  depot: string;
  sizeType: string;
  condition: string;
  color: string;
  machineType: string;
};

type DispatchSummaryContainerBucketInput = {
  location?: { city_code: string | null; city_name: string | null; region: string | null } | null;
  depot?: { depot_code: string | null; depot_name: string | null } | null;
  size?: { size_code: string | null } | null;
  type?: { type_code: string | null } | null;
  condition?: { condition_code: string | null } | null;
  color: string | null;
  machine_type: string | null;
};

type DispatchSummaryBucketFilters = {
  region: string | null | undefined;
  city: string | null | undefined;
  depot: string | null | undefined;
  sizeType: string | null | undefined;
  condition: string | null | undefined;
  color: string | null | undefined;
  machineType: string | null | undefined;
};

function normalizeText(value?: string | null) {
  return value?.trim() ?? "";
}

function resolveLocationLabel(raw: {
  location?: { city_code: string | null; city_name: string | null; region: string | null } | null;
}) {
  const code = raw.location?.city_code ?? "";
  const name = raw.location?.city_name ?? "";
  if (code && name) return `${code} · ${name}`;
  return code || name || "-";
}

function formatDepotLabel(input: {
  depotCode?: string | null;
  depotName?: string | null;
}) {
  const depotCode = normalizeText(input.depotCode);
  const depotName = normalizeText(input.depotName);

  if (depotCode && depotName) {
    return `${depotCode} · ${depotName}`;
  }

  return depotCode || depotName || "-";
}

function summaryBucketParts(input: {
  region: string | null | undefined;
  city: string | null | undefined;
  depot: string | null | undefined;
  sizeType: string | null | undefined;
  condition: string | null | undefined;
  color: string | null | undefined;
  machineType: string | null | undefined;
}) {
  return {
    region: normalizeText(input.region) || "-",
    city: normalizeText(input.city) || "-",
    depot: normalizeText(input.depot) || "-",
    sizeType: normalizeText(input.sizeType) || "-",
    condition: normalizeText(input.condition) || "-",
    color: normalizeText(input.color) || "-",
    machineType: normalizeText(input.machineType) || "-",
  };
}

function normalizedSummaryBucketMatch(value: string | null | undefined) {
  return normalizeText(value).toUpperCase();
}

export function buildSummaryBucketPartsFromDispatchSummaryContainerRow(
  row: DispatchSummaryContainerBucketInput
) {
  const city = resolveLocationLabel({
    location: row.location ?? null,
  });
  const depot = formatDepotLabel({
    depotCode: row.depot?.depot_code,
    depotName: row.depot?.depot_name,
  });
  const sizeType = `${row.size?.size_code ?? ""}${row.type?.type_code ?? ""}` || "-";
  const condition = row.condition?.condition_code ?? "-";

  return summaryBucketParts({
    region: row.location?.region,
    city,
    depot,
    sizeType,
    condition,
    color: row.color ?? "-",
    machineType: row.machine_type ?? "-",
  });
}

export function matchesDispatchSummaryBucketFilters(
  bucket: SummaryBucketLike,
  filters: DispatchSummaryBucketFilters
) {
  const normalizedFilterRegion = normalizedSummaryBucketMatch(filters.region);
  if (normalizedFilterRegion && bucket.region.toUpperCase() !== normalizedFilterRegion) {
    return false;
  }

  const normalizedFilterCity = normalizedSummaryBucketMatch(filters.city);
  if (normalizedFilterCity && !bucket.city.toUpperCase().includes(normalizedFilterCity)) {
    return false;
  }

  const normalizedFilterDepot = normalizedSummaryBucketMatch(filters.depot);
  if (normalizedFilterDepot && !bucket.depot.toUpperCase().includes(normalizedFilterDepot)) {
    return false;
  }

  const normalizedFilterSizeType = normalizedSummaryBucketMatch(filters.sizeType);
  if (normalizedFilterSizeType && bucket.sizeType.toUpperCase() !== normalizedFilterSizeType) {
    return false;
  }

  const normalizedFilterCondition = normalizedSummaryBucketMatch(filters.condition);
  if (normalizedFilterCondition && bucket.condition.toUpperCase() !== normalizedFilterCondition) {
    return false;
  }

  const normalizedFilterColor = normalizedSummaryBucketMatch(filters.color);
  if (normalizedFilterColor && !bucket.color.toUpperCase().includes(normalizedFilterColor)) {
    return false;
  }

  const normalizedFilterMachineType = normalizedSummaryBucketMatch(filters.machineType);
  if (normalizedFilterMachineType && !bucket.machineType.toUpperCase().includes(normalizedFilterMachineType)) {
    return false;
  }

  return true;
}
