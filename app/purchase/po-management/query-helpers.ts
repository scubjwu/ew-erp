export type PurchaseQuickFilter =
  | "today"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "";

export type PurchaseItemFilterShape = {
  purchase_order_id: string;
  line_no: number;
  color: string | null;
  location_city_id: string | null;
  container_size_code_id: string | null;
  container_type_code_id: string | null;
  container_condition_code_id: string | null;
  location_code?: string | null;
  location_name?: string | null;
  size_code?: string | null;
  type_code?: string | null;
  condition_code?: string | null;
};

export type PurchaseItemAggregateFilters = {
  locationCityId: string;
  color: string;
  sizeType: string;
  conditionId: string;
};

function normalizeText(value?: string | null) {
  return value?.trim() ?? "";
}

function includesNormalized(haystack?: string | null, needle?: string | null) {
  const normalizedNeedle = normalizeText(needle).toLowerCase();
  if (!normalizedNeedle) return true;
  return normalizeText(haystack).toLowerCase().includes(normalizedNeedle);
}

export function applyQuickFilterDates(quickFilter: PurchaseQuickFilter, now = new Date()) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const formatDate = (value: Date) => value.toISOString().slice(0, 10);

  if (quickFilter === "today") {
    return { orderDateFrom: formatDate(end), orderDateTo: formatDate(end) };
  }
  if (quickFilter === "last7") {
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 6);
    return { orderDateFrom: formatDate(start), orderDateTo: formatDate(end) };
  }
  if (quickFilter === "last30") {
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 29);
    return { orderDateFrom: formatDate(start), orderDateTo: formatDate(end) };
  }
  if (quickFilter === "thisMonth") {
    const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
    return { orderDateFrom: formatDate(start), orderDateTo: formatDate(end) };
  }
  if (quickFilter === "lastMonth") {
    const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 1, 1));
    const finish = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 0));
    return { orderDateFrom: formatDate(start), orderDateTo: formatDate(finish) };
  }
  return null;
}

export function groupPurchaseItemsByOrder<T extends PurchaseItemFilterShape>(items: T[]) {
  const itemsByOrder = new Map<string, T[]>();
  for (const item of items) {
    const current = itemsByOrder.get(item.purchase_order_id);
    if (current) {
      current.push(item);
    } else {
      itemsByOrder.set(item.purchase_order_id, [item]);
    }
  }

  for (const orderItems of itemsByOrder.values()) {
    orderItems.sort((left, right) => left.line_no - right.line_no);
  }

  return itemsByOrder;
}

export function firstPurchaseItemByOrder<T extends PurchaseItemFilterShape>(itemsByOrder: Map<string, T[]>) {
  const firstItems = new Map<string, T>();
  for (const [orderId, items] of itemsByOrder.entries()) {
    const first = items[0];
    if (first) firstItems.set(orderId, first);
  }
  return firstItems;
}

export function purchaseItemMatchesAggregateFilters(
  item: PurchaseItemFilterShape | undefined,
  filters: PurchaseItemAggregateFilters
) {
  if (!item) return false;
  if (
    filters.locationCityId &&
    !includesNormalized(item.location_code ?? item.location_city_id, filters.locationCityId) &&
    !includesNormalized(item.location_name, filters.locationCityId)
  )
    return false;
  if (
    filters.color &&
    !normalizeRalLikeSearch(item.color).includes(normalizeRalLikeSearch(filters.color))
  )
    return false;
  if (
    filters.conditionId &&
    !includesNormalized(item.condition_code ?? item.container_condition_code_id, filters.conditionId)
  )
    return false;
  if (filters.sizeType) {
    const query = filters.sizeType.toLowerCase();
    const sizeValue = normalizeText(item.size_code ?? item.container_size_code_id).toLowerCase();
    const typeValue = normalizeText(item.type_code ?? item.container_type_code_id).toLowerCase();
    const combined = `${sizeValue}${typeValue}`;
    if (!sizeValue.includes(query) && !typeValue.includes(query) && !combined.includes(query))
      return false;
  }
  return true;
}

export function normalizeRalLikeSearch(value?: string | null) {
  return normalizeText(value).replace(/\s+/g, "").toUpperCase();
}

export function rowMatchesAnyPurchaseItem(
  items: PurchaseItemFilterShape[] | undefined,
  filters: PurchaseItemAggregateFilters
) {
  const hasItemLevelFilter =
    Boolean(filters.locationCityId) ||
    Boolean(filters.color) ||
    Boolean(filters.sizeType) ||
    Boolean(filters.conditionId);

  if (!hasItemLevelFilter) return true;
  if (!items || items.length === 0) return false;

  return items.some((item) => purchaseItemMatchesAggregateFilters(item, filters));
}
