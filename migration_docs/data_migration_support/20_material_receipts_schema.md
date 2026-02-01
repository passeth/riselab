# Material Receipts Schema Design

**Document ID:** 20_material_receipts_schema  
**Version:** 1.0  
**Date:** 2026-02-02  
**Status:** Design Phase (Wave 2 DDL)

---

## 1. Overview

원료입고 관리대장(Material Receipts Ledger) 데이터를 위한 물리 스키마 설계.

### 1.1 Source Data Summary

| Item | Value |
|------|-------|
| Source Files | 11개 Excel 파일 (2016-2026) |
| Sheet Structure | 월별 시트 (1월~12월) + List 시트 |
| Master Records | 822개 (List 시트 기준) |
| Suppliers | ~40개 업체 |
| Primary Key | test_no (시험번호, R2601001 형식) |

### 1.2 Design Principles

- **Soft Reference**: 외래키 제약 없이 코드로 연결 (데이터 이관 유연성)
- **Demo Namespace**: `labdoc_demo_*` prefix로 운영 데이터와 분리
- **Traceability**: source_file, source_sheet, source_row로 원본 추적

---

## 2. Table Definitions

### 2.1 labdoc_demo_suppliers (Supplier Master)

공급업체 마스터 테이블.

```sql
-- ============================================
-- Table: labdoc_demo_suppliers
-- Description: 원료 공급업체 마스터
-- ============================================
CREATE TABLE labdoc_demo_suppliers (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 공급업체명
    supplier_name varchar(100) NOT NULL,
    supplier_name_normalized varchar(100),  -- 정규화된 이름 (트림, 공백 처리)
    
    -- 메타데이터
    created_at timestamptz NOT NULL DEFAULT now(),
    
    -- 제약조건
    CONSTRAINT uq_demo_supplier_name UNIQUE (supplier_name)
);

-- 인덱스
CREATE INDEX idx_demo_suppliers_normalized ON labdoc_demo_suppliers(supplier_name_normalized);
```

#### Column Specifications

| Column | Type | Null | Default | Description |
|--------|------|------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | 고유 식별자 |
| supplier_name | varchar(100) | NO | - | 공급업체명 (원본) |
| supplier_name_normalized | varchar(100) | YES | - | 정규화된 공급업체명 |
| created_at | timestamptz | NO | now() | 생성일시 |

---

### 2.2 labdoc_demo_material_receipts (Receipt Records)

원료입고 기록 테이블.

```sql
-- ============================================
-- Table: labdoc_demo_material_receipts
-- Description: 원료입고 기록
-- ============================================
CREATE TABLE labdoc_demo_material_receipts (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 핵심 식별자
    test_no varchar(15) NOT NULL,  -- 시험번호: R2601001 형식
    
    -- 입고 정보
    receipt_date date NOT NULL,
    ingredient_code varchar(20),    -- 원료코드: MXX-NNNN (→ ingredients soft ref)
    ingredient_name text,           -- 원료명
    lot_no varchar(50),             -- Lot No (공급업체 배치번호)
    quantity_kg decimal(12,2),      -- 입고량 (kg)
    
    -- 공급업체 (soft reference)
    supplier_id uuid,               -- → labdoc_demo_suppliers.id
    supplier_name varchar(100),     -- 정규화 전 원본값 보존
    
    -- COA 참조
    coa_reference varchar(50),      -- COA 파일 위치/참조 문자열
    
    -- 비고
    remarks text,
    
    -- 원본 추적성
    source_file text,               -- 원본 파일명
    source_sheet text,              -- 시트명 ('1월', '2월' 등)
    source_row int,                 -- 원본 행번호
    
    -- 메타데이터
    created_at timestamptz NOT NULL DEFAULT now(),
    
    -- 제약조건
    CONSTRAINT uq_demo_receipt_test_no UNIQUE (test_no)
);
```

#### Column Specifications

