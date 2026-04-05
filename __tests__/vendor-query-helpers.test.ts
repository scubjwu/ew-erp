import { describe, expect, it } from "vitest";

import {
  DEFAULT_VENDOR_SORT,
  normalizeLike,
  resolveRegionFilter,
  resolveVendorSort,
  VENDOR_SORT_COLUMN_MAP,
} from "@/app/partners/vendors/query-helpers";

describe("vendor query helpers", () => {
  it("defaults to vendor_code ascending sort", () => {
    expect(resolveVendorSort(undefined, undefined)).toEqual(DEFAULT_VENDOR_SORT);
  });

  it("normalizes supported sort fields and directions", () => {
    expect(resolveVendorSort("currentPrepaidBalance", "desc")).toEqual({
      sortBy: "currentPrepaidBalance",
      sortDirection: "desc",
    });
    expect(VENDOR_SORT_COLUMN_MAP.currentPrepaidBalance).toEqual({
      column: "settlement_current_prepaid_balance",
    });
  });

  it("trims fuzzy-match values", () => {
    expect(normalizeLike("  ABC  ")).toBe("%ABC%");
    expect(normalizeLike("")).toBeNull();
  });

  it("prioritizes selectedRegionId over free-text regionQuery", () => {
    expect(
      resolveRegionFilter({
        selectedRegionId: "region-1",
        regionQuery: "China",
      })
    ).toEqual({
      selectedRegionId: "region-1",
      regionQuery: "",
    });

    expect(
      resolveRegionFilter({
        selectedRegionId: "",
        regionQuery: "China",
      })
    ).toEqual({
      selectedRegionId: "",
      regionQuery: "China",
    });
  });
});
