"""
management_code 기반 추가 매칭 업데이트
- product_code로 매칭 안 된 레코드를 management_code로 매칭
"""

import json
import urllib.request
import urllib.error
from pathlib import Path

SUPABASE_URL = "https://usvjbuudnofwhmclwhfl.supabase.co"
INPUT_FILE = (
    Path(__file__).parent.parent / "csv_output" / "product_standard_extracted.json"
)


def get_service_key() -> str:
    """환경변수 또는 .env 파일에서 서비스 키 읽기"""
    import os

    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if key:
        return key

    env_file = Path(__file__).parent.parent / ".env"
    if env_file.exists():
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
                    return line.split("=", 1)[1].strip()

    raise ValueError("SUPABASE_SERVICE_ROLE_KEY not found")


def convert_management_code(code: str) -> str:
    """
    추출 데이터의 management_code를 DB 형식으로 변환
    EVCO1000 -> EVCO-1000
    """
    if code and code.startswith("EVCO") and len(code) == 8 and code[4:].isdigit():
        return f"EVCO-{code[4:]}"
    return code


def update_by_management_code(
    api_key: str, management_code: str, update_data: dict
) -> int:
    """management_code로 매칭되는 모든 제품 업데이트, 업데이트된 개수 반환"""
    url = f"{SUPABASE_URL}/rest/v1/labdoc_products?management_code=eq.{management_code}"
    headers = {
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",  # 업데이트된 레코드 반환
    }

    body = json.dumps(update_data).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=headers, method="PATCH")

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode("utf-8"))
            return len(result)  # 업데이트된 레코드 수
    except urllib.error.HTTPError as e:
        print(f"  Error updating {management_code}: {e.code}")
        return 0


def main():
    # 서비스 키 로드
    try:
        api_key = get_service_key()
    except ValueError as e:
        print(f"Error: {e}")
        return

    # 추출 데이터 로드
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"로드된 데이터: {len(data)}건")

    # management_code가 있고 (cosmetic_type 또는 recycling_grade)가 있는 레코드
    to_update = [
        d
        for d in data
        if d.get("management_code")
        and (d.get("cosmetic_type") or d.get("recycling_grade"))
    ]
    print(f"management_code 기반 업데이트 대상: {len(to_update)}건")

    # 업데이트 수행
    total_updated = 0
    mgmt_codes_processed = 0

    for i, item in enumerate(to_update, 1):
        raw_code = item.get("management_code")
        management_code = convert_management_code(raw_code)

        # 업데이트 데이터 준비
        update_data = {}
        if item.get("cosmetic_type"):
            update_data["cosmetic_type"] = item["cosmetic_type"].strip()
        if item.get("recycling_grade"):
            update_data["recycling_grade"] = item["recycling_grade"].strip()

        if not update_data:
            continue

        # management_code로 업데이트
        updated_count = update_by_management_code(api_key, management_code, update_data)

        if updated_count > 0:
            total_updated += updated_count
            mgmt_codes_processed += 1
            if updated_count > 1:
                print(
                    f"[{i}/{len(to_update)}] {management_code} -> {updated_count}개 제품 업데이트"
                )

    print(f"\n=== 결과 ===")
    print(f"처리된 management_code: {mgmt_codes_processed}건")
    print(f"업데이트된 총 제품 수: {total_updated}건")


if __name__ == "__main__":
    main()
