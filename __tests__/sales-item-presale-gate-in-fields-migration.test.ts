import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("sales item presale gate-in fields migration contract", () => {
  it("adds release/gate-in container-level fields without changing sales_delivery status enum", () => {
    const migrationPath = path.join(
      process.cwd(),
      "db",
      "supabase",
      "migrations",
      "20260530152000_sales_item_presale_gate_in_fields.sql"
    );
    const sql = fs.readFileSync(migrationPath, "utf8");

    expect(sql).toContain("add column if not exists sales_delivery_id uuid");
    expect(sql).toContain("add column if not exists gate_in_date date");
    expect(sql).toContain("add column if not exists cancel_reason text");
    expect(sql).toContain("add column if not exists cancelled_at timestamptz");
    expect(sql).toContain("add constraint sales_item_sales_delivery_id_fkey");
    expect(sql).toContain(
      "foreign key (sales_delivery_id) references public.sales_delivery(id)"
    );
    expect(sql).toContain("notify pgrst, 'reload schema'");
  });
});
