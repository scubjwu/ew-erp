#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import math
import re
import subprocess
import uuid
from dataclasses import dataclass
from pathlib import Path

try:
    import pandas as pd
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "pandas is required to read the depot spreadsheet. "
        "Use the bundled runtime plus xlrd/pandas dependencies."
    ) from exc


MANUAL_CITY_CODE_MAP = {
    "CNNSS": "CNNSA",  # Nansha typo in source file
    "CNSKU": "CNSHK",  # Shekou typo in source file
    "GBLVB": "GBLVL",  # Liverpool typo in source file
    "GBTRI": "EUDCT",  # Doncaster is stored as EUDCT in current system master
    "NZAUK": "NZAUC",  # Auckland typo in source file
    "PHVAL": "PHMAN",  # Valiant depot is in Manila
    "SGMAS": "SGSGP",  # Singapore typo in source file
    "THCIM": "THLCH",  # Address resolves to Laem Chabang
    "UKLCS": "GBLON",  # Tilbury currently rolls up under London
    "USRIV": "USSTL",  # Pontoon Beach rolls up under St Louis
    "USSAT": "USSAO",  # System master uses USSAO for San Antonio
    "VTVIE": "ATVIE",  # Country prefix typo in source file
}

SHEET_COLUMNS = [
    "depot_code",
    "depot_name_cn",
    "depot_name_en",
    "contact_person",
    "phone",
    "fax",
    "address_cn",
    "city_short",
    "depot_type_raw",
    "address_en",
    "email",
    "remark",
    "gate_20",
    "gate_40",
    "lift_20",
    "lift_40",
    "storage_20",
    "storage_40",
]


@dataclass
class CityRow:
    id: str
    city_code: str
    city_name: str
    country_name: str | None
    region_id: str | None


@dataclass
class DepotRow:
    id: str
    depot_code: str
    depot_name: str
    city_id: str | None
    gate_email: str | None
    currency: str | None
    is_primary_depot: bool


def run_psql(sql: str, *, container: str) -> list[str]:
    cmd = [
        "docker",
        "exec",
        container,
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-F",
        "\t",
        "-At",
        "-c",
        sql,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or f"psql failed with code {result.returncode}")
    return [line for line in result.stdout.splitlines() if line.strip()]


def execute_sql(sql: str, *, container: str) -> None:
    cmd = ["docker", "exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"]
    result = subprocess.run(cmd, input=sql, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or f"psql apply failed with code {result.returncode}")


def sql_literal(value: object | None) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if isinstance(value, float) and not math.isfinite(value):
            return "NULL"
        return str(value)
    text = str(value).replace("'", "''")
    return f"'{text}'"


def clean_text(value: object | None) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text or text.lower() == "nan":
        return None
    return text


def clean_number(value: object | None) -> float | None:
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    text = str(value).strip()
    if not text or text.lower() == "nan":
        return None
    try:
        return float(text)
    except ValueError:
        return None


def normalize_name(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"[^A-Z0-9]+", "", value.upper())


def next_numeric_suffix(used_suffixes: set[str]) -> str:
    for value in range(1, 1000):
        suffix = f"{value:03d}"
        if suffix not in used_suffixes:
            return suffix
    letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    for a in letters:
        for b in letters:
            for c in letters:
                suffix = f"{a}{b}{c}"
                if suffix not in used_suffixes:
                    return suffix
    raise RuntimeError("Ran out of 3-letter suffixes")


def map_depot_type(value: str | None) -> str | None:
    text = (value or "").strip().upper()
    if not text:
        return "CONTRACT"
    if "SHIPPING" in text:
        return "SHIPPING_LINES"
    if "FACTORY" in text:
        return "FACTORY_YARD"
    if "TRADER" in text:
        return "TRADER"
    if "VENDOR" in text:
        return "VENDOR"
    if "CONSIGN" in text:
        return "CONSIGNMENT"
    if "协议" in value or "CONTRACT" in text:
        return "CONTRACT"
    return "OTHER"


