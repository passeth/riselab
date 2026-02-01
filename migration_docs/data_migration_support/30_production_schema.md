# 반완제품관리대장 물리 스키마 설계서

## 1. 개요

### 1.1 문서 목적
반완제품관리대장 Excel 데이터를 Supabase PostgreSQL로 마이그레이션하기 위한 물리 스키마 설계 문서

### 1.2 데이터 소스
| 항목 | 내용 |
|------|------|
| 파일 수 | 6개 (2021-2026) |
| 시트 구성 | 반완제품(벌크), 완제품, OEM, 양식 |
| 데이터 범위 | 2021년 ~ 2026년 생산 기록 |

### 1.3 테이블 네이밍 규칙
- 접두사: `labdoc_demo_` (데모용 독립 스키마)
- 실 운영 테이블과 분리하여 마이그레이션 검증 용이

---

## 2. 테이블 설계

### 2.1 labdoc_demo_production_batches (벌크/반제품 생산)

벌크(반완제품) 생산 배치 기록. 원료 → 벌크 제조 단계의 품질 및 생산 정보 관리.

```sql
CREATE TABLE labdoc_demo_production_batches (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- =============================================
    -- 핵심 식별자
    -- =============================================
    semi_test_no varchar(15) NOT NULL,  -- 반제품시험번호: B2601001 형식 (PK 역할)
    
    -- =============================================
    -- 제품 정보 (Soft Reference → products)
    -- =============================================
    product_code varchar(20),           -- B CODE: 벌크 제품코드
    lot_no varchar(30) NOT NULL,        -- LOT: 배치번호 (B6001, S6001 등)
    
    -- =============================================
    -- 제조 정보
    -- =============================================
    manufacturing_date date,            -- 제조일
    approval_date date,                 -- 제조판정일 (품질 승인)
    quantity_kg decimal(12,2),          -- 제조량(kg)
    functionality int DEFAULT 0,        -- 기능성 여부 (0/1)
    
    -- =============================================
    -- 품질 측정값
    -- =============================================
    ph_value decimal(5,2),              -- pH 측정값
    ph_standard varchar(30),            -- pH 기준 (예: 6.00 +/- 1.00)
    viscosity decimal(12,2),            -- 점,경도 측정값
    viscosity_standard varchar(30),     -- 점,경도 기준
    specific_gravity decimal(6,4),      -- 비중 측정값
    gravity_standard decimal(6,4),      -- 비중 기준
    
    -- =============================================
    -- 포장 정보 (완제품 연결)
    -- =============================================
    finished_product_code varchar(20),  -- P CODE: 완제품 코드
    finished_test_no varchar(15),       -- 완제품시험번호: P2601001 형식
    production_date date,               -- 생산일 (포장)
    production_approval_date date,      -- 생산판정일 (포장 승인)
    actual_quantity_ea int,             -- 실생산량(ea)
    theoretical_quantity_ea decimal(12,2), -- 이론 생산량
    packaging_yield decimal(6,2),       -- 포장수율(%)
    actual_fill_volume decimal(10,2),   -- 실제 충전량
    
    -- =============================================
    -- 관리 필드
    -- =============================================
    managed_item int DEFAULT 0,         -- 관리 항목 플래그
    remarks text,                       -- 비고
    
    -- =============================================
    -- 추적성 (Traceability)
    -- =============================================
    source_file text,                   -- 원본 파일명
    source_sheet text,                  -- 원본 시트명
    source_row int,                     -- 원본 행 번호
    created_at timestamptz NOT NULL DEFAULT now(),
    
    -- =============================================
    -- 제약조건
    -- =============================================
    CONSTRAINT uq_demo_batch_semi_test UNIQUE (semi_test_no)
);

COMMENT ON TABLE labdoc_demo_production_batches IS '벌크/반제품 생산 배치 기록';
COMMENT ON COLUMN labdoc_demo_production_batches.semi_test_no IS '반제품시험번호 (B + 년도2자리 + 순번5자리)';
COMMENT ON COLUMN labdoc_demo_production_batches.product_code IS 'B CODE - 벌크 제품 코드 (products 테이블 참조)';
COMMENT ON COLUMN labdoc_demo_production_batches.finished_test_no IS '완제품시험번호 - finished_batches와 연결';
```

