import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("sales order header presale fields migration contract", () => {
  it("adds presale header fields to sales_order and compensation fields to sales_item", () => {
    const migrationPath = path.join(
      process.cwd(),
      "db",
      "supabase",
      "migrations",
      "20260530143000_sales_order_header_presale_fields.sql"
    );
    const sql = fs.readFileSync(migrationPath, "utf8");

    expect(sql).toContain("add column if not exists payment_term_days integer not null default 0");
    expect(sql).toContain("add column if not exists sales_rep_id uuid");
    expect(sql).toContain("add column if not exists customer_depot_id uuid");
    expect(sql).toContain("add column if not exists customer_depot_name text");
    expect(sql).toContain("add column if not exists customer_depot_address text");
    expect(sql).toContain("add column if not exists customer_depot_tel text");
    expect(sql).toContain("add column if not exists financial_status text not null default 'UNPAID'");
    expect(sql).toContain("add column if not exists ordered_qty integer not null default 0");
    expect(sql).toContain("add column if not exists deposit_amount numeric(18,2) not null default 0");
    expect(sql).toContain("add column if not exists deposit_percent numeric(7,4) not null default 0");
    expect(sql).toContain("add column if not exists deposit_invoice_id uuid");
    expect(sql).toContain("add column if not exists completed_at timestamptz");

    expect(sql).toContain("add column if not exists compensation_amount numeric(18,2) not null default 0");
    expect(sql).toContain("add column if not exists compensation_currency text not null default 'USD'");

    expect(sql).toContain("add constraint sales_order_sales_rep_id_fkey");
    expect(sql).toContain("foreign key (sales_rep_id) references public.users(id)");
    expect(sql).toContain("add constraint sales_order_customer_depot_id_fkey");
    expect(sql).toContain("foreign key (customer_depot_id) references public.customer_depot(id)");
    expect(sql).toContain("add constraint sales_order_deposit_invoice_id_fkey");
    expect(sql).toContain("foreign key (deposit_invoice_id) references public.business_invoice(id)");

    expect(sql).toContain("add constraint sales_order_financial_status_check");
    expect(sql).toContain("financial_status = any (array['UNPAID'::text, 'PARTIAL'::text, 'PAID'::text, 'CANCELLED'::text])");
    expect(sql).toContain("add constraint sales_order_ordered_qty_check");
    expect(sql).toContain("check (ordered_qty >= 0)");
    expect(sql).toContain("add constraint sales_order_deposit_amount_check");
    expect(sql).toContain("check (deposit_amount >= 0::numeric)");
    expect(sql).toContain("add constraint sales_order_deposit_percent_check");
    expect(sql).toContain("check (deposit_percent >= 0::numeric and deposit_percent <= 1::numeric)");

    expect(sql).toContain("add constraint sales_item_compensation_amount_check");
    expect(sql).toContain("check (compensation_amount >= 0::numeric)");
    expect(sql).toContain("add constraint sales_item_compensation_currency_check");
    expect(sql).toContain("check (compensation_currency in ('USD', 'CNY', 'HKD', 'EUR', 'JPY', 'SGD', 'AUD', 'CAD'))");
    expect(sql).toContain("notify pgrst, 'reload schema'");
  });
});
