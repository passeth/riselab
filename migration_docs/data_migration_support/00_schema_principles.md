# Demo 테이블 스키마 설계 원칙

**프로젝트**: 에바스코스메틱 제품표준서 시스템 - QC Demo 데이터 마이그레이션  
**작성일**: 2026-02-02  
**테이블 Prefix**: `labdoc_demo_` (운영 테이블 `labdoc_`과 분리)

---

## 1. 개요

### 1.1 배경

| 구분 | Prefix | 테이블 수 | 레코드 수 | 용도 |
|------|--------|-----------|-----------|------|
| 기존 운영 | `labdoc_` | 15개 | 92,300+ | 제품표준서 운영 데이터 |
| 신규 Demo | `labdoc_demo_` | TBD | TBD | QC 시험 데모 데이터 |

### 1.2 설계 원칙

1. **운영 분리**: 기존 `labdoc_` 테이블과 완전 분리
2. **스키마 일관성**: 기존 `schema_labdoc_v2.sql` 패턴 준수
3. **Soft Reference**: FK 제약 없이 인덱스로 JOIN 성능 확보
4. **추적성**: 원본 Excel 파일/시트/행 정보 보존

---

## 2. 네이밍 컨벤션

### 2.1 테이블 명명

```
labdoc_demo_{도메인}_{entity}
```

| 요소 | 규칙 | 예시 |
|------|------|------|
| Prefix | 고정값 | `labdoc_demo_` |
| 도메인 | snake_case, 업무영역 | `purified_water`, `semi_product`, `finished_product` |
| Entity | snake_case, 데이터 유형 | `tests`, `specs`, `results` |

**예시 테이블명:**
- `labdoc_demo_purified_water_tests` - 정제수 시험
- `labdoc_demo_semi_product_tests` - 반제품 시험
- `labdoc_demo_finished_product_tests` - 완제품 시험
- `labdoc_demo_ingredient_receiving_tests` - 원료 입고검사

### 2.2 컬럼 명명

| 규칙 | 예시 |
|------|------|
| snake_case 사용 | `test_date`, `product_code`, `lot_number` |
| 약어 지양 (명확성 우선) | `specification` (O), `spec` (X) |
| Boolean은 `is_` / `has_` prefix | `is_passed`, `has_attachment` |
| 날짜는 `_date` / `_at` suffix | `test_date`, `created_at` |

### 2.3 인덱스 명명

```sql
-- 단일 컬럼 인덱스
idx_{table}_{column}

-- 복합 인덱스
idx_{table}_{column1}_{column2}
```

**예시:**
```sql
CREATE INDEX idx_labdoc_demo_purified_water_tests_test_no 
  ON labdoc_demo_purified_water_tests(test_no);

CREATE INDEX idx_labdoc_demo_semi_product_tests_product_code 
  ON labdoc_demo_semi_product_tests(product_code);
```

### 2.4 UNIQUE 제약 명명

```sql
-- 단일 컬럼
uq_{table}_{column}

-- 복합 컬럼
uq_{table}_{column1}_{column2}
```

**예시:**
```sql
ALTER TABLE labdoc_demo_purified_water_tests 
  ADD CONSTRAINT uq_labdoc_demo_purified_water_tests_test_no UNIQUE (test_no);
```

> **참고**: 간결한 인라인 형태도 허용
> ```sql
> test_no varchar(15) UNIQUE NOT NULL
> ```

---

## 3. 공통 컬럼 (모든 신규 테이블)

### 3.1 필수 공통 컬럼

```sql
-- 모든 labdoc_demo_ 테이블에 포함
id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz,

-- 데이터 추적성 (마이그레이션 원본 추적)
source_file text,      -- 원본 Excel 파일명
source_sheet text,     -- 원본 시트명
source_row int         -- 원본 row 번호 (1-based, 헤더 제외)
```

### 3.2 컬럼 설명

| 컬럼 | 타입 | 용도 |
|------|------|------|
| `id` | uuid | 서로게이트 PK, 자동 생성 |
| `created_at` | timestamptz | 레코드 생성 시각 |
| `updated_at` | timestamptz | 레코드 수정 시각 (trigger로 자동 갱신) |
| `source_file` | text | 마이그레이션 원본 파일명 (예: `정제수시험일지_2024.xlsx`) |
| `source_sheet` | text | 원본 시트명 (예: `1월`, `2024년`) |
| `source_row` | int | 원본 Excel 행 번호 (디버깅/검증용) |

### 3.3 updated_at 트리거

```sql
-- 트리거 함수 (기존 labdoc_update_updated_at 재사용)
CREATE OR REPLACE FUNCTION labdoc_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 트리거 적용
CREATE TRIGGER update_labdoc_demo_purified_water_tests_updated_at
  BEFORE UPDATE ON labdoc_demo_purified_water_tests
  FOR EACH ROW EXECUTE FUNCTION labdoc_update_updated_at();
```

---

## 4. Soft Reference 정책

