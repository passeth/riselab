"""
Supabase Import용 CSV 준비 스크립트
- 데이터 정제 및 형식 변환
- 중복 제거
- 컬럼명 영문 변환
- UTF-8 인코딩
"""

import pandas as pd
import numpy as np
import json
import os
from datetime import datetime

# Input/Output directories
INPUT_DIR = "csv_output/Data_prep"
OUTPUT_DIR = "csv_output/supabase_import"

# Create output directory
os.makedirs(OUTPUT_DIR, exist_ok=True)


def clean_text(val):
    """Clean text values"""
    if pd.isna(val):
        return None
    val = str(val).strip()
    # Remove excessive whitespace
    val = " ".join(val.split())
    return val if val else None


def parse_date(val):
    """Parse various date formats to YYYY-MM-DD"""
    if pd.isna(val):
        return None
    val = str(val).strip()
    if not val or val in ["일련번호", "개정년월일"]:
        return None
    try:
        # Try common formats
        for fmt in ["%Y.%m.%d", "%Y-%m-%d", "%y.%m.%d", "%Y/%m/%d"]:
            try:
                return datetime.strptime(val, fmt).strftime("%Y-%m-%d")
            except:
                continue
        return None
    except:
        return None


def parse_int(val):
    """Parse integer, handling floats like 1.0"""
    if pd.isna(val):
        return None
    try:
        return int(float(val))
    except:
        return None


def json_to_postgres_array(json_str):
    """Convert JSON array string to Postgres array literal"""
    if pd.isna(json_str) or json_str in ["[]", ""]:
        return "{}"
    try:
        arr = json.loads(json_str)
        if not arr:
            return "{}"
        # Escape quotes and format as Postgres array
        escaped = ['"{}"'.format(s.replace('"', '\\"')) for s in arr]
        return "{" + ",".join(escaped) + "}"
    except:
        return "{}"


def prepare_products():
    """Prepare 01_products_master.csv -> labdoc_products.csv"""
    print("\n[1/7] Preparing labdoc_products.csv...")

    df = pd.read_csv(f"{INPUT_DIR}/01_products_master.csv", encoding="utf-8-sig")
    print(f"  Input: {len(df)} rows")

    # Remove duplicates by product_code (keep last)
    df = df.drop_duplicates(subset=["제품코드"], keep="last")
    print(f"  After dedup: {len(df)} rows")

    # Map columns
    result = pd.DataFrame(
        {
            "product_code": df["제품코드"].apply(clean_text),
            "management_code": df["관리번호"].apply(clean_text),
            "korean_name": df["국문제품명"].apply(clean_text),
            "english_name": df["영문제품명"].apply(clean_text),
            "appearance": df["성상"].apply(clean_text),
            "packaging_unit": df["포장단위"].apply(clean_text),
            "created_date": df["작성일자"].apply(parse_date),
            "author": df["작성자"].apply(clean_text),
            "usage_instructions": df["사용법"].apply(clean_text),
            "allergen_korean": df["Allergen국문"].apply(clean_text),
            "allergen_english": df["Allergen영문"].apply(clean_text),
            "storage_method": df["저장방법"].apply(clean_text),
            "shelf_life": df["사용기한_x"].apply(clean_text),
            "label_volume": df["표시\n용량"].apply(clean_text)
            if "표시\n용량" in df.columns
            else None,
            "fill_volume": df["충진\n용량\n()"].apply(clean_text)
            if "충진\n용량\n()" in df.columns
            else None,
            "specific_gravity": pd.to_numeric(df["비중"], errors="coerce"),
            "ph_standard": df["pH기준"].apply(clean_text),
            "viscosity_standard": df["점,경도기준"].apply(clean_text),
            "raw_material_report": df["원료목록보고"].apply(parse_int),
            "standardized_name": df["표준화\n명칭적용"].apply(parse_int)
            if "표준화\n명칭적용" in df.columns
            else None,
            "responsible_seller": df["책임판매업적용"].apply(parse_int),
            "recycling_grade": df["재활용등급표시"].apply(clean_text),
            "label_position": df["라벨부착위치"].apply(clean_text),
            "functional_claim": df["기능성"].apply(clean_text),
            "semi_product_code": df["semi_product_code"].apply(clean_text),
            "p_product_code": df["p_product_code"].apply(clean_text),
            "source_file": df["원본파일"].apply(clean_text),
        }
    )

    # Remove rows without product_code
    result = result[result["product_code"].notna()]

    # Convert INT columns to nullable integer to avoid "0.0" float format
    int_cols = ["raw_material_report", "standardized_name", "responsible_seller"]
    for col in int_cols:
        if col in result.columns:
            result[col] = result[col].astype("Int64")

    result.to_csv(
        f"{OUTPUT_DIR}/labdoc_products.csv", index=False, encoding="utf-8-sig"
    )
    print(f"  Output: {len(result)} rows")
    return result


