#!/usr/bin/env python3

from __future__ import annotations

import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SEEDS_DIR = ROOT / "db" / "supabase" / "seeds"

TABLE_SPECS = [
    ("users", "20260401_partner_master_users.sql"),
    ("company_profiles", "20260330_basic_info_company_profiles.sql"),
    ("company_bank_accounts", "20260330_basic_info_company_bank_accounts.sql"),
    ("customers", "20260330_basic_info_customers.sql"),
    ("customer_certificate_links", "20260330_basic_info_customer_certificate_links.sql"),
    ("region_codes", "20260330_basic_info_region_codes.sql"),
    ("cities", "20260330_basic_info_cities.sql"),
    ("depots", "20260330_basic_info_depots.sql"),
    ("depot_attachment_links", "20260330_basic_info_depot_attachment_links.sql"),
    ("depot_additional_costs", "20260330_basic_info_depot_additional_costs.sql"),
    ("cost_codes", "20260330_basic_info_cost_codes.sql"),
    ("revenue_codes", "20260330_basic_info_revenue_codes.sql"),
    ("container_condition_codes", "20260330_basic_info_condition_codes.sql"),
    ("container_size_codes", "20260330_basic_info_size_codes.sql"),
    ("container_type_codes", "20260330_basic_info_type_codes.sql"),
    ("container_number_rules", "20260330_basic_info_container_number_rules.sql"),
    ("operation_price_configs", "20260330_basic_info_operation_price_configs.sql"),
    ("vendors", "20260401_partner_master_vendors.sql"),
    ("vendor_attachment_links", "20260401_partner_master_vendors_attachment_links.sql"),
    ("material_vendors", "20260401_partner_master_material_vendors.sql"),
    ("material_vendor_attachment_links", "20260401_partner_master_material_vendors_attachment_links.sql"),
    ("lessees", "20260401_partner_master_lessees.sql"),
    ("lessee_attachment_links", "20260401_partner_master_lessees_attachment_links.sql"),
    ("container_owners", "20260401_partner_master_container_owners.sql"),
    ("container_owner_attachment_links", "20260401_partner_master_container_owners_attachment_links.sql"),
]

