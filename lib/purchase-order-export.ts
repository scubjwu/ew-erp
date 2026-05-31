import type { PurchaseOrderManagementRow } from "@/app/purchase/po-management/actions";

type PurchaseOrderExportItem = {
  lineNo?: number;
  line_no?: number;
  vendorReleaseNumber?: string | null;
  vendor_release_number?: string | null;
  locationCode?: string | null;
  location_code?: string | null;
  sizeCode?: string | null;
  size_code?: string | null;
  typeCode?: string | null;
  type_code?: string | null;
  conditionCode?: string | null;
  condition_code?: string | null;
  color?: string | null;
  plannedQty?: number | null;
  planned_qty?: number | null;
  lineAmount?: number | null;
  line_amount?: number | null;
};

export type PurchaseOrderExportRow = {
  orderDate: string | null;
  orderNo: string;
  vendor: string | null;
  supplierInvoiceNo: string | null;
  contractNo: string | null;
  vendorReleaseNo: string | null;
  location: string | null;
  sizeType: string | null;
  condition: string | null;
  color: string | null;
  freeDay: number | null;
  poTotal: number;
  itemTotal: number | null;
  paidAmount: number | null;
  unpaidAmount: number | null;
  quantity: number | null;
  earliestEstimatedOfflineDate: string | null;
  earliestFreedayExpiryDate: string | null;
  plannedQty: number;
  availableQty: number;
  remainingQty: number;
  cancelledQty: number;
  prepaidBalance: number;
  status: string;
};

function buildSizeType(item: PurchaseOrderExportItem | null, row: PurchaseOrderManagementRow) {
  const sizeCode = item?.sizeCode ?? item?.size_code ?? null;
  const typeCode = item?.typeCode ?? item?.type_code ?? null;
  if (sizeCode || typeCode) return `${sizeCode ?? ""}${typeCode ?? ""}` || null;
  return row.sizeTypeLabel;
}

export function buildPurchaseOrderExportRow(
  row: PurchaseOrderManagementRow,
  item: PurchaseOrderExportItem | null
): PurchaseOrderExportRow {
  const quantity = item?.plannedQty ?? item?.planned_qty ?? null;
  const itemTotal = item?.lineAmount ?? item?.line_amount ?? null;
  return {
      orderDate: row.purchaseDate,
      orderNo: row.orderNo,
      vendor: row.vendorLabel,
      supplierInvoiceNo: row.invoiceNumber,
      contractNo: row.contractNumber,
      vendorReleaseNo: item?.vendorReleaseNumber ?? item?.vendor_release_number ?? null,
      location: item?.locationCode ?? item?.location_code ?? row.locationLabel,
      sizeType: buildSizeType(item, row),
      condition: item?.conditionCode ?? item?.condition_code ?? row.conditionLabel,
      color: item?.color ?? row.primaryColor ?? null,
      freeDay: row.freeday,
      poTotal: row.grandTotal,
      itemTotal,
      paidAmount: row.totalAmountPaid,
      unpaidAmount: row.totalAmountUnpaid,
      quantity,
      earliestEstimatedOfflineDate: row.earliestEstimatedOfflineDate ?? null,
      earliestFreedayExpiryDate: row.earliestFreedayExpiryDate ?? null,
      plannedQty: row.totalPlannedQty,
      availableQty: row.totalAvailableQty,
      remainingQty: row.remainingQty,
      cancelledQty: row.cancelledQty,
      prepaidBalance: row.prepaidBalance,
      status: row.orderStatus,
  };
}

export function buildPurchaseOrderExportRows(
  rows: PurchaseOrderManagementRow[],
  itemsByOrder: Map<string, PurchaseOrderExportItem[]>
): PurchaseOrderExportRow[] {
  return rows.flatMap((row) => {
    const items = [...(itemsByOrder.get(row.id) ?? [])].sort(
      (left, right) => (left.lineNo ?? left.line_no ?? 0) - (right.lineNo ?? right.line_no ?? 0)
    );
    const exportItems = items.length > 0 ? items : [null];
    return exportItems.map((item) => buildPurchaseOrderExportRow(row, item));
  });
}