def prepare_ingredients():
    """Prepare 11_ingredients_master.csv + docs -> labdoc_ingredients.csv"""
    print("\n[2/7] Preparing labdoc_ingredients.csv...")

    # Load ingredient master
    df = pd.read_csv(f"{INPUT_DIR}/11_ingredients_master.csv", encoding="utf-8-sig")
    print(f"  Master: {len(df)} rows")

    # Load document URLs
    docs = pd.read_csv(
        f"{INPUT_DIR}/ingredient_files_uploaded_summary.csv", encoding="utf-8-sig"
    )
    print(f"  Docs: {len(docs)} rows")

    # Merge
    df = df.merge(docs, on="ingredient_code", how="left")

    # Map columns
    result = pd.DataFrame(
        {
            "ingredient_code": df["ingredient_code"].apply(clean_text),
            "ingredient_name": df["ingredient_name"].apply(clean_text),
            "manufacturer": df["manufacturer"].apply(clean_text),
            "origin_country": df["origin_country"].apply(clean_text),
            "purchase_type": df["purchase_type"].apply(clean_text),
            "purchase_method": df["purchase_method"].apply(clean_text),
            "coa_urls": df["coa_urls"].apply(json_to_postgres_array)
            if "coa_urls" in df.columns
            else "{}",
            "composition_urls": df["composition_urls"].apply(json_to_postgres_array)
            if "composition_urls" in df.columns
            else "{}",
            "msds_kr_urls": df["msds_kr_urls"].apply(json_to_postgres_array)
            if "msds_kr_urls" in df.columns
            else "{}",
            "msds_en_urls": df["msds_en_urls"].apply(json_to_postgres_array)
            if "msds_en_urls" in df.columns
            else "{}",
        }
    )

    result.to_csv(
        f"{OUTPUT_DIR}/labdoc_ingredients.csv", index=False, encoding="utf-8-sig"
    )
    print(f"  Output: {len(result)} rows")
    return result


def prepare_bom():
    """Prepare 02_products_bom.csv -> labdoc_product_bom.csv"""
    print("\n[3/7] Preparing labdoc_product_bom.csv...")

    df = pd.read_csv(f"{INPUT_DIR}/02_products_bom.csv", encoding="utf-8-sig")
    print(f"  Input: {len(df)} rows")

    result = pd.DataFrame(
        {
            "product_code": df["제품코드"].apply(clean_text),
            "sequence_no": df["순번"].apply(parse_int),
            "ingredient_code": df["원료코드"].apply(clean_text),
            "content_ratio": pd.to_numeric(df["함량"], errors="coerce"),
        }
    )

    # Remove invalid rows
    result = result[result["product_code"].notna() & result["sequence_no"].notna()]

    # Convert INT columns to nullable integer
    result["sequence_no"] = result["sequence_no"].astype("Int64")

    result.to_csv(
        f"{OUTPUT_DIR}/labdoc_product_bom.csv", index=False, encoding="utf-8-sig"
    )
    print(f"  Output: {len(result)} rows")
    return result


def prepare_qc_specs():
    """Prepare 03_products_qc_specs.csv -> labdoc_product_qc_specs.csv"""
    print("\n[4/7] Preparing labdoc_product_qc_specs.csv...")

    df = pd.read_csv(f"{INPUT_DIR}/03_products_qc_specs.csv", encoding="utf-8-sig")
    print(f"  Input: {len(df)} rows")

    # Remove duplicates
    df = df.drop_duplicates()
    print(f"  After dedup: {len(df)} rows")

    result = pd.DataFrame(
        {
            "product_code": df["제품코드"].apply(clean_text),
            "qc_type": df["QC유형"].apply(clean_text),
            "sequence_no": df["순번"].apply(parse_int),
            "test_item": df["항목"].apply(clean_text),
            "specification": df["시험기준"].apply(clean_text),
            "test_method": df["시험방법"].apply(clean_text),
        }
    )

    result = result[result["product_code"].notna() & result["test_item"].notna()]

    # Convert INT columns to nullable integer
    result["sequence_no"] = result["sequence_no"].astype("Int64")

    result.to_csv(
        f"{OUTPUT_DIR}/labdoc_product_qc_specs.csv", index=False, encoding="utf-8-sig"
    )
    print(f"  Output: {len(result)} rows")
    return result


