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
    ("depots", "20260330_basic_info_depots.sql"),
    ("cost_codes", "20260330_basic_info_cost_codes.sql"),
    ("revenue_codes", "20260330_basic_info_revenue_codes.sql"),
    ("container_condition_codes", "20260330_basic_info_condition_codes.sql"),
    ("container_type_codes", "20260330_basic_info_type_codes.sql"),
    ("container_number_rules", "20260330_basic_info_container_number_rules.sql"),
    ("operation_price_configs", "20260330_basic_info_operation_price_configs.sql"),
]


def run_psql(sql: str) -> str:
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
            "-F",
            "\t",
            "-c",
            sql,
        ],
        check=True,
        capture_output=True,
        text=True,
    )
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
    sql = f"""
select row_to_json(t)::text
from (
  select *
  from public.{table_name}
  order by 1
) as t;
"""
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
        values_sql = ", ".join(sql_literal(row.get(column)) for column in columns)
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


def main() -> int:
    SEEDS_DIR.mkdir(parents=True, exist_ok=True)

    for table_name, filename in TABLE_SPECS:
        columns = load_columns(table_name)
        rows = load_rows(table_name)
        sql = build_seed_sql(table_name, columns, rows)
        (SEEDS_DIR / filename).write_text(sql, encoding="utf-8")
        print(f"wrote {filename} ({len(rows)} rows)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