#### 컬럼 상세

| 컬럼명 | 타입 | NULL | 설명 | Excel 원본 |
|--------|------|------|------|------------|
| semi_test_no | varchar(15) | NOT NULL | 반제품시험번호 | 반제품시험번호 |
| product_code | varchar(20) | NULL | 벌크 제품코드 | B CODE |
| lot_no | varchar(30) | NOT NULL | 배치번호 | LOT |
| manufacturing_date | date | NULL | 제조일 | 제조일 |
| approval_date | date | NULL | 품질승인일 | 제조판정일 |
| quantity_kg | decimal(12,2) | NULL | 생산량 kg | 제조량(kg) |
| functionality | int | NULL | 기능성 0/1 | 기능성 |
| ph_value | decimal(5,2) | NULL | pH | pH |
| viscosity | decimal(12,2) | NULL | 점도/경도 | 점,경도 |
| specific_gravity | decimal(6,4) | NULL | 비중 | 비중 |
| finished_product_code | varchar(20) | NULL | 완제품코드 | P CODE |
| finished_test_no | varchar(15) | NULL | 완제품시험번호 | 완제품시험번호 |
| production_date | date | NULL | 포장생산일 | 생산일 |
| actual_quantity_ea | int | NULL | 실제수량 | 실생산량(ea) |
| packaging_yield | decimal(6,2) | NULL | 수율 % | 포장수율(%) |

---

### 2.2 labdoc_demo_finished_batches (완제품 생산)

완제품 생산 배치 기록. 벌크 → 포장(완제품) 단계의 품질 및 생산 정보 관리.

```sql
CREATE TABLE labdoc_demo_finished_batches (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- =============================================
    -- 핵심 식별자
    -- =============================================
    finished_test_no varchar(15) NOT NULL,  -- 완제품시험번호: P2601001 형식 (PK 역할)
    
    -- =============================================
    -- 제품 정보 (Soft Reference → products)
    -- =============================================
    product_code varchar(20),               -- P CODE: 완제품 코드
    lot_no varchar(30) NOT NULL,            -- LOT: 배치번호
    
    -- =============================================
    -- 생산 정보
    -- =============================================
    production_date date,                   -- 생산일 (포장일)
    approval_date date,                     -- 생산판정일 (승인일)
    actual_quantity_ea int,                 -- 실생산량(ea)
    average_volume decimal(10,2),           -- 평균용량 (ml)
    
    -- =============================================
    -- 품질 측정값
    -- =============================================
    ph_value decimal(5,2),                  -- pH 측정값
    
    -- =============================================
    -- 원본 벌크 정보
    -- =============================================
    bulk_manufacturing_date date,           -- 제조일 (벌크 원본)
    
    -- =============================================
    -- 반제품 연결
    -- =============================================
    semi_test_no varchar(15),               -- 반제품시험번호 (→ production_batches)
    
    -- =============================================
    -- 기타 필드
    -- =============================================
    theoretical_quantity_ea decimal(12,2),  -- 이론 생산량
    packaging_yield decimal(6,2),           -- 포장수율(%)
    actual_fill_volume decimal(10,2),       -- 실제 충전량
    managed_item int DEFAULT 0,             -- 관리 항목 플래그
    remarks text,                           -- 비고
    
    -- =============================================
    -- 추적성 (Traceability)
    -- =============================================
    source_file text,
    source_sheet text,
    source_row int,
    created_at timestamptz NOT NULL DEFAULT now(),
    
    -- =============================================
    -- 제약조건
    -- =============================================
    CONSTRAINT uq_demo_finished_test UNIQUE (finished_test_no)
);

COMMENT ON TABLE labdoc_demo_finished_batches IS '완제품 생산 배치 기록';
COMMENT ON COLUMN labdoc_demo_finished_batches.finished_test_no IS '완제품시험번호 (P + 년도2자리 + 순번5자리)';
COMMENT ON COLUMN labdoc_demo_finished_batches.semi_test_no IS '반제품시험번호 - production_batches와 연결';
```

