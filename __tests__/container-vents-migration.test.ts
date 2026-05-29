import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("container vents migration contract", () => {
  it("converts container.vents to integer and backfills from purchase_order_container.vents_count", () => {
    const migrationPath = path.join(
      process.cwd(),
      "db",
      "supabase",
      "migrations",
      "20260526003100_container_vents_quantity.sql"
    );
    const sql = fs.readFileSync(migrationPath, "utf8");

    expect(sql).toContain("add column if not exists vents_quantity integer");
    expect(sql).toContain("alter column vents drop default");
    expect(sql).toContain("drop column if exists vents");
    expect(sql).toContain("rename column vents_quantity to vents");
    expect(sql).toContain("check (vents is null or vents >= 0)");
    expect(sql).toContain("from ranked_purchase_container_vents");
    expect(sql).toContain("poc.vents_count >= 0");
    expect(sql).not.toContain("when vents = true then 1");
    expect(sql).not.toContain("when vents then 1");
  });
});
