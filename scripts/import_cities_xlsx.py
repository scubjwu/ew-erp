#!/usr/bin/env python3

from __future__ import annotations

import math
import re
import sys
from pathlib import Path

import pandas as pd


COUNTRY_BY_PREFIX = {
    "AD": "Andorra",
    "AE": "United Arab Emirates",
    "AO": "Angola",
    "AR": "Argentina",
    "AT": "Austria",
    "AU": "Australia",
    "BD": "Bangladesh",
    "BE": "Belgium",
    "BG": "Bulgaria",
    "BR": "Brazil",
    "BY": "Belarus",
    "CA": "Canada",
    "CH": "Switzerland",
    "CI": "Cote d'Ivoire",
    "CL": "Chile",
    "CN": "China",
    "CR": "Costa Rica",
    "CZ": "Czech Republic",
    "DE": "Germany",
    "DJ": "Djibouti",
    "DK": "Denmark",
    "EC": "Ecuador",
    "EG": "Egypt",
    "ES": "Spain",
    "ET": "Ethiopia",
    "FI": "Finland",
    "FR": "France",
    "GB": "United Kingdom",
    "GR": "Greece",
    "GT": "Guatemala",
    "HK": "Hong Kong",
    "HR": "Croatia",
    "HU": "Hungary",
    "ID": "Indonesia",
    "IE": "Ireland",
    "IL": "Israel",
    "IN": "India",
    "IR": "Iran",
    "IT": "Italy",
    "JP": "Japan",
    "KE": "Kenya",
    "KH": "Cambodia",
    "KR": "South Korea",
    "KW": "Kuwait",
    "KZ": "Kazakhstan",
    "LC": "Saint Lucia",
    "LK": "Sri Lanka",
    "LT": "Lithuania",
    "MA": "Morocco",
    "MM": "Myanmar",
    "MT": "Malta",
    "MX": "Mexico",
    "MY": "Malaysia",
    "NA": "Namibia",
    "NG": "Nigeria",
    "NL": "Netherlands",
    "NO": "Norway",
    "NZ": "New Zealand",
    "OM": "Oman",
    "PE": "Peru",
    "PH": "Philippines",
    "PL": "Poland",
    "PT": "Portugal",
    "RO": "Romania",
    "RU": "Russia",
    "SA": "Saudi Arabia",
    "SE": "Sweden",
    "SG": "Singapore",
    "SI": "Slovenia",
    "SK": "Slovakia",
    "SN": "Senegal",
    "TH": "Thailand",
    "TR": "Turkey",
    "TW": "Taiwan",
    "TZ": "Tanzania",
    "UA": "Ukraine",
    "US": "United States",
    "UY": "Uruguay",
    "VN": "Vietnam",
    "YE": "Yemen",
    "ZA": "South Africa",
}

SPECIAL_COUNTRY_BY_CITY_CODE = {
    "ADWEN": "Austria",
    "JTOVS": "China",
    "EUZEE": "Belgium",
    "EUDCT": "United Kingdom",
    "EUTBA": "United Kingdom",
    "EUMOE": "Netherlands",
    "HATBA": "United States",
    "MSCOW": "Russia",
    "YKTEB": "Russia",
    "RLNSK": "Russia",
    "YDKHV": "Russia",
}

REGION_CANONICAL = {
    "AFRICA": "Africa",
    "AUSTRALIA": "Australia",
    "BRAZIL": "Brazil",
    "CENTRAASIA": "CentraAsia",
    "CHINA": "China",
    "EUROPE": "Europe",
    "HAWAII": "Hawaii",
    "INDIA": "India",
    "KOREA": "Korea",
    "MIDDLEEAST": "MiddleEast",
    "PHILIPPINE": "Philippine",
    "RUSSIA": "Russia",
    "S AMERICA": "S America",
    "SOUTH-ASIA": "South-Asia",
    "TAIWAN": "Taiwan",
    "TURKEY": "Turkey",
    "USA/CA": "USA/CA",
}

CODE_COLUMNS = [
    "City code",
    "CMA city code",
    "OOOL City code",
    "ZIM city code",
    "MSK city code",
]


def clean_text(value: object) -> str | None:
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    text = str(value).strip()
    return text or None


def sql_literal(value: object) -> str:
    text = clean_text(value)
    if text is None:
        return "NULL"
    return "'" + text.replace("'", "''") + "'"


def normalize_region(value: object) -> str:
    raw = clean_text(value)
    if not raw:
        return "Unknown"
    return REGION_CANONICAL.get(raw.upper(), raw)


def extract_prefix_from_code_like(value: object) -> str | None:
    text = clean_text(value)
    if not text:
        return None
    for part in re.split(r"[;,\s]+", text.upper()):
        token = part.strip()
        if re.fullmatch(r"[A-Z]{2}[A-Z0-9]{3}", token):
            return token[:2]
    return None