#### 컬럼 상세

| 컬럼명 | 타입 | NULL | 설명 | Excel 원본 |
|--------|------|------|------|------------|
| finished_test_no | varchar(15) | NOT NULL | 완제품시험번호 | 완제품시험번호 |
| product_code | varchar(20) | NULL | 완제품 코드 | P CODE |
| lot_no | varchar(30) | NOT NULL | 배치번호 | LOT |
| production_date | date | NULL | 포장일 | 생산일 |
| approval_date | date | NULL | 승인일 | 생산판정일 |
| actual_quantity_ea | int | NULL | 생산수량 | 실생산량(ea) |
| average_volume | decimal(10,2) | NULL | 평균용량 ml | 평균용량 |
| ph_value | decimal(5,2) | NULL | pH | pH |
| bulk_manufacturing_date | date | NULL | 벌크제조일 | 제조일 |
| semi_test_no | varchar(15) | NULL | 반제품시험번호 | (매칭 로직) |

---

### 2.3 labdoc_demo_oem_products (OEM 입고)

OEM 위탁생산 제품 입고 기록.

```sql
CREATE TABLE labdoc_demo_oem_products (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- =============================================
    -- 제품 정보
    -- =============================================
    product_code varchar(20),               -- P CODE: 제품코드
    product_name text,                      -- 제품명
    lot_no varchar(30),                     -- LOT: 배치번호
    
    -- =============================================
    -- 입고 정보
    -- =============================================
    receiving_date date,                    -- 입고일
    approval_date date,                     -- 판정일
    received_quantity_ea int,               -- 입고수량(ea)
    
    -- =============================================
    -- 품질 정보
    -- =============================================
    finished_test_no varchar(15),           -- 완제품시험번호 (있는 경우)
    ph_value decimal(5,2),                  -- pH 측정값
    
    -- =============================================
    -- 관리 필드
    -- =============================================
    managed_item int DEFAULT 0,
    remarks text,
    
    -- =============================================
    -- 추적성 (Traceability)
    -- =============================================
    source_file text,
    source_sheet text,
    source_row int,
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE labdoc_demo_oem_products IS 'OEM 위탁생산 제품 입고 기록';
COMMENT ON COLUMN labdoc_demo_oem_products.product_name IS '제품명 - OEM 시트에서만 존재';
COMMENT ON COLUMN labdoc_demo_oem_products.receiving_date IS '입고일 - OEM 제품의 입고 날짜';
```

#### 컬럼 상세

| 컬럼명 | 타입 | NULL | 설명 | Excel 원본 |
|--------|------|------|------|------------|
| product_code | varchar(20) | NULL | 제품코드 | P CODE |
| product_name | text | NULL | 제품명 | 제품명 |
| lot_no | varchar(30) | NULL | 배치번호 | LOT |
| receiving_date | date | NULL | 입고일 | 입고일 |
| received_quantity_ea | int | NULL | 입고수량 | 입고수량(ea) |
| finished_test_no | varchar(15) | NULL | 완제품시험번호 | 완제품시험번호 |
| ph_value | decimal(5,2) | NULL | pH | pH |

---

### 2.4 labdoc_demo_products (제품 마스터 복사본)

제품 마스터 데이터의 데모용 복사본. 마이그레이션 시 참조 무결성 검증용.