| Column | Type | Null | Default | Description |
|--------|------|------|---------|-------------|
| id | uuid | NO | uuid_generate_v4() | 고유 식별자 |
| test_no | varchar(15) | NO | - | 시험번호 (PK, RYYMMNNN 형식) |
| receipt_date | date | NO | - | 입고일 |
| ingredient_code | varchar(20) | YES | - | 원료코드 (MXX-NNNN) |
| ingredient_name | text | YES | - | 원료명 |
| lot_no | varchar(50) | YES | - | 공급업체 Lot 번호 |
| quantity_kg | decimal(12,2) | YES | - | 입고량 (kg) |
| supplier_id | uuid | YES | - | 공급업체 ID (soft ref) |
| supplier_name | varchar(100) | YES | - | 공급업체명 (원본) |
| coa_reference | varchar(50) | YES | - | COA 참조 문자열 |
| remarks | text | YES | - | 비고 |
| source_file | text | YES | - | 원본 파일명 |
| source_sheet | text | YES | - | 원본 시트명 |
| source_row | int | YES | - | 원본 행번호 |
| created_at | timestamptz | NO | now() | 생성일시 |

---

### 2.3 labdoc_demo_ingredients (Ingredient Reference)

원료 마스터 데모 복사본 (기존 labdoc_ingredients에서 복사).

```sql
-- ============================================
-- Table: labdoc_demo_ingredients
-- Description: 원료 마스터 (데모용 복사본)
-- ============================================
CREATE TABLE labdoc_demo_ingredients (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 원료 정보
    ingredient_code varchar(20) NOT NULL,  -- MXX-NNNN 형식
    ingredient_name text,
    manufacturer text,
    origin_country text,
    
    -- 메타데이터
    created_at timestamptz NOT NULL DEFAULT now(),
    
    -- 제약조건
    CONSTRAINT uq_demo_ingredient_code UNIQUE (ingredient_code)
);

-- 기존 데이터 복사 (DDL 적용 후 실행)
-- INSERT INTO labdoc_demo_ingredients (ingredient_code, ingredient_name, manufacturer, origin_country)
-- SELECT ingredient_code, ingredient_name, manufacturer, origin_country
-- FROM labdoc_ingredients;
```

---

## 3. Indexes

```sql
-- ============================================
-- Indexes for labdoc_demo_material_receipts
-- ============================================

-- 입고일 기준 조회 (월별/기간별 조회)
CREATE INDEX idx_demo_receipts_date 
    ON labdoc_demo_material_receipts(receipt_date);

-- 원료코드 기준 조회 (원료별 입고 이력)
CREATE INDEX idx_demo_receipts_ingredient 
    ON labdoc_demo_material_receipts(ingredient_code);

-- 공급업체 기준 조회 (업체별 입고 내역)
CREATE INDEX idx_demo_receipts_supplier 
    ON labdoc_demo_material_receipts(supplier_id);

-- Lot 번호 기준 조회 (추적성)
CREATE INDEX idx_demo_receipts_lot 
    ON labdoc_demo_material_receipts(lot_no);

-- 복합 인덱스: 날짜 + 원료코드 (월별 원료 조회)
CREATE INDEX idx_demo_receipts_date_ingredient 
    ON labdoc_demo_material_receipts(receipt_date, ingredient_code);
```

---

## 4. Relationships (ERD)

