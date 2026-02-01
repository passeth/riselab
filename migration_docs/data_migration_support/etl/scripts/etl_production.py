"""
ETL: Production Batches (반완제품/완제품/OEM) -> Supabase

Requirements:
- pandas, openpyxl, supabase-py
- SUPABASE_SERVICE_ROLE_KEY in environment or .env
"""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any

import pandas as pd
from supabase import Client, create_client

PROJECT_ROOT = Path(__file__).resolve().parents[4]
SOURCE_DIR = PROJECT_ROOT / "migration_docs" / "서식 샘플" / "반완제품관리대장"

PRODUCTION_TABLE = "labdoc_demo_production_batches"
FINISHED_TABLE = "labdoc_demo_finished_batches"
OEM_TABLE = "labdoc_demo_oem_products"


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line or line.strip().startswith("#"):
            continue
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


load_env_file(PROJECT_ROOT / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://usvjbuudnofwhmclwhfl.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def trim_value(value: Any) -> str | None:
    if value is None or pd.isna(value):
        return None
    text = str(value).strip()
    return text or None


def parse_date(value: Any) -> str | None:
    if value is None or pd.isna(value):
        return None
    parsed = pd.to_datetime(value, errors="coerce")
    if pd.isna(parsed):
        return None
    return parsed.date().isoformat()


def to_decimal(value: Any, precision: int = 2) -> float | None:
    if value is None or pd.isna(value):
        return None
    try:
        return round(float(value), precision)
    except (TypeError, ValueError):
        return None


def to_int(value: Any) -> int | None:
    if value is None or pd.isna(value):
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def parse_ph(value: Any) -> float | None:
    if value is None or pd.isna(value):
        return None
    if isinstance(value, str) and ("+/-" in value or "±" in value):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def find_sheet(sheet_names: list[str], pattern: str) -> str | None:
    for name in sheet_names:
        if name == pattern:
            return name
    for name in sheet_names:
        if pattern in name:
            return name
    return None


def chunked(
    values: list[dict[str, Any]], size: int = 500
) -> list[list[dict[str, Any]]]:
    return [values[i : i + size] for i in range(0, len(values), size)]


def dedupe_by_key(records: list[dict[str, Any]], key: str) -> list[dict[str, Any]]:
    seen: dict[str, dict[str, Any]] = {}
    for record in records:
        value = record.get(key)
        if not value:
            continue
        seen[str(value)] = record
    return list(seen.values())


def upsert_records(
    client: Client, table: str, records: list[dict[str, Any]], conflict: str | None
) -> None:
    if not records:
        return
    for batch in chunked(records):
        if conflict:
            client.table(table).upsert(batch, on_conflict=conflict).execute()
        else:
            client.table(table).insert(batch).execute()


def build_production_records(
    df: pd.DataFrame,
    file_name: str,
    sheet_name: str,
    header_row: int,
    warnings: list[str],
) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for idx, row in df.iterrows():
        semi_test_no = trim_value(row.iloc[5])
        if not semi_test_no:
            continue
        if len(semi_test_no) > 15:
            warnings.append(
                f"{file_name}::{sheet_name}: skip semi_test_no too long ({semi_test_no})"
            )
            continue
        record = {
            "product_code": trim_value(row.iloc[0]),
            "lot_no": trim_value(row.iloc[1]),
            "manufacturing_date": parse_date(row.iloc[2]),
            "approval_date": parse_date(row.iloc[3]),
            "quantity_kg": to_decimal(row.iloc[4]),
            "semi_test_no": semi_test_no,
            "functionality": to_int(row.iloc[6]),
            "finished_product_code": trim_value(row.iloc[7]),
            "production_date": parse_date(row.iloc[8]),
            "production_approval_date": parse_date(row.iloc[9]),
            "actual_quantity_ea": to_int(row.iloc[10]),
            "finished_test_no": trim_value(row.iloc[12]),
            "ph_value": to_decimal(row.iloc[13]),
            "viscosity": to_decimal(row.iloc[14]),
            "specific_gravity": to_decimal(row.iloc[15], precision=4),
            "managed_item": to_int(row.iloc[16]),
            "remarks": trim_value(row.iloc[17]),
            "theoretical_quantity_ea": to_decimal(row.iloc[18]),
            "packaging_yield": to_decimal(row.iloc[19]),
            "ph_standard": trim_value(row.iloc[21]),
            "viscosity_standard": trim_value(row.iloc[22]),
            "gravity_standard": to_decimal(row.iloc[23], precision=4),
            "actual_fill_volume": to_decimal(row.iloc[24]),
            "source_file": file_name,
            "source_sheet": sheet_name,
            "source_row": idx + header_row + 2,
        }
        records.append(record)
    return records


def build_finished_records(
    df: pd.DataFrame,
    file_name: str,
    sheet_name: str,
    header_row: int,
    warnings: list[str],
) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for idx, row in df.iterrows():
        finished_test_no = trim_value(row.iloc[6])
        if not finished_test_no:
            continue
        if len(finished_test_no) > 15:
            warnings.append(
                f"{file_name}::{sheet_name}: skip finished_test_no too long ({finished_test_no})"
            )
            continue
        record = {
            "product_code": trim_value(row.iloc[0]),
            "lot_no": trim_value(row.iloc[1]),
            "production_date": parse_date(row.iloc[2]),
            "approval_date": parse_date(row.iloc[3]),
            "actual_quantity_ea": to_int(row.iloc[4]),
            "average_volume": to_decimal(row.iloc[5]),
            "finished_test_no": finished_test_no,
            "ph_value": to_decimal(row.iloc[7]),
            "managed_item": to_int(row.iloc[8]),
            "remarks": trim_value(row.iloc[9]),
            "bulk_manufacturing_date": parse_date(row.iloc[10]),
            "theoretical_quantity_ea": to_decimal(row.iloc[11]),
            "packaging_yield": to_decimal(row.iloc[12]),
            "actual_fill_volume": to_decimal(row.iloc[14]),
            "semi_test_no": None,
            "source_file": file_name,
            "source_sheet": sheet_name,
            "source_row": idx + header_row + 2,
        }
        records.append(record)
    return records


def build_oem_records(
    df: pd.DataFrame, file_name: str, sheet_name: str, header_row: int
) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for idx, row in df.iterrows():
        product_code = trim_value(row.iloc[0])
        lot_no = trim_value(row.iloc[1])
        if not product_code and not lot_no:
            continue
        record = {
            "product_code": product_code,
            "lot_no": lot_no,
            "product_name": trim_value(row.iloc[2]),
            "receiving_date": parse_date(row.iloc[3]),
            "approval_date": parse_date(row.iloc[4]),
            "received_quantity_ea": to_int(row.iloc[5]),
            "finished_test_no": trim_value(row.iloc[6]),
            "ph_value": parse_ph(row.iloc[7]),
            "managed_item": to_int(row.iloc[8]),
            "remarks": trim_value(row.iloc[9]),
            "source_file": file_name,
            "source_sheet": sheet_name,
            "source_row": idx + header_row + 2,
        }
        records.append(record)
    return records


def main() -> None:
    print("=" * 70)
    print("Production ETL")
    print("=" * 70)

    if not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY is required")

    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    files = sorted(SOURCE_DIR.glob("반완제품관리대장(*).xlsx"))
    if not files:
        print("No source files found.")
        return

    totals = {"production": 0, "finished": 0, "oem": 0}
    errors: list[str] = []
    warnings: list[str] = []

    for file_path in files:
        print(f"\n[FILE] {file_path.name}")
        match = re.search(r"\((\d{4})\)", file_path.name)
        if not match:
            errors.append(f"Cannot parse year from filename: {file_path.name}")
            continue
        year = match.group(1)

        try:
            sheet_names = pd.ExcelFile(file_path).sheet_names
        except Exception as exc:
            errors.append(f"{file_path.name}: failed to read sheets ({exc})")
            continue

        production_sheet = find_sheet(sheet_names, f"{year}-반완제품")
        finished_sheet = find_sheet(sheet_names, f"{year}-완제품")
        oem_pattern = "OEM_2021" if year == "2021" else f"{year}-OEM"
        oem_sheet = find_sheet(sheet_names, oem_pattern)

        if production_sheet:
            try:
                header_row = 1
                df = pd.read_excel(
                    file_path, sheet_name=production_sheet, header=header_row
                )
                records = build_production_records(
                    df, file_path.name, production_sheet, header_row, warnings
                )
                records = dedupe_by_key(records, "semi_test_no")
                upsert_records(client, PRODUCTION_TABLE, records, "semi_test_no")
                totals["production"] += len(records)
            except Exception as exc:
                errors.append(f"{file_path.name}::{production_sheet}: {exc}")

        if finished_sheet:
            try:
                header_row = 0
                df = pd.read_excel(
                    file_path, sheet_name=finished_sheet, header=header_row
                )
                records = build_finished_records(
                    df, file_path.name, finished_sheet, header_row, warnings
                )
                records = dedupe_by_key(records, "finished_test_no")
                upsert_records(client, FINISHED_TABLE, records, "finished_test_no")
                totals["finished"] += len(records)
            except Exception as exc:
                errors.append(f"{file_path.name}::{finished_sheet}: {exc}")

        if oem_sheet:
            try:
                header_row = 2
                df = pd.read_excel(file_path, sheet_name=oem_sheet, header=header_row)
                records = build_oem_records(df, file_path.name, oem_sheet, header_row)
                client.table(OEM_TABLE).delete().eq(
                    "source_file", file_path.name
                ).execute()
                upsert_records(client, OEM_TABLE, records, None)
                totals["oem"] += len(records)
            except Exception as exc:
                errors.append(f"{file_path.name}::{oem_sheet}: {exc}")

    print("\n" + "=" * 70)
    print(f"PRODUCTION ROWS: {totals['production']}")
    print(f"FINISHED ROWS: {totals['finished']}")
    print(f"OEM ROWS: {totals['oem']}")
    if errors:
        print(f"ERRORS ({len(errors)}):")
        for err in errors:
            print(f"  - {err}")
    if warnings:
        print(f"WARNINGS ({len(warnings)}):")
        for warn in warnings:
            print(f"  - {warn}")
    print("=" * 70)


if __name__ == "__main__":
    main()
