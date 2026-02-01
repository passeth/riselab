"""
Generate SQL INSERT statements from CSV in batches
No external dependencies required
"""

import csv

CSV_PATH = "csv_output/Data_prep/06_allergens_master.csv"
OUTPUT_DIR = "sql"
BATCH_SIZE = 300


def escape_sql(val):
    """Escape single quotes for SQL"""
    if val is None:
        return "NULL"
    val = str(val).replace("'", "''")
    return f"'{val}'"


def write_batch(batch_num, rows, f):
    """Write a batch of rows to file"""
    f.write(f"\n-- Batch {batch_num} ({len(rows)} rows)\n")
    f.write("INSERT INTO labdoc_fragrance_allergen_contents ")
    f.write(
        "(supplier, fragrance_code, fragrance_name, allergen_name, cas_no, content_in_fragrance, source_filename) VALUES\n"
    )

    values = []
    for row in rows:
        val = f"({escape_sql(row['supplier'])}, {escape_sql(row['fragrance_code'])}, {escape_sql(row['fragrance_name'])}, {escape_sql(row['allergen_name'])}, {escape_sql(row['cas_no'])}, {row['content_in_fragrance']}, {escape_sql(row['source_filename'])})"
        values.append(val)

    f.write(",\n".join(values))
    f.write("\nON CONFLICT (fragrance_code, allergen_name) DO UPDATE SET\n")
    f.write("  content_in_fragrance = EXCLUDED.content_in_fragrance,\n")
    f.write("  source_filename = EXCLUDED.source_filename;\n")


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

            rows.append(
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

    print(f"Total rows: {len(rows)}")

    # Write single file with multiple INSERT statements
    output_path = f"{OUTPUT_DIR}/insert_fragrance_allergens_batched.sql"

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("-- Fragrance allergen contents import (batched)\n")
        f.write("-- Generated from 06_allergens_master.csv\n")
        f.write(f"-- Total rows: {len(rows)}\n")
        f.write(f"-- Batch size: {BATCH_SIZE}\n")

        batch_num = 0
        for i in range(0, len(rows), BATCH_SIZE):
            batch_num += 1
            batch = rows[i : i + BATCH_SIZE]
            write_batch(batch_num, batch, f)

        print(f"Written {batch_num} batches to {output_path}")


if __name__ == "__main__":
    main()