def run_psql(sql: str) -> str:
    normalized_sql = " ".join(sql.split())
    result = subprocess.run(
        [
            "docker",
            "exec",
            "supabase_db_db",
            "psql",
            "-U",
            "postgres",
            "-d",
            "postgres",
            "-At",
            "-c",
            normalized_sql,
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or f"psql failed for SQL: {normalized_sql}")
    return result.stdout


def load_columns(table_name: str) -> list[str]:
    sql = f"""
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = '{table_name}'
order by ordinal_position;
"""
    output = run_psql(sql)
    return [line.strip() for line in output.splitlines() if line.strip()]


def load_column_types(table_name: str) -> dict[str, str]:
    sql = f"""
select column_name || ':' || data_type || ':' || udt_name
from information_schema.columns
where table_schema = 'public'
  and table_name = '{table_name}'
order by ordinal_position;
"""
    output = run_psql(sql)
    types: dict[str, str] = {}
    for line in output.splitlines():
        line = line.strip()
        if not line:
            continue
        column_name, data_type, udt_name = line.split(":", 2)
        types[column_name] = udt_name if data_type == "ARRAY" else data_type
    return types


def build_placeholder_seed(table_name: str) -> str:
    return (
        f"-- Skipped export for public.{table_name} because the table or columns are unavailable in the current local schema.\n"
        f"-- Run `npm run db:seed:export-basic-info` again after the schema is updated.\n"
    )


def build_select_sql(table_name: str, columns: list[str]) -> str:
    column_set = set(columns)

    if table_name == "customers":
        customer_sort = "c.company_name"
        if "customer_custom_id" in column_set:
            customer_sort = "c.customer_custom_id nulls last, c.company_name"
        elif "company_name" not in column_set and "id" in column_set:
            customer_sort = "c.id"

        extra = ""
        join = ""
        if "region_id" in column_set:
            extra = ", rc.region_code as __region_code_ref"
            join = "left join public.region_codes rc on rc.id = c.region_id"
        return f"""
select row_to_json(t)::text
from (
  select
    c.*{extra}
  from public.customers c
  {join}
  order by {customer_sort}
) as t;
"""

    if table_name == "customer_certificate_links":
        customer_columns = set(load_columns("customers"))
        customer_ref = "c.id::text"
        customer_sort = "c.id, l.id"
        if "customer_custom_id" in customer_columns:
            customer_ref = "c.customer_custom_id"
            customer_sort = "c.customer_custom_id, l.id"
        return """
select row_to_json(t)::text
from (
  select
    l.*,
    {customer_ref} as __customer_custom_id_ref
  from public.customer_certificate_links l
  join public.customers c on c.id = l.customer_id
  order by {customer_sort}
) as t;
""".format(customer_ref=customer_ref, customer_sort=customer_sort)

    if table_name == "cities":
        extra = ""
        join = ""
        if "region_id" in column_set:
            extra = ", rc.region_code as __region_code_ref"
            join = "left join public.region_codes rc on rc.id = c.region_id"
        return f"""
select row_to_json(t)::text
from (
  select
    c.*{extra}
  from public.cities c
  {join}
  order by c.city_code
) as t;
"""

    if table_name == "depots":
        city_extra = ""
        city_join = ""
        if "city_id" in column_set:
            city_extra = ", c.city_code as __city_code_ref"
            city_join = "left join public.cities c on c.id = d.city_id"

        region_extra = ""
        region_join = ""
        if "region_id" in column_set and "region" in column_set:
            region_extra = ", coalesce(rc.region_code, d.region) as __region_code_ref"
            region_join = "left join public.region_codes rc on rc.id = d.region_id"
        elif "region_id" in column_set:
            region_extra = ", rc.region_code as __region_code_ref"
            region_join = "left join public.region_codes rc on rc.id = d.region_id"
        elif "region" in column_set:
            region_extra = ", d.region as __region_code_ref"

        return f"""
select row_to_json(t)::text
from (
  select
    d.*{city_extra}{region_extra}
  from public.depots d
  {city_join}
  {region_join}
  order by d.depot_code
) as t;
"""

    if table_name == "operation_price_configs":
        size_extra = ""
        size_join = ""
        if "container_size_code_id" in column_set:
            size_extra = ", sz.size_code as __size_code_ref"
            size_join = "left join public.container_size_codes sz on sz.id = o.container_size_code_id"

        condition_extra = ""
        condition_join = ""
        if "container_condition_code_id" in column_set:
            condition_extra = ", cc.condition_code as __condition_code_ref"
            condition_join = "left join public.container_condition_codes cc on cc.id = o.container_condition_code_id"

        return f"""
select row_to_json(t)::text
from (
  select
    o.*{size_extra}{condition_extra}
  from public.operation_price_configs o
  {size_join}
  {condition_join}
  order by o.id
) as t;
"""

    if table_name == "container_number_rules":
        extra = ""
        join = ""
        if "container_size_code_id" in column_set:
            extra = ", sz.size_code as __size_code_ref"
            join = "left join public.container_size_codes sz on sz.id = r.container_size_code_id"
        return f"""
select row_to_json(t)::text
from (
  select
    r.*{extra}
  from public.container_number_rules r
  {join}
  order by r.id
) as t;
"""

    return f"""
select row_to_json(t)::text
from (
  select *
  from public.{table_name}
  order by 1
) as t;
"""


def load_rows(table_name: str, columns: list[str]) -> list[dict]:
    if not columns:
        return []
    sql = build_select_sql(table_name, columns)
    output = run_psql(sql)
    rows = []
    for line in output.splitlines():
        line = line.strip()
        if not line:
            continue
        rows.append(json.loads(line))
    return rows


def sql_literal(value) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, (dict, list)):
        return "'" + json.dumps(value, ensure_ascii=False).replace("'", "''") + "'::jsonb"
    return "'" + str(value).replace("'", "''") + "'"


def sql_array_literal(value) -> str:
    if value is None:
        return "NULL"
    if not isinstance(value, list):
        return "NULL"
    escaped = []
    for item in value:
        if item is None:
            escaped.append("NULL")
        else:
            escaped.append('"' + str(item).replace("\\", "\\\\").replace('"', '\\"') + '"')
    return "'{" + ",".join(escaped) + "}'"


