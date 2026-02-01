# 정제수성적서 물리 스키마 설계

## 1. 개요

### 1.1 데이터 원천
- **파일 수**: 27개 Excel 파일
- **기간**: 2012년 ~ 2025년 (반기별)
- **시트 구조**: 일별 시트 (form-based, 약 122개/반기)
- **시험항목**: 12개

### 1.2 스키마 설계 원칙
- **Long-form 구조**: 시험항목별 개별 row 저장 (유연성, 확장성)
- **정규화**: 테스트 헤더와 결과 분리 (1:N 관계)
- **마스터 테이블**: 시험항목 코드화로 일관성 유지
- **추적성**: 원본 파일/시트/행 정보 보존

---

## 2. ERD (Entity Relationship Diagram)

```
┌─────────────────────────────────────────┐
│  labdoc_demo_purified_water_test_items  │
│  (마스터: 시험항목 정의)                 │
├─────────────────────────────────────────┤
│  PK  id (uuid)                          │
│  UK  item_code (varchar)                │
│      item_name_ko (varchar)             │
│      item_name_en (varchar)             │
│      specification (text)               │
│      test_frequency (varchar)           │
│      result_type (varchar)              │
│      sort_order (int)                   │
└─────────────────────────────────────────┘
                    │
                    │ (item_code 참조)
                    ▼
┌─────────────────────────────────────────┐
│  labdoc_demo_purified_water_tests       │
│  (테스트 헤더: 일별 검사 기록)           │
├─────────────────────────────────────────┤
│  PK  id (uuid)                          │
│      test_date (date)                   │
│      material_name (varchar)            │
│      sample_amount (varchar)            │
│      sampling_location (varchar)        │
│      collector (varchar)                │
│      inspector (varchar)                │
│      overall_result (varchar)           │
│      source_file (text)                 │
│      source_sheet (text)                │
│      source_row (int)                   │
│  UK  (test_date, source_file)           │
└─────────────────────────────────────────┘
                    │
                    │ 1:N
                    ▼
┌─────────────────────────────────────────┐
│  labdoc_demo_purified_water_test_results│
│  (테스트 결과: 항목별 결과)              │
├─────────────────────────────────────────┤
│  PK  id (uuid)                          │
│  FK  test_id (uuid)                     │
│      test_item_code (varchar)           │
│      test_item_name (varchar)           │
│      specification (text)               │
│      result_value (text)                │
│      result_numeric (decimal)           │
│      judgment (varchar)                 │
│      test_frequency (varchar)           │
│  UK  (test_id, test_item_code)          │
└─────────────────────────────────────────┘
```

---

## 3. 테이블 정의

### 3.1 labdoc_demo_purified_water_tests (테스트 헤더)

일별 정제수 검사의 기본 정보를 저장합니다.

```sql
CREATE TABLE labdoc_demo_purified_water_tests (
    -- 기본 키
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 검사 기본 정보
    test_date date NOT NULL,
    material_name varchar(50) DEFAULT '정제수',
    sample_amount varchar(20) DEFAULT '200 g',
    sampling_location varchar(50),
    
    -- 담당자
    collector varchar(50),      -- 채취자
    inspector varchar(50),      -- 검사자
    
    -- 종합 결과
    overall_result varchar(20) DEFAULT '적합',
    
    -- 추적성 (원본 파일 정보)
    source_file text,           -- 원본 Excel 파일명
    source_sheet text,          -- 원본 시트명
    source_row int,             -- 원본 행 번호
    
    -- 메타데이터
    created_at timestamptz NOT NULL DEFAULT now(),
    
    -- 제약조건: 동일 파일에서 동일 날짜 중복 방지
    CONSTRAINT uq_demo_pw_test_date UNIQUE (test_date, source_file)
);

COMMENT ON TABLE labdoc_demo_purified_water_tests IS '정제수성적서 일별 검사 기록 헤더';
COMMENT ON COLUMN labdoc_demo_purified_water_tests.test_date IS '검사 일자';
COMMENT ON COLUMN labdoc_demo_purified_water_tests.collector IS '시료 채취자';
COMMENT ON COLUMN labdoc_demo_purified_water_tests.inspector IS '검사 수행자';
COMMENT ON COLUMN labdoc_demo_purified_water_tests.overall_result IS '종합 판정 (적합/부적합)';
COMMENT ON COLUMN labdoc_demo_purified_water_tests.source_file IS '데이터 추적용 원본 파일명';
```

