"""
Clean CSV data and generate SQL for Supabase import
Handles multi-line values in CSV
"""

import csv
import re

CSV_PATH = "csv_output/Data_prep/06_allergens_master.csv"
OUTPUT_PATH = "csv_output/supabase_import/fragrance_allergen_contents.csv"


def clean_value(val):
    """Clean multi-line values and normalize"""
    if val is None:
        return None
    # Replace newlines with space
    val = re.sub(r"[\r\n]+", " ", str(val))
    # Remove extra spaces
    val = re.sub(r"\s+", " ", val)
    return val.strip()


def main():
    rows = []

    with open(CSV_PATH, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)

        for row in reader:
            content_str = row.get("향료중함량", "").strip()

            if not content_str:
                continue

            try:
                content = float(content_str)
                if content <= 0:
                    continue
            except (ValueError, TypeError):
                continue

            # Clean values
            supplier = clean_value(row.get("공급업체", ""))
            fragrance_code = clean_value(row.get("향료코드", ""))
            fragrance_name = clean_value(row.get("향료명", ""))
            allergen_name = clean_value(row.get("알러젠명", ""))
            cas_no = clean_value(row.get("CAS번호", ""))
            source_filename = clean_value(row.get("파일명", ""))

            if not fragrance_code or not allergen_name:
                continue

            rows.append(
                {
                    "supplier": supplier or "",
                    "fragrance_code": fragrance_code,
                    "fragrance_name": fragrance_name or "",
                    "allergen_name": allergen_name,
                    "cas_no": cas_no or "",
                    "content_in_fragrance": content,
                    "source_filename": source_filename or "",
                }
            )

    print(f"Total valid rows: {len(rows)}")

    # Write clean CSV for Supabase import
    with open(OUTPUT_PATH, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "supplier",
                "fragrance_code",
                "fragrance_name",
                "allergen_name",
                "cas_no",
                "content_in_fragrance",
                "source_filename",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    print(f"Clean CSV written to {OUTPUT_PATH}")

    # Also generate unique fragrance count
    unique_fragrances = set(r["fragrance_code"] for r in rows)
    unique_allergens = set(r["allergen_name"] for r in rows)
    print(f"Unique fragrances: {len(unique_fragrances)}")
    print(f"Unique allergens: {len(unique_allergens)}")


if __name__ == "__main__":
    main()