def normalize_country_name(value: str) -> str:
    text = value.strip()
    canonical = {
        "COTE D IVOIRE": "Cote d'Ivoire",
        "U.K.": "United Kingdom",
        "UK": "United Kingdom",
        "U S A": "United States",
        "USA": "United States",
    }
    if text.upper() in canonical:
        return canonical[text.upper()]
    return text.title()


def extract_country_from_hmm(value: object) -> str | None:
    text = clean_text(value)
    if not text:
        return None

    if "," in text:
        tail = text.split(",")[-1].strip()
        if tail:
            return normalize_country_name(tail)

    if re.fullmatch(r"[A-Z][A-Z\s.'&/-]+", text):
        return normalize_country_name(text)

    return None


def derive_country(row: pd.Series) -> str:
    city_code = clean_text(row["City code"])
    if not city_code:
        raise ValueError("Missing City code")

    if city_code in SPECIAL_COUNTRY_BY_CITY_CODE:
        return SPECIAL_COUNTRY_BY_CITY_CODE[city_code]

    for column in CODE_COLUMNS[1:]:
        prefix = extract_prefix_from_code_like(row[column])
        if prefix and prefix in COUNTRY_BY_PREFIX:
            return COUNTRY_BY_PREFIX[prefix]

    hmm_country = extract_country_from_hmm(row["HMM city code"])
    if hmm_country:
        return hmm_country

    prefix = city_code[:2].upper()
    if prefix in COUNTRY_BY_PREFIX:
        return COUNTRY_BY_PREFIX[prefix]

    raise ValueError(f"Could not derive country for {city_code}")


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: import_cities_xlsx.py <xlsx-path>", file=sys.stderr)
        return 2

    path = Path(sys.argv[1])
    df = pd.read_excel(path)

    required_columns = {
        "City code",
        "Region",
        "city",
        "CMA city code",
        "OOOL City code",
        "HMM city code",
        "ZIM city code",
        "MSK city code",
    }
    missing = sorted(required_columns - set(df.columns))
    if missing:
        raise RuntimeError(f"Missing columns: {', '.join(missing)}")

    region_values = sorted({normalize_region(value) for value in df["Region"]})

    sql_lines: list[str] = [
        "BEGIN;",
        "",
    ]

    for region in region_values:
        sql_lines.append(
            "INSERT INTO public.region_codes (region_code, region_name, status)"
            f" VALUES ({sql_literal(region)}, {sql_literal(region)}, 'ACTIVE')"
            " ON CONFLICT (region_code) DO UPDATE"
            " SET region_name = EXCLUDED.region_name, status = 'ACTIVE';"
        )

    sql_lines.append("")

    inserted = 0
    for _, row in df.iterrows():
        city_code = clean_text(row["City code"])
        city_name = clean_text(row["city"])
        region = normalize_region(row["Region"])
        country = derive_country(row)

        sql_lines.append(
            "INSERT INTO public.cities ("
            "city_code, city_name, country, region, region_id, "
            "cma_city_code, oocl_city_code, hmm_city_code, zim_city_code, msk_city_code, remark"
            ") VALUES ("
            f"{sql_literal(city_code)}, "
            f"{sql_literal(city_name)}, "
            f"{sql_literal(country)}, "
            f"{sql_literal(region)}, "
            f"(SELECT id FROM public.region_codes WHERE region_code = {sql_literal(region)}), "
            f"{sql_literal(row['CMA city code'])}, "
            f"{sql_literal(row['OOOL City code'])}, "
            f"{sql_literal(row['HMM city code'])}, "
            f"{sql_literal(row['ZIM city code'])}, "
            f"{sql_literal(row['MSK city code'])}, "
            "NULL"
            ") ON CONFLICT (city_code) DO UPDATE SET "
            "city_name = EXCLUDED.city_name, "
            "country = EXCLUDED.country, "
            "region = EXCLUDED.region, "
            "region_id = EXCLUDED.region_id, "
            "cma_city_code = EXCLUDED.cma_city_code, "
            "oocl_city_code = EXCLUDED.oocl_city_code, "
            "hmm_city_code = EXCLUDED.hmm_city_code, "
            "zim_city_code = EXCLUDED.zim_city_code, "
            "msk_city_code = EXCLUDED.msk_city_code, "
            "updated_at = now();"
        )
        inserted += 1

    sql_lines.extend(
        [
            "",
            "COMMIT;",
            "",
            f"-- rows prepared: {inserted}",
            f"-- regions prepared: {len(region_values)}",
        ]
    )

    sys.stdout.write("\n".join(sql_lines))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
