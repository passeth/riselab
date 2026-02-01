# 메인 세션 전달용 보고서 (ETL 실행 결과)

## 1) 수행 작업 요약
- **ETL 스크립트 3종 작성/수정 후 실행 완료**
  - `migration_docs/data_migration_support/etl/scripts/etl_purified_water.py`
    - .xls/.xlsx 대응, `.env` 로더, 12항목 결과 생성, upsert
  - `etl_material_receipts.py`
    - NaN 정리 + test_no dedupe + supplier 정규화/매핑
  - `etl_production.py`
    - date ISO 문자열화, upsert 전에 dedupe, 긴 시험번호 스킵 경고
- **DDL 문서 보정**
  - `migration_docs/data_migration_support/ddl/0001_create_labdoc_demo_tables.sql`
  - `product_code` 길이 20 → **30**으로 문서 반영
- **정제수 테스트 1건(결과 0건) 삭제**
  - `2025-11-20 / 정제수성적서_2025년 하반기.xlsx / 11월 20일`

## 2) 적재 결과 (DB Row Count)
- purified_water_tests: **2680**
- purified_water_results: **32160** (= 2680 × 12)
- material_receipts: **17914**
- production_batches: **6034**
- finished_batches: **6200**
- oem_products: **307**

## 3) 품질/정합성 체크 (샘플 쿼리 결과)
- **pH 범위 초과**
  - production: **1건**, finished: **1건**, oem: 0
- **Soft FK 매칭률**
  - material_receipts → ingredients: **99.96%**
  - production → products: **94.90%**
  - finished → products: **94.60%**
  - oem → products: **99.02%**
- **반완제품↔완제품 매칭**: **5876**
- **정제수 daily 항목 NA**: **13400건**
  → 규칙상 daily는 NA 없어야 함. 로직/원본 확인 필요.

## 4) 발견 이슈 & 리스크
- **정제수 daily 항목 NA 대량**: 매핑 규칙 위배 가능성.
  (ditto 처리/셀 읽기/스킵된 시트 확인 필요)
- **pH 범위 초과 2건**: 원본 확인 필요.
- **제품코드 매칭률 95% 미만(94.6~94.9)**: 소수 불일치 존재.
- **LSP 진단 실패**: basedpyright 경로 인식 실패(환경 PATH 재설정/세션 재시작 필요).

## 5) 검증 SQL 위치/실행
- 경로: `migration_docs/data_migration_support/verify/`
- 실행 순서:
  1. `00_row_counts.sql`
  2. `10_soft_fk_match_rates.sql`
  3. `20_value_ranges.sql`
  4. `30_spotcheck_queries.sql`

## 6) 레포용 참고(ETL/검증 문서 위치)
- 실행 가이드: `migration_docs/data_migration_support/etl/00_runbook.md`
- 검증 SQL 안내: `migration_docs/data_migration_support/README.md`
- 매핑 문서:
  - `etl/10_purified_water_mapping.md`
  - `etl/20_material_receipts_mapping.md`
  - `etl/30_production_mapping.md`

## 7) Supabase Upsert 문서 요약(참고 링크)
- Supabase Python Upsert: https://supabase.com/docs/reference/python/upsert
  - bulk upsert는 list 전달, `on_conflict` 필요
- PostgREST bulk insert/upsert: https://postgrest.org/en/v11/references/api/tables_views.html
- PostgreSQL “ON CONFLICT … cannot affect row a second time”:
  - https://www.postgresql.org/docs/current/sql-insert.html
  - 같은 배치 내 중복 키 제거 필요 (dedupe 적용 완료)

## 8) 남은 후속 작업 (권장)
1) **정제수 daily NA 원인 분석**
2) **pH 범위 초과 2건 원본 확인**
3) **verify/*.sql 전체 실행**로 정합성 리포트 확보
4) **LSP 진단 복구** (basedpyright PATH 재설정/재시작)
