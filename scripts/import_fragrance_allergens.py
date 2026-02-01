"""
Import fragrance allergen contents from CSV to Supabase
Only imports rows with actual content (content_in_fragrance > 0)
"""

import csv
import os
from supabase import create_client

# Supabase config
SUPABASE_URL = "https://usvjbuudnofwhmclwhfl.supabase.co"
SUPABASE_KEY = os.environ.get(
    "SUPABASE_SERVICE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzdmpidXVkbm9md2htY2x3aGZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzg3NTcxMiwiZXhwIjoyMDUzNDUxNzEyfQ.EMt9ctucOWdxkX0F5kLW1horXves-ILmVpI9fMOPwHo",
)

CSV_PATH = "csv_output/Data_prep/06_allergens_master.csv"


def main():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    rows_to_insert = []
    skipped = 0

    with open(CSV_PATH, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)

        for row in reader:
            # Get content value
            content_str = row.get("향료중함량", "").strip()

            # Skip if no content
            if not content_str:
                skipped += 1
                continue

            try:
                content = float(content_str)
                if content <= 0:
                    skipped += 1
                    continue
            except (ValueError, TypeError):
                skipped += 1
                continue

            # Build row data
            rows_to_insert.append(
                {
                    "supplier": row.get("공급업체", "").strip() or None,
                    "fragrance_code": row.get("향료코드", "").strip(),
                    "fragrance_name": row.get("향료명", "").strip() or None,
                    "allergen_name": row.get("알러젠명", "").strip(),
                    "cas_no": row.get("CAS번호", "").strip() or None,
                    "content_in_fragrance": content,
                    "source_filename": row.get("파일명", "").strip() or None,
                }
            )

    print(f"Rows to insert: {len(rows_to_insert)}")
    print(f"Rows skipped (no content): {skipped}")

    # Insert in batches of 500
    batch_size = 500
    total_inserted = 0

    for i in range(0, len(rows_to_insert), batch_size):
        batch = rows_to_insert[i : i + batch_size]
        try:
            result = (
                supabase.table("labdoc_fragrance_allergen_contents")
                .upsert(batch, on_conflict="fragrance_code,allergen_name")
                .execute()
            )
            total_inserted += len(batch)
            print(f"Inserted batch {i // batch_size + 1}: {len(batch)} rows")
        except Exception as e:
            print(f"Error inserting batch {i // batch_size + 1}: {e}")
            # Try individual inserts for failed batch
            for row in batch:
                try:
                    supabase.table("labdoc_fragrance_allergen_contents").upsert(
                        row, on_conflict="fragrance_code,allergen_name"
                    ).execute()
                    total_inserted += 1
                except Exception as e2:
                    print(
                        f"  Failed: {row['fragrance_code']}/{row['allergen_name']}: {e2}"
                    )

    print(f"\nTotal inserted: {total_inserted}")


if __name__ == "__main__":
    main()