def prepare_english_specs():
    """Prepare 04_products_english_specs.csv -> labdoc_product_english_specs.csv"""
    print("\n[5/7] Preparing labdoc_product_english_specs.csv...")

    df = pd.read_csv(f"{INPUT_DIR}/04_products_english_specs.csv", encoding="utf-8-sig")
    print(f"  Input: {len(df)} rows")

    df = df.drop_duplicates()

    result = pd.DataFrame(
        {
            "management_code": df["관리번호"].apply(clean_text),
            "product_name": df["제품명"].apply(clean_text),
            "product_code": df["품목코드"].apply(clean_text),
            "test_item": df["TEST"].apply(clean_text),
            "specification": df["SPECIFICATION"].apply(clean_text),
            "result": df["RESULT"].apply(clean_text),
        }
    )

    result = result[result["management_code"].notna() & result["test_item"].notna()]

    result.to_csv(
        f"{OUTPUT_DIR}/labdoc_product_english_specs.csv",
        index=False,
        encoding="utf-8-sig",
    )
    print(f"  Output: {len(result)} rows")
    return result


def prepare_work_specs():
    """Prepare 07_products_work_specs.csv -> labdoc_product_work_specs.csv"""
    print("\n[6/7] Preparing labdoc_product_work_specs.csv...")

    df = pd.read_csv(f"{INPUT_DIR}/07_products_work_specs.csv", encoding="utf-8-sig")
    print(f"  Input: {len(df)} rows")

    result = pd.DataFrame(
        {
            "management_code": df["관리번호"].apply(clean_text),
            "product_code": df["제품코드"].apply(clean_text),
            "product_name": df["제품명"].apply(clean_text),
            "contents_notes": df["내용물관련사항"].apply(clean_text),
            "production_cautions": df["생산시주의사항"].apply(clean_text)
            if "생산시주의사항" in df.columns
            else None,
            "label_volume": df["표시용량"].apply(clean_text),
            "fill_volume": df["충진용량"].apply(clean_text),
            "color": df["색상"].apply(clean_text),
            "remarks": df["비고"].apply(clean_text),
            "source_filename": df["파일명"].apply(clean_text),
        }
    )

    result = result[result["product_code"].notna()]

    result.to_csv(
        f"{OUTPUT_DIR}/labdoc_product_work_specs.csv", index=False, encoding="utf-8-sig"
    )
    print(f"  Output: {len(result)} rows")
    return result


def prepare_subsidiary_materials():
    """Prepare 08_products_subsidiary_materials.csv with fill-down"""
    print("\n[7/7] Preparing labdoc_product_subsidiary_materials.csv...")

    df = pd.read_csv(
        f"{INPUT_DIR}/08_products_subsidiary_materials.csv", encoding="utf-8-sig"
    )
    print(f"  Input: {len(df)} rows")

    # Fill down blank 관리번호 and 제품코드
    df["관리번호"] = df["관리번호"].ffill()
    df["제품코드"] = df["제품코드"].ffill()

    # Add sequence numbers per product
    df["seq"] = df.groupby(["관리번호", "제품코드"]).cumcount() + 1

    result = pd.DataFrame(
        {
            "management_code": df["관리번호"].apply(clean_text),
            "product_code": df["제품코드"].apply(clean_text),
            "material_name": df["부자재명"].apply(clean_text),
            "material_spec": df["부자재사양"].apply(clean_text),
            "vendor": df["업체"].apply(clean_text),
            "sequence_no": df["seq"],
        }
    )

    result = result[result["product_code"].notna() & result["material_name"].notna()]

    # Convert INT columns to nullable integer
    result["sequence_no"] = result["sequence_no"].astype("Int64")

    result.to_csv(
        f"{OUTPUT_DIR}/labdoc_product_subsidiary_materials.csv",
        index=False,
        encoding="utf-8-sig",
    )
    print(f"  Output: {len(result)} rows")
    return result


