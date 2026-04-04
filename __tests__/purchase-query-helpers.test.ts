import { describe, expect, it } from "vitest";

import {
  applyQuickFilterDates,
  firstPurchaseItemByOrder,
  groupPurchaseItemsByOrder,
  normalizeRalLikeSearch,
  rowMatchesAnyPurchaseItem,
} from "@/app/purchase/po-management/query-helpers";

describe("purchase query helpers", () => {
  it("matches aggregated item filters when any purchase item qualifies", () => {
    const grouped = groupPurchaseItemsByOrder([
      {
        purchase_order_id: "po-1",
        line_no: 2,
        color: "RAL3020",
        location_city_id: "city-2",
        container_size_code_id: "size-2",
        container_type_code_id: "type-2",
        container_condition_code_id: "condition-2",
        location_code: "USLAX",
        location_name: "Los Angeles",
        size_code: "40",
        type_code: "HC",
        condition_code: "ASIS",
      },
      {
        purchase_order_id: "po-1",
        line_no: 1,
        color: "RAL1001",
        location_city_id: "city-1",
        container_size_code_id: "size-1",
        container_type_code_id: "type-1",
        container_condition_code_id: "condition-1",
        location_code: "ADWEN",
        location_name: "Wien",
        size_code: "20",
        type_code: "GP",
        condition_code: "CW",
      },
    ]);

    expect(
      rowMatchesAnyPurchaseItem(grouped.get("po-1"), {
        locationCityId: "lax",
        color: "",
        sizeType: "",
        conditionId: "",
      })
    ).toBe(true);

    expect(
      rowMatchesAnyPurchaseItem(grouped.get("po-1"), {
        locationCityId: "",
        color: "ral3020",
        sizeType: "hc",
        conditionId: "asis",
      })
    ).toBe(true);

    expect(
      rowMatchesAnyPurchaseItem(grouped.get("po-1"), {
        locationCityId: "",
        color: "",
        sizeType: "20gp",
        conditionId: "cw",
      })
    ).toBe(true);
  });

  it("keeps the first display item stable by line number", () => {
    const grouped = groupPurchaseItemsByOrder([
      {
        purchase_order_id: "po-1",
        line_no: 3,
        color: "RAL1018",
        location_city_id: "city-3",
        container_size_code_id: "size-3",
        container_type_code_id: "type-3",
        container_condition_code_id: "condition-3",
      },
      {
        purchase_order_id: "po-1",
        line_no: 1,
        color: "RAL1001",
        location_city_id: "city-1",
        container_size_code_id: "size-1",
        container_type_code_id: "type-1",
        container_condition_code_id: "condition-1",
      },
    ]);

    const firstItems = firstPurchaseItemByOrder(grouped);
    expect(firstItems.get("po-1")?.line_no).toBe(1);
  });

  it("converts quick filters into explicit date ranges", () => {
    const now = new Date("2026-04-10T18:45:00Z");

    expect(applyQuickFilterDates("today", now)).toEqual({
      orderDateFrom: "2026-04-10",
      orderDateTo: "2026-04-10",
    });
    expect(applyQuickFilterDates("last7", now)).toEqual({
      orderDateFrom: "2026-04-04",
      orderDateTo: "2026-04-10",
    });
    expect(applyQuickFilterDates("lastMonth", now)).toEqual({
      orderDateFrom: "2026-03-01",
      orderDateTo: "2026-03-31",
    });
  });

  it("normalizes RAL-like input by stripping spaces and uppercasing", () => {
    expect(normalizeRalLikeSearch(" ral 5002 ")).toBe("RAL5002");
  });
});