#### 컬럼 상세

| 컬럼명 | 데이터 타입 | NULL | 기본값 | 설명 |
|--------|-------------|------|--------|------|
| id | uuid | NO | uuid_generate_v4() | 기본 키 |
| test_date | date | NO | - | 검사 일자 |
| material_name | varchar(50) | YES | '정제수' | 검체명 |
| sample_amount | varchar(20) | YES | '200 g' | 검체량 |
| sampling_location | varchar(50) | YES | - | 채취 장소 |
| collector | varchar(50) | YES | - | 채취자 |
| inspector | varchar(50) | YES | - | 검사자 |
| overall_result | varchar(20) | YES | '적합' | 종합 판정 |
| source_file | text | YES | - | 원본 파일명 |
| source_sheet | text | YES | - | 원본 시트명 |
| source_row | int | YES | - | 원본 행 번호 |
| created_at | timestamptz | NO | now() | 생성 일시 |

---

### 3.2 labdoc_demo_purified_water_test_results (테스트 결과)

각 시험항목별 검사 결과를 저장합니다. 테스트 헤더와 1:N 관계입니다.

```sql
CREATE TABLE labdoc_demo_purified_water_test_results (
    -- 기본 키
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 외래 키: 테스트 헤더 참조
    test_id uuid NOT NULL REFERENCES labdoc_demo_purified_water_tests(id) 
        ON DELETE CASCADE,
    
    -- 시험항목 정보
    test_item_code varchar(30) NOT NULL,    -- 항목 코드 (영문)
    test_item_name varchar(50),             -- 항목명 (한글)
    specification text,                      -- 시험 기준/규격
    
    -- 결과값
    result_value text,                       -- 결과값 (문자열)
    result_numeric decimal(10,4),            -- 숫자형 결과 (pH 등)
    judgment varchar(20),                    -- 판정: '적합', '부적합', 'NA'
    
    -- 검사 빈도
    test_frequency varchar(10),              -- 'daily' 또는 'weekly'
    
    -- 메타데이터
    created_at timestamptz NOT NULL DEFAULT now(),
    
    -- 제약조건: 동일 테스트에서 동일 항목 중복 방지
    CONSTRAINT uq_demo_pw_result UNIQUE (test_id, test_item_code)
);

COMMENT ON TABLE labdoc_demo_purified_water_test_results IS '정제수성적서 항목별 검사 결과';
COMMENT ON COLUMN labdoc_demo_purified_water_test_results.test_item_code IS '시험항목 코드 (영문 snake_case)';
COMMENT ON COLUMN labdoc_demo_purified_water_test_results.result_numeric IS 'pH 등 숫자형 결과 저장용';
COMMENT ON COLUMN labdoc_demo_purified_water_test_results.judgment IS '판정 결과: 적합/부적합/NA';
```

#### 컬럼 상세

| 컬럼명 | 데이터 타입 | NULL | 기본값 | 설명 |
|--------|-------------|------|--------|------|
| id | uuid | NO | uuid_generate_v4() | 기본 키 |
| test_id | uuid | NO | - | 테스트 헤더 FK |
| test_item_code | varchar(30) | NO | - | 항목 코드 |
| test_item_name | varchar(50) | YES | - | 항목명 (한글) |
| specification | text | YES | - | 시험 기준 |
| result_value | text | YES | - | 결과값 (텍스트) |
| result_numeric | decimal(10,4) | YES | - | 결과값 (숫자) |
| judgment | varchar(20) | YES | - | 판정 결과 |
| test_frequency | varchar(10) | YES | - | 검사 빈도 |
| created_at | timestamptz | NO | now() | 생성 일시 |

---

### 3.3 labdoc_demo_purified_water_test_items (마스터 테이블)

12개 시험항목의 정의 및 메타데이터를 관리합니다.

