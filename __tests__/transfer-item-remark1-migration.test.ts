import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("transfer item remark1 migration contract", () => {
  it("adds transfer_item.remark1 as text and reloads schema", () => {
    const migrationPath = path.join(
      process.cwd(),
      "db",
      "supabase",
      "migrations",
      "20260530103000_transfer_item_remark1.sql"
    );
    const sql = fs.readFileSync(migrationPath, "utf8");

    expect(sql).toContain("add column if not exists remark1 text");
    expect(sql).toContain("notify pgrst, 'reload schema'");
  });
});
