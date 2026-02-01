"""
추출된 제품표준서 필드를 Supabase에 업데이트
- supabase 패키지 대신 urllib로 REST API 직접 호출 (Python 3.14 호환)
"""

import json
import re
import urllib.request
import urllib.error
from pathlib import Path

# Supabase 설정
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


def expand_product_codes(product_code: str) -> list[str]:
    """복수 코드 확장 (예: MLDM029~031 -> [MLDM029, MLDM030, MLDM031])"""
    if not product_code:
        return []

    if "~" in product_code:
        match = re.match(r"([A-Z]+)(\d+)~(\d+)", product_code)
        if match:
            prefix, start, end = match.groups()
            width = len(start)
            return [f"{prefix}{i:0{width}d}" for i in range(int(start), int(end) + 1)]

    return [product_code]


def get_existing_products(api_key: str) -> set[str]:
    """DB에서 기존 product_code 목록 조회"""
    url = f"{SUPABASE_URL}/rest/v1/labdoc_products?select=product_code"
    headers = {
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
    }

    req = urllib.request.Request(url, headers=headers, method="GET")

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode("utf-8"))
            return {r["product_code"] for r in data if r.get("product_code")}
    except urllib.error.HTTPError as e:
        print(f"Error fetching products: {e.code} - {e.read().decode()}")
        return set()


def update_product(api_key: str, product_code: str, update_data: dict) -> bool:
    """단일 제품 업데이트"""
    url = f"{SUPABASE_URL}/rest/v1/labdoc_products?product_code=eq.{product_code}"
    headers = {
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    body = json.dumps(update_data).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=headers, method="PATCH")

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            return response.status in (200, 204)
    except urllib.error.HTTPError as e:
        print(f"  Error updating {product_code}: {e.code}")
        return False


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

    # 업데이트할 데이터 필터링 (cosmetic_type 또는 recycling_grade가 있는 것만)
    to_update = [d for d in data if d.get("cosmetic_type") or d.get("recycling_grade")]
    print(f"업데이트 대상: {len(to_update)}건")

    # 기존 product_code 목록 조회
    existing_codes = get_existing_products(api_key)
    print(f"DB 제품 수: {len(existing_codes)}건")

    # 업데이트 수행
    updated = 0
    not_found = 0
    errors = []

    for i, item in enumerate(to_update, 1):
        product_code = item.get("product_code")
        codes_to_try = expand_product_codes(product_code)

        # 업데이트 데이터 준비
        update_data = {}
        if item.get("cosmetic_type"):
            update_data["cosmetic_type"] = item["cosmetic_type"].strip()
        if item.get("recycling_grade"):
            update_data["recycling_grade"] = item["recycling_grade"].strip()

        if not update_data or not codes_to_try:
            continue

        # 각 코드에 대해 업데이트 시도
        matched = False
        for code in codes_to_try:
            if code in existing_codes:
                if update_product(api_key, code, update_data):
                    updated += 1
                    matched = True
                    print(f"[{i}/{len(to_update)}] {code} 업데이트 완료")
                else:
                    errors.append(code)

        if not matched and codes_to_try:
            not_found += 1
            # 복수 코드 중 하나라도 매칭 안됨
            if len(codes_to_try) > 1:
                print(
                    f"[{i}/{len(to_update)}] {product_code} -> 매칭 실패 (확장: {codes_to_try})"
                )

    print(f"\n=== 결과 ===")
    print(f"업데이트 성공: {updated}건")
    print(f"매칭 실패: {not_found}건")
    print(f"오류: {len(errors)}건")

    if errors[:10]:
        print(f"\n오류 샘플:")
        for e in errors[:10]:
            print(f"  {e}")


if __name__ == "__main__":
    main()
