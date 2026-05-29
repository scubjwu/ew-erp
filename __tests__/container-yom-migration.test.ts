import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("container yom migration contract", () => {
  it("adds container.yom and backfills from purchase_order_container.yom", () => {
    const migrationPath = path.join(
      process.cwd(),
      "db",
      "supabase",
      "migrations",
      "20260525203000_container_yom.sql"
    );
    const sql = fs.readFileSync(migrationPath, "utf8");

    expect(sql).toContain('add column if not exists yom integer');
    expect(sql).toContain("check (yom is null or yom between 1900 and 2100)");
    expect(sql).toContain("update public.container c");
    expect(sql).toContain("from ranked_purchase_container_yom");
    expect(sql).toContain("poc.yom between 1900 and 2100");
    expect(sql).not.toContain("manufacture_date");
  });
});
