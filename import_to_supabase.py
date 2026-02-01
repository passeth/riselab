"""
Import prepared CSVs to Supabase using direct PostgreSQL connection.
Uses psycopg2 COPY command for fast bulk import.
"""

import os
import pandas as pd
from io import StringIO

# Try to import psycopg2, fall back to supabase if not available
try:
    import psycopg2
    from psycopg2 import sql

    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False
    print("psycopg2 not found, will use supabase-py instead")

try:
    from supabase import create_client, Client

    HAS_SUPABASE = True
except ImportError:
    HAS_SUPABASE = False

# Configuration - Get from environment or .env file
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://usvjbuudnofwhmclwhfl.supabase.co")
SUPABASE_KEY = os.getenv(
    "SUPABASE_SERVICE_ROLE_KEY", ""
)  # Need service role key for direct insert

# For direct PostgreSQL connection (preferred for bulk import)
DB_HOST = os.getenv("DB_HOST", "db.usvjbuudnofwhmclwhfl.supabase.co")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv(
    "DB_PASSWORD", ""
)  # Get from Supabase Dashboard > Settings > Database

INPUT_DIR = "csv_output/supabase_import"

# Import order (respecting foreign key dependencies)
IMPORT_ORDER = [
    # Independent tables first
    ("labdoc_products.csv", "labdoc_products"),
    ("labdoc_ingredients.csv", "labdoc_ingredients"),
    ("labdoc_allergens.csv", "labdoc_allergens"),
    ("labdoc_fragrances.csv", "labdoc_fragrances"),
    ("labdoc_manufacturing_processes.csv", "labdoc_manufacturing_processes"),
    # Dependent tables
    ("labdoc_product_bom.csv", "labdoc_product_bom"),
    ("labdoc_product_qc_specs.csv", "labdoc_product_qc_specs"),
    ("labdoc_product_english_specs.csv", "labdoc_product_english_specs"),
    ("labdoc_product_revisions.csv", "labdoc_product_revisions"),
    ("labdoc_product_work_specs.csv", "labdoc_product_work_specs"),
    ("labdoc_product_subsidiary_materials.csv", "labdoc_product_subsidiary_materials"),
    ("labdoc_fragrance_allergens.csv", "labdoc_fragrance_allergens"),
    ("labdoc_manufacturing_process_steps.csv", "labdoc_manufacturing_process_steps"),
    ("labdoc_ingredient_specs.csv", "labdoc_ingredient_specs"),
]


def clear_tables(conn):
    """Clear all labdoc_ tables in reverse order (to handle FK constraints)"""
    print("\nClearing existing data...")

    tables = [t[1] for t in reversed(IMPORT_ORDER)]

    with conn.cursor() as cur:
        for table in tables:
            try:
                cur.execute(
                    sql.SQL("TRUNCATE TABLE {} CASCADE").format(sql.Identifier(table))
                )
                print(f"  Cleared {table}")
            except Exception as e:
                print(f"  Error clearing {table}: {e}")

    conn.commit()
    print("  Done clearing tables")


def import_csv_psycopg2(conn, csv_file, table_name):
    """Import CSV using PostgreSQL COPY command (fastest method)"""
    filepath = os.path.join(INPUT_DIR, csv_file)

    if not os.path.exists(filepath):
        print(f"  SKIP: {csv_file} not found")
        return 0

    df = pd.read_csv(filepath, encoding="utf-8-sig")

    if len(df) == 0:
        print(f"  SKIP: {csv_file} is empty")
        return 0

    # Get column names from CSV
    columns = list(df.columns)

    # Handle NaN values - replace with None for proper NULL handling
    df = df.where(pd.notnull(df), None)

    # Create StringIO buffer for COPY
    buffer = StringIO()
    df.to_csv(buffer, index=False, header=False, sep="\t", na_rep="\\N")
    buffer.seek(0)

    try:
        with conn.cursor() as cur:
            # Use COPY command for fast bulk insert
            copy_sql = sql.SQL(
                "COPY {} ({}) FROM STDIN WITH (FORMAT csv, DELIMITER E'\\t', NULL '\\N')"
            ).format(
                sql.Identifier(table_name),
                sql.SQL(", ").join(map(sql.Identifier, columns)),
            )
            cur.copy_expert(copy_sql.as_string(conn), buffer)

        conn.commit()
        return len(df)

    except Exception as e:
        conn.rollback()
        print(f"  ERROR with COPY: {e}")
        # Fall back to row-by-row insert
        return import_csv_rowbyrow(conn, df, table_name, columns)


