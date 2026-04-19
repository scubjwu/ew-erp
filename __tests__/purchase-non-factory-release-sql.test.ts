import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("purchase non-factory release SQL contract", () => {
  it("resolves RELEASED from item-level offline dates instead of vendor release date", () => {
    const migrationPath = path.join(
      process.cwd(),
      "db",
      "supabase",
      "migrations",
      "20260419150000_purchase_non_factory_release_by_item.sql"
    );
    const sql = fs.readFileSync(migrationPath, "utf8");

    expect(sql).toContain("count(*) filter (where offline_date is not null)");
    expect(sql).toContain("from public.purchase_order_item");
    expect(sql).toContain("if v_item_count > 0 and v_released_item_count = v_item_count then");
    expect(sql).not.toContain("if v_order.vendor_release_date is not null then");
  });
});
