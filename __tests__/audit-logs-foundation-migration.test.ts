import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("audit logs foundation migration contract", () => {
  it("creates a generic audit_logs table that can cover sale order, item, container, and customer depot changes", () => {
    const migrationPath = path.join(
      process.cwd(),
      "db",
      "supabase",
      "migrations",
      "20260530162000_audit_logs_foundation.sql"
    );
    const sql = fs.readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.audit_logs");
    expect(sql).toContain("business_type text not null");
    expect(sql).toContain("business_id uuid");
    expect(sql).toContain("entity_table text not null");
    expect(sql).toContain("entity_id uuid not null");
    expect(sql).toContain("action text not null");
    expect(sql).toContain("reason text");
    expect(sql).toContain("before_data jsonb not null default '{}'::jsonb");
    expect(sql).toContain("after_data jsonb not null default '{}'::jsonb");
    expect(sql).toContain("performed_by uuid");
    expect(sql).toContain("created_at timestamptz not null default now()");
    expect(sql).toContain("add constraint audit_logs_performed_by_fkey");
    expect(sql).toContain(
      "foreign key (performed_by) references public.users(id)"
    );
    expect(sql).toContain("create index if not exists idx_audit_logs_business");
    expect(sql).toContain("create index if not exists idx_audit_logs_entity");
    expect(sql).toContain(
      "create index if not exists idx_audit_logs_created_at_desc"
    );
    expect(sql).toContain("notify pgrst, 'reload schema'");

    expect(sql).not.toContain("sales_item_id");
    expect(sql).not.toContain("container_id");
    expect(sql).not.toContain("customer_depot_id");
  });
});
