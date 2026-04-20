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
    ("purchase_order", "20260403_purchase_order.sql"),
    ("purchase_order_item", "20260403_purchase_order_item.sql"),
    ("purchase_order_container", "20260403_purchase_order_container.sql"),
    ("purchase_order_material_type", "20260403_purchase_order_material_type.sql"),
    ("purchase_finance_record", "20260403_purchase_finance_record.sql"),
]

DO_NOT_PRESERVE_WHEN_EMPTY = {
    "customer_certificate_links",
    "company_bank_accounts",
    "depot_attachment_links",
    "depot_additional_costs",
    "vendor_attachment_links",
    "material_vendor_attachment_links",
    "lessee_attachment_links",
    "container_owner_attachment_links",
    "purchase_order",
    "purchase_order_item",
    "purchase_order_container",
    "purchase_order_material_type",
    "purchase_finance_record",
}

EXCLUDED_EXPORT_COLUMNS = {
    "purchase_order": {"vendor_release_number", "planned_pod"},
    "purchase_order_item": {"payload_weight"},
    "purchase_order_container": {"payload_weight"},
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
    excluded = EXCLUDED_EXPORT_COLUMNS.get(table_name, set())
    return [
        line.strip()
        for line in output.splitlines()
        if line.strip() and line.strip() not in excluded
    ]


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

    if table_name == "purchase_order":
        supplier_extra = ""
        supplier_join = ""
        if "supplier_id" in column_set:
            supplier_extra = ", v.vendor_code as __vendor_code_ref"
            supplier_join = "left join public.vendors v on v.id = p.supplier_id"

        owner_extra = ""
        owner_join = ""
        if "owner_id" in column_set:
            owner_extra = ", o.container_owner_code as __container_owner_code_ref"
            owner_join = "left join public.container_owners o on o.id = p.owner_id"

        buyer_extra = ""
        buyer_join = ""
        if "buyer_id" in column_set:
            buyer_extra = ", u.user_code as __buyer_user_code_ref"
            buyer_join = "left join public.users u on u.id = p.buyer_id"

        return f"""
select row_to_json(t)::text
from (
  select
    p.*{supplier_extra}{owner_extra}{buyer_extra}
  from public.purchase_order p
  {supplier_join}
  {owner_join}
  {buyer_join}
  order by p.order_no
) as t;
"""

    if table_name == "purchase_order_item":
        po_columns = set(load_columns("purchase_order"))
        po_ref = "po.order_no as __purchase_order_order_no_ref"

        city_extra = ""
        city_join = ""
        if "location_city_id" in column_set:
            city_extra = ", c.city_code as __city_code_ref"
            city_join = "left join public.cities c on c.id = i.location_city_id"

        depot_extra = ""
        depot_join = ""
        if "depot_id" in column_set:
            depot_extra = ", d.depot_code as __depot_code_ref"
            depot_join = "left join public.depots d on d.id = i.depot_id"

        size_extra = ""
        size_join = ""
        if "container_size_code_id" in column_set:
            size_extra = ", sz.size_code as __size_code_ref"
            size_join = "left join public.container_size_codes sz on sz.id = i.container_size_code_id"

        type_extra = ""
        type_join = ""
        if "container_type_code_id" in column_set:
            type_extra = ", ty.type_code as __type_code_ref"
            type_join = "left join public.container_type_codes ty on ty.id = i.container_type_code_id"

        condition_extra = ""
        condition_join = ""
        if "container_condition_code_id" in column_set:
            condition_extra = ", cc.condition_code as __condition_code_ref"
            condition_join = "left join public.container_condition_codes cc on cc.id = i.container_condition_code_id"

        return f"""
select row_to_json(t)::text
from (
  select
    i.*,
    {po_ref}{city_extra}{depot_extra}{size_extra}{type_extra}{condition_extra}
  from public.purchase_order_item i
  join public.purchase_order po on po.id = i.purchase_order_id
  {city_join}
  {depot_join}
  {size_join}
  {type_join}
  {condition_join}
  order by po.order_no, i.line_no
) as t;
"""

    if table_name == "purchase_order_container":
        item_extra = ""
        item_join = ""
        if "purchase_order_item_id" in column_set:
            item_extra = ", i.line_no as __purchase_order_line_no_ref"
            item_join = "join public.purchase_order_item i on i.id = c.purchase_order_item_id"
        else:
            item_join = "join public.purchase_order_item i on i.id = c.purchase_order_item_id"

        po_extra = ", po.order_no as __purchase_order_order_no_ref"
        po_join = "join public.purchase_order po on po.id = c.purchase_order_id"

        city_extra = ""
        city_join = ""
        if "location_city_id" in column_set:
            city_extra = ", city.city_code as __city_code_ref"
            city_join = "left join public.cities city on city.id = c.location_city_id"

        depot_extra = ""
        depot_join = ""
        if "depot_id" in column_set:
            depot_extra = ", d.depot_code as __depot_code_ref"
            depot_join = "left join public.depots d on d.id = c.depot_id"

        size_extra = ""
        size_join = ""
        if "container_size_code_id" in column_set:
            size_extra = ", sz.size_code as __size_code_ref"
            size_join = "left join public.container_size_codes sz on sz.id = c.container_size_code_id"

        type_extra = ""
        type_join = ""
        if "container_type_code_id" in column_set:
            type_extra = ", ty.type_code as __type_code_ref"
            type_join = "left join public.container_type_codes ty on ty.id = c.container_type_code_id"

        condition_extra = ""
        condition_join = ""
        if "container_condition_code_id" in column_set:
            condition_extra = ", cc.condition_code as __condition_code_ref"
            condition_join = "left join public.container_condition_codes cc on cc.id = c.container_condition_code_id"

        return f"""
select row_to_json(t)::text
from (
  select
    c.*{po_extra}{item_extra}{city_extra}{depot_extra}{size_extra}{type_extra}{condition_extra}
  from public.purchase_order_container c
  {po_join}
  {item_join}
  {city_join}
  {depot_join}
  {size_join}
  {type_join}
  {condition_join}
  order by po.order_no, i.line_no, c.id
) as t;
"""

    if table_name == "purchase_order_material_type":
        vendor_extra = ""
        vendor_join = ""
        if "material_vendor_id" in column_set:
            vendor_extra = ", mv.vendor_code as __material_vendor_code_ref"
            vendor_join = "left join public.material_vendors mv on mv.id = mt.material_vendor_id"
        return f"""
select row_to_json(t)::text
from (
  select
    mt.*,
    po.order_no as __purchase_order_order_no_ref{vendor_extra}
  from public.purchase_order_material_type mt
  join public.purchase_order po on po.id = mt.purchase_order_id
  {vendor_join}
  order by po.order_no, mt.material_type
) as t;
"""

    if table_name == "purchase_finance_record":
        supplier_extra = ""
        supplier_join = ""
        if "supplier_id" in column_set:
            supplier_extra = ", v.vendor_code as __vendor_code_ref"
            supplier_join = "left join public.vendors v on v.id = f.supplier_id"
        return f"""
select row_to_json(t)::text
from (
  select
    f.*,
    po.order_no as __purchase_order_order_no_ref{supplier_extra}
  from public.purchase_finance_record f
  join public.purchase_order po on po.id = f.purchase_order_id
  {supplier_join}
  order by po.order_no
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
        statement = f"INSERT INTO public.{table_name} ({col_sql}) VALUES ({values_sql})"
        if table_name == "purchase_finance_record":
            statement += " ON CONFLICT (purchase_order_id) DO NOTHING"
        lines.append(f"{statement};")

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

    if table_name == "purchase_order":
        if column == "supplier_id":
            vendor_code = row.get("__vendor_code_ref")
            if not vendor_code:
                return "NULL"
            return f"(SELECT id FROM public.vendors WHERE vendor_code = {sql_literal(vendor_code)} LIMIT 1)"
        if column == "owner_id":
            owner_code = row.get("__container_owner_code_ref")
            if not owner_code:
                return "NULL"
            return f"(SELECT id FROM public.container_owners WHERE container_owner_code = {sql_literal(owner_code)} LIMIT 1)"
        if column == "buyer_id":
            user_code = row.get("__buyer_user_code_ref")
            if not user_code:
                return "NULL"
            return f"(SELECT id FROM public.users WHERE user_code = {sql_literal(user_code)} LIMIT 1)"

    if table_name == "purchase_order_item":
        if column == "purchase_order_id":
            order_no = row.get("__purchase_order_order_no_ref")
            if not order_no:
                return "NULL"
            return f"(SELECT id FROM public.purchase_order WHERE order_no = {sql_literal(order_no)} LIMIT 1)"
        if column == "location_city_id":
            city_code = row.get("__city_code_ref")
            if not city_code:
                return "NULL"
            return f"(SELECT id FROM public.cities WHERE city_code = {sql_literal(city_code)} LIMIT 1)"
        if column == "depot_id":
            depot_code = row.get("__depot_code_ref")
            if not depot_code:
                return "NULL"
            return f"(SELECT id FROM public.depots WHERE depot_code = {sql_literal(depot_code)} LIMIT 1)"
        if column == "container_size_code_id":
            size_code = row.get("__size_code_ref")
            if not size_code:
                return "NULL"
            return f"(SELECT id FROM public.container_size_codes WHERE size_code = {sql_literal(size_code)} LIMIT 1)"
        if column == "container_type_code_id":
            type_code = row.get("__type_code_ref")
            if not type_code:
                return "NULL"
            return f"(SELECT id FROM public.container_type_codes WHERE type_code = {sql_literal(type_code)} LIMIT 1)"
        if column == "container_condition_code_id":
            condition_code = row.get("__condition_code_ref")
            if not condition_code:
                return "NULL"
            return f"(SELECT id FROM public.container_condition_codes WHERE condition_code = {sql_literal(condition_code)} LIMIT 1)"

    if table_name == "purchase_order_container":
        if column == "purchase_order_id":
            order_no = row.get("__purchase_order_order_no_ref")
            if not order_no:
                return "NULL"
            return f"(SELECT id FROM public.purchase_order WHERE order_no = {sql_literal(order_no)} LIMIT 1)"
        if column == "purchase_order_item_id":
            order_no = row.get("__purchase_order_order_no_ref")
            line_no = row.get("__purchase_order_line_no_ref")
            if not order_no or line_no is None:
                return "NULL"
            return (
                "(SELECT poi.id FROM public.purchase_order_item poi "
                "JOIN public.purchase_order po ON po.id = poi.purchase_order_id "
                f"WHERE po.order_no = {sql_literal(order_no)} "
                f"AND poi.line_no = {sql_literal(line_no)} "
                "LIMIT 1)"
            )
        if column == "location_city_id":
            city_code = row.get("__city_code_ref")
            if not city_code:
                return "NULL"
            return f"(SELECT id FROM public.cities WHERE city_code = {sql_literal(city_code)} LIMIT 1)"
        if column == "depot_id":
            depot_code = row.get("__depot_code_ref")
            if not depot_code:
                return "NULL"
            return f"(SELECT id FROM public.depots WHERE depot_code = {sql_literal(depot_code)} LIMIT 1)"
        if column == "container_size_code_id":
            size_code = row.get("__size_code_ref")
            if not size_code:
                return "NULL"
            return f"(SELECT id FROM public.container_size_codes WHERE size_code = {sql_literal(size_code)} LIMIT 1)"
        if column == "container_type_code_id":
            type_code = row.get("__type_code_ref")
            if not type_code:
                return "NULL"
            return f"(SELECT id FROM public.container_type_codes WHERE type_code = {sql_literal(type_code)} LIMIT 1)"
        if column == "container_condition_code_id":
            condition_code = row.get("__condition_code_ref")
            if not condition_code:
                return "NULL"
            return f"(SELECT id FROM public.container_condition_codes WHERE condition_code = {sql_literal(condition_code)} LIMIT 1)"

    if table_name == "purchase_order_material_type":
        if column == "purchase_order_id":
            order_no = row.get("__purchase_order_order_no_ref")
            if not order_no:
                return "NULL"
            return f"(SELECT id FROM public.purchase_order WHERE order_no = {sql_literal(order_no)} LIMIT 1)"
        if column == "material_vendor_id":
            vendor_code = row.get("__material_vendor_code_ref")
            if not vendor_code:
                return "NULL"
            return f"(SELECT id FROM public.material_vendors WHERE vendor_code = {sql_literal(vendor_code)} LIMIT 1)"

    if table_name == "purchase_finance_record":
        if column == "purchase_order_id":
            order_no = row.get("__purchase_order_order_no_ref")
            if not order_no:
                return "NULL"
            return f"(SELECT id FROM public.purchase_order WHERE order_no = {sql_literal(order_no)} LIMIT 1)"
        if column == "supplier_id":
            vendor_code = row.get("__vendor_code_ref")
            if not vendor_code:
                return "NULL"
            return f"(SELECT id FROM public.vendors WHERE vendor_code = {sql_literal(vendor_code)} LIMIT 1)"

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
            if (
                table_name not in DO_NOT_PRESERVE_WHEN_EMPTY
                and existing.strip()
                and not existing.startswith(f"-- No local rows exported for public.{table_name}.")
            ):
                print(f"preserved {filename} (current table empty, kept existing seed)")
                continue

        target.write_text(sql, encoding="utf-8")
        print(f"wrote {filename} ({len(rows)} rows)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
