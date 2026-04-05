import { describe, expect, it } from "vitest";

import {
  DEFAULT_MATERIAL_VENDOR_SORT,
  MATERIAL_VENDOR_SORT_COLUMN_MAP,
  normalizeLike,
  resolveMaterialVendorSort,
} from "@/app/partners/material-vendors/query-helpers";

describe("material vendor query helpers", () => {
  it("defaults to vendor_code ascending sort", () => {
    expect(resolveMaterialVendorSort(undefined, undefined)).toEqual(
      DEFAULT_MATERIAL_VENDOR_SORT
    );
  });

  it("normalizes supported sort fields and directions", () => {
    expect(resolveMaterialVendorSort("currentPrepaidBalance", "desc")).toEqual({
      sortBy: "currentPrepaidBalance",
      sortDirection: "desc",
    });
    expect(MATERIAL_VENDOR_SORT_COLUMN_MAP.currentPrepaidBalance).toEqual({
      column: "settlement_current_prepaid_balance",
    });
  });

  it("trims fuzzy-match values", () => {
    expect(normalizeLike("  DB0001  ")).toBe("%DB0001%");
    expect(normalizeLike("")).toBeNull();
  });
});