```
                                    ┌─────────────────────────────────┐
                                    │   labdoc_demo_ingredients       │
                                    ├─────────────────────────────────┤
                                    │ id (PK)                         │
                                    │ ingredient_code (UQ)  ◄─────────┼─── Soft Reference
                                    │ ingredient_name                 │           │
                                    │ manufacturer                    │           │
                                    │ origin_country                  │           │
                                    └─────────────────────────────────┘           │
                                                                                  │
┌─────────────────────────────────┐                                              │
│   labdoc_demo_suppliers         │                                              │
├─────────────────────────────────┤    Soft Reference                            │
│ id (PK)  ◄──────────────────────┼────────────┐                                 │
│ supplier_name (UQ)              │            │                                 │
│ supplier_name_normalized        │            │                                 │
└─────────────────────────────────┘            │                                 │
                                               │                                 │
                                               ▼                                 │
                              ┌─────────────────────────────────────────────────────┐
                              │   labdoc_demo_material_receipts                     │
                              ├─────────────────────────────────────────────────────┤
                              │ id (PK)                                             │
                              │ test_no (UQ)                                        │
                              │ receipt_date                                        │
                              │ ingredient_code  ────────────────────────────────────┘
                              │ ingredient_name                                     │
                              │ lot_no                                              │
                              │ quantity_kg                                         │
                              │ supplier_id  ────────────────────────────────────────┘
                              │ supplier_name                                       │
                              │ coa_reference                                       │
                              │ remarks                                             │
                              │ source_file, source_sheet, source_row               │
                              └─────────────────────────────────────────────────────┘
```

### Relationship Summary

| From Table | Column | To Table | Column | Type |
|------------|--------|----------|--------|------|
| material_receipts | ingredient_code | demo_ingredients | ingredient_code | Soft (JOIN) |
| material_receipts | supplier_id | demo_suppliers | id | Soft (JOIN) |

**Why Soft Reference?**
- 데이터 이관 시 순서 유연성 (receipts 먼저 적재 가능)
- 불완전한 마스터 데이터 허용 (미등록 원료/업체)
- 데모 환경에서 FK 제약으로 인한 오류 방지

---

## 5. Data Validation Rules

### 5.1 test_no Format (시험번호)

```
Format: R[YY][MM][NNN]
- R     : 고정 prefix
- YY    : 연도 2자리 (16-26)
- MM    : 월 2자리 (01-12)
- NNN   : 순번 3자리 (001-999)

Examples:
- R1601001 (2016년 1월 첫 번째)
- R2601001 (2026년 1월 첫 번째)
- R2512125 (2025년 12월 125번째)

Validation Regex: ^R(1[6-9]|2[0-6])(0[1-9]|1[0-2])\d{3}$
```

```sql
-- CHECK 제약조건 (선택적 적용)
ALTER TABLE labdoc_demo_material_receipts
ADD CONSTRAINT chk_demo_test_no_format 
CHECK (test_no ~ '^R(1[6-9]|2[0-6])(0[1-9]|1[0-2])\d{3}$');
```

### 5.2 ingredient_code Format (원료코드)

```
Format: M[XX]-[NNNN]
- M     : 고정 prefix
- XX    : 카테고리 코드 (2자리, 영문 대문자)
- NNNN  : 순번 (3-4자리)

Examples:
- MAS-0001
- MET-0123
- MAQ-001

Validation Regex: ^M[A-Z]{2}-\d{3,4}$
```

### 5.3 quantity_kg (입고량)

```
- 양수 값만 허용
- 최대 12자리, 소수점 2자리
- 일반 범위: 0.01 ~ 999999.99 kg
```

---

## 6. Supplier Normalization Rules

### 6.1 Normalization Algorithm

```python
def normalize_supplier_name(name: str) -> str:
    """공급업체명 정규화"""
    if not name:
        return None
    
    # 1. 앞뒤 공백 제거
    normalized = name.strip()
    
    # 2. 연속 공백을 단일 공백으로
    normalized = ' '.join(normalized.split())
    
    # 3. 괄호 내용 표준화 (선택)
    # '(주)' → '(주)', '주)' → '(주)'
    
    # 4. 대소문자 통일 (영문의 경우)
    # normalized = normalized.upper()
    
    return normalized
```

### 6.2 Common Variations

| Original | Normalized |
|----------|------------|
| " 한국화장품 " | "한국화장품" |
| "(주)대한원료" | "(주)대한원료" |
| "대한원료(주)" | "대한원료(주)" |
| "ABC   Trading" | "ABC Trading" |

