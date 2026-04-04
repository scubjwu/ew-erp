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
  if (filters.locationCityId && item.location_city_id !== filters.locationCityId) return false;
  if (
    filters.color &&
    normalizeText(item.color).toLowerCase() !== filters.color.toLowerCase()
  ) {
    return false;
  }
  if (filters.conditionId && item.container_condition_code_id !== filters.conditionId) return false;
  if (filters.sizeType) {
    const pair = `${item.container_size_code_id ?? ""}:${item.container_type_code_id ?? ""}`;
    if (pair !== filters.sizeType) return false;
  }
  return true;
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
