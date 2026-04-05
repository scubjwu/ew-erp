import { describe, expect, it } from "vitest";

import {
  CONTAINER_OWNER_SORT_COLUMN_MAP,
  DEFAULT_CONTAINER_OWNER_SORT,
  normalizeLike,
  resolveContainerOwnerSort,
  resolveRegionFilter,
} from "@/app/partners/container-owners/query-helpers";

describe("container owner query helpers", () => {
  it("defaults to container_owner_code ascending sort", () => {
    expect(resolveContainerOwnerSort(undefined, undefined)).toEqual(
      DEFAULT_CONTAINER_OWNER_SORT
    );
  });

  it("normalizes supported sort fields and directions", () => {
    expect(resolveContainerOwnerSort("currentPrepaidBalance", "desc")).toEqual({
      sortBy: "currentPrepaidBalance",
      sortDirection: "desc",
    });
    expect(CONTAINER_OWNER_SORT_COLUMN_MAP.region).toEqual({
      column: "region_code",
      foreignTable: "region",
    });
  });

  it("trims fuzzy-match values and prioritizes selected region", () => {
    expect(normalizeLike("  OABCDE  ")).toBe("%OABCDE%");
    expect(
      resolveRegionFilter({ selectedRegionId: "region-1", regionQuery: "China" })
    ).toEqual({
      selectedRegionId: "region-1",
      regionQuery: "",
    });
  });
});