### 4.1 정책 요약

| 항목 | 정책 |
|------|------|
| FK 제약조건 | **사용 안 함** |
| Orphan 레코드 | **허용** |
| 참조 무결성 | 애플리케이션 레벨에서 관리 |
| JOIN 성능 | **인덱스 필수** |

### 4.2 배경

- Demo 데이터는 운영 마스터와 1:1 매핑되지 않을 수 있음
- Excel 원본에 존재하지만 마스터에 없는 코드 허용
- 데이터 로드 순서에 독립적

### 4.3 예시

```sql
-- labdoc_demo_semi_product_tests 테이블
product_code varchar(20),  -- labdoc_products.product_code와 JOIN 가능
lot_number varchar(30),    -- 마스터 테이블 없음 (독립 데이터)

-- FK 제약 없음 - 아래처럼 사용하지 않음
-- REFERENCES labdoc_products(product_code)  -- X

-- 대신 인덱스로 JOIN 성능 확보
CREATE INDEX idx_labdoc_demo_semi_product_tests_product_code 
  ON labdoc_demo_semi_product_tests(product_code);
```

### 4.4 JOIN 쿼리 예시

```sql
-- Soft Reference JOIN (LEFT JOIN 권장)
SELECT 
    t.test_no,
    t.product_code,
    p.korean_name,
    t.judgment
FROM labdoc_demo_semi_product_tests t
LEFT JOIN labdoc_products p ON t.product_code = p.product_code
WHERE t.test_date >= '2024-01-01';
```

---

## 5. PK 정책

### 5.1 요약

| 구분 | 컬럼 | 제약 |
|------|------|------|
| **Surrogate PK** | `id` | UUID, 자동 생성 |
| **업무키** | `test_no`, `lot_number` 등 | UNIQUE NOT NULL |

### 5.2 UUID PK

```sql
-- uuid-ossp 확장 필요 (Supabase 기본 활성화)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PK 정의
id uuid PRIMARY KEY DEFAULT uuid_generate_v4()
```

### 5.3 업무키 UNIQUE 제약

```sql
-- 시험번호 (단일 업무키)
test_no varchar(15) UNIQUE NOT NULL,

-- 복합 업무키
UNIQUE(product_code, lot_number, test_date)
```

### 5.4 업무키 패턴

| 업무키 | 패턴 | 예시 |
|--------|------|------|
| 정제수 시험번호 | `R{YY}{MM}{SEQ}` | R2601001, R2601002 |
| 반제품 시험번호 | `B{YY}{MM}{SEQ}` | B2601001, B2601002 |
| 완제품 시험번호 | `P{YY}{MM}{SEQ}` | P2601001, P2601002 |
| 원료 LOT | 자유형식 | B6001, H5111-1, 2024-001 |

---

## 6. 데이터 타입 가이드

### 6.1 타입 매핑 테이블

| 유형 | PostgreSQL 타입 | 크기 | 예시 값 |
|------|-----------------|------|---------|
| 코드 | `varchar(20)` | 20자 | FJSL002, MAA-0001 |
| 시험번호 | `varchar(15)` | 15자 | B2601001, R2601001 |
| LOT 번호 | `varchar(30)` | 30자 | B6001, H5111-1, 2024-001-A |
| 측정값 | `decimal(10,4)` | 소수 4자리 | 5.2100 (pH), 1.0234 (비중) |
| 수량 | `decimal(12,2)` | 소수 2자리 | 1500.00 (kg), 25000.00 (ea) |
| 퍼센트 | `decimal(6,2)` | 소수 2자리 | 98.50 (포장수율) |
| 날짜 | `date` | - | 2024-01-15 |
| 일시 | `timestamptz` | - | 2024-01-15 09:30:00+09 |
| 짧은텍스트 | `varchar(100)` | 100자 | 담당자명, 장비명 |
| 긴텍스트 | `text` | 무제한 | 비고, 특이사항 |
| 판정 | `varchar(20)` | 20자 | '적합', '부적합', 'NA' |
| Boolean | `boolean` | - | true, false |

### 6.2 측정값 상세

```sql
-- pH 값 (일반적으로 0~14, 소수점 2자리)
ph_value decimal(10,4),

-- 비중 (0.8~1.5 범위, 소수점 4자리)
specific_gravity decimal(10,4),

-- 점도 (범위 넓음, 소수점 2자리)
viscosity decimal(12,2),

-- 온도
temperature decimal(5,1),

-- 미생물 수 (정수)
bacteria_count int,
```

### 6.3 NULL 허용 가이드

| 컬럼 유형 | NULL 허용 | 이유 |
|-----------|-----------|------|
| PK (id) | NOT NULL | 필수 |
| 업무키 (test_no) | NOT NULL | 필수 |
| 측정값 | NULL 허용 | 측정 안 된 항목 존재 |
| 판정 | NULL 허용 | 진행중 상태 |
| 비고 | NULL 허용 | 선택 입력 |
| source_* | NULL 허용 | 수동 입력 데이터 |