def infer_currency(city_code: str) -> str | None:
    country_prefix = city_code[:2]
    mapping = {
        "AR": "ARS",
        "AT": "EUR",
        "AU": "AUD",
        "BE": "EUR",
        "CA": "CAD",
        "CH": "CHF",
        "CN": "CNY",
        "CZ": "CZK",
        "DE": "EUR",
        "DK": "DKK",
        "EG": "EGP",
        "ES": "EUR",
        "FI": "EUR",
        "FR": "EUR",
        "GB": "GBP",
        "GR": "EUR",
        "HK": "HKD",
        "HR": "EUR",
        "HU": "HUF",
        "ID": "IDR",
        "IE": "EUR",
        "IN": "INR",
        "IT": "EUR",
        "JP": "JPY",
        "KE": "KES",
        "MY": "MYR",
        "NL": "EUR",
        "NZ": "NZD",
        "PH": "PHP",
        "PL": "PLN",
        "PT": "EUR",
        "RO": "RON",
        "RU": "RUB",
        "SA": "SAR",
        "SE": "SEK",
        "SG": "SGD",
        "SI": "EUR",
        "TH": "THB",
        "TR": "TRY",
        "TW": "TWD",
        "TZ": "TZS",
        "UK": "GBP",
        "US": "USD",
        "VN": "VND",
        "ZA": "ZAR",
    }
    return mapping.get(country_prefix)


def build_existing_maps(container: str) -> tuple[dict[str, CityRow], dict[str, DepotRow], dict[tuple[str, str], DepotRow], dict[str, set[str]]]:
    city_rows = run_psql(
        """
        select json_build_object(
          'id', id::text,
          'city_code', city_code,
          'city_name', coalesce(city_name, ''),
          'country_name', coalesce(country, ''),
          'region_id', coalesce(region_id::text, '')
        )::text
        from public.cities
        order by city_code;
        """.strip(),
        container=container,
    )
    cities: dict[str, CityRow] = {}
    for row in city_rows:
        payload = json.loads(row)
        city_id = payload["id"]
        city_code = payload["city_code"]
        city_name = payload["city_name"]
        country_name = payload["country_name"]
        region_id = payload["region_id"]
        cities[city_code] = CityRow(
            id=city_id,
            city_code=city_code,
            city_name=city_name,
            country_name=country_name or None,
            region_id=region_id or None,
        )

    depot_rows = run_psql(
        """
        select json_build_object(
          'id', id::text,
          'depot_code', depot_code,
          'depot_name', depot_name,
          'city_id', coalesce(city_id::text, ''),
          'gate_email', coalesce(gate_email, ''),
          'currency', coalesce(currency, ''),
          'is_primary_depot', is_primary_depot
        )::text
        from public.depots
        order by depot_code;
        """.strip(),
        container=container,
    )
    by_code: dict[str, DepotRow] = {}
    by_name_city: dict[tuple[str, str], DepotRow] = {}
    codes_by_city: dict[str, set[str]] = {}
    for row in depot_rows:
        payload = json.loads(row)
        depot_id = payload["id"]
        depot_code = payload["depot_code"]
        depot_name = payload["depot_name"]
        city_id = payload["city_id"]
        gate_email = payload["gate_email"]
        currency = payload["currency"]
        is_primary = payload["is_primary_depot"]
        depot = DepotRow(
            id=depot_id,
            depot_code=depot_code,
            depot_name=depot_name,
            city_id=city_id or None,
            gate_email=gate_email or None,
            currency=currency or None,
            is_primary_depot=bool(is_primary),
        )
        by_code[depot_code] = depot
        if depot.city_id:
            by_name_city[(depot.city_id, normalize_name(depot_name))] = depot
        codes_by_city.setdefault(depot_code[:5], set()).add(depot_code)
    return cities, by_code, by_name_city, codes_by_city


