"""
ETL: Material Receipts (원료입고 관리대장) -> Supabase

Requirements:
- pandas, xlrd, supabase-py
- SUPABASE_SERVICE_ROLE_KEY in environment or .env
"""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any

import pandas as pd
from supabase import Client, create_client

try:
    import xlrd

    HAS_XLRD = True
except ImportError:
    HAS_XLRD = False

PROJECT_ROOT = Path(__file__).resolve().parents[4]
SOURCE_DIR = PROJECT_ROOT / "migration_docs" / "서식 샘플" / "원료입고 관리대장"

SUPPLIERS_TABLE = "labdoc_demo_suppliers"
RECEIPTS_TABLE = "labdoc_demo_material_receipts"


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


def parse_year(file_name: str) -> int:
    match = re.search(r"\((\d{4})\)", file_name)
    if not match:
        raise ValueError(f"Cannot parse year from filename: {file_name}")
    return int(match.group(1))


def normalize_text(value: Any) -> str | None:
    if value is None or pd.isna(value):
        return None
    text = str(value).strip()
    return text or None


def normalize_supplier(value: Any) -> str | None:
    text = normalize_text(value)
    if not text:
        return None
    return re.sub(r"\s+", " ", text)


def to_decimal(value: Any) -> float | None:
    if value is None or pd.isna(value):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def to_date(value: Any) -> str | None:
    if value is None or pd.isna(value):
        return None
    parsed = pd.to_datetime(value, errors="coerce")
    if pd.isna(parsed):
        return None
    return parsed.date().isoformat()


def to_test_no(value: Any, year: int) -> str | None:
    text = normalize_text(value)
    if not text:
        return None
    if year == 2016 and re.fullmatch(r"\d{7}", text):
        return f"R{text}"
    return text


def load_sheet(file_path: Path, sheet_name: str) -> pd.DataFrame:
    if not HAS_XLRD:
        raise RuntimeError("xlrd is required to read .xls files")
    return pd.read_excel(
        file_path,
        sheet_name=sheet_name,
        header=2,
        engine="xlrd",
    )


def build_records(
    df: pd.DataFrame, year: int, file_name: str, sheet_name: str
) -> pd.DataFrame:
    if df.shape[1] < 9:
        return pd.DataFrame()

    if df.shape[1] >= 10:
        df = df.iloc[:, [0, 1, 2, 4, 5, 6, 7, 8, 9]]

    df.columns = [
        "receipt_date",
        "ingredient_code",
        "ingredient_name",
        "lot_no",
        "quantity_kg",
        "supplier_name",
        "coa_reference",
        "test_no",
        "remarks",
    ]

    df["receipt_date"] = df["receipt_date"].ffill().apply(to_date)
    df["ingredient_code"] = df["ingredient_code"].apply(normalize_text).str.upper()
    df["ingredient_name"] = df["ingredient_name"].apply(normalize_text)
    df["lot_no"] = df["lot_no"].apply(normalize_text)
    df["quantity_kg"] = df["quantity_kg"].apply(to_decimal)
    df["supplier_name"] = df["supplier_name"].apply(normalize_text)
    df["supplier_name_normalized"] = df["supplier_name"].apply(normalize_supplier)
    df["coa_reference"] = df["coa_reference"].apply(normalize_text)
    df["test_no"] = df["test_no"].apply(lambda value: to_test_no(value, year))
    df["remarks"] = df["remarks"].apply(normalize_text)

    df = df[df["test_no"].notna()]
    df = df[df["receipt_date"].notna()]

    header_row = 2
    df["source_file"] = file_name
    df["source_sheet"] = sheet_name
    df["source_row"] = df.index + header_row + 2

    return df


def chunked(
    values: list[dict[str, Any]], size: int = 500
) -> list[list[dict[str, Any]]]:
    return [values[i : i + size] for i in range(0, len(values), size)]


def sanitize_record(record: dict[str, Any]) -> dict[str, Any]:
    cleaned: dict[str, Any] = {}
    for key, value in record.items():
        if value is None:
            cleaned[key] = None
        elif isinstance(value, float) and pd.isna(value):
            cleaned[key] = None
        elif pd.isna(value):
            cleaned[key] = None
        else:
            cleaned[key] = value
    return cleaned


