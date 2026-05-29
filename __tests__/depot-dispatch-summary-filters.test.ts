import { describe, expect, it } from "vitest";

import {
  buildSummaryBucketPartsFromDispatchSummaryContainerRow,
  matchesDispatchSummaryBucketFilters,
} from "@/lib/depot-dispatch-summary";

describe("dispatch summary bucket filters", () => {
  it("excludes container rows with missing location when a city filter is applied", () => {
    const bucket = buildSummaryBucketPartsFromDispatchSummaryContainerRow({
      location: null,
      depot: {
        depot_code: "USLAX003",
        depot_name: "Fast Lane Transportation Inc.",
      },
      size: { size_code: "20" },
      type: { type_code: "GP" },
      condition: { condition_code: "CW" },
      color: "RAL1001",
      machine_type: null,
    });

    const matches = matchesDispatchSummaryBucketFilters(bucket, {
      region: "",
      city: "CNSHA · Shanghai",
      depot: "",
      sizeType: "",
      condition: "",
      color: "",
      machineType: "",
    });

    expect(bucket.city).toBe("-");
    expect(matches).toBe(false);
  });

  it("matches Shanghai bucket labels against the full city label filter", () => {
    const bucket = buildSummaryBucketPartsFromDispatchSummaryContainerRow({
      location: {
        city_code: "CNSHA",
        city_name: "Shanghai",
        region: "CHINA",
      },
      depot: {
        depot_code: "CNSAVDP",
        depot_name: "vendor depot",
      },
      size: { size_code: "40" },
      type: { type_code: "HQ" },
      condition: { condition_code: "CW" },
      color: null,
      machine_type: null,
    });

    const matches = matchesDispatchSummaryBucketFilters(bucket, {
      region: "",
      city: "CNSHA · Shanghai",
      depot: "",
      sizeType: "",
      condition: "",
      color: "",
      machineType: "",
    });

    expect(bucket.city).toBe("CNSHA · Shanghai");
    expect(matches).toBe(true);
  });
});
