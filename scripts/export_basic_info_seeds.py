#!/usr/bin/env python3

from __future__ import annotations

import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SEEDS_DIR = ROOT / "db" / "supabase" / "seeds"

TABLE_SPECS = [
    ("company_profiles", "20260330_basic_info_company_profiles.sql"),
    ("company_bank_accounts", "20260330_basic_info_company_bank_accounts.sql"),
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
]

SPECIAL_SELECTS = {
    "cities": """
select row_to_json(t)::text
from (
  select
    c.*,
    rc.region_code as __region_code_ref
  from public.cities c
  left join public.region_codes rc on rc.id = c.region_id
  order by c.city_code
) as t;
""",
    "depots": """
select row_to_json(t)::text
from (
  select
    d.*,
    c.city_code as __city_code_ref,
    coalesce(rc.region_code, d.region) as __region_code_ref
  from public.depots d
  left join public.cities c on c.id = d.city_id
  left join public.region_codes rc on rc.id = d.region_id
  order by d.depot_code
) as t;
""",
    "operation_price_configs": """
select row_to_json(t)::text
from (
  select
    o.*,
    sz.size_code as __size_code_ref,
    cc.condition_code as __condition_code_ref
  from public.operation_price_configs o
  left join public.container_size_codes sz on sz.id = o.container_size_code_id
  left join public.container_condition_codes cc on cc.id = o.container_condition_code_id
  order by o.id
) as t;
""",
    "container_number_rules": """
select row_to_json(t)::text
from (
  select
    r.*,
    sz.size_code as __size_code_ref
  from public.container_number_rules r
  left join public.container_size_codes sz on sz.id = r.container_size_code_id
  order by r.id
) as t;
""",
}


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


def load_rows(table_name: str) -> list[dict]:
    sql = SPECIAL_SELECTS.get(table_name, f"""
select row_to_json(t)::text
from (
  select *
  from public.{table_name}
  order by 1
) as t;
""")
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


def build_seed_sql(table_name: str, columns: list[str], rows: list[dict]) -> str:
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
        values_sql = ", ".join(render_column_value(table_name, row, column) for column in columns)
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


def render_column_value(table_name: str, row: dict, column: str) -> str:
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

    return sql_literal(row.get(column))


def main() -> int:
    SEEDS_DIR.mkdir(parents=True, exist_ok=True)

    for table_name, filename in TABLE_SPECS:
        columns = load_columns(table_name)
        rows = load_rows(table_name)
        sql = build_seed_sql(table_name, columns, rows)
        target = SEEDS_DIR / filename
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
