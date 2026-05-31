import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("customer depot foundation migration contract", () => {
  it("creates customer_depot with customer/city links and default-depot guardrails", () => {
    const migrationPath = path.join(
      process.cwd(),
      "db",
      "supabase",
      "migrations",
      "20260530130000_customer_depot_foundation.sql"
    );
    const sql = fs.readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create table if not exists public.customer_depot");
    expect(sql).toContain("customer_id uuid not null");
    expect(sql).toContain("city_code text not null");
    expect(sql).toContain("depot_name text not null");
    expect(sql).toContain("depot_address text");
    expect(sql).toContain("depot_contact_person text");
    expect(sql).toContain("depot_tel text");
    expect(sql).toContain("contact_email text");
    expect(sql).toContain("is_default boolean not null default false");
    expect(sql).toContain("status text not null default 'ACTIVE'");
    expect(sql).toContain("add constraint customer_depot_customer_id_fkey");
    expect(sql).toContain(
      "foreign key (customer_id) references public.customers(id)"
    );
    expect(sql).toContain("add constraint customer_depot_city_code_fkey");
    expect(sql).toContain(
      "foreign key (city_code) references public.cities(city_code)"
    );
    expect(sql).toContain("add constraint customer_depot_status_check");
    expect(sql).toContain("create unique index if not exists uq_customer_depot_customer_city_name");
    expect(sql).toContain("create unique index if not exists uq_customer_depot_default_per_customer");
    expect(sql).toContain("where is_default = true");
    expect(sql).toContain("create index if not exists idx_customer_depot_customer_city");
    expect(sql).toContain("notify pgrst, 'reload schema'");
  });
});