```sql
CREATE TABLE labdoc_demo_products (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_code varchar(20) UNIQUE NOT NULL,
    korean_name text,
    english_name text,
    management_code varchar(20),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 기존 products 테이블에서 데이터 복사
INSERT INTO labdoc_demo_products (product_code, korean_name, english_name, management_code)
SELECT product_code, korean_name, english_name, management_code
FROM labdoc_products;

COMMENT ON TABLE labdoc_demo_products IS '제품 마스터 데모용 복사본';
```

---

## 3. 테이블 관계도

```
+----------------------------------+
|  labdoc_demo_products            |
|  (제품 마스터)                    |
+----------------------------------+
| product_code (PK)                |
| korean_name                      |
| english_name                     |
| management_code                  |
+----------------------------------+
           ^
           | (Soft Reference)
           |
+----------------------------------+        +----------------------------------+
|  labdoc_demo_production_batches  |        |  labdoc_demo_finished_batches    |
|  (벌크/반제품 생산)               |        |  (완제품 생산)                    |
+----------------------------------+        +----------------------------------+
| semi_test_no (UK) ---------------+------> | semi_test_no                     |
| product_code ~~~~~~~~~~~~~~~~~~~~|        | finished_test_no (UK)            |
| lot_no                           |        | product_code ~~~~~~~~~~~~~~~~~~~~|
| manufacturing_date               |        | lot_no                           |
| approval_date                    |        | production_date                  |
| quantity_kg                      |        | approval_date                    |
| ph_value, viscosity, ...         |        | actual_quantity_ea               |
|                                  |        | average_volume                   |
| finished_product_code            |        | ph_value                         |
| finished_test_no ----------------+------> | bulk_manufacturing_date          |
| production_date                  |        +----------------------------------+
| actual_quantity_ea               |
| packaging_yield                  |
+----------------------------------+

+----------------------------------+
|  labdoc_demo_oem_products        |
|  (OEM 입고)                       |
+----------------------------------+
| product_code ~~~~~~~~~~~~~~~~~~~~|  (Soft Reference to products)
| product_name                     |
| lot_no                           |
| receiving_date                   |
| received_quantity_ea             |
| finished_test_no                 |
+----------------------------------+

[범례]
  -----> : 논리적 연결 (매칭 관계)
  ~~~~~> : Soft Reference (FK 없음)
  (UK)   : Unique Key
  (PK)   : Primary Key
```

### 3.1 매칭 관계

| 연결 유형 | From Table | To Table | 연결 컬럼 | 설명 |
|-----------|------------|----------|-----------|------|
| 벌크→완제품 | production_batches | finished_batches | finished_test_no | 벌크에서 포장된 완제품 |
| 완제품→벌크 | finished_batches | production_batches | semi_test_no | 완제품의 원본 벌크 |
| 제품참조 | production_batches | products | product_code | B CODE 참조 |
| 제품참조 | finished_batches | products | product_code | P CODE 참조 |
| 제품참조 | oem_products | products | product_code | P CODE 참조 |

---

## 4. 인덱스 설계

### 4.1 production_batches 인덱스

```sql
-- 제품코드 검색 (빈번한 조회)
CREATE INDEX idx_demo_batches_product 
    ON labdoc_demo_production_batches(product_code);

-- LOT 번호 검색 (추적성)
CREATE INDEX idx_demo_batches_lot 
    ON labdoc_demo_production_batches(lot_no);

-- 제조일 기준 조회 (날짜 범위)
CREATE INDEX idx_demo_batches_mfg_date 
    ON labdoc_demo_production_batches(manufacturing_date);

-- 완제품 시험번호 연결 (조인 최적화)
CREATE INDEX idx_demo_batches_finished 
    ON labdoc_demo_production_batches(finished_test_no);
```

### 4.2 finished_batches 인덱스