```sql
CREATE TABLE labdoc_demo_purified_water_test_items (
    -- 기본 키
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 항목 코드 (Unique)
    item_code varchar(30) UNIQUE NOT NULL,
    
    -- 항목명
    item_name_ko varchar(50) NOT NULL,      -- 한글명
    item_name_en varchar(50),               -- 영문명
    
    -- 시험 규격
    specification text,                      -- 기준/규격
    
    -- 검사 빈도 및 결과 타입
    test_frequency varchar(10),              -- 'daily', 'weekly'
    result_type varchar(20),                 -- 'pass_fail', 'numeric', 'pass_fail_na'
    
    -- 정렬 순서
    sort_order int,
    
    -- 메타데이터
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE labdoc_demo_purified_water_test_items IS '정제수 시험항목 마스터';
COMMENT ON COLUMN labdoc_demo_purified_water_test_items.result_type IS 'pass_fail: 적합/부적합, numeric: 숫자, pass_fail_na: 적합/부적합/NA';
```

#### 초기 데이터 (12개 항목)

```sql
INSERT INTO labdoc_demo_purified_water_test_items 
    (item_code, item_name_ko, item_name_en, specification, test_frequency, result_type, sort_order) 
VALUES
    -- 일상 검사 항목 (5개)
    ('appearance', '성상', 'Appearance', '무색투명액상,무취,무미', 'daily', 'pass_fail', 1),
    ('ph', 'pH', 'pH', '5.0~7.0', 'daily', 'numeric', 2),
    ('chloride', '염화물', 'Chloride', '액이 변해선 안됨', 'daily', 'pass_fail', 3),
    ('sulfate', '황산염', 'Sulfate', '액이 변해선 안됨', 'daily', 'pass_fail', 4),
    ('heavy_metals', '중금속', 'Heavy Metals', '비교액보다 진해선 안됨', 'daily', 'pass_fail', 5),
    
    -- 주 1회 검사 항목 (7개)
    ('residual_chlorine', '잔류염소', 'Residual Chlorine', '색을 나타내선 안됨', 'weekly', 'pass_fail_na', 6),
    ('ammonia', '암모니아', 'Ammonia', '액이 변해선 안됨', 'weekly', 'pass_fail_na', 7),
    ('carbon_dioxide', '이산화탄소', 'Carbon Dioxide', '액이 변해선 안됨', 'weekly', 'pass_fail_na', 8),
    ('potassium', '칼륨', 'Potassium', '액이 변해선 안됨', 'weekly', 'pass_fail_na', 9),
    ('permanganate', '과망간산칼륨환원성물질', 'Permanganate Reducing', '홍색이 없어져선 안됨', 'weekly', 'pass_fail_na', 10),
    ('evaporation_residue', '증발잔류물', 'Evaporation Residue', '1mg 이하', 'weekly', 'pass_fail_na', 11),
    ('microorganism', '미생물', 'Microorganism', '100 CFU/g 이하', 'weekly', 'pass_fail_na', 12);
```

#### 컬럼 상세

| 컬럼명 | 데이터 타입 | NULL | 기본값 | 설명 |
|--------|-------------|------|--------|------|
| id | uuid | NO | uuid_generate_v4() | 기본 키 |
| item_code | varchar(30) | NO | - | 항목 코드 (UK) |
| item_name_ko | varchar(50) | NO | - | 한글명 |
| item_name_en | varchar(50) | YES | - | 영문명 |
| specification | text | YES | - | 시험 기준 |
| test_frequency | varchar(10) | YES | - | 검사 빈도 |
| result_type | varchar(20) | YES | - | 결과 타입 |
| sort_order | int | YES | - | 정렬 순서 |
| created_at | timestamptz | NO | now() | 생성 일시 |

---

## 4. 인덱스 정의

```sql
-- 테스트 헤더: 날짜 기반 조회 최적화
CREATE INDEX idx_demo_pw_tests_date 
    ON labdoc_demo_purified_water_tests(test_date);

-- 테스트 결과: FK 조회 최적화
CREATE INDEX idx_demo_pw_results_test_id 
    ON labdoc_demo_purified_water_test_results(test_id);

-- 테스트 결과: 항목별 조회 최적화
CREATE INDEX idx_demo_pw_results_item 
    ON labdoc_demo_purified_water_test_results(test_item_code);

-- 복합 인덱스: 날짜 + 항목 조회 (선택적)
CREATE INDEX idx_demo_pw_results_date_item 
    ON labdoc_demo_purified_water_test_results(test_id, test_item_code);
```

### 인덱스 목록 요약

