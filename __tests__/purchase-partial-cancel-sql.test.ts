import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("purchase partial cancel SQL contract", () => {
  it("selects the last eligible containers by container number order", () => {
    const migrationPath = path.join(
      process.cwd(),
      "db",
      "supabase",
      "migrations",
      "20260419170000_purchase_partial_cancel_tail_by_container_number.sql"
    );
    const sql = fs.readFileSync(migrationPath, "utf8");

    expect(sql).toContain("order by poc.container_number desc");
    expect(sql).not.toContain("order by poc.id desc");
    expect(sql).toContain("limit p_cancel_qty");
    expect(sql).toContain("coalesce(poc.container_status, '') <> 'CANCELLED'");
    expect(sql).toContain("nullif(trim(coalesce(poc.container_number, '')), '') is not null");
  });
});
