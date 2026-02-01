"""
제품표준서 엑셀에서 누락된 필드 추출
- 화장품 유형 (cosmetic_type)
- 재활용등급 (recycling_grade)

사용법:
    python extract_product_standard_fields.py
"""

import pandas as pd
import xlrd
import os
import re
import json
from pathlib import Path

# 설정
FOLDER = r"d:\(주)에바스코스메틱 Dropbox\JI SEULKI\claude\@ongoing_LAB doc\200_연구실 문서 샘플\제품표준서_all"
OUTPUT_FILE = (
    Path(__file__).parent.parent / "csv_output" / "product_standard_extracted.json"
)


def normalize_text(text):
    """공백 정규화"""
    if pd.isna(text):
        return ""
    return re.sub(r"\s+", "", str(text).strip())


def extract_from_file(filepath):
    """단일 파일에서 데이터 추출"""
    result = {
        "filename": os.path.basename(filepath),
        "product_code": None,
        "management_code": None,
        "cosmetic_type": None,
        "recycling_grade": None,
        "error": None,
    }

    # 파일명에서 코드 추출
    fname = os.path.basename(filepath)

    # 관리번호: EVCO1249
    mgmt_match = re.search(r"_?(EVCO\d+)_", fname)
    if mgmt_match:
        result["management_code"] = mgmt_match.group(1)

    # 제품코드: (AOFC001)
    code_match = re.search(r"\(([A-Z0-9~]+)\)", fname)
    if code_match:
        result["product_code"] = code_match.group(1)

    try:
        # 시트 찾기
        wb = xlrd.open_workbook(filepath)
        target_sheet = None
        for s in wb.sheet_names():
            if "표준" in s:
                target_sheet = s
                break

        if not target_sheet:
            result["error"] = "No 제품표준서 sheet"
            return result

        # 시트 읽기
        df = pd.read_excel(
            filepath, sheet_name=target_sheet, header=None, engine="xlrd"
        )

        # 라벨 기반 검색
        for i in range(min(30, len(df))):
            if df.shape[1] < 4:
                continue

            label = normalize_text(df.iloc[i, 0])
            value = df.iloc[i, 3] if pd.notna(df.iloc[i, 3]) else None

            # 화장품 유형
            if "화장품유형" in label and result["cosmetic_type"] is None:
                result["cosmetic_type"] = str(value).strip() if value else None

            # 재활용등급
            if "재활용등급" in label and result["recycling_grade"] is None:
                val_str = str(value).strip() if value else None
                if val_str:
                    # "재활용 보통" 등에서 앞의 공백 제거
                    result["recycling_grade"] = val_str.lstrip()

    except Exception as e:
        result["error"] = str(e)

    return result


def main():
    print(f"폴더: {FOLDER}")
    files = sorted([f for f in os.listdir(FOLDER) if f.endswith(".xls")])
    print(f"파일 수: {len(files)}")

    results = []
    success_count = 0
    has_cosmetic_type = 0
    has_recycling_grade = 0

    for i, fname in enumerate(files):
        filepath = os.path.join(FOLDER, fname)
        result = extract_from_file(filepath)
        results.append(result)

        if not result["error"]:
            success_count += 1
        if result["cosmetic_type"]:
            has_cosmetic_type += 1
        if result["recycling_grade"]:
            has_recycling_grade += 1

        # 진행률 출력
        if (i + 1) % 100 == 0:
            print(f"  처리: {i + 1}/{len(files)}")

    # 결과 저장
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n=== 결과 요약 ===")
    print(f"전체 파일: {len(files)}")
    print(f"성공: {success_count}")
    print(f"화장품유형 있음: {has_cosmetic_type}")
    print(f"재활용등급 있음: {has_recycling_grade}")
    print(f"저장: {OUTPUT_FILE}")

    # 샘플 출력
    print(f"\n=== 샘플 (화장품유형 있는 것) ===")
    samples = [r for r in results if r["cosmetic_type"]][:5]
    for s in samples:
        print(
            f"  {s['product_code']}: 유형={s['cosmetic_type']}, 등급={s['recycling_grade']}"
        )


if __name__ == "__main__":
    main()
