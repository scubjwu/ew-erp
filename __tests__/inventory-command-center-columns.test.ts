import { describe, expect, it } from "vitest";

import {
  ALL_GRID_COLUMNS,
  CSV_HEADERS,
} from "@/components/inventory/inventory-command-center";

describe("inventory command center default columns", () => {
  it("restores depot address and depot tel to the power table and CSV export", () => {
    expect(ALL_GRID_COLUMNS).toContain("depotAddr");
    expect(ALL_GRID_COLUMNS).toContain("depotTel");
    expect(CSV_HEADERS).toContain("DepotAddr");
    expect(CSV_HEADERS).toContain("DepotTel");
  });
});
