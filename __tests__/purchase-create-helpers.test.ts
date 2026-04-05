import { describe, expect, it } from "vitest";

import {
  computeLineAmount,
  computeTotals,
  formatPoNumberDatePart,
  generatePurchaseOrderNumber,
  getDefaultConditionCode,
  getNextPurchaseOrderSequence,
  shouldShowEstimatedOfflineTime,
  shouldShowMaterialTypes,
  shouldShowVendorReleaseFields,
} from "@/app/purchase/po-management/create-helpers";

describe("purchase create helpers", () => {
  it("applies purchase type visibility rules", () => {
    expect(shouldShowEstimatedOfflineTime("FACTORY_ORDER")).toBe(true);
    expect(shouldShowEstimatedOfflineTime("USED_CONTAINER")).toBe(false);
    expect(shouldShowVendorReleaseFields("NEW_CONTAINER")).toBe(true);
    expect(shouldShowVendorReleaseFields("FACTORY_ORDER")).toBe(false);
    expect(shouldShowMaterialTypes("FACTORY_ORDER")).toBe(true);
    expect(shouldShowMaterialTypes("USED_CONTAINER")).toBe(false);
  });

  it("uses the agreed default condition codes", () => {
    expect(getDefaultConditionCode("FACTORY_ORDER")).toBe("Brand New");
    expect(getDefaultConditionCode("NEW_CONTAINER")).toBe("Brand New");
    expect(getDefaultConditionCode("USED_CONTAINER")).toBe("CW");
  });

  it("builds PO numbers with MMDDX date logic and next sequence", () => {
    expect(formatPoNumberDatePart("2026-04-04", 3)).toBe("04043");
    expect(
      getNextPurchaseOrderSequence({
        existingOrderNumbers: ["POCOS04041", "POCOS04042"],
        supplierName: "COSCO Shipping",
        purchaseDate: "2026-04-04",
      })
    ).toBe(3);
    expect(
      generatePurchaseOrderNumber({
        supplierName: "COSCO Shipping",
        purchaseDate: "2026-04-04",
        sequence: 3,
      })
    ).toBe("POCOS04043");
  });

  it("uses pinyin initials for chinese supplier names", () => {
    expect(
      generatePurchaseOrderNumber({
        supplierName: "付定金箱厂",
        purchaseDate: "2026-04-05",
        sequence: 1,
      })
    ).toBe("POFDJ04051");

    expect(
      generatePurchaseOrderNumber({
        supplierName: "给额度箱厂",
        purchaseDate: "2026-04-05",
        sequence: 1,
      })
    ).toBe("POGED04051");
  });

  it("computes item totals from planned qty and unit price", () => {
    expect(computeLineAmount(2, 1250)).toBe(2500);
    expect(
      computeTotals([
        {
          locationCityId: null,
          depotId: null,
          containerSizeCodeId: null,
          containerTypeCodeId: null,
          containerConditionCodeId: null,
          color: "RAL5002",
          flp: false,
          lbx: false,
          lockingBarsCount: null,
          ventsCount: null,
          machineType: null,
          yom: null,
          offlineDate: null,
          plannedQty: 2,
          unitPrice: 1200,
          lineAmount: 2400,
          remark: null,
        },
        {
          locationCityId: null,
          depotId: null,
          containerSizeCodeId: null,
          containerTypeCodeId: null,
          containerConditionCodeId: null,
          color: "RAL1000",
          flp: false,
          lbx: false,
          lockingBarsCount: null,
          ventsCount: null,
          machineType: null,
          yom: null,
          offlineDate: null,
          plannedQty: 3,
          unitPrice: 500,
          lineAmount: 1500,
          remark: null,
        },
      ])
    ).toEqual({
      totalPlannedQty: 5,
      totalAmount: 3900,
    });
  });
});