def import_csv_rowbyrow(conn, df, table_name, columns):
    """Fallback: Import row by row (slower but more reliable)"""
    print(f"  Falling back to row-by-row insert...")

    success_count = 0
    error_count = 0

    with conn.cursor() as cur:
        for idx, row in df.iterrows():
            try:
                # Build INSERT statement
                placeholders = sql.SQL(", ").join(sql.Placeholder() * len(columns))
                insert_sql = sql.SQL("INSERT INTO {} ({}) VALUES ({})").format(
                    sql.Identifier(table_name),
                    sql.SQL(", ").join(map(sql.Identifier, columns)),
                    placeholders,
                )

                # Convert row values, handling NaN
                values = []
                for col in columns:
                    val = row[col]
                    if pd.isna(val):
                        values.append(None)
                    else:
                        values.append(val)

                cur.execute(insert_sql, values)
                success_count += 1

            except Exception as e:
                error_count += 1
                if error_count <= 3:
                    print(f"    Row {idx} error: {e}")

    conn.commit()

    if error_count > 0:
        print(f"  Errors: {error_count}/{len(df)} rows failed")

    return success_count


def import_with_supabase_py(client: Client, csv_file: str, table_name: str):
    """Import using supabase-py (slower, but works without direct DB access)"""
    filepath = os.path.join(INPUT_DIR, csv_file)

    if not os.path.exists(filepath):
        print(f"  SKIP: {csv_file} not found")
        return 0

    df = pd.read_csv(filepath, encoding="utf-8-sig")

    if len(df) == 0:
        print(f"  SKIP: {csv_file} is empty")
        return 0

    # Convert to list of dicts
    records = df.where(pd.notnull(df), None).to_dict(orient="records")

    # Insert in batches of 500
    batch_size = 500
    total = 0

    for i in range(0, len(records), batch_size):
        batch = records[i : i + batch_size]
        try:
            result = client.table(table_name).insert(batch).execute()
            total += len(batch)
        except Exception as e:
            print(f"  Batch error at {i}: {e}")

    return total


def main():
    print("=" * 70)
    print("Supabase CSV Import")
    print("=" * 70)

    if HAS_PSYCOPG2 and DB_PASSWORD:
        # Preferred: Direct PostgreSQL connection
        print("\nUsing PostgreSQL direct connection...")

        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
        )

        # Clear existing data
        clear_tables(conn)

        # Import each table
        print("\nImporting tables...")
        total_rows = 0

        for csv_file, table_name in IMPORT_ORDER:
            print(f"\n  [{table_name}]")
            rows = import_csv_psycopg2(conn, csv_file, table_name)
            print(f"    Imported: {rows} rows")
            total_rows += rows

        conn.close()

    elif HAS_SUPABASE and SUPABASE_KEY:
        # Alternative: Supabase Python client
        print("\nUsing Supabase Python client...")

        client = create_client(SUPABASE_URL, SUPABASE_KEY)

        total_rows = 0
        for csv_file, table_name in IMPORT_ORDER:
            print(f"\n  [{table_name}]")
            rows = import_with_supabase_py(client, csv_file, table_name)
            print(f"    Imported: {rows} rows")
            total_rows += rows

    else:
        print("\nERROR: No database connection available!")
        print("Please set one of:")
        print(
            "  1. DB_PASSWORD environment variable (for PostgreSQL direct connection)"
        )
        print(
            "  2. SUPABASE_SERVICE_ROLE_KEY environment variable (for Supabase client)"
        )
        print("\nAlternatively, import CSVs via Supabase Dashboard:")
        print("  1. Go to https://supabase.com/dashboard/project/usvjbuudnofwhmclwhfl")
        print("  2. Navigate to Table Editor")
        print("  3. Select each table > Import > Upload CSV")
        return

    print("\n" + "=" * 70)
    print(f"TOTAL IMPORTED: {total_rows} rows")
    print("=" * 70)


if __name__ == "__main__":
    main()
