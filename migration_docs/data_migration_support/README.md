# Data Migration Support

**프로젝트**: 에바스코스메틱 화장품 연구 오라클 시스템
**작성일**: 2026-02-02
**버전**: 1.0
**상태**: 문서화 완료, ETL 실행 대기

---

## 개요

### 목적

기존 Excel 데이터를 Supabase 데이터베이스로 마이그레이션하기 위한 스키마 설계, DDL, ETL 매핑, 검증 문서 패키지.

### 범위

| 도메인   | 소스                                     | 타겟 테이블                                                                                        |
| -------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 정제수   | 정제수성적서 (27개 파일, 2012-2025)      | `labdoc_demo_purified_water_*`                                                                   |
| 원료입고 | 원료입고 관리대장 (11개 파일, 2016-2026) | `labdoc_demo_material_receipts`, `labdoc_demo_suppliers`                                       |
| 반완제품 | 반완제품관리대장 (6개 파일, 2021-2026)   | `labdoc_demo_production_batches`, `labdoc_demo_finished_batches`, `labdoc_demo_oem_products` |

### 제외 (별도 작업)

- MSDS
- 반제품/완제품 시험성적서

---

## 테이블 목록 (labdoc_demo_ prefix)

| #  | 테이블명                                    | 설명                 | 예상 rows |
| -- | ------------------------------------------- | -------------------- | --------- |
| 1  | `labdoc_demo_products`                    | 제품 마스터 (복사본) | 1,571     |
| 2  | `labdoc_demo_ingredients`                 | 원료 마스터 (복사본) | 1,066     |
| 3  | `labdoc_demo_suppliers`                   | 공급업체 마스터      | ~137      |
| 4  | `labdoc_demo_purified_water_test_items`   | 시험항목 마스터      | 12        |
| 5  | `labdoc_demo_purified_water_tests`        | 정제수 테스트 헤더   | ~3,000    |
| 6  | `labdoc_demo_purified_water_test_results` | 정제수 테스트 결과   | ~36,000   |
| 7  | `labdoc_demo_material_receipts`           | 원료입고 기록        | ~16,600   |
| 8  | `labdoc_demo_production_batches`          | 벌크/반제품 생산     | ~6,300    |
| 9  | `labdoc_demo_finished_batches`            | 완제품 생산          | ~6,300    |
| 10 | `labdoc_demo_oem_products`                | OEM 입고             | ~300      |

**총 예상**: ~71,000 rows

---

## 폴더 구조

```
data_migration_support/
├── README.md                              # 이 문서
│
├── 00_schema_principles.md                # 스키마 설계 원칙
├── 10_purified_water_schema.md            # 정제수 스키마
├── 20_material_receipts_schema.md         # 원료입고 스키마
├── 30_production_schema.md                # 반완제품 스키마
│
├── ddl/
│   └── 0001_create_labdoc_demo_tables.sql # DDL (10테이블, 728줄)
│
├── sql/
│   └── 010_copy_products_ingredients.sql  # 마스터 데이터 복사
│
├── etl/
│   ├── 00_runbook.md                      # ETL 실행 가이드
│   ├── 10_purified_water_mapping.md       # 정제수 매핑
│   ├── 20_material_receipts_mapping.md    # 원료입고 매핑
│   └── 30_production_mapping.md           # 반완제품 매핑
│
├── verify/
│   ├── 00_row_counts.sql                  # Row count 검증
│   ├── 10_soft_fk_match_rates.sql         # FK 매칭률 검증
│   ├── 20_value_ranges.sql                # 값 범위 검증
│   └── 30_spotcheck_queries.sql           # 샘플 스팟체크
│
└── reports/                               # ETL 실행 리포트 (추후)
```

---

## 실행 순서

### Phase 1: DDL 실행

```bash
# Supabase에서 apply_migration 실행
supabase db execute -f ddl/0001_create_labdoc_demo_tables.sql
```

### Phase 2: 마스터 데이터 복사

```bash
supabase db execute -f sql/010_copy_products_ingredients.sql
```

### Phase 3: ETL 실행 (도메인 순서)

1. **정제수** (독립, 1순위)
   - 참조: `etl/10_purified_water_mapping.md`
2. **원료입고** (ingredients soft reference)
   - 참조: `etl/20_material_receipts_mapping.md`
3. **반완제품** (products soft reference)
   - 참조: `etl/30_production_mapping.md`

### Phase 4: 검증

```bash
# 순서대로 실행
supabase db execute -f verify/00_row_counts.sql
supabase db execute -f verify/10_soft_fk_match_rates.sql
supabase db execute -f verify/20_value_ranges.sql
supabase db execute -f verify/30_spotcheck_queries.sql
```

---

## 핵심 설계 결정

### 1. Soft Reference (FK 제약 없음)

- 모든 외부 참조는 인덱스만 생성, FK 제약 없음
- orphan 허용 (미매칭 코드도 삽입)
- 매칭률은 검증 SQL로 모니터링

### 2. UUID PK + 업무키 UNIQUE

```sql
id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
test_no varchar(15) UNIQUE NOT NULL  -- 업무키
```

### 3. 추적성 컬럼

```sql
source_file text,    -- 원본 Excel 파일명
source_sheet text,   -- 원본 시트명
source_row int       -- 원본 row 번호
```

### 4. 재실행 가능 (Idempotent)

- `DROP IF EXISTS` 포함
- `TRUNCATE ... CASCADE` 사용
- `ON CONFLICT DO NOTHING`

---

## 검증 기준

| 검증 항목             | 기준        | 파일                           |
| --------------------- | ----------- | ------------------------------ |
| Row count             | 예상치 ±5% | `00_row_counts.sql`          |
| Soft FK 매칭률        | ≥95%       | `10_soft_fk_match_rates.sql` |
| pH 범위               | 0~14        | `20_value_ranges.sql`        |
| 수량                  | ≥0         | `20_value_ranges.sql`        |
| 포장수율              | 0~110%      | `20_value_ranges.sql`        |
| 날짜 NULL             | 0건         | `20_value_ranges.sql`        |
| 반완제품↔완제품 매칭 | ≥33건      | `10_soft_fk_match_rates.sql` |

---

## 소스 파일 위치

```
migration_docs/서식 샘플/
├── 정제수/                     # 27개 파일
├── 원료입고 관리대장/          # 11개 파일
└── 반완제품관리대장/           # 6개 파일
```

---

## 다음 단계 (추후 작업)

- [ ] Python ETL 스크립트 개발 (`etl/scripts/`)
- [ ] 실제 ETL 실행
- [ ] 검증 리포트 생성 (`reports/`)
- [ ] 운영 반영 (labdoc_demo_ → labdoc_)

---

## 참조 문서

| 문서               | 경로                                        | 설명               |
| ------------------ | ------------------------------------------- | ------------------ |
| 기존 스키마 가이드 | `migration_docs/SUPABASE_SCHEMA_GUIDE.md` | 기존 15개 테이블   |
| 프로젝트 인수인계  | `HANDOVER.md`                             | 전체 프로젝트 현황 |
| 기존 DDL           | `migration_docs/schema_labdoc_v2.sql`     | 기존 테이블 DDL    |

---

**작성자**: Claude AI (Sisyphus)
**최종 수정**: 2026-02-02
