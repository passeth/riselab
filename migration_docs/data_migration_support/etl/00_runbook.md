# 공통 ETL 런북 (Common ETL Runbook)

본 문서는 Excel 파일에서 추출한 데이터를 CSV로 변환하고 Supabase(PostgreSQL)로 마이그레이션하는 공통 ETL 프로세스 실행 가이드를 제공합니다.

---

## 1. 개요
- **마이그레이션 범위**: 정제수 관리, 원료입고 검사, 반완제품 검사
- **대상 테이블**: `labdoc_demo_*` 시리즈 (총 10개 테이블)
- **소스 파일 위치**: `migration_docs/서식 샘플/` (Excel 파일군)
- **최종 목적지**: Supabase Database (Project Ref 참조)

---

## 2. 사전 요구사항
### 시스템 요구사항
- **Python 3.8+**
  - 필수 라이브러리: `pandas`, `openpyxl`, `psycopg2-binary` (또는 `sqlalchemy`)
- **Supabase 접속 정보**
  - 환경변수(`.env`)에 아래 정보가 설정되어 있어야 합니다.
    - `SUPABASE_URL`
    - `SUPABASE_KEY`
    - `DB_CONNECTION_STRING` (PostgreSQL 직접 연결 시)

### 데이터베이스 준비
- DDL 실행 완료: `ddl/0001_create_labdoc_demo_tables.sql` 파일이 실행되어 대상 테이블이 생성된 상태여야 합니다.

---

## 3. 폴더 구조
프로젝트 루트 기준 `migration_docs/data_migration_support/` 구조는 다음과 같습니다.

```text
data_migration_support/
├── ddl/           # 테이블 정의 SQL
├── etl/           # ETL 문서 및 실행 가이드
│   ├── 00_runbook.md                    # (현재 문서)
│   ├── 10_purified_water_mapping.md      # 정제수 매핑 정의
│   ├── 20_material_receipts_mapping.md   # 원료입고 매핑 정의
│   ├── 30_production_mapping.md          # 반완제품 매핑 정의
│   └── scripts/                          # ETL 처리용 Python 스크립트
├── sql/           # 데이터 조작 및 가공용 SQL
├── verify/        # 마이그레이션 후 데이터 정합성 검증 SQL
└── reports/       # 실행 결과 및 이슈 로그 리포트
```

---

## 4. 실행 순서
데이터 간 참조 무결성(FK)을 고려하여 아래 순서로 실행합니다.

1.  **DDL 실행**: `labdoc_demo_*` 테이블 생성 및 제약 조건 설정
2.  **기초 마스터 데이터 확인**: `products`, `ingredients` 등 참조되는 마스터 데이터가 존재하는지 확인 (필요시 복사)
3.  **정제수 ETL**: 정제수 시험 항목 및 결과 데이터 마이그레이션
4.  **원료입고 ETL**: 원료 입고 정보 및 검사 결과 데이터 마이그레이션
5.  **반완제품 ETL**: 제조 지시 및 제품 검사 결과 데이터 마이그레이션
6.  **최종 검증**: `verify/` 폴더 내 SQL을 실행하여 카운트 및 데이터 샘플 대조

---

## 5. 재실행 전략
ETL 실행 중 오류가 발생하거나 데이터 업데이트가 필요한 경우 아래 전략을 따릅니다.

-   **데이터 초기화(Cleanup)**: 전체 삭제가 필요한 경우 `labdoc_demo_*` 테이블만 `TRUNCATE` 합니다.
-   **멱등성(Idempotent) 보장**: 
    -   스크립트 작성 시 `ON CONFLICT (id) DO UPDATE` 또는 `DO NOTHING` 구문을 사용합니다.
-   **부분 재실행**: 도메인별(정제수, 원료, 제품) 독립적인 스크립트 구성을 통해 실패한 도메인만 재실행할 수 있도록 합니다.

---

## 6. 에러 처리 가이드라인
| 에러 유형 | 처리 방법 | 비고 |
| :--- | :--- | :--- |
| **파싱 실패** | 해당 로우를 무시하고 에러 로그(`reports/`)에 기록 후 다음 행 진행 | Excel 서식 변경 확인 필요 |
| **타입 변환 실패** | NULL을 삽입하거나 해당 필드의 기본값(Default) 적용 | 데이터 정제 단계에서 보정 권장 |
| **UNIQUE 충돌** | `ON CONFLICT DO NOTHING`으로 중복 삽입 방지 | 기존 데이터 유지가 기본 원칙 |
| **참조 무결성 위반** | 부모 데이터(마스터) 누락 여부 확인 후 로그 기록 | `products` 테이블 등 사전 데이터 확인 |

---

## 7. 로그 및 리포트 포맷
모든 ETL 실행 기록은 `reports/` 폴더 내에 표준 포맷으로 작성합니다.

```text
[YYYY-MM-DD HH:MM:SS] INFO: Starting [DOMAIN_NAME] ETL
[YYYY-MM-DD HH:MM:SS] INFO: Processing file: [FILENAME].xlsx
[YYYY-MM-DD HH:MM:SS] WARN: Sheet "[SHEET_NAME]" - Row [N]: [ISSUE_DESCRIPTION]
[YYYY-MM-DD HH:MM:SS] ERROR: Critical failure at Row [N]: [ERROR_DETAIL]
[YYYY-MM-DD HH:MM:SS] INFO: Completed. Rows: [INSERTED] inserted, [SKIPPED] skipped, [WARNINGS] warnings
```

---

## 8. 롤백(Rollback) 절차
마이그레이션 중단 및 원복이 필요한 경우 아래 SQL을 순서대로 실행합니다. (CASCADE 주의)

```sql
-- 1. 제품/반완제품 데이터 삭제
TRUNCATE labdoc_demo_production_test_results CASCADE;
TRUNCATE labdoc_demo_production_tests CASCADE;

-- 2. 원료입고 데이터 삭제
TRUNCATE labdoc_demo_material_receipt_test_results CASCADE;
TRUNCATE labdoc_demo_material_receipts CASCADE;

-- 3. 정제수 데이터 삭제
TRUNCATE labdoc_demo_purified_water_test_results CASCADE;
TRUNCATE labdoc_demo_purified_water_tests CASCADE;
```

---

## 9. 최종 체크리스트
- [ ] DDL 실행 완료 및 테이블 구조 확인
- [ ] `.env` 파일 내 Supabase 접속 정보 유효성 확인
- [ ] `migration_docs/서식 샘플/` 내 소스 엑셀 파일 존재 여부 확인
- [ ] 정제수(Purified Water) ETL 성공 여부
- [ ] 원료입고(Material Receipts) ETL 성공 여부
- [ ] 반완제품(Production) ETL 성공 여부
- [ ] `verify/` 스크립트를 통한 데이터 정합성 검증 통과
