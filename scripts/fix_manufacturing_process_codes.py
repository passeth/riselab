"""
제조공정 CSV의 product_code를 품목 마스터와 매칭하여 교정하는 스크립트

파일명 패턴 유형:
1. ADML_케어미... → ADML prefix, 마스터에서 ADML로 시작하는 모든 코드
2. BTBC004~10_... → BTBC004부터 BTBC010까지 범위 지정
3. ANHP001_... → ANHP001 단일 코드 (숫자가 명시됨)
4. AOBC005_... → AOBC005 단일 코드
"""

import pandas as pd
import re
from pathlib import Path

# 파일 경로
BASE_DIR = Path(r"c:\Users\passe\Documents\@PROJECT\riselab\csv_output\Data_prep")
PROCESS_HEADERS_CSV = BASE_DIR / "09_manufacturing_process_headers.csv"
PROCESS_STEPS_CSV = BASE_DIR / "10_manufacturing_process_steps.csv"
PRODUCTS_CSV = BASE_DIR / "01_products_master.csv"
OUTPUT_HEADERS_CSV = BASE_DIR / "09_manufacturing_process_headers_fixed.csv"
OUTPUT_STEPS_CSV = BASE_DIR / "10_manufacturing_process_steps_fixed.csv"


def parse_filename_pattern(filename):
    """
    파일명에서 품목코드 패턴 추출

    Returns:
        dict with keys:
        - prefix: 알파벳 prefix (예: BTBC)
        - range_start: 시작 숫자 (예: 004) 또는 None
        - range_end: 끝 숫자 (예: 10) 또는 None
        - single_code: 단일 코드 (예: ANHP001) 또는 None
        - pattern_type: 'range', 'single', 'prefix_only'
    """
    # 파일명에서 .xlsx 제거
    base = filename.replace(".xlsx", "").replace(".xls", "")

    # 첫 번째 언더스코어 또는 한글 전까지 추출
    match = re.match(r"^([A-Z]+)(\d+)?(?:~(\d+))?(?:[-_]|\s|[가-힣])", base)
    if not match:
        # 다른 패턴 시도: 알파벳+숫자_
        match = re.match(r"^([A-Z]+)(\d+)?[-_\s]", base)

    if not match:
        # 마지막 시도: 알파벳만
        match = re.match(r"^([A-Z]+)", base)
        if match:
            return {
                "prefix": match.group(1),
                "range_start": None,
                "range_end": None,
                "single_code": None,
                "pattern_type": "prefix_only",
            }
        return None

    prefix = match.group(1)
    num_start = match.group(2) if len(match.groups()) > 1 else None
    num_end = match.group(3) if len(match.groups()) > 2 else None

    # 범위 패턴 확인 (예: BTBC004~10)
    range_match = re.match(r"^([A-Z]+)(\d+)[~-](\d+)", base)
    if range_match:
        prefix = range_match.group(1)
        num_start = range_match.group(2)
        num_end = range_match.group(3)

        # 끝 숫자가 짧으면 시작 숫자 길이에 맞춤 (004~10 → 004~010)
        if len(num_end) < len(num_start):
            num_end = num_start[: len(num_start) - len(num_end)] + num_end

        return {
            "prefix": prefix,
            "range_start": num_start,
            "range_end": num_end,
            "single_code": None,
            "pattern_type": "range",
        }

    # 단일 코드 패턴 (예: ANHP001_)
    single_match = re.match(r"^([A-Z]+\d{2,})", base)
    if single_match:
        return {
            "prefix": prefix,
            "range_start": num_start,
            "range_end": None,
            "single_code": single_match.group(1),
            "pattern_type": "single",
        }

    # prefix만 있는 경우 (예: ADML_)
    return {
        "prefix": prefix,
        "range_start": None,
        "range_end": None,
        "single_code": None,
        "pattern_type": "prefix_only",
    }


def find_matching_codes(pattern, all_product_codes):
    """
    패턴에 맞는 품목코드 목록 반환
    """
    if pattern is None:
        return []

    prefix = pattern["prefix"]
    matching_codes = []

    if pattern["pattern_type"] == "single":
        # 단일 코드 - 정확히 매칭되는 것 찾기
        single_code = pattern["single_code"]
        for code in all_product_codes:
            if code and code.upper() == single_code.upper():
                matching_codes.append(code)

        # 못 찾으면 prefix로 시작하는 것들 중 숫자가 같은 것
        if not matching_codes:
            num_part = pattern["range_start"]
            for code in all_product_codes:
                if code and code.upper().startswith(prefix):
                    # 숫자 부분 비교
                    code_num = re.sub(r"^[A-Z]+", "", code.upper())
                    if code_num and num_part:
                        if code_num.lstrip("0") == num_part.lstrip("0"):
                            matching_codes.append(code)

    elif pattern["pattern_type"] == "range":
        # 범위 코드 - 해당 범위 내의 모든 코드
        start = int(pattern["range_start"])
        end = int(pattern["range_end"])
        num_len = len(pattern["range_start"])

        for code in all_product_codes:
            if code and code.upper().startswith(prefix):
                # 숫자 부분 추출
                code_num = re.sub(r"^[A-Z]+", "", code.upper())
                if code_num:
                    try:
                        num = int(code_num.lstrip("0") or "0")
                        if start <= num <= end:
                            matching_codes.append(code)
                    except ValueError:
                        pass

    else:  # prefix_only
        # prefix로 시작하는 모든 코드
        for code in all_product_codes:
            if code and code.upper().startswith(prefix):
                matching_codes.append(code)

    return sorted(set(matching_codes))