def build_seed_sql(table_name: str, columns: list[str], column_types: dict[str, str], rows: list[dict]) -> str:
    if not rows:
        return (
            f"-- No local rows exported for public.{table_name}.\n"
            f"-- Run `npm run db:seed:export-basic-info` again after adding data.\n"
        )

    col_sql = ", ".join(columns)
    lines = [
        "BEGIN;",
        "",
    ]

    for row in rows:
        values_sql = ", ".join(render_column_value(table_name, row, column, column_types) for column in columns)
        lines.append(f"INSERT INTO public.{table_name} ({col_sql}) VALUES ({values_sql});")

    lines.extend(
        [
            "",
            "COMMIT;",
            "",
            f"-- rows exported: {len(rows)}",
        ]
    )
    return "\n".join(lines) + "\n"


def render_column_value(table_name: str, row: dict, column: str, column_types: dict[str, str]) -> str:
    if table_name == "customers" and column == "region_id":
        region_code = row.get("__region_code_ref")
        if not region_code:
            return "NULL"
        return f"(SELECT id FROM public.region_codes WHERE region_code = {sql_literal(region_code)} LIMIT 1)"

    if table_name == "customer_certificate_links" and column == "customer_id":
        customer_custom_id = row.get("__customer_custom_id_ref")
        if not customer_custom_id:
            return "NULL"
        return (
            "(SELECT id FROM public.customers "
            f"WHERE customer_custom_id = {sql_literal(customer_custom_id)} "
            f"OR id::text = {sql_literal(customer_custom_id)} "
            "LIMIT 1)"
        )

    if table_name == "cities" and column == "region_id":
        region_code = row.get("__region_code_ref")
        if not region_code:
            return "NULL"
        return f"(SELECT id FROM public.region_codes WHERE region_code = {sql_literal(region_code)} LIMIT 1)"

    if table_name == "depots":
        if column == "city_id":
            city_code = row.get("__city_code_ref")
            if not city_code:
                return "NULL"
            return f"(SELECT id FROM public.cities WHERE city_code = {sql_literal(city_code)} LIMIT 1)"
        if column == "region_id":
            region_code = row.get("__region_code_ref")
            if not region_code:
                return "NULL"
            return f"(SELECT id FROM public.region_codes WHERE region_code = {sql_literal(region_code)} LIMIT 1)"

    if table_name == "operation_price_configs":
        if column == "container_size_code_id":
            size_code = row.get("__size_code_ref")
            if not size_code:
                return "NULL"
            return f"(SELECT id FROM public.container_size_codes WHERE size_code = {sql_literal(size_code)} LIMIT 1)"
        if column == "container_condition_code_id":
            condition_code = row.get("__condition_code_ref")
            if not condition_code:
                return "NULL"
            return f"(SELECT id FROM public.container_condition_codes WHERE condition_code = {sql_literal(condition_code)} LIMIT 1)"

    if table_name == "container_number_rules" and column == "container_size_code_id":
        size_code = row.get("__size_code_ref")
        if not size_code:
            return "NULL"
        return f"(SELECT id FROM public.container_size_codes WHERE size_code = {sql_literal(size_code)} LIMIT 1)"

    value = row.get(column)
    if column_types.get(column, "") == "_text":
        return sql_array_literal(value)

    return sql_literal(value)


def main() -> int:
    SEEDS_DIR.mkdir(parents=True, exist_ok=True)

    for table_name, filename in TABLE_SPECS:
        columns = load_columns(table_name)
        column_types = load_column_types(table_name) if columns else {}
        target = SEEDS_DIR / filename
        if not columns:
            if target.exists():
                existing = target.read_text(encoding="utf-8")
                if existing.strip():
                    print(f"preserved {filename} (table unavailable in current local schema, kept existing seed)")
                    continue
            target.write_text(build_placeholder_seed(table_name), encoding="utf-8")
            print(f"wrote {filename} (table unavailable in current local schema)")
            continue

        rows = load_rows(table_name, columns)
        sql = build_seed_sql(table_name, columns, column_types, rows)
        if not rows and target.exists():
            existing = target.read_text(encoding="utf-8")
            if existing.strip() and not existing.startswith(f"-- No local rows exported for public.{table_name}."):
                print(f"preserved {filename} (current table empty, kept existing seed)")
                continue

        target.write_text(sql, encoding="utf-8")
        print(f"wrote {filename} ({len(rows)} rows)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
