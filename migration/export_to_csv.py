#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
[제품표준서 Excel to CSV 변환 스크립트]

이 스크립트는 여러 개의 Excel(.xls) 형식 제품표준서 파일을 읽어
데이터베이스 임포트에 적합한 CSV 파일들로 변환합니다.

주요 기능:
1. 다수의 Excel 파일 일괄 처리
2. 제품 정보, BOM(원료 구성), QC(품질 관리) 기준, 개정 이력 추출
3. 알러젠(Allergen) 정보 자동 검색 및 추출
4. 중복된 제품 코드 자동 감지 및 별도 저장
5. 처리 결과 요약 보고서 생성

사용법:
    1. config.py 파일에 SOURCE_DIR(엑셀 폴더)과 OUTPUT_DIR(결과 폴더)을 설정합니다.
    2. python export_to_csv.py                    # 전체 파일 변환
    3. python export_to_csv.py --file "파일명.xls" # 특정 파일 하나만 테스트
    4. python export_to_csv.py --dry-run          # 파일 생성 없이 검증만 수행
"""

import xlrd
from pathlib import Path
import logging
import sys
import io
import csv
from datetime import datetime
from tqdm import tqdm

# 설정 파일(config.py) 불러오기 시도
try:
    import config

    SOURCE_DIR = config.SOURCE_DIR
    OUTPUT_DIR = config.OUTPUT_DIR
    LOG_FILE = getattr(config, "LOG_FILE", "csv_export.log")
except ImportError:
    # 설정 파일이 없는 경우 기본값 사용 (주의 메시지 출력)
    SOURCE_DIR = "excel_files"
    OUTPUT_DIR = "csv_output"
    LOG_FILE = "csv_export.log"
    print("[경고] config.py 파일을 찾을 수 없어 기본 설정을 사용합니다.")

# Windows 콘솔에서 한글 깨짐 방지를 위한 인코딩 설정
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

# 로깅 설정 (파일과 콘솔에 동시에 기록)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)


def get_cell_value(sheet, row: int, col: int):
    """
    Excel 시트에서 특정 셀의 값을 안전하게 가져옵니다.
    - 빈 셀, 숫자, 문자열 등 타입에 따라 적절히 처리합니다.
    - 범위를 벗어난 접근 시 빈 문자열을 반환합니다.
    """
    try:
        cell = sheet.cell(row, col)
        value = cell.value

        if cell.ctype == xlrd.XL_CELL_EMPTY:
            return ""
        elif cell.ctype == xlrd.XL_CELL_NUMBER:
            # 숫자인 경우 소수점 포함 그대로 반환
            return value
        else:
            # 문자열인 경우 앞뒤 공백 제거 후 반환
            return str(value).strip() if value else ""
    except IndexError:
        return ""


def extract_allergen(sheet) -> tuple:
    """
    엑셀 시트에서 알러젠(Allergen) 정보를 찾아 추출합니다.
    1. 먼저 예상되는 고정 위치(F42-F48)를 확인합니다.
    2. 고정 위치에 없으면 시트 전체를 검색하여 'Allergen(국문/영문)' 키워드를 찾습니다.

    Returns: (알러젠_국문, 알러젠_영문)
    """
    allergen_kr = ""
    allergen_en = ""

    # 1단계: 고정 위치 확인 (속도 최적화)
    try:
        # F42 (행 41, 열 5) 위치 확인
        f42_value = str(get_cell_value(sheet, 41, 5))
        if "Allergen(국문)" in f42_value:
            allergen_kr = str(get_cell_value(sheet, 42, 5))  # F43

        # F47 (행 46, 열 5) 위치 확인
        f47_value = str(get_cell_value(sheet, 46, 5))
        if "Allergen(영문)" in f47_value:
            allergen_en = str(get_cell_value(sheet, 47, 5))  # F48
    except (IndexError, KeyError):
        pass

    # 2단계: 고정 위치에 없으면 전체 시트 검색
    if not allergen_kr or not allergen_en:
        for row_idx in range(sheet.nrows):
            for col_idx in range(sheet.ncols):
                try:
                    cell_value = str(get_cell_value(sheet, row_idx, col_idx))

                    if "Allergen(국문)" in cell_value and not allergen_kr:
                        # 키워드 바로 아래 셀의 값을 가져옴
                        allergen_kr = str(get_cell_value(sheet, row_idx + 1, col_idx))

                    if "Allergen(영문)" in cell_value and not allergen_en:
                        # 키워드 바로 아래 셀의 값을 가져옴
                        allergen_en = str(get_cell_value(sheet, row_idx + 1, col_idx))

                except (IndexError, KeyError):
                    continue

    return (allergen_kr.strip(), allergen_en.strip())


def parse_excel_to_dict(filepath: str) -> dict:
    """
    Excel 파일 하나를 읽어서 딕셔너리 구조로 변환합니다.
    '입력란' 시트와 '제품표준서' 시트의 데이터를 조합합니다.
    """
    try:
        # 엑셀 파일 열기 (xlrd 라이브러리 사용)
        workbook = xlrd.open_workbook(filepath, formatting_info=False)

        # '입력란' 시트 분석 (기본 정보, BOM, QC 데이터 포함)
        try:
            input_sheet = workbook.sheet_by_name("입력란")
        except xlrd.XLRDError:
            raise ValueError("'입력란' 시트를 찾을 수 없습니다.")

        # 알러젠 정보 추출
        allergen_kr, allergen_en = extract_allergen(input_sheet)

        # 1. 제품 기본 정보 추출 (고정 셀 위치 사용)
        basic_info = {
            "국문제품명": get_cell_value(input_sheet, 2, 1),
            "영문제품명": get_cell_value(input_sheet, 3, 1),
            "관리번호": get_cell_value(input_sheet, 4, 1),
            "작성일자": get_cell_value(input_sheet, 5, 1),
            "제품코드": get_cell_value(input_sheet, 6, 1),
            "성상": get_cell_value(input_sheet, 7, 1),
            "포장단위": get_cell_value(input_sheet, 8, 1),
            "작성자": get_cell_value(input_sheet, 9, 1),
            "사용법": get_cell_value(input_sheet, 10, 1),
            "Allergen국문": allergen_kr,
            "Allergen영문": allergen_en,
        }

        # 2. BOM (원료 구성) 추출 (13행부터 원료코드가 없을 때까지)
        bom = []
        for row_idx in range(13, 100):  # 최대 100행까지 확인
            material_code = get_cell_value(input_sheet, row_idx, 1)
            if not material_code:
                break
            bom.append(
                {
                    "순번": get_cell_value(input_sheet, row_idx, 0),
                    "원료코드": material_code,
                    "함량": get_cell_value(input_sheet, row_idx, 2),
                }
            )

        # 3. QC 규격 (반제품/완제품) 추출
        # 반제품 QC (2~6행)
        qc_semi = []
        for row_idx in range(2, 7):
            test_item = get_cell_value(input_sheet, row_idx, 5)
            if test_item:
                qc_semi.append(
                    {
                        "순번": get_cell_value(input_sheet, row_idx, 4),
                        "항목": test_item,
                        "시험기준": get_cell_value(input_sheet, row_idx, 6),
                        "시험방법": get_cell_value(input_sheet, row_idx, 8),
                    }
                )

        # 완제품 QC (8~39행)
        qc_finished = []
        for row_idx in range(8, 40):
            test_item = get_cell_value(input_sheet, row_idx, 5)
            if test_item:
                qc_finished.append(
                    {
                        "순번": get_cell_value(input_sheet, row_idx, 4),
                        "항목": test_item,
                        "시험기준": get_cell_value(input_sheet, row_idx, 6),
                        "시험방법": get_cell_value(input_sheet, row_idx, 8),
                    }
                )

        # 4. '제품표준서' 시트 분석 (저장방법, 유통기한, 개정 이력)
        storage_method = ""
        shelf_life = ""
        revisions = []

        try:
            std_sheet = None
            # 시트 이름에 공백이 포함된 경우 대응
            for name in ["제품표준서", "제품표준서 ", " 제품표준서"]:
                try:
                    std_sheet = workbook.sheet_by_name(name)
                    break
                except xlrd.XLRDError:
                    continue

            if std_sheet:
                storage_method = get_cell_value(std_sheet, 17, 3)  # D18
                shelf_life = get_cell_value(std_sheet, 18, 3)  # D19

                # 개정 이력 (22~26행)
                for row_idx in range(22, 27):
                    revision_no = get_cell_value(std_sheet, row_idx, 0)
                    if revision_no:
                        revisions.append(
                            {
                                "일련번호": revision_no,
                                "개정년월일": get_cell_value(std_sheet, row_idx, 1),
                                "개정사항": get_cell_value(std_sheet, row_idx, 2),
                            }
                        )
        except Exception as e:
            logger.warning(f"제품표준서 시트 분석 중 경고 발생: {e}")

        return {
            "basic_info": basic_info,
            "storage_method": storage_method,
            "shelf_life": shelf_life,
            "bom": bom,
            "qc_semi": qc_semi,
            "qc_finished": qc_finished,
            "revisions": revisions,
            "source_file": Path(filepath).name,
        }

    except Exception as e:
        logger.error(f"파일 분석 중 오류 발생 ({filepath}): {e}")
        raise


def export_to_csv(all_data: list, output_dir: Path, prefix: str = ""):
    """
    추출된 데이터를 4개의 CSV 파일로 나누어 저장합니다.
    한글 깨짐 방지를 위해 UTF-8-SIG 인코딩을 사용합니다.
    """
    output_dir.mkdir(exist_ok=True)

    # 1. 제품 기본 정보 (Products)
    products_file = output_dir / f"{prefix}products.csv"
    with open(products_file, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "국문제품명",
                "영문제품명",
                "관리번호",
                "작성일자",
                "제품코드",
                "성상",
                "포장단위",
                "작성자",
                "사용법",
                "Allergen국문",
                "Allergen영문",
                "저장방법",
                "사용기한",
                "원본파일",
            ]
        )

        for data in all_data:
            info = data["basic_info"]
            writer.writerow(
                [
                    info["국문제품명"],
                    info["영문제품명"],
                    info["관리번호"],
                    info["작성일자"],
                    info["제품코드"],
                    info["성상"],
                    info["포장단위"],
                    info["작성자"],
                    info["사용법"],
                    info.get("Allergen국문", ""),
                    info.get("Allergen영문", ""),
                    data["storage_method"],
                    data["shelf_life"],
                    data["source_file"],
                ]
            )

    # 2. BOM 정보 (BOM)
    bom_file = output_dir / f"{prefix}bom.csv"
    with open(bom_file, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["제품코드", "순번", "원료코드", "함량"])

        for data in all_data:
            product_code = data["basic_info"]["제품코드"]
            for item in data["bom"]:
                writer.writerow(
                    [product_code, item["순번"], item["원료코드"], item["함량"]]
                )

    # 3. 품질 규격 (QC Specs)
    qc_file = output_dir / f"{prefix}qc_specs.csv"
    with open(qc_file, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["제품코드", "QC유형", "순번", "항목", "시험기준", "시험방법"])

        for data in all_data:
            product_code = data["basic_info"]["제품코드"]
            # 반제품 QC
            for item in data["qc_semi"]:
                writer.writerow(
                    [
                        product_code,
                        "반제품",
                        item["순번"],
                        item["항목"],
                        item["시험기준"],
                        item["시험방법"],
                    ]
                )
            # 완제품 QC
            for item in data["qc_finished"]:
                writer.writerow(
                    [
                        product_code,
                        "완제품",
                        item["순번"],
                        item["항목"],
                        item["시험기준"],
                        item["시험방법"],
                    ]
                )

    # 4. 개정 이력 (Revisions)
    revisions_file = output_dir / f"{prefix}revisions.csv"
    with open(revisions_file, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["제품코드", "일련번호", "개정년월일", "개정사항"])

        for data in all_data:
            product_code = data["basic_info"]["제품코드"]
            for item in data["revisions"]:
                writer.writerow(
                    [
                        product_code,
                        item["일련번호"],
                        item["개정년월일"],
                        item["개정사항"],
                    ]
                )


def main():
    import argparse

    parser = argparse.ArgumentParser(description="제품표준서 Excel to CSV 변환 도구")
    parser.add_argument(
        "--file", type=str, help="특정 파일 하나만 처리할 때 파일명 지정"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="파일 생성 없이 분석만 수행"
    )
    args = parser.parse_args()

    # 입력 폴더 확인
    source_path = Path(SOURCE_DIR)
    if not source_path.exists():
        logger.error(f"오류: 소스 폴더를 찾을 수 없습니다: {SOURCE_DIR}")
        logger.error("config.py 파일의 SOURCE_DIR 설정을 확인해주세요.")
        sys.exit(1)

    # 대상 파일 목록 생성
    if args.file:
        files = [source_path / args.file]
        if not files[0].exists():
            logger.error(f"오류: 파일을 찾을 수 없습니다: {files[0]}")
            sys.exit(1)
    else:
        # 폴더 내 모든 .xls 파일 검색
        files = sorted(source_path.glob("*.xls"))

    if not files:
        logger.warning(f"처리할 .xls 파일이 {SOURCE_DIR} 폴더에 없습니다.")
        sys.exit(0)

    logger.info(f"총 {len(files)}개의 파일을 처리합니다.")
    logger.info(f"출력 폴더: {OUTPUT_DIR}")
    print()

    # 파일 분석 실행
    all_data = []
    success_count = 0
    error_count = 0

    # 진행률 표시줄(tqdm) 사용
    for idx, filepath in enumerate(tqdm(files, desc="엑셀 파일 분석 중"), 1):
        try:
            data = parse_excel_to_dict(str(filepath))
            all_data.append(data)
            success_count += 1
        except Exception as e:
            logger.error(f"실패: {filepath.name} - {e}")
            error_count += 1
            continue

    print()
    logger.info(f"분석 완료: 성공 {success_count}건, 실패 {error_count}건")
    print()

    # 중복 제품 코드 감지 및 분리
    logger.info("중복 제품 코드를 확인하고 있습니다...")
    product_codes = {}

    for data in all_data:
        code = data["basic_info"]["제품코드"]
        if code not in product_codes:
            product_codes[code] = []
        product_codes[code].append(data)

    normal_data = []
    duplicate_data = []

    for code, products in product_codes.items():
        if len(products) > 1:
            # 중복된 코드가 있는 제품들
            duplicate_data.extend(products)
            for product in products:
                logger.warning(
                    f"⚠️ 중복 제품코드 감지: {code} ({product['source_file']})"
                )
        else:
            # 유일한 코드를 가진 제품
            normal_data.extend(products)

    logger.info(f"- 정상 제품: {len(normal_data)}건")
    logger.info(f"- 중복 제품: {len(duplicate_data)}건")
    print()

    # CSV 파일로 저장
    if all_data:
        if args.dry_run:
            logger.info("DRY-RUN 모드: CSV 파일 생성을 생략합니다.")
        else:
            output_path = Path(OUTPUT_DIR)

            # 정상 제품 저장
            if normal_data:
                export_to_csv(normal_data, output_path)
                logger.info(f"✓ 정상 제품 데이터 저장 완료")

            # 중복 제품 저장 (파일명 앞에 'duplicates_' 접두어 추가)
            if duplicate_data:
                export_to_csv(duplicate_data, output_path, prefix="duplicates_")
                logger.info(f"✓ 중복 제품 데이터 저장 완료 (duplicates_ 접두어 확인)")

        # 최종 요약 출력
        print()
        logger.info("=" * 60)
        logger.info("변환 작업 요약")
        logger.info("=" * 60)
        logger.info(f"총 처리 파일: {len(files)}")
        logger.info(f"성공 건수: {success_count}")
        logger.info(f"실패 건수: {error_count}")
        logger.info("-" * 30)

        allergen_count = sum(
            1
            for d in all_data
            if d["basic_info"].get("Allergen국문")
            or d["basic_info"].get("Allergen영문")
        )
        logger.info(f"알러젠 정보 추출: {allergen_count}/{len(all_data)}개 제품")

        total_bom = sum(len(d["bom"]) for d in all_data)
        total_qc = sum(len(d["qc_semi"]) + len(d["qc_finished"]) for d in all_data)
        logger.info(f"추출된 총 BOM 항목: {total_bom}건")
        logger.info(f"추출된 총 QC 규격: {total_qc}건")

        if not args.dry_run:
            logger.info(f"결과 저장 위치: {Path(OUTPUT_DIR).absolute()}")
        logger.info("=" * 60)
    else:
        logger.error("변환할 데이터가 없습니다.")
        sys.exit(1)


if __name__ == "__main__":
    main()
