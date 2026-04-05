import { describe, expect, it } from "vitest";

import {
  CUSTOMER_SORT_COLUMN_MAP,
  DEFAULT_CUSTOMER_SORT,
  normalizeLike,
  resolveCustomerSort,
} from "@/app/customers/query-helpers";

describe("customer query helpers", () => {
  it("defaults to customer ID ascending sort", () => {
    expect(resolveCustomerSort(undefined, undefined)).toEqual(DEFAULT_CUSTOMER_SORT);
  });

  it("normalizes supported sort fields and directions", () => {
    expect(resolveCustomerSort("creditLimit", "desc")).toEqual({
      sortBy: "creditLimit",
      sortDirection: "desc",
    });
    expect(CUSTOMER_SORT_COLUMN_MAP.creditLimit).toEqual({
      column: "credit_limit",
    });
  });

  it("trims fuzzy-match values", () => {
    expect(normalizeLike("  CX0001  ")).toBe("%CX0001%");
    expect(normalizeLike("")).toBeNull();
  });
});