| 인덱스명 | 테이블 | 컬럼 | 용도 |
|----------|--------|------|------|
| idx_demo_pw_tests_date | tests | test_date | 날짜 범위 조회 |
| idx_demo_pw_results_test_id | results | test_id | FK 조인 최적화 |
| idx_demo_pw_results_item | results | test_item_code | 항목별 집계 |
| idx_demo_pw_results_date_item | results | (test_id, test_item_code) | 복합 조회 |

---

## 5. NA 처리 규칙

### 5.1 배경
- **일상 검사 항목 (5개)**: 매일 검사 수행
- **주간 검사 항목 (7개)**: 주 1회만 검사 수행
- 주간 항목의 비검사일 데이터 처리 방법 정의 필요

### 5.2 처리 방식 (권장)

#### Option A: NA Row 생성 (권장)
주간 항목도 매일 row를 생성하되, 비검사일은 `judgment = 'NA'`로 표시

```
장점:
- 모든 날짜에 일관된 row 수 (12개/일)
- 쿼리 및 리포팅 단순화
- "검사 안 함"을 명시적으로 표현

단점:
- 데이터량 증가 (약 40% 추가)
```

**ETL 매핑 예시:**
```python
# 주간 항목이 비어있거나 'N/A'인 경우
if test_frequency == 'weekly' and (value is None or value == 'N/A'):
    judgment = 'NA'
    result_value = None
```

#### Option B: Row 미생성
주간 항목의 비검사일에는 해당 row를 생성하지 않음

```
장점:
- 데이터량 최소화
- 실제 검사 데이터만 저장

단점:
- 날짜별 row 수가 가변적 (5~12개)
- "검사 안 함" vs "데이터 누락" 구분 어려움
```

### 5.3 judgment 값 정의

| 값 | 의미 | 사용 조건 |
|----|------|-----------|
| `적합` | 기준 충족 | 검사 수행, 기준 통과 |
| `부적합` | 기준 미충족 | 검사 수행, 기준 미달 |
| `NA` | 해당 없음 | 주간 항목 비검사일 |

### 5.4 ETL 단계 확정 필요
- Wave 3 (ETL 매핑) 단계에서 최종 방식 확정
- 현재 스키마는 양쪽 방식 모두 지원 가능하도록 설계됨

---

## 6. 시험항목 상세

### 6.1 일상 검사 항목 (Daily, 5개)

| 코드 | 한글명 | 기준 | 결과 타입 |
|------|--------|------|-----------|
| appearance | 성상 | 무색투명액상,무취,무미 | Pass/Fail |
| ph | pH | 5.0~7.0 | Numeric |
| chloride | 염화물 | 액이 변해선 안됨 | Pass/Fail |
| sulfate | 황산염 | 액이 변해선 안됨 | Pass/Fail |
| heavy_metals | 중금속 | 비교액보다 진해선 안됨 | Pass/Fail |

### 6.2 주간 검사 항목 (Weekly, 7개)

| 코드 | 한글명 | 기준 | 결과 타입 |
|------|--------|------|-----------|
| residual_chlorine | 잔류염소 | 색을 나타내선 안됨 | Pass/Fail/NA |
| ammonia | 암모니아 | 액이 변해선 안됨 | Pass/Fail/NA |
| carbon_dioxide | 이산화탄소 | 액이 변해선 안됨 | Pass/Fail/NA |
| potassium | 칼륨 | 액이 변해선 안됨 | Pass/Fail/NA |
| permanganate | 과망간산칼륨환원성물질 | 홍색이 없어져선 안됨 | Pass/Fail/NA |
| evaporation_residue | 증발잔류물 | 1mg 이하 | Pass/Fail/NA |
| microorganism | 미생물 | 100 CFU/g 이하 | Pass/Fail/NA |

---

## 7. 샘플 쿼리

### 7.1 특정 날짜 검사 결과 조회

```sql
SELECT 
    t.test_date,
    t.inspector,
    r.test_item_name,
    r.result_value,
    r.result_numeric,
    r.judgment
FROM labdoc_demo_purified_water_tests t
JOIN labdoc_demo_purified_water_test_results r ON t.id = r.test_id
WHERE t.test_date = '2024-01-15'
ORDER BY r.test_item_code;
```

### 7.2 월별 부적합 건수 집계

