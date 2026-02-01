# 제품표준서 Excel to Supabase Migration

This directory contains scripts to migrate 94 Excel (.xls) files from `04_01_제품표준서` to Supabase.

## Files

- `schema.sql` - Database schema (run this first in Supabase SQL Editor)
- `migrate_products.py` - Main migration script
- `requirements.txt` - Python dependencies
- `.env.example` - Environment variable template

## Setup

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
```

### 3. Create Database Schema

1. Go to your Supabase project
2. Open SQL Editor
3. Copy and paste the contents of `schema.sql`
4. Execute the SQL

This will create the following tables:
- `lab_products` - Product basic information
- `lab_product_bom` - Bill of Materials (ingredients)
- `lab_product_qc_specs` - QC test specifications
- `lab_product_revisions` - Product revision history

## Usage

### Dry Run (Preview Only)

Test the migration without inserting data:

```bash
python migrate_products.py --dry-run
```

### Test Single File

Process one file to verify everything works:

```bash
python migrate_products.py --file "제품표준서_EVCO1000_(FJSL002)-프레쥬 프로 모이스처 크리미 토너.xls"
```

### Migrate All Files

Process all 94 Excel files:

```bash
python migrate_products.py
```

### Skip Validation

If you want to skip material code validation (not recommended):

```bash
python migrate_products.py --skip-validation
```

## What Gets Migrated

From each Excel file, the script extracts:

### 입력란 (Input Sheet)
- **기본사항** (Rows 2-11): Product basic info
  - 국문제품명, 영문제품명, 관리번호, 작성일자, 제품코드, 성상, 포장단위, 작성자, 사용법
- **BOM** (Rows 14-44): Ingredient list
  - 순번, 원료코드, 함량%
- **QC Specs** (Columns E-I): Test specifications
  - 반제품 (semi-finished) and 완제품 (finished) test items

### 제품표준서 (Product Standard Sheet)
- D18: 저장방법 (Storage method)
- D19: 사용기한 (Shelf life)
- A23:D27: 개정사항 (Revision history, up to 5 entries)

## Data Validation

The script validates:
- Required fields (product_code, korean_name) are present
- Material codes in BOM exist in `lab_ingredients` table
- No duplicate product codes

## Idempotency

The script is idempotent - you can run it multiple times safely:
- Products are upserted (INSERT or UPDATE based on `product_code`)
- Related data (BOM, QC specs, revisions) are deleted and re-inserted

## Logging

All operations are logged to:
- Console (stdout)
- `migration.log` file

## Troubleshooting

### "SUPABASE_URL and SUPABASE_KEY environment variables required"

Make sure you've created `.env` file with your Supabase credentials.

### "Material codes not found in lab_ingredients"

Some ingredient codes in the Excel file don't exist in your `lab_ingredients` table. You need to:
1. Add missing ingredients to `lab_ingredients` first, OR
2. Use `--skip-validation` flag (not recommended)

### "Source directory not found"

Update the `SOURCE_DIR` variable in `migrate_products.py` to point to your Excel files directory.

## Example Output

```
2026-01-31 18:00:00 - INFO - Connected to Supabase: https://xxx.supabase.co
2026-01-31 18:00:00 - INFO - Found 94 file(s) to process

[1/94] Processing: 제품표준서_EVCO1000_(FJSL002)-프레쥬 프로 모이스처 크리미 토너.xls
2026-01-31 18:00:01 - INFO - Parsing: ...
2026-01-31 18:00:02 - INFO - ✓ Upserted product: FJSL002 (ID: xxx-xxx-xxx)
2026-01-31 18:00:02 - INFO -   ✓ Inserted 31 BOM items
2026-01-31 18:00:02 - INFO -   ✓ Inserted 24 QC specs
2026-01-31 18:00:02 - INFO -   ✓ Inserted 3 revisions

...

============================================================
MIGRATION SUMMARY
============================================================
Total files: 94
Success: 94
Errors: 0
============================================================
```

## Support

For issues or questions, check `migration.log` for detailed error messages.
