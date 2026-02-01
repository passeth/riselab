#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Interactive environment setup script
Helps user create .env file with Supabase credentials
"""

import sys
import io
from pathlib import Path

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")


def main():
    print("=" * 60)
    print("Supabase 환경변수 설정")
    print("=" * 60)
    print()

    env_file = Path(".env")

    if env_file.exists():
        print("⚠ .env 파일이 이미 존재합니다.")
        response = input("덮어쓰시겠습니까? (y/N): ").strip().lower()
        if response != "y":
            print("취소되었습니다.")
            return
        print()

    print("Supabase 프로젝트 정보를 입력해주세요.")
    print("(Supabase Dashboard > Settings > API 에서 확인)")
    print()

    # Get Supabase URL
    print("1. Supabase URL")
    print("   예시: https://abcdefghijk.supabase.co")
    supabase_url = input("   URL: ").strip()

    if not supabase_url:
        print("✗ URL이 입력되지 않았습니다.")
        return

    print()

    # Get Supabase Key
    print("2. Supabase Key")
    print("   - 테스트용: anon/public key 사용")
    print("   - 프로덕션: service_role key 사용 (권장)")
    supabase_key = input("   Key: ").strip()

    if not supabase_key:
        print("✗ Key가 입력되지 않았습니다.")
        return

    print()

    # Create .env file
    env_content = f"""# Supabase Configuration
SUPABASE_URL={supabase_url}
SUPABASE_KEY={supabase_key}
"""

    try:
        with open(env_file, "w", encoding="utf-8") as f:
            f.write(env_content)

        print("=" * 60)
        print("✓ .env 파일이 생성되었습니다!")
        print("=" * 60)
        print()
        print("다음 단계:")
        print("1. Supabase SQL Editor에서 schema.sql 실행")
        print("2. python migrate_products.py --dry-run  # 테스트")
        print("3. python migrate_products.py  # 실제 마이그레이션")
        print()

    except Exception as e:
        print(f"✗ 파일 생성 실패: {e}")
        return


if __name__ == "__main__":
    main()