```sql
SELECT 
    DATE_TRUNC('month', t.test_date) AS month,
    r.test_item_name,
    COUNT(*) FILTER (WHERE r.judgment = '부적합') AS fail_count
FROM labdoc_demo_purified_water_tests t
JOIN labdoc_demo_purified_water_test_results r ON t.id = r.test_id
GROUP BY 1, 2
ORDER BY 1, 2;
```

### 7.3 pH 추이 분석

```sql
SELECT 
    t.test_date,
    r.result_numeric AS ph_value
FROM labdoc_demo_purified_water_tests t
JOIN labdoc_demo_purified_water_test_results r ON t.id = r.test_id
WHERE r.test_item_code = 'ph'
  AND t.test_date BETWEEN '2024-01-01' AND '2024-12-31'
ORDER BY t.test_date;
```

### 7.4 주간 항목 검사 이행률

```sql
SELECT 
    DATE_TRUNC('week', t.test_date) AS week,
    r.test_item_name,
    COUNT(*) FILTER (WHERE r.judgment != 'NA') AS tested_count,
    COUNT(*) AS total_days
FROM labdoc_demo_purified_water_tests t
JOIN labdoc_demo_purified_water_test_results r ON t.id = r.test_id
WHERE r.test_frequency = 'weekly'
GROUP BY 1, 2
ORDER BY 1, 2;
```

---

## 8. 검증 체크리스트

### 8.1 스키마 검증

| # | 검증 항목 | 확인 방법 | 상태 |
|---|-----------|-----------|------|
| 1 | 테이블 생성 완료 | `\dt labdoc_demo_purified_water_*` | [ ] |
| 2 | 제약조건 적용 | `\d+ {table_name}` | [ ] |
| 3 | 인덱스 생성 | `\di *demo_pw*` | [ ] |
| 4 | 마스터 데이터 12건 | `SELECT COUNT(*) FROM test_items` | [ ] |

### 8.2 데이터 무결성 검증

| # | 검증 항목 | 검증 쿼리 | 기대값 |
|---|-----------|-----------|--------|
| 1 | 일별 일상항목 존재 | 모든 날짜에 5개 daily 항목 존재 | 0건 누락 |
| 2 | FK 무결성 | 고아 result 레코드 없음 | 0건 |
| 3 | 중복 방지 | 동일 test_date + source_file 없음 | 0건 |
| 4 | judgment 값 검증 | '적합', '부적합', 'NA' 외 값 없음 | 0건 |

### 8.3 데이터 품질 검증 쿼리

```sql
-- FK 무결성 검증
SELECT COUNT(*) AS orphan_results
FROM labdoc_demo_purified_water_test_results r
LEFT JOIN labdoc_demo_purified_water_tests t ON r.test_id = t.id
WHERE t.id IS NULL;

-- judgment 값 검증
SELECT judgment, COUNT(*)
FROM labdoc_demo_purified_water_test_results
WHERE judgment NOT IN ('적합', '부적합', 'NA')
GROUP BY judgment;

-- 일상 항목 누락 검증
WITH daily_items AS (
    SELECT item_code FROM labdoc_demo_purified_water_test_items 
    WHERE test_frequency = 'daily'
)
SELECT t.test_date, t.id, 
       COUNT(r.id) AS result_count,
       5 - COUNT(r.id) AS missing_count
FROM labdoc_demo_purified_water_tests t
LEFT JOIN labdoc_demo_purified_water_test_results r 
    ON t.id = r.test_id AND r.test_item_code IN (SELECT item_code FROM daily_items)
GROUP BY t.test_date, t.id
HAVING COUNT(r.id) < 5;

-- pH 범위 검증 (5.0 ~ 7.0)
SELECT test_date, result_numeric
FROM labdoc_demo_purified_water_test_results r
JOIN labdoc_demo_purified_water_tests t ON r.test_id = t.id
WHERE r.test_item_code = 'ph'
  AND (r.result_numeric < 5.0 OR r.result_numeric > 7.0);
```

---

## 9. 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0 | 2026-02-02 | AI | 초안 작성 |

---

## 10. 관련 문서

- ETL 매핑 문서: `11_purified_water_etl_mapping.md` (Wave 3)
- 검증 스크립트: `verify/purified_water_validation.sql` (Wave 4)
- DDL 스크립트: `ddl/purified_water_tables.sql` (Wave 2)