def main():
    print("=== 제조공정 CSV product_code 교정 시작 ===\n")

    # CSV 파일 읽기
    print("1. CSV 파일 로딩...")
    process_df = pd.read_csv(PROCESS_CSV)
    products_df = pd.read_csv(PRODUCTS_CSV)

    # 품목 마스터의 모든 품목코드
    all_product_codes = products_df["제품코드"].dropna().unique().tolist()
    print(f"   품목 마스터 품목코드 수: {len(all_product_codes)}")

    # 품목코드 → semi_product_code 매핑 딕셔너리 생성
    code_to_semi = {}
    for _, row in products_df.iterrows():
        prod_code = row["제품코드"]
        semi_code = row.get("semi_product_code", "")
        if pd.notna(prod_code) and pd.notna(semi_code) and semi_code:
            code_to_semi[prod_code] = semi_code
    print(f"   품목코드→semi_product_code 매핑 수: {len(code_to_semi)}")

    # 결과 저장용
    new_rows = []
    stats = {"expanded": 0, "single": 0, "no_match": 0}

    print("\n2. 파일명 패턴 분석 및 품목코드 매칭...\n")

    for idx, row in process_df.iterrows():
        filename = row["filename"]
        current_code = row["product_code"]

        # 패턴 파싱
        pattern = parse_filename_pattern(filename)

        if pattern:
            matching_codes = find_matching_codes(pattern, all_product_codes)

            if matching_codes:
                if len(matching_codes) == 1:
                    # 단일 매칭
                    new_row = row.copy()
                    new_row["product_code"] = matching_codes[0]
                    new_row["semi_product_code"] = code_to_semi.get(
                        matching_codes[0], ""
                    )
                    new_rows.append(new_row)
                    stats["single"] += 1
                else:
                    # 다중 매칭 - 각각 행 생성
                    for code in matching_codes:
                        new_row = row.copy()
                        new_row["product_code"] = code
                        new_row["semi_product_code"] = code_to_semi.get(code, "")
                        new_rows.append(new_row)
                    stats["expanded"] += 1
                    print(f"   [1:N] {filename}")
                    print(
                        f"         → {len(matching_codes)}개 품목: {', '.join(matching_codes[:5])}{'...' if len(matching_codes) > 5 else ''}"
                    )
            else:
                # 매칭 실패 - 기존 데이터 유지
                new_row = row.copy()
                new_row["semi_product_code"] = ""
                new_rows.append(new_row)
                stats["no_match"] += 1
                print(f"   [!] 매칭 실패: {filename} (현재코드: {current_code})")
        else:
            # 패턴 파싱 실패 - 기존 데이터 유지
            new_row = row.copy()
            new_row["semi_product_code"] = ""
            new_rows.append(new_row)
            stats["no_match"] += 1
            print(f"   [!] 패턴 파싱 실패: {filename}")

    # 새 DataFrame 생성
    result_df = pd.DataFrame(new_rows)

    # 저장
    result_df.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")

    print(f"\n=== 완료 ===")
    print(f"원본 행 수: {len(process_df)}")
    print(f"결과 행 수: {len(result_df)}")
    print(f"- 단일 매칭: {stats['single']}건")
    print(f"- 1:N 펼침: {stats['expanded']}건")
    print(f"- 매칭 실패 (유지): {stats['no_match']}건")
    print(f"\n결과 저장: {OUTPUT_CSV}")

    # 불완전한 코드 목록 출력
    print("\n=== 불완전했던 코드 샘플 (수정 전→후) ===")
    incomplete_mask = process_df["product_code"].str.contains("_", na=False)
    for idx, row in process_df[incomplete_mask].head(10).iterrows():
        filename = row["filename"]
        old_code = row["product_code"]
        # 결과에서 같은 파일명의 새 코드 찾기
        new_codes = result_df[result_df["filename"] == filename][
            "product_code"
        ].tolist()
        print(f"  {old_code:15} → {', '.join(new_codes[:3])}")


if __name__ == "__main__":
    main()