def load_sheet_rows(path: Path) -> list[dict[str, object]]:
    df = pd.read_excel(path, engine="xlrd")
    df.columns = SHEET_COLUMNS
    records: list[dict[str, object]] = []
    for _, row in df.iloc[1:].iterrows():
        records.append({column: row[column] for column in SHEET_COLUMNS})
    return records


def choose_city_code(raw_code: str) -> str | None:
    raw_prefix = raw_code[:5] if len(raw_code) >= 5 else raw_code
    return MANUAL_CITY_CODE_MAP.get(raw_prefix, raw_prefix)


def main() -> int:
    parser = argparse.ArgumentParser(description="Import depot spreadsheet into local Supabase depots table.")
    parser.add_argument("xls_path", type=Path)
    parser.add_argument("--container", default="supabase_db_db")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--report-csv", type=Path)
    args = parser.parse_args()

    cities, depots_by_code, depots_by_name_city, used_codes_by_city = build_existing_maps(args.container)
    sheet_rows = load_sheet_rows(args.xls_path)

    assigned_codes_by_city = {city: set(codes) for city, codes in used_codes_by_city.items()}
    statements: list[str] = []
    report_rows: list[dict[str, object]] = []
    unresolved: list[tuple[str, str]] = []
    inserts = 0
    updates = 0
    skipped = 0

    for source in sheet_rows:
        raw_code = (clean_text(source["depot_code"]) or "").upper()
        if not raw_code or raw_code == "堆场代码":
            continue

        name_en = clean_text(source["depot_name_en"])
        name_cn = clean_text(source["depot_name_cn"])
        remark_name = clean_text(source["remark"])
        if not name_en and not name_cn and remark_name and re.search(r"[\u4e00-\u9fff]", remark_name):
            name_cn = remark_name
        elif not name_en and not name_cn and remark_name:
            name_en = remark_name
        elif not name_en and not name_cn and raw_code != "PHDUMMY":
            name_en = raw_code
        if not name_en and not name_cn:
            skipped += 1
            unresolved.append((raw_code, "missing depot name"))
            continue

        city_code = choose_city_code(raw_code)
        city = cities.get(city_code or "")
        if city is None:
            skipped += 1
            unresolved.append((raw_code, f"unknown city code prefix {raw_code[:5]}"))
            continue

        normalized_name = normalize_name(name_en or name_cn)
        existing = (
            depots_by_code.get(raw_code)
            or depots_by_name_city.get((city.id, normalized_name))
        )

        raw_prefix = raw_code[:5] if len(raw_code) >= 5 else raw_code
        raw_suffix = raw_code[5:] if len(raw_code) > 5 else ""
        raw_has_kept_suffix = len(raw_code) == 8 and len(raw_suffix) == 3
        used_codes = assigned_codes_by_city.setdefault(city.city_code, set())
        existing_for_target = None

        if raw_prefix == city.city_code and raw_has_kept_suffix:
            if raw_code in used_codes:
                target_code = raw_code
                existing_for_target = depots_by_code.get(raw_code)
            else:
                target_code = raw_code
        elif raw_has_kept_suffix:
            remapped_code = f"{city.city_code}{raw_suffix}"
            if remapped_code == getattr(existing, "depot_code", None) or remapped_code not in used_codes:
                target_code = remapped_code
                existing_for_target = depots_by_code.get(remapped_code)
            else:
                used_suffixes = {code[5:] for code in used_codes if code.startswith(city.city_code) and len(code) == 8}
                target_code = f"{city.city_code}{next_numeric_suffix(used_suffixes)}"
        elif existing and existing.depot_code[:5] == city.city_code and len(existing.depot_code) == 8:
            target_code = existing.depot_code
        else:
            used_suffixes = {code[5:] for code in used_codes if code.startswith(city.city_code) and len(code) == 8}
            target_code = f"{city.city_code}{next_numeric_suffix(used_suffixes)}"

        if target_code in used_codes and target_code != getattr(existing, "depot_code", None) and depots_by_code.get(target_code) is None:
            used_suffixes = {code[5:] for code in used_codes if code.startswith(city.city_code) and len(code) == 8}
            target_code = f"{city.city_code}{next_numeric_suffix(used_suffixes)}"

        used_codes.add(target_code)
        if existing is None:
            existing = existing_for_target or depots_by_code.get(target_code)

        depot_name = name_en or name_cn or raw_code
        depot_name_cn = name_cn if name_cn and name_cn != depot_name else None
        address_en = clean_text(source["address_en"])
        address_cn = clean_text(source["address_cn"])
        email = clean_text(source["email"])
        phone = clean_text(source["phone"])
        fax = clean_text(source["fax"])
        depot_type = map_depot_type(clean_text(source["depot_type_raw"]))
        currency = (existing.currency if existing else None) or infer_currency(city.city_code)
        gate_email = email or (existing.gate_email if existing else None)

        values = {
            "depot_code": target_code,
            "depot_name": depot_name,
            "depot_name_cn": depot_name_cn,
            "depot_type": depot_type,
            "status": "NORMAL",
            "is_primary_depot": existing.is_primary_depot if existing else False,
            "depot_address": address_en or address_cn,
            "depot_address_cn": address_cn,
            "contact_person": clean_text(source["contact_person"]),
            "gate_email": gate_email,
            "contact_email": email,
            "depot_tel": phone,
            "fax": fax,
            "currency": currency,
            "city_id": city.id,
            "region_id": city.region_id,
            "country_code": city.city_code[:2],
            "country_name": city.country_name,
            "gate_in_20_cost": clean_number(source["gate_20"]) or 0,
            "gate_out_20_cost": clean_number(source["gate_20"]) or 0,
            "gate_in_40_cost": clean_number(source["gate_40"]) or 0,
            "gate_out_40_cost": clean_number(source["gate_40"]) or 0,
            "lift_in_20_cost": clean_number(source["lift_20"]) or 0,
            "lift_out_20_cost": clean_number(source["lift_20"]) or 0,
            "lift_in_40_cost": clean_number(source["lift_40"]) or 0,
            "lift_out_40_cost": clean_number(source["lift_40"]) or 0,
            "storage_rate_20": clean_number(source["storage_20"]) or 0,
            "storage_rate_40": clean_number(source["storage_40"]) or 0,
            "remark": clean_text(source["remark"]),
            "data_updated_on": "CURRENT_DATE",
        }

        report_rows.append(
            {
                "source_code": raw_code,
                "target_code": target_code,
                "city_code": city.city_code,
                "depot_name": depot_name,
                "action": "update" if existing else "insert",
            }
        )

        if existing:
            updates += 1
            set_clauses = []
            for key, value in values.items():
                if key == "data_updated_on":
                    set_clauses.append(f"{key} = CURRENT_DATE")
                else:
                    set_clauses.append(f"{key} = {sql_literal(value)}")
            statements.append(
                f"update public.depots set {', '.join(set_clauses)} where id = {sql_literal(existing.id)};"
            )
        else:
            inserts += 1
            columns = ["id", *values.keys()]
            row_values = [sql_literal(str(uuid.uuid4()))]
            for key, value in values.items():
                row_values.append("CURRENT_DATE" if key == "data_updated_on" else sql_literal(value))
            statements.append(
                f"insert into public.depots ({', '.join(columns)}) values ({', '.join(row_values)});"
            )

    if args.report_csv:
        with args.report_csv.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=["source_code", "target_code", "city_code", "depot_name", "action"])
            writer.writeheader()
            writer.writerows(report_rows)

    print(f"sheet rows: {len(sheet_rows)}")
    print(f"planned inserts: {inserts}")
    print(f"planned updates: {updates}")
    print(f"skipped rows: {skipped}")
    if unresolved:
        print("unresolved:")
        for code, reason in unresolved:
            print(f"  - {code}: {reason}")

    if args.apply:
        sql = "begin;\n" + "\n".join(statements) + "\ncommit;\n"
        execute_sql(sql, container=args.container)
        print("applied: yes")
    else:
        print("applied: no")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