```sql
-- 제품코드 검색
CREATE INDEX idx_demo_finished_product 
    ON labdoc_demo_finished_batches(product_code);

-- LOT 번호 검색
CREATE INDEX idx_demo_finished_lot 
    ON labdoc_demo_finished_batches(lot_no);

-- 반제품 시험번호 연결 (조인 최적화)
CREATE INDEX idx_demo_finished_semi 
    ON labdoc_demo_finished_batches(semi_test_no);

-- 생산일 기준 조회
CREATE INDEX idx_demo_finished_prod_date 
    ON labdoc_demo_finished_batches(production_date);
```

### 4.3 oem_products 인덱스

```sql
-- 제품코드 검색
CREATE INDEX idx_demo_oem_product 
    ON labdoc_demo_oem_products(product_code);

-- 입고일 기준 조회
CREATE INDEX idx_demo_oem_date 
    ON labdoc_demo_oem_products(receiving_date);
```

---

## 5. 시험번호 형식

### 5.1 반제품시험번호 (Semi Test No.)

| 구성 | 설명 | 예시 |
|------|------|------|
| 접두사 | B (Bulk) | B |
| 년도 | 2자리 | 26 (2026년) |
| 순번 | 5자리 | 01001 |
| **전체** | B + 년도 + 순번 | **B2601001** |

### 5.2 완제품시험번호 (Finished Test No.)

| 구성 | 설명 | 예시 |
|------|------|------|
| 접두사 | P (Product) | P |
| 년도 | 2자리 | 26 (2026년) |
| 순번 | 5자리 | 01001 |
| **전체** | P + 년도 + 순번 | **P2601001** |

### 5.3 시험번호 추출 정규식

```sql
-- 반제품시험번호 패턴 검증
CHECK (semi_test_no ~ '^B[0-9]{7}$')

-- 완제품시험번호 패턴 검증
CHECK (finished_test_no ~ '^P[0-9]{7}$')
```

---

## 6. 매칭 검증 쿼리

### 6.1 벌크-완제품 매칭 현황 (예상 33개)

```sql
-- 양방향 매칭 검증: 반제품 → 완제품
SELECT 
    pb.semi_test_no AS "반제품시험번호",
    pb.finished_test_no AS "벌크측_완제품번호",
    fb.finished_test_no AS "완제품측_시험번호",
    fb.semi_test_no AS "완제품측_반제품번호",
    CASE 
        WHEN pb.finished_test_no = fb.finished_test_no THEN 'Matched'
        WHEN pb.semi_test_no = fb.semi_test_no THEN 'Reverse-Matched'
        ELSE 'Partial'
    END AS match_type
FROM labdoc_demo_production_batches pb
JOIN labdoc_demo_finished_batches fb 
    ON pb.finished_test_no = fb.finished_test_no
    OR pb.semi_test_no = fb.semi_test_no;
```

### 6.2 매칭 통계 쿼리

```sql
-- 매칭 현황 요약
SELECT 
    'production_batches' AS source,
    COUNT(*) AS total_records,
    COUNT(finished_test_no) AS has_finished_link,
    COUNT(*) - COUNT(finished_test_no) AS no_finished_link
FROM labdoc_demo_production_batches

UNION ALL

SELECT 
    'finished_batches' AS source,
    COUNT(*) AS total_records,
    COUNT(semi_test_no) AS has_semi_link,
    COUNT(*) - COUNT(semi_test_no) AS no_semi_link
FROM labdoc_demo_finished_batches;
```

### 6.3 고아 레코드 검출

```sql
-- 완제품 시험번호가 있지만 finished_batches에 없는 경우
SELECT pb.semi_test_no, pb.finished_test_no
FROM labdoc_demo_production_batches pb
WHERE pb.finished_test_no IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM labdoc_demo_finished_batches fb
      WHERE fb.finished_test_no = pb.finished_test_no
  );

-- 반제품 시험번호가 있지만 production_batches에 없는 경우
SELECT fb.finished_test_no, fb.semi_test_no
FROM labdoc_demo_finished_batches fb
WHERE fb.semi_test_no IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM labdoc_demo_production_batches pb
      WHERE pb.semi_test_no = fb.semi_test_no
  );
```

