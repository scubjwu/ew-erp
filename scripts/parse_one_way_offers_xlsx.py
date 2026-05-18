#!/usr/bin/env python3

from __future__ import annotations

import json
import math
import sys
import warnings
from pathlib import Path

import pandas as pd


def clean_text(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and math.isnan(value):
        return ""
    if pd.isna(value):
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, (int, float)) and float(value).is_integer():
        return str(int(value))
    return str(value).strip()


def normalize_date(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and math.isnan(value):
        return ""
    if pd.isna(value):
        return ""
    try:
        parsed = pd.to_datetime(value)
    except Exception:
        return clean_text(value)
    if pd.isna(parsed):
        return ""
    return parsed.strftime("%Y-%m-%d")


def normalize_number(value: object) -> float | None:
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    if pd.isna(value):
        return None
    try:
        return float(value)
    except Exception:
        text = clean_text(value).replace(",", "")
        if not text:
            return None
        try:
            return float(text)
        except Exception:
            return None


def first_present(row: dict[str, object], *candidates: str) -> object:
    for candidate in candidates:
        if candidate in row:
            value = row.get(candidate)
            if clean_text(value):
                return value
            if value is not None and not (isinstance(value, float) and math.isnan(value)):
                return value
    return None


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: parse_one_way_offers_xlsx.py <xlsx-path>", file=sys.stderr)
        return 2

    workbook_path = Path(sys.argv[1])
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        excel_file = pd.ExcelFile(workbook_path)

    records: list[dict[str, object]] = []

    for sheet_name in excel_file.sheet_names:
        if sheet_name.strip().lower() == "criteria":
            continue

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            frame = pd.read_excel(workbook_path, sheet_name=sheet_name, dtype=object)

        columns = [clean_text(column) for column in frame.columns]
        frame.columns = columns

        for index, values in frame.iterrows():
            row = {column: values[column] for column in columns}
            if all(clean_text(value) == "" for value in row.values()):
                continue

            status_date = first_present(
                row, "Status date", "Validation date", "Status Date", "Validation Date"
            )
            records.append(
                {
                    "sheetName": sheet_name,
                    "rowNo": index + 2,
                    "offerId": clean_text(first_present(row, "Offer id", "Offer ID")),
                    "status": clean_text(first_present(row, "Status")),
                    "statusDate": normalize_date(status_date),
                    "applyDate": normalize_date(status_date),
                    "availabilityDate": normalize_date(first_present(row, "Availability Date")),
                    "lessee": clean_text(first_present(row, "Lessor", "Lessee")),
                    "depotCodeRaw": clean_text(
                        first_present(row, "CMA CGM Depot", "Depot Code", "Factory/Dep")
                    ),
                    "pol": clean_text(first_present(row, "From", "POL")),
                    "pod": clean_text(first_present(row, "To", "POD")),
                    "sizeType": clean_text(first_present(row, "Size Type", "Size/Type")),
                    "condition": clean_text(first_present(row, "Conditions", "Condition")),
                    "color": clean_text(first_present(row, "Color")),
                    "machineType": clean_text(first_present(row, "Machine Type", "MachineType")),
                    "quantity": normalize_number(first_present(row, "Quantity")) or 0,
                    "authorizedQty": normalize_number(
                        first_present(row, "Auth", "Authorized Qty", "Authorized Quantity")
                    )
                    or 0,
                    "remainingQty": normalize_number(first_present(row, "Rem", "Remaining Qty"))
                    or 0,
                    "pickedUpQty": normalize_number(first_present(row, "PU", "Picked Up Qty"))
                    or 0,
                    "nonPickedUpQty": normalize_number(
                        first_present(row, "NPU", "Non Picked Up Qty")
                    )
                    or 0,
                    "pickupCharge": normalize_number(
                        first_present(row, "Pick-up charge", "PUC", "Pick-up Charge")
                    )
                    or 0,
                    "freeDays": normalize_number(
                        first_present(row, "Free days", "Freedays", "Free Days")
                    )
                    or 0,
                    "perDiem": normalize_number(
                        first_present(row, "PerDiem", "Per Die", "Per Diem")
                    )
                    or 0,
                    "dpp": normalize_number(first_present(row, "DPP")) or 0,
                    "shipperRequestId": clean_text(
                        first_present(row, "RequestNO", "Request No", "Shipper Request ID")
                    ),
                    "onhireNo": clean_text(first_present(row, "Onhireno", "Onhire No")),
                    "remarks": clean_text(
                        first_present(row, "Remark", "Remarks", "FollowupRemarks")
                    ),
                }
            )

    print(json.dumps({"rows": records}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