def prepare_revisions():
    """Prepare 05_products_revisions.csv -> labdoc_product_revisions.csv
    Filter out header rows where 일련번호 = '일련번호'
    """
    print("\n[8/14] Preparing labdoc_product_revisions.csv...")

    df = pd.read_csv(f"{INPUT_DIR}/05_products_revisions.csv", encoding="utf-8-sig")
    print(f"  Input: {len(df)} rows")

    # Filter out header rows
    df = df[df["일련번호"] != "일련번호"]
    print(f"  After header filter: {len(df)} rows")

    # Remove empty revisions
    df = df[df["일련번호"].notna() | df["개정년월일"].notna() | df["개정사항"].notna()]
    print(f"  After empty filter: {len(df)} rows")

    result = pd.DataFrame(
        {
            "product_code": df["제품코드"].apply(clean_text),
            "revision_no": df["일련번호"].apply(parse_int),
            "revision_date": df["개정년월일"].apply(parse_date),
            "revision_content": df["개정사항"].apply(clean_text),
        }
    )

    result = result[result["product_code"].notna() & result["revision_no"].notna()]

    # Remove duplicates by product_code + revision_no
    result = result.drop_duplicates(subset=["product_code", "revision_no"], keep="last")

    # Convert INT columns to nullable integer
    result["revision_no"] = result["revision_no"].astype("Int64")

    result.to_csv(
        f"{OUTPUT_DIR}/labdoc_product_revisions.csv", index=False, encoding="utf-8-sig"
    )
    print(f"  Output: {len(result)} rows")
    return result


def prepare_fragrances_allergens():
    """Prepare 06_allergens_master.csv -> 3 tables:
    - labdoc_fragrances.csv (unique fragrances)
    - labdoc_allergens.csv (unique allergens)
    - labdoc_fragrance_allergens.csv (links with content values)
    """
    print("\n[9-11/14] Preparing fragrance/allergen tables...")

    df = pd.read_csv(f"{INPUT_DIR}/06_allergens_master.csv", encoding="utf-8-sig")
    print(f"  Input: {len(df)} rows")

    # === 1. Extract unique fragrances ===
    print("  Extracting fragrances...")

    # Fill NULL fragrance_code with fragrance_name (can be updated later)
    df["향료코드_filled"] = df["향료코드"].fillna(df["향료명"])

    frag_cols = ["공급업체", "향료코드_filled", "향료명", "파일명"]
    frag_df = df[frag_cols].drop_duplicates(subset=["공급업체", "향료코드_filled"])

    # Generate UUIDs for fragrances
    import uuid

    frag_df = frag_df.copy()
    frag_df["id"] = [str(uuid.uuid4()) for _ in range(len(frag_df))]

    fragrances = pd.DataFrame(
        {
            "id": frag_df["id"],
            "supplier": frag_df["공급업체"].apply(clean_text),
            "fragrance_code": frag_df["향료코드_filled"].apply(clean_text),
            "fragrance_name": frag_df["향료명"].apply(clean_text),
            "source_filename": frag_df["파일명"].apply(clean_text),
        }
    )
    fragrances = fragrances[fragrances["fragrance_code"].notna()]
    fragrances.to_csv(
        f"{OUTPUT_DIR}/labdoc_fragrances.csv", index=False, encoding="utf-8-sig"
    )
    print(f"  Fragrances: {len(fragrances)} rows")

    # Create fragrance lookup dict - use filtered fragrances, not frag_df!
    frag_lookup = {}
    for _, row in fragrances.iterrows():
        key = (row["supplier"], row["fragrance_code"])
        frag_lookup[key] = row["id"]

    # === 2. Extract unique allergens ===
    print("  Extracting allergens...")
    allerg_cols = ["알러젠명", "INCI명", "CAS번호"]
    allerg_df = df[allerg_cols].drop_duplicates()

    # Generate UUIDs for allergens
    allerg_df = allerg_df.copy()
    allerg_df["id"] = [str(uuid.uuid4()) for _ in range(len(allerg_df))]

    allergens = pd.DataFrame(
        {
            "id": allerg_df["id"],
            "allergen_name": allerg_df["알러젠명"].apply(clean_text),
            "inci_name": allerg_df["INCI명"].apply(clean_text),
            "cas_no": allerg_df["CAS번호"].apply(clean_text),
        }
    )
    allergens = allergens[allergens["allergen_name"].notna()]
    allergens.to_csv(
        f"{OUTPUT_DIR}/labdoc_allergens.csv", index=False, encoding="utf-8-sig"
    )
    print(f"  Allergens: {len(allergens)} rows")

    # Create allergen lookup dict - use filtered allergens, not allerg_df!
    allerg_lookup = {}
    for _, row in allergens.iterrows():
        key = (
            row["allergen_name"],
            row["inci_name"],
            row["cas_no"],
        )
        allerg_lookup[key] = row["id"]

    # === 3. Create fragrance-allergen links ===
    print("  Creating fragrance-allergen links...")
    links = []
    for _, row in df.iterrows():
        frag_key = (clean_text(row["공급업체"]), clean_text(row["향료코드_filled"]))
        allerg_key = (
            clean_text(row["알러젠명"]),
            clean_text(row["INCI명"]),
            clean_text(row["CAS번호"]),
        )

        frag_id = frag_lookup.get(frag_key)
        allerg_id = allerg_lookup.get(allerg_key)

        if frag_id and allerg_id:
            links.append(
                {
                    "fragrance_id": frag_id,
                    "allergen_id": allerg_id,
                    "content_in_fragrance": pd.to_numeric(
                        row["향료중함량"], errors="coerce"
                    ),
                    "content_in_product": pd.to_numeric(
                        row["제품중함량"], errors="coerce"
                    ),
                    "leave_on_label": clean_text(row["Leave-on라벨"]),
                    "rinse_off_label": clean_text(row["Rinse-off라벨"]),
                }
            )

    fa_df = pd.DataFrame(links)
    # Remove duplicates (fragrance_id + allergen_id)
    fa_df = fa_df.drop_duplicates(subset=["fragrance_id", "allergen_id"], keep="last")
    fa_df.to_csv(
        f"{OUTPUT_DIR}/labdoc_fragrance_allergens.csv",
        index=False,
        encoding="utf-8-sig",
    )
    print(f"  Fragrance-Allergens: {len(fa_df)} rows")

    return fragrances, allergens, fa_df


