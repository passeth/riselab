"""
교정된 제조공정 데이터를 Supabase에 임포트하는 스크립트
"""

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import uuid
from pathlib import Path

# 파일 경로
BASE_DIR = Path(r"c:\Users\passe\Documents\@PROJECT\riselab\csv_output\Data_prep")
HEADERS_CSV = BASE_DIR / "09_manufacturing_process_headers_fixed.csv"
STEPS_CSV = BASE_DIR / "10_manufacturing_process_steps_fixed.csv"

# Supabase DB 연결 정보
DB_CONFIG = {
    "host": "db.usvjbuudnofwhmclwhfl.supabase.co",
    "port": 5432,
    "database": "postgres",
    "user": "postgres",
    "password": "giWz8L5tP55YTZlK",
}


def main():
    print("=== 제조공정 데이터 Supabase 임포트 ===\n")

    # CSV 로드
    print("1. CSV 파일 로딩...")
    headers_df = pd.read_csv(HEADERS_CSV)
    steps_df = pd.read_csv(STEPS_CSV)
    print(f"   Headers: {len(headers_df)}행")
    print(f"   Steps: {len(steps_df)}행")

    # DB 연결
    print("\n2. 데이터베이스 연결...")
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    print("   연결 성공!")

    try:
        # 기존 데이터 삭제 (steps 먼저 - FK 관계)
        print("\n3. 기존 데이터 삭제...")
        cur.execute("DELETE FROM labdoc_manufacturing_process_steps;")
        cur.execute("DELETE FROM labdoc_manufacturing_processes;")
        conn.commit()
        print("   삭제 완료!")

        # Headers 삽입 및 ID 매핑 생성
        print("\n4. Headers (processes) 삽입...")

        # product_code + filename 조합으로 고유 ID 생성
        process_id_map = {}  # (product_code, filename) -> uuid

        headers_data = []
        for _, row in headers_df.iterrows():
            process_id = str(uuid.uuid4())
            product_code = row["product_code"]
            filename = row["filename"]

            # 매핑 저장
            process_id_map[(product_code, filename)] = process_id

            headers_data.append(
                (
                    process_id,
                    product_code,
                    filename,  # source_filename
                    row["product_name"] if pd.notna(row["product_name"]) else None,
                    row["batch_number"] if pd.notna(row["batch_number"]) else None,
                    row["batch_unit"] if pd.notna(row["batch_unit"]) else None,
                    row["dept_name"] if pd.notna(row["dept_name"]) else None,
                    row["actual_qty"] if pd.notna(row["actual_qty"]) else None,
                    None,  # mfg_date - 원본에 없음
                    row["operator"] if pd.notna(row["operator"]) else None,
                    row["approver_1"] if pd.notna(row["approver_1"]) else None,
                    row["approver_2"] if pd.notna(row["approver_2"]) else None,
                    row["approver_3"] if pd.notna(row["approver_3"]) else None,
                    row["notes_content"] if pd.notna(row["notes_content"]) else None,
                    row["total_time"] if pd.notna(row["total_time"]) else None,
                    row["special_notes"] if pd.notna(row["special_notes"]) else None,
                    int(row["step_count"]) if pd.notna(row["step_count"]) else None,
                )
            )

        insert_headers_sql = """
            INSERT INTO labdoc_manufacturing_processes 
            (id, product_code, source_filename, product_name, batch_number, batch_unit, 
             dept_name, actual_qty, mfg_date, operator, approver_1, approver_2, approver_3,
             notes_content, total_time, special_notes, step_count)
            VALUES %s
        """

        execute_values(cur, insert_headers_sql, headers_data, page_size=500)
        conn.commit()
        print(f"   {len(headers_data)}행 삽입 완료!")

        # Steps 삽입 (process_id 매핑 필요)
        print("\n5. Steps 삽입...")

        # Steps에서 product_code로 process_id 찾기 위해 역매핑 필요
        # filename → product_code 매핑 (headers_df에서)
        filename_product_map = {}
        for _, row in headers_df.iterrows():
            filename = row["filename"]
            product_code = row["product_code"]
            if filename not in filename_product_map:
                filename_product_map[filename] = []
            filename_product_map[filename].append(product_code)

        # product_code → (product_code, filename) 매핑
        # steps_df의 product_code가 headers_df의 어떤 filename에서 왔는지 찾기
        product_to_filename = {}
        for filename, codes in filename_product_map.items():
            for code in codes:
                product_to_filename[code] = filename

        steps_data = []
        missing_count = 0
        for _, row in steps_df.iterrows():
            product_code = row["product_code"]
            filename = product_to_filename.get(product_code)

            if filename and (product_code, filename) in process_id_map:
                process_id = process_id_map[(product_code, filename)]

                steps_data.append(
                    (
                        str(uuid.uuid4()),
                        process_id,
                        int(row["step_num"]) if pd.notna(row["step_num"]) else 0,
                        row["step_type"] if pd.notna(row["step_type"]) else None,
                        row["step_name"] if pd.notna(row["step_name"]) else None,
                        row["step_desc"] if pd.notna(row["step_desc"]) else None,
                        row["work_time"] if pd.notna(row["work_time"]) else None,
                        row["checker"] if pd.notna(row["checker"]) else None,
                    )
                )
            else:
                missing_count += 1

        if missing_count > 0:
            print(f"   경고: {missing_count}개 steps의 process_id 매핑 실패")

        insert_steps_sql = """
            INSERT INTO labdoc_manufacturing_process_steps 
            (id, process_id, step_num, step_type, step_name, step_desc, work_time, checker)
            VALUES %s
        """

        # 배치 삽입
        batch_size = 1000
        for i in range(0, len(steps_data), batch_size):
            batch = steps_data[i : i + batch_size]
            execute_values(cur, insert_steps_sql, batch, page_size=500)
            conn.commit()
            print(
                f"   {min(i + batch_size, len(steps_data))}/{len(steps_data)}행 삽입..."
            )

        print(f"   총 {len(steps_data)}행 삽입 완료!")

        # 검증
        print("\n6. 데이터 검증...")
        cur.execute("SELECT COUNT(*) FROM labdoc_manufacturing_processes;")
        processes_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM labdoc_manufacturing_process_steps;")
        steps_count = cur.fetchone()[0]

        print(f"   labdoc_manufacturing_processes: {processes_count}행")
        print(f"   labdoc_manufacturing_process_steps: {steps_count}행")

        print("\n=== 임포트 완료! ===")

    except Exception as e:
        conn.rollback()
        print(f"\n오류 발생: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
