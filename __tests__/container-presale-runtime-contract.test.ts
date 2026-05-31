import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("container presale runtime contract", () => {
  it("keeps GATEBUY_PENDING as a legal IN_TRANSIT status with current sale/customer links", () => {
    const remoteSchemaPath = path.join(
      process.cwd(),
      "db",
      "supabase",
      "migrations",
      "20260329221538_remote_schema.sql"
    );
    const inventoryFixPath = path.join(
      process.cwd(),
      "db",
      "supabase",
      "migrations",
      "20260330035000_inventory_consistency_fix_final.sql"
    );

    const remoteSchemaSql = fs.readFileSync(remoteSchemaPath, "utf8");
    const inventoryFixSql = fs.readFileSync(inventoryFixPath, "utf8");

    expect(remoteSchemaSql).toContain('"current_customer_id" uuid');
    expect(remoteSchemaSql).toContain('"current_sale_id" uuid');
    expect(remoteSchemaSql).toContain("container_current_customer_id_fkey");
    expect(remoteSchemaSql).toContain("fk_container_current_sale");
    expect(remoteSchemaSql).toContain(
      "lifecycle_stage = 'IN_TRANSIT'::text) AND (status = ANY (ARRAY['ONHIRE_IN_TRANSIT'::text, 'GATEBUY_PENDING'::text, 'EW_DEPOT_PENDING'::text, 'MISUSE'::text, 'THIRD_PARTY_TRANSIT'::text]))"
    );

    expect(remoteSchemaSql).not.toContain("IN_TRANSIT_SOLD");
    expect(inventoryFixSql).toContain("current_sale_id = p_sales_order_id");
    expect(inventoryFixSql).toContain("current_customer_id = v_customer_id");
  });
});