---

## 7. Migration Checklist

### 7.1 Pre-Migration (Wave 2)

- [ ] DDL 스크립트 생성
- [ ] 테스트 환경에서 테이블 생성
- [ ] 인덱스 생성 확인
- [ ] 제약조건 동작 확인

### 7.2 Data Loading (Wave 3)

- [ ] Supplier 마스터 적재 (40개 업체)
- [ ] Ingredient 복사본 생성 (labdoc_ingredients → demo)
- [ ] Receipt 데이터 적재 (월별 시트)
- [ ] test_no 중복 검사
- [ ] 원본 추적 정보 확인 (source_*)

### 7.3 Post-Migration Validation

- [ ] 레코드 수 검증 (예상: ~822건 기준)
- [ ] supplier_id 매핑률 확인
- [ ] ingredient_code 매핑률 확인
- [ ] 날짜 범위 검증 (2016-2026)
- [ ] null 허용 컬럼 분포 확인

---

## 8. Sample Queries

### 8.1 Monthly Receipt Summary

```sql
-- 월별 입고 통계
SELECT 
    date_trunc('month', receipt_date) AS month,
    COUNT(*) AS receipt_count,
    COUNT(DISTINCT ingredient_code) AS unique_ingredients,
    SUM(quantity_kg) AS total_kg
FROM labdoc_demo_material_receipts
GROUP BY date_trunc('month', receipt_date)
ORDER BY month DESC;
```

### 8.2 Supplier Analysis

```sql
-- 공급업체별 입고 현황
SELECT 
    s.supplier_name,
    COUNT(r.id) AS receipt_count,
    SUM(r.quantity_kg) AS total_kg,
    MIN(r.receipt_date) AS first_receipt,
    MAX(r.receipt_date) AS last_receipt
FROM labdoc_demo_material_receipts r
LEFT JOIN labdoc_demo_suppliers s ON r.supplier_id = s.id
GROUP BY s.supplier_name
ORDER BY receipt_count DESC;
```

### 8.3 Ingredient Traceability

```sql
-- 원료별 입고 이력 (추적성)
SELECT 
    r.receipt_date,
    r.test_no,
    r.lot_no,
    r.quantity_kg,
    r.supplier_name,
    r.coa_reference
FROM labdoc_demo_material_receipts r
WHERE r.ingredient_code = 'MET-0001'
ORDER BY r.receipt_date DESC;
```

### 8.4 Join with Ingredients

```sql
-- 원료 정보와 함께 조회 (soft reference join)
SELECT 
    r.test_no,
    r.receipt_date,
    r.ingredient_code,
    i.ingredient_name,
    i.manufacturer,
    r.quantity_kg,
    r.lot_no
FROM labdoc_demo_material_receipts r
LEFT JOIN labdoc_demo_ingredients i 
    ON r.ingredient_code = i.ingredient_code
WHERE r.receipt_date >= '2025-01-01';
```

---

## 9. Appendix

### A. Source Field Mapping

| Excel Column | DB Column | Transform |
|--------------|-----------|-----------|
| 입고일 | receipt_date | Excel date → DATE |
| 원료코드 | ingredient_code | TRIM |
| 원료명 | ingredient_name | TRIM |
| Lot No | lot_no | TRIM, VARCHAR |
| 입고량(kg) | quantity_kg | DECIMAL(12,2) |
| 공급처 | supplier_name | TRIM |
| COA유무 | coa_reference | VARCHAR |
| 시험번호 | test_no | TRIM, validate format |
| 비고 | remarks | TEXT |

### B. File Metadata

| Column | Value |
|--------|-------|
| source_file | 원료입고 관리대장(YYYY).xls |
| source_sheet | 1월, 2월, ..., 12월, List |
| source_row | Excel 행번호 (1-based) |

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-02 | System | Initial schema design |
