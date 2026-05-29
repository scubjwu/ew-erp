import { describe, expect, it } from "vitest";

import { buildTransferFinancePackage } from "@/lib/dispatch-release-finance";
import type {
  TransferFinanceItemSnapshot,
  TransferFinanceOrderSnapshot,
} from "@/types/dispatch-finance";

function buildOrderSnapshot(
  overrides: Partial<TransferFinanceOrderSnapshot> = {}
): TransferFinanceOrderSnapshot {
  return {
    id: "transfer-1",
    dispatchVendorId: "vendor-1",
    releaseDate: "2026-05-25",
    pickupCharge: 150,
    dpp: 100,
    freeDays: 90,
    rv: 2000,
    dailyRent: 1,
    truckingCost: 0,
    handlingFee: 0,
    headerCurrency: "USD",
    itemCostCurrency: "USD",
    currency: "USD",
    ...overrides,
  };
}

function buildTransferItem(
  id: string,
  overrides: Partial<TransferFinanceItemSnapshot> = {}
): TransferFinanceItemSnapshot {
  return {
    id,
    containerId: `container-${id}`,
    pickupDate: "2026-05-25",
    returnDate: null,
    truckingCost: 0,
    truckingCostCurrency: "USD",
    repairCost: 0,
    repairCostCurrency: "USD",
    damageClaim: 0,
    damageClaimCurrency: "USD",
    ...overrides,
  };
}

describe("dispatch release finance", () => {
  it("treats pick-up charge as a per-container revenue", () => {
    const financePackage = buildTransferFinancePackage(buildOrderSnapshot(), [
      buildTransferItem("1"),
      buildTransferItem("2"),
      buildTransferItem("3"),
      buildTransferItem("4"),
      buildTransferItem("5"),
    ]);

    expect(financePackage.revenues).toHaveLength(5);
    expect(financePackage.revenues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          revenueCode: "PUC",
          amount: 150,
          currency: "USD",
          containerId: "container-1",
          remark: "Dispatch release pick-up charge",
        }),
        expect.objectContaining({
          revenueCode: "PUC",
          amount: 150,
          currency: "USD",
          containerId: "container-5",
          remark: "Dispatch release pick-up charge",
        }),
      ])
    );
    expect(financePackage.financeRecords).toEqual([
      expect.objectContaining({
        recordType: "RECEIVABLE",
        amount: 750,
        currency: "USD",
      }),
    ]);
    expect(financePackage.totalRevenue).toBe(750);
  });

  it("allocates header handling fee evenly across containers while preserving total cents", () => {
    const financePackage = buildTransferFinancePackage(
      buildOrderSnapshot({
        pickupCharge: 0,
        handlingFee: 10,
      }),
      [buildTransferItem("1"), buildTransferItem("2"), buildTransferItem("3")]
    );

    expect(financePackage.costs).toEqual([
      expect.objectContaining({
        costCode: "HDL",
        amount: 3.34,
        containerId: "container-1",
      }),
      expect.objectContaining({
        costCode: "HDL",
        amount: 3.33,
        containerId: "container-2",
      }),
      expect.objectContaining({
        costCode: "HDL",
        amount: 3.33,
        containerId: "container-3",
      }),
    ]);
    expect(financePackage.totalCost).toBe(10);
  });

  it("calculates overdue rent per day per container after free days", () => {
    const financePackage = buildTransferFinancePackage(
      buildOrderSnapshot({
        pickupCharge: 0,
        freeDays: 10,
        dailyRent: 2,
      }),
      [
        buildTransferItem("1", { pickupDate: "2026-05-01" }),
        buildTransferItem("2", { pickupDate: "2026-05-01" }),
        buildTransferItem("3", { pickupDate: "2026-05-01" }),
      ],
      {
        cutoffDate: "2026-05-16",
        occurDate: "2026-05-16",
      }
    );

    expect(financePackage.revenues).toHaveLength(3);
    expect(financePackage.revenues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          revenueCode: "DMR",
          amount: 10,
          billableDays: 5,
          currency: "USD",
        }),
      ])
    );
    expect(financePackage.financeRecords).toEqual([
      expect.objectContaining({
        recordType: "RECEIVABLE",
        amount: 30,
        currency: "USD",
      }),
    ]);
    expect(financePackage.totalRevenue).toBe(30);
  });
});