---

## 7. 검증 체크리스트

### 7.1 스키마 검증

| # | 항목 | 검증 방법 | 기대값 |
|---|------|-----------|--------|
| 1 | 테이블 생성 | `\dt labdoc_demo_*` | 4개 테이블 |
| 2 | UK 제약조건 | `\d labdoc_demo_production_batches` | semi_test_no UNIQUE |
| 3 | UK 제약조건 | `\d labdoc_demo_finished_batches` | finished_test_no UNIQUE |
| 4 | 인덱스 생성 | `\di idx_demo_*` | 9개 인덱스 |

### 7.2 데이터 무결성 검증

| # | 항목 | 검증 쿼리 | 기대값 |
|---|------|-----------|--------|
| 1 | 중복 반제품번호 | `SELECT semi_test_no, COUNT(*) FROM ... GROUP BY ... HAVING COUNT(*) > 1` | 0건 |
| 2 | 중복 완제품번호 | `SELECT finished_test_no, COUNT(*) FROM ... GROUP BY ... HAVING COUNT(*) > 1` | 0건 |
| 3 | 매칭 레코드 수 | 6.1 쿼리 실행 | 33건 |
| 4 | NULL LOT 없음 | `SELECT COUNT(*) WHERE lot_no IS NULL` | 0건 |

### 7.3 참조 무결성 검증

| # | 항목 | 검증 쿼리 | 조치 |
|---|------|-----------|------|
| 1 | 존재하지 않는 B CODE | `SELECT DISTINCT product_code FROM pb WHERE NOT EXISTS (...)` | 리포트 |
| 2 | 존재하지 않는 P CODE | `SELECT DISTINCT product_code FROM fb WHERE NOT EXISTS (...)` | 리포트 |
| 3 | 양방향 매칭 일관성 | `pb.finished_test_no ↔ fb.finished_test_no` | 동기화 확인 |

### 7.4 ETL 후 검증

```sql
-- 전체 레코드 수 검증
SELECT 
    (SELECT COUNT(*) FROM labdoc_demo_production_batches) AS bulk_count,
    (SELECT COUNT(*) FROM labdoc_demo_finished_batches) AS finished_count,
    (SELECT COUNT(*) FROM labdoc_demo_oem_products) AS oem_count;

-- 연도별 분포 검증
SELECT 
    EXTRACT(YEAR FROM manufacturing_date) AS year,
    COUNT(*) AS batch_count
FROM labdoc_demo_production_batches
WHERE manufacturing_date IS NOT NULL
GROUP BY EXTRACT(YEAR FROM manufacturing_date)
ORDER BY year;
```

---

## 8. 마이그레이션 일정

| Wave | 단계 | 내용 | 상태 |
|------|------|------|------|
| Wave 1 | 스키마 설계 | 본 문서 작성 | **완료** |
| Wave 2 | DDL 실행 | 테이블/인덱스 생성 | 예정 |
| Wave 3 | ETL 개발 | Excel → DB 변환 로직 | 예정 |
| Wave 4 | 검증 | 데이터 정합성 확인 | 예정 |

---

## 9. 참고사항

### 9.1 Soft Reference 사용 이유
- Foreign Key 제약조건 없이 유연한 데이터 적재
- 마이그레이션 시 순서 독립성 확보
- 누락된 마스터 데이터 허용 (리포트로 처리)

### 9.2 추적성 컬럼
모든 테이블에 `source_file`, `source_sheet`, `source_row` 컬럼 포함:
- 원본 Excel 파일 역추적 가능
- 데이터 오류 시 원인 파악 용이
- 감사(Audit) 목적 대응

### 9.3 시험번호 형식 예외
- 일부 과거 데이터에서 형식이 다를 수 있음
- ETL 단계에서 정규화 또는 예외 처리 필요

---

*문서 작성일: 2026-02-02*
*버전: 1.0*
