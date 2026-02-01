"""
Generate SQL INSERT statements from CSV
No external dependencies required
"""

import csv

CSV_PATH = "csv_output/Data_prep/06_allergens_master.csv"
OUTPUT_PATH = "sql/insert_fragrance_allergens.sql"


def escape_sql(val):
    """Escape single quotes for SQL"""
    if val is None:
        return "NULL"
    val = str(val).replace("'", "''")
    return f"'{val}'"


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

    print(f"Generating SQL for {len(rows)} rows...")

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        f.write("-- Fragrance allergen contents import\n")
        f.write("-- Generated from 06_allergens_master.csv\n")
        f.write(f"-- Total rows: {len(rows)}\n\n")

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

    print(f"SQL file written to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