---

## 7. 인덱스 전략

### 7.1 자동 생성 인덱스

| 제약 | 인덱스 자동 생성 |
|------|------------------|
| PRIMARY KEY | O (자동) |
| UNIQUE | O (자동) |

### 7.2 수동 생성 인덱스

| 컬럼 용도 | 인덱스 필요 | 이유 |
|-----------|-------------|------|
| 외래 참조 코드 | **필수** | JOIN 성능 |
| 날짜 범위 조회 | 권장 | WHERE 절 필터 |
| 빈번한 검색 조건 | 권장 | 조회 성능 |

### 7.3 인덱스 생성 예시

```sql
-- 참조 코드 (Soft Reference)
CREATE INDEX idx_labdoc_demo_semi_product_tests_product_code 
  ON labdoc_demo_semi_product_tests(product_code);

CREATE INDEX idx_labdoc_demo_ingredient_tests_ingredient_code 
  ON labdoc_demo_ingredient_tests(ingredient_code);

-- 날짜 범위 조회
CREATE INDEX idx_labdoc_demo_purified_water_tests_test_date 
  ON labdoc_demo_purified_water_tests(test_date);

-- 복합 인덱스 (빈번한 조회 패턴)
CREATE INDEX idx_labdoc_demo_semi_product_tests_code_date 
  ON labdoc_demo_semi_product_tests(product_code, test_date);
```

---

## 8. 테이블 템플릿

### 8.1 기본 테이블 구조

```sql
-- ============================================================================
-- {테이블 설명}
-- Source: {원본 Excel 파일/시트}
-- ============================================================================
CREATE TABLE IF NOT EXISTS labdoc_demo_{domain}_{entity} (
  -- === PK ===
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- === 업무키 ===
  test_no varchar(15) UNIQUE NOT NULL,
  
  -- === 참조 코드 (Soft Reference) ===
  product_code varchar(20),
  
  -- === 업무 데이터 ===
  test_date date NOT NULL,
  -- ... 업무별 컬럼
  
  -- === 판정 ===
  judgment varchar(20),
  remarks text,
  
  -- === 추적성 ===
  source_file text,
  source_sheet text,
  source_row int,
  
  -- === 타임스탬프 ===
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

-- === 인덱스 ===
CREATE INDEX idx_labdoc_demo_{domain}_{entity}_test_no 
  ON labdoc_demo_{domain}_{entity}(test_no);
CREATE INDEX idx_labdoc_demo_{domain}_{entity}_product_code 
  ON labdoc_demo_{domain}_{entity}(product_code);
CREATE INDEX idx_labdoc_demo_{domain}_{entity}_test_date 
  ON labdoc_demo_{domain}_{entity}(test_date);

-- === 트리거 ===
CREATE TRIGGER update_labdoc_demo_{domain}_{entity}_updated_at
  BEFORE UPDATE ON labdoc_demo_{domain}_{entity}
  FOR EACH ROW EXECUTE FUNCTION labdoc_update_updated_at();

-- === 코멘트 ===
COMMENT ON TABLE labdoc_demo_{domain}_{entity} IS '{테이블 설명}';
```

---

## 9. 검증 체크리스트

### 9.1 DDL 작성 시 확인사항

- [ ] 테이블명이 `labdoc_demo_` prefix로 시작하는가?
- [ ] 모든 컬럼이 snake_case인가?
- [ ] 공통 컬럼 (id, created_at, updated_at, source_*) 포함되었는가?
- [ ] UUID PK와 업무키 UNIQUE 분리되었는가?
- [ ] FK 제약조건 없이 Soft Reference로 설계되었는가?
- [ ] 참조 코드 컬럼에 인덱스가 있는가?
- [ ] 데이터 타입이 가이드와 일치하는가?
- [ ] updated_at 트리거가 설정되었는가?

### 9.2 기존 스키마 일관성 확인

| 항목 | 기존 `labdoc_` | 신규 `labdoc_demo_` |
|------|----------------|---------------------|
| PK 타입 | uuid | uuid |
| PK 생성 | uuid_generate_v4() | uuid_generate_v4() |
| 타임스탬프 | timestamptz | timestamptz |
| FK 정책 | 일부 FK, 일부 Soft | 전체 Soft Reference |
| 인덱스 명명 | idx_labdoc_{tbl}_{col} | idx_labdoc_demo_{tbl}_{col} |

---

## 10. 참조 문서

| 문서 | 경로 | 용도 |
|------|------|------|
| 기존 스키마 | `migration_docs/schema_labdoc_v2.sql` | 컨벤션 참조 |
| 스키마 가이드 | `migration_docs/SUPABASE_SCHEMA_GUIDE.md` | ERD, 쿼리 예시 |

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-02-02 | 1.0 | 초기 작성 |

---

**작성자**: Claude AI  
**최종 수정**: 2026-02-02  
**버전**: 1.0
