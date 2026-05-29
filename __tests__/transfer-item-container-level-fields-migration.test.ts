import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("transfer item container-level fields migration contract", () => {
  it("adds date and text fields for dispatch-release container-level metadata", () => {
    const migrationPath = path.join(
      process.cwd(),
      "db",
      "supabase",
      "migrations",
      "20260526090000_transfer_item_container_level_fields.sql"
    );
    const sql = fs.readFileSync(migrationPath, "utf8");

    expect(sql).toContain("add column if not exists eta date");
    expect(sql).toContain("add column if not exists gate_in_ref text");
    expect(sql).toContain("add column if not exists return_depot_name text");
    expect(sql).toContain("add column if not exists return_depot_address text");
    expect(sql).toContain("add column if not exists return_depot_tel text");
    expect(sql).toContain("add column if not exists arrange_date date");
    expect(sql).toContain("add column if not exists customer_order_num text");
    expect(sql).toContain("add column if not exists remark2 text");
    expect(sql).toContain("notify pgrst, 'reload schema'");
  });
});