def dedupe_by_key(records: list[dict[str, Any]], key: str) -> list[dict[str, Any]]:
    seen: dict[str, dict[str, Any]] = {}
    for record in records:
        value = record.get(key)
        if not value:
            continue
        seen[str(value)] = record
    return list(seen.values())


def upsert_suppliers(client: Client, suppliers: list[str]) -> dict[str, str]:
    if not suppliers:
        return {}
    payload = [
        {"supplier_name": name, "supplier_name_normalized": name}
        for name in sorted(set(suppliers))
    ]
    for batch in chunked(payload):
        client.table(SUPPLIERS_TABLE).upsert(
            batch, on_conflict="supplier_name"
        ).execute()

    response = client.table(SUPPLIERS_TABLE).select("id,supplier_name").execute()
    mapping: dict[str, str] = {}
    for row in response.data or []:
        if row.get("supplier_name"):
            mapping[row["supplier_name"]] = row["id"]
    return mapping


def upsert_receipts(client: Client, records: list[dict[str, Any]]) -> None:
    if not records:
        return
    for batch in chunked(records):
        client.table(RECEIPTS_TABLE).upsert(batch, on_conflict="test_no").execute()


def main() -> None:
    print("=" * 70)
    print("Material Receipts ETL")
    print("=" * 70)

    if not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY is required")

    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    files = sorted(SOURCE_DIR.glob("원료입고 관리대장(*).xls"))
    if not files:
        print("No source files found.")
        return

    total_rows = 0
    all_frames: list[pd.DataFrame] = []
    errors: list[str] = []

    for file_path in files:
        print(f"\n[FILE] {file_path.name}")
        try:
            year = parse_year(file_path.name)
        except ValueError as exc:
            errors.append(str(exc))
            continue

        try:
            sheet_names = (
                xlrd.open_workbook(file_path).sheet_names() if HAS_XLRD else []
            )
        except Exception as exc:
            errors.append(f"{file_path.name}: failed to read sheets ({exc})")
            continue

        for sheet_name in sheet_names:
            if sheet_name in {"양식", "List", "Sheet1", "Sheet2"}:
                continue
            if not re.match(r"^\d{1,2}월$", sheet_name):
                continue

            print(f"  [SHEET] {sheet_name}")
            try:
                df = load_sheet(file_path, sheet_name)
                if df.empty:
                    continue
                frame = build_records(df, year, file_path.name, sheet_name)
                if frame.empty:
                    continue
                total_rows += len(frame)
                all_frames.append(frame)
            except Exception as exc:
                errors.append(f"{file_path.name}::{sheet_name}: {exc}")

    if not all_frames:
        print("No data extracted.")
        return

    merged = pd.concat(all_frames, ignore_index=True)
    supplier_names = [
        name
        for name in merged["supplier_name_normalized"].dropna().tolist()
        if isinstance(name, str) and name.strip()
    ]
    supplier_map = upsert_suppliers(client, supplier_names)

    merged["supplier_id"] = merged["supplier_name_normalized"].map(supplier_map)
    merged["supplier_name"] = merged["supplier_name_normalized"]

    records = merged[
        [
            "test_no",
            "receipt_date",
            "ingredient_code",
            "ingredient_name",
            "lot_no",
            "quantity_kg",
            "supplier_id",
            "supplier_name",
            "coa_reference",
            "remarks",
            "source_file",
            "source_sheet",
            "source_row",
        ]
    ].to_dict(orient="records")
    records = [sanitize_record(record) for record in records]
    records = dedupe_by_key(records, "test_no")

    upsert_receipts(client, records)

    print("\n" + "=" * 70)
    print(f"TOTAL ROWS: {total_rows}")
    if errors:
        print(f"ERRORS ({len(errors)}):")
        for err in errors:
            print(f"  - {err}")
    print("=" * 70)


if __name__ == "__main__":
    main()