def prepare_manufacturing():
    """Prepare manufacturing process tables:
    - 09_manufacturing_process_headers.csv -> labdoc_manufacturing_processes.csv
    - 10_manufacturing_process_steps.csv -> labdoc_manufacturing_process_steps.csv
    """
    print("\n[12-13/14] Preparing manufacturing process tables...")
    import uuid

    # === 1. Manufacturing process headers ===
    headers = pd.read_csv(
        f"{INPUT_DIR}/09_manufacturing_process_headers.csv", encoding="utf-8-sig"
    )
    print(f"  Headers input: {len(headers)} rows")

    # Generate UUIDs
    headers = headers.copy()
    headers["id"] = [str(uuid.uuid4()) for _ in range(len(headers))]

    processes = pd.DataFrame(
        {
            "id": headers["id"],
            "product_code": headers["product_code"].apply(clean_text),
            "source_filename": headers["filename"].apply(clean_text),
            "product_name": headers["product_name"].apply(clean_text),
            "batch_number": headers["batch_number"].apply(clean_text),
            "batch_unit": headers["batch_unit"].apply(clean_text),
            "dept_name": headers["dept_name"].apply(clean_text),
            "actual_qty": headers["actual_qty"].apply(clean_text),
            "mfg_date": headers["mfg_date"].apply(parse_date),
            "operator": headers["operator"].apply(clean_text),
            "approver_1": headers["approver_1"].apply(clean_text),
            "approver_2": headers["approver_2"].apply(clean_text),
            "approver_3": headers["approver_3"].apply(clean_text),
            "notes_content": headers["notes_content"].apply(clean_text),
            "total_time": headers["total_time"].apply(clean_text),
            "special_notes": headers["special_notes"].apply(clean_text),
            "step_count": headers["step_count"].apply(parse_int),
        }
    )
    processes = processes[processes["product_code"].notna()]

    # Convert INT columns to nullable integer
    processes["step_count"] = processes["step_count"].astype("Int64")

    processes.to_csv(
        f"{OUTPUT_DIR}/labdoc_manufacturing_processes.csv",
        index=False,
        encoding="utf-8-sig",
    )
    print(f"  Processes output: {len(processes)} rows")

    # Create lookup by product_code
    process_lookup = {}
    for _, row in processes.iterrows():
        process_lookup[row["product_code"]] = row["id"]

    # === 2. Manufacturing process steps ===
    steps_df = pd.read_csv(
        f"{INPUT_DIR}/10_manufacturing_process_steps.csv", encoding="utf-8-sig"
    )
    print(f"  Steps input: {len(steps_df)} rows")

    # Fill down product_code for steps that have blank product_code
    steps_df["product_code"] = steps_df["product_code"].ffill()

    # Map to process_id
    steps_df["process_id"] = steps_df["product_code"].apply(
        lambda x: process_lookup.get(clean_text(x))
    )

    # Only keep steps with valid process_id
    steps_df = steps_df[steps_df["process_id"].notna()]

    steps = pd.DataFrame(
        {
            "process_id": steps_df["process_id"],
            "step_num": steps_df["step_num"].apply(parse_int),
            "step_type": steps_df["step_type"].apply(clean_text),
            "step_name": steps_df["step_name"].apply(clean_text),
            "step_desc": steps_df["step_desc"].apply(clean_text),
            "work_time": steps_df["work_time"].apply(clean_text),
            "checker": steps_df["checker"].apply(clean_text),
        }
    )
    steps = steps[steps["step_num"].notna()]
    steps = steps.drop_duplicates(subset=["process_id", "step_num"], keep="last")

    # Convert INT columns to nullable integer
    steps["step_num"] = steps["step_num"].astype("Int64")

    steps.to_csv(
        f"{OUTPUT_DIR}/labdoc_manufacturing_process_steps.csv",
        index=False,
        encoding="utf-8-sig",
    )
    print(f"  Steps output: {len(steps)} rows")

    return processes, steps


