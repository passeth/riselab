"""
제조공정 steps CSV를 headers 파일 매핑을 활용하여 교정하는 스크립트

로직:
1. 09 원본에서 filename → 원본 product_code 매핑
2. 09 수정본에서 filename → 새 product_code (1:N) 매핑
3. 10번 파일의 product_code를 원본 매핑으로 filename 찾기
4. 해당 filename의 새 product_code들로 행 확장
"""

import pandas as pd
from pathlib import Path

# 파일 경로
BASE_DIR = Path(r"c:\Users\passe\Documents\@PROJECT\riselab\csv_output\Data_prep")
HEADERS_ORIGINAL_CSV = BASE_DIR / "09_manufacturing_process_headers.csv"
HEADERS_FIXED_CSV = BASE_DIR / "09_manufacturing_process_headers_fixed.csv"
STEPS_CSV = BASE_DIR / "10_manufacturing_process_steps.csv"
OUTPUT_STEPS_CSV = BASE_DIR / "10_manufacturing_process_steps_fixed.csv"


def main():
    print("=== 제조공정 Steps CSV 교정 시작 ===\n")

    # CSV 파일 읽기
    print("1. CSV 파일 로딩...")
    headers_orig = pd.read_csv(HEADERS_ORIGINAL_CSV)
    headers_fixed = pd.read_csv(HEADERS_FIXED_CSV)
    steps_df = pd.read_csv(STEPS_CSV)

    print(f"   원본 Headers: {len(headers_orig)}행")
    print(f"   수정 Headers: {len(headers_fixed)}행")
    print(f"   Steps: {len(steps_df)}행")

    # 원본 product_code → filename 매핑 (역방향)
    print("\n2. 매핑 생성...")
    orig_code_to_filename = {}
    for _, row in headers_orig.iterrows():
        code = row["product_code"]
        filename = row["filename"]
        if pd.notna(code) and pd.notna(filename):
            orig_code_to_filename[code] = filename
    print(f"   원본 product_code → filename 매핑: {len(orig_code_to_filename)}개")

    # filename → 새 product_code 목록 (1:N)
    filename_to_new_codes = {}
    for _, row in headers_fixed.iterrows():
        filename = row["filename"]
        new_code = row["product_code"]
        semi_code = row.get("semi_product_code", "")
        if pd.notna(filename) and pd.notna(new_code):
            if filename not in filename_to_new_codes:
                filename_to_new_codes[filename] = []
            filename_to_new_codes[filename].append(
                {
                    "product_code": new_code,
                    "semi_product_code": semi_code if pd.notna(semi_code) else "",
                }
            )
    print(f"   filename → 새 product_code 매핑: {len(filename_to_new_codes)}개")

    # Steps 교정
    print("\n3. Steps 교정 중...")
    new_rows = []
    stats = {"expanded": 0, "single": 0, "no_match": 0}

    for idx, row in steps_df.iterrows():
        orig_code = row["product_code"]

        # 원본 코드로 filename 찾기
        filename = orig_code_to_filename.get(orig_code)

        if filename and filename in filename_to_new_codes:
            new_codes_list = filename_to_new_codes[filename]

            if len(new_codes_list) == 1:
                # 단일 매칭
                new_row = row.copy()
                new_row["product_code"] = new_codes_list[0]["product_code"]
                new_row["semi_product_code"] = new_codes_list[0]["semi_product_code"]
                new_rows.append(new_row)
                stats["single"] += 1
            else:
                # 다중 매칭 - 각각 행 생성
                for code_info in new_codes_list:
                    new_row = row.copy()
                    new_row["product_code"] = code_info["product_code"]
                    new_row["semi_product_code"] = code_info["semi_product_code"]
                    new_rows.append(new_row)
                stats["expanded"] += 1
        else:
            # 매칭 실패 - 기존 데이터 유지
            new_row = row.copy()
            new_row["semi_product_code"] = ""
            new_rows.append(new_row)
            stats["no_match"] += 1
            if stats["no_match"] <= 10:
                print(f"   [!] 매칭 실패: {orig_code}")

    # 새 DataFrame 생성
    result_df = pd.DataFrame(new_rows)

    # 컬럼 순서 정리 (semi_product_code를 product_code 뒤에)
    cols = list(steps_df.columns)
    if "semi_product_code" not in cols:
        cols.insert(1, "semi_product_code")  # product_code 다음에 삽입
    result_df = result_df[cols]

    # 저장
    result_df.to_csv(OUTPUT_STEPS_CSV, index=False, encoding="utf-8-sig")

    print(f"\n=== 완료 ===")
    print(f"원본 행 수: {len(steps_df)}")
    print(f"결과 행 수: {len(result_df)}")
    print(f"- 단일 매칭: {stats['single']}건")
    print(f"- 1:N 펼침 (행 기준): {stats['expanded']}건")
    print(f"- 매칭 실패 (유지): {stats['no_match']}건")
    print(f"\n결과 저장: {OUTPUT_STEPS_CSV}")

    # 샘플 출력
    print("\n=== 수정 샘플 (불완전 코드 → 수정 코드) ===")
    incomplete_codes = [c for c in steps_df["product_code"].unique() if "_" in str(c)][
        :5
    ]
    for orig_code in incomplete_codes:
        new_codes = result_df[
            result_df["product_code"].isin(
                [
                    r["product_code"]
                    for r in filename_to_new_codes.get(
                        orig_code_to_filename.get(orig_code, ""), []
                    )
                ]
            )
        ]["product_code"].unique()[:3]
        print(
            f"  {orig_code:15} → {', '.join(map(str, new_codes)) if len(new_codes) > 0 else '(매칭 정보 없음)'}"
        )


if __name__ == "__main__":
    main()
