import { describe, expect, it } from "vitest";

import { buildPurchaseOrderExportRows } from "@/lib/purchase-order-export";
import type { PurchaseOrderManagementRow } from "@/app/purchase/po-management/actions";

function buildManagementRow(
  overrides: Partial<PurchaseOrderManagementRow> = {}
): PurchaseOrderManagementRow {
  return {
    id: "po-1",
    orderNo: "PO-001",
    purchaseType: "USED_CONTAINER",
    supplierId: "vendor-1",
    ownerId: null,
    buyerId: null,
    purchaseDate: "2026-04-10",
    estimatedOfflineTime: null,
    contractNumber: "CT-001",
    invoiceNumber: "INV-001",
    freeday: 7,
    vendorReleaseDate: null,
    remark: null,
    exchangeRate: 1,
    orderStatus: "RELEASED",
    inboundStatus: "PARTIAL",
    paymentMode: "PREPAYMENT",
    paymentAccount: null,
    dueDate: null,
    totalPlannedQty: 2,
    totalReceivedQty: 0,
    totalAvailableQty: 1,
    grandTotal: 2500,
    totalAmountPaid: 300,
    totalAmountUnpaid: 2200,
    settlementPaymentTerm: null,
    settlementCreditDays: null,
    settlementCreditLimit: null,
    settlementAdvancePaymentPercentage: null,
    settlementBalanceTriggerEvent: null,
    settlementCurrency: "USD",
    settlementPrepaymentPool: false,
    settlementPrepaymentThreshold: 0,
    settlementCurrentPrepaidBalance: 1200,
    vendorBankInformation: null,
    createdAt: "2026-04-10T00:00:00Z",
    updatedAt: "2026-04-10T00:00:00Z",
    supplier: null,
    owner: null,
    buyer: null,
    primaryLocation: "SHA",
    primarySizeCode: "20",
    primaryTypeCode: "DV",
    primaryConditionCode: "CW",
    primaryColor: "RAL1001",
    earliestEstimatedOfflineDate: "2026-04-11",
    earliestFreedayExpiryDate: "2026-04-18",
    remainingQty: 1,
    cancelledQty: 0,
    locationLabel: "SHA",
    vendorLabel: "Vendor One",
    sizeTypeLabel: "20DV",
    conditionLabel: "CW",
    prepaidBalance: 1200,
    ...overrides,
  };
}

function buildItem(
  overrides: Partial<{
    id: string;
    purchaseOrderId: string;
    lineNo: number;
    vendorReleaseNumber: string | null;
    locationCode: string | null;
    sizeCode: string | null;
    typeCode: string | null;
    conditionCode: string | null;
    color: string | null;
    plannedQty: number | null;
    lineAmount: number | null;
  }> = {}
) {
  return {
    id: "item-1",
    purchaseOrderId: "po-1",
    lineNo: 1,
    vendorReleaseNumber: null,
    locationCode: "SHA",
    sizeCode: "20",
    typeCode: "DV",
    conditionCode: "CW",
    color: "RAL1001",
    plannedQty: 1,
    lineAmount: 1250,
    ...overrides,
  };
}

describe("buildPurchaseOrderExportRows", () => {
  it("splits one purchase order into multiple export rows by item vendor release number", () => {
    const rows = buildPurchaseOrderExportRows(
      [buildManagementRow()],
      new Map([
        [
          "po-1",
          [
            buildItem({
              id: "item-2",
              lineNo: 2,
              vendorReleaseNumber: "VRN-002",
              locationCode: "USLAX",
              sizeCode: "40",
              typeCode: "RH",
              conditionCode: "Brand New",
              color: "RAL3005",
              plannedQty: 3,
              lineAmount: 999,
            }),
            buildItem({
              id: "item-1",
              lineNo: 1,
              vendorReleaseNumber: "VRN-001",
              locationCode: "USLAX",
              sizeCode: "20",
              typeCode: "GP",
              conditionCode: "Brand New",
              color: "RAL1001",
              plannedQty: 1,
              lineAmount: 111,
            }),
          ],
        ],
      ])
    );

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.vendorReleaseNo)).toEqual(["VRN-001", "VRN-002"]);
    expect(rows.map((row) => row.sizeType)).toEqual(["20GP", "40RH"]);
    expect(rows.map((row) => row.color)).toEqual(["RAL1001", "RAL3005"]);
    expect(rows.map((row) => row.quantity)).toEqual([1, 3]);
    expect(rows.map((row) => row.itemTotal)).toEqual([111, 999]);
    expect(rows[0].orderNo).toBe("PO-001");
    expect(rows[0].supplierInvoiceNo).toBe("INV-001");
    expect(rows[0].contractNo).toBe("CT-001");
    expect(rows[0].freeDay).toBe(7);
    expect(rows[0].poTotal).toBe(2500);
    expect(rows[0].paidAmount).toBe(300);
    expect(rows[0].unpaidAmount).toBe(2200);
  });

  it("keeps an export row when an item has no vendor release number", () => {
    const rows = buildPurchaseOrderExportRows(
      [buildManagementRow()],
      new Map([["po-1", [buildItem({ vendorReleaseNumber: null, plannedQty: 2, lineAmount: 500 })]]])
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].vendorReleaseNo).toBeNull();
    expect(rows[0].quantity).toBe(2);
    expect(rows[0].itemTotal).toBe(500);
  });

  it("emits a fallback row when the purchase order has no items", () => {
    const rows = buildPurchaseOrderExportRows([buildManagementRow()], new Map());

    expect(rows).toHaveLength(1);
    expect(rows[0].vendorReleaseNo).toBeNull();
    expect(rows[0].orderNo).toBe("PO-001");
    expect(rows[0].quantity).toBeNull();
    expect(rows[0].itemTotal).toBeNull();
  });
});