def prepare_ingredient_specs():
    """Prepare 12_ingredients_specs.csv -> labdoc_ingredient_specs.csv"""
    print("\n[14/14] Preparing labdoc_ingredient_specs.csv...")

    df = pd.read_csv(f"{INPUT_DIR}/12_ingredients_specs.csv", encoding="utf-8-sig")
    print(f"  Input: {len(df)} rows")

    result = pd.DataFrame(
        {
            "ingredient_code": df["ingredient_code"].apply(clean_text),
            "ingredient_name": df["ingredient_name"].apply(clean_text),
            "spec_item": df["spec_item"].apply(clean_text),
            "spec_standard": df["spec_standard"].apply(clean_text),
            "result_value": df["result_value"].apply(clean_text),
            "result_date": df["result_date"].apply(parse_date),
            "test_method": df["test_method"].apply(clean_text),
            "remarks": df["remarks"].apply(clean_text),
        }
    )

    result = result[result["ingredient_code"].notna() & result["spec_item"].notna()]

    result.to_csv(
        f"{OUTPUT_DIR}/labdoc_ingredient_specs.csv", index=False, encoding="utf-8-sig"
    )
    print(f"  Output: {len(result)} rows")
    return result


def main():
    print("=" * 70)
    print("Supabase Import CSV Preparation")
    print("=" * 70)

    # Prepare all CSVs (14 tables)
    # Group 1: Basic product tables (1-7)
    prepare_products()
    prepare_ingredients()
    prepare_bom()
    prepare_qc_specs()
    prepare_english_specs()
    prepare_work_specs()
    prepare_subsidiary_materials()

    # Group 2: Remaining tables (8-14)
    prepare_revisions()
    prepare_fragrances_allergens()  # 9-11: fragrances, allergens, links
    prepare_manufacturing()  # 12-13: processes, steps
    prepare_ingredient_specs()

    # List output files
    print("\n" + "=" * 70)
    print("OUTPUT FILES")
    print("=" * 70)

    total_rows = 0
    total_size = 0
    for f in sorted(os.listdir(OUTPUT_DIR)):
        if f.endswith(".csv"):
            path = os.path.join(OUTPUT_DIR, f)
            size = os.path.getsize(path)
            df = pd.read_csv(path, encoding="utf-8-sig")
            print(f"  {f}: {len(df)} rows, {size / 1024:.1f} KB")
            total_rows += len(df)
            total_size += size

    print(f"\nTOTAL: {total_rows} rows, {total_size / 1024:.1f} KB")
    print("\nDone! Files ready for Supabase import in:", OUTPUT_DIR)


if __name__ == "__main__":
    main()
