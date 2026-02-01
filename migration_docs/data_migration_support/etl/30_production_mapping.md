# 반완제품 ETL 매핑 정의 (Production ETL Mapping)

본 문서는 반완제품관리대장 Excel 파일에서 추출한 데이터를 Supabase 테이블로 마이그레이션하는 ETL 매핑 규칙을 정의합니다.

---

## 1. 소스 파일 정보

### 1.1 파일 위치 및 패턴
```
위치: migration_docs/서식 샘플/반완제품관리대장/
패턴: 반완제품관리대장(YYYY).xlsx
연도: 2021, 2022, 2023, 2024, 2025, 2026
파일 수: 6개
```

### 1.2 파일 목록
| 파일명 | 반완제품 | 완제품 | OEM |
|--------|----------|--------|-----|
| 반완제품관리대장(2021).xlsx | 1,386 | 1,352 | 100 |
| 반완제품관리대장(2022).xlsx | 1,324 | 1,320 | 96 |
| 반완제품관리대장(2023).xlsx | 1,401 | 1,415 | 42 |
| 반완제품관리대장(2024).xlsx | 1,019 | 1,004 | 25 |
| 반완제품관리대장(2025).xlsx | 1,158 | 1,157 | 41 |
| 반완제품관리대장(2026).xlsx | 48 | 59 | 3 |
| **합계** | **6,336** | **6,307** | **307** |

### 1.3 시트 구조
| 시트명 패턴 | 타겟 테이블 | 헤더 행 | 처리 |
|-------------|-------------|---------|------|
| `YYYY-반완제품` | `labdoc_demo_production_batches` | Row 1 | 처리 |
| `YYYY-완제품` | `labdoc_demo_finished_batches` | Row 0 | 처리 |
| `YYYY-OEM` 또는 `OEM_YYYY` | `labdoc_demo_oem_products` | Row 2 | 처리 |
| `양식` | - | - | **스킵** |
| `Sheet1`, `Sheet2` | - | - | **스킵** |
| `동방코스메틱` | - | - | **스킵** |

> **NOTE**: OEM 시트 이름이 연도별로 다름
> - 2021: `OEM_2021`
> - 2022~2026: `YYYY-OEM`

---

## 2. 반완제품 시트 매핑 (production_batches)

### 2.1 타겟 테이블
```sql
labdoc_demo_production_batches
```

### 2.2 컬럼 매핑
| Excel 컬럼 | Excel 헤더 | DB 컬럼 | 데이터 타입 | 변환 규칙 | 필수 |
|------------|-----------|---------|-------------|-----------|------|
| A | B CODE | `product_code` | varchar(20) | TRIM | N |
| B | LOT | `lot_no` | varchar(30) | TRIM | **Y** |
| C | 제조일 | `manufacturing_date` | date | PARSE_DATE | N |
| D | 제조판정일 | `approval_date` | date | PARSE_DATE | N |
| E | 제조량(kg) | `quantity_kg` | decimal(12,2) | TO_DECIMAL | N |
| F | 반제품시험번호 | `semi_test_no` | varchar(15) | TRIM | **Y (PK)** |
| G | 기능성 | `functionality` | int | TO_INT (0/1) | N |
| H | P CODE | `finished_product_code` | varchar(20) | TRIM | N |
| I | 생산일 | `production_date` | date | PARSE_DATE | N |
| J | 생산판정일 | `production_approval_date` | date | PARSE_DATE | N |
| K | 실생산량(ea) | `actual_quantity_ea` | int | TO_INT | N |
| L | 평균용량 | - | - | **스킵** | - |
| M | 완제품시험번호 | `finished_test_no` | varchar(15) | TRIM | N |
| N | PH | `ph_value` | decimal(5,2) | TO_DECIMAL | N |
| O | 점,경도 | `viscosity` | decimal(12,2) | TO_DECIMAL | N |
| P | 비중 | `specific_gravity` | decimal(6,4) | TO_DECIMAL | N |
| Q | 관리품 | `managed_item` | int | TO_INT (0/1) | N |
| R | 비고 | `remarks` | text | TRIM | N |
| S | 이론생산량(ea) | `theoretical_quantity_ea` | decimal(12,2) | TO_DECIMAL | N |
| T | 포장수율(%) | `packaging_yield` | decimal(6,2) | TO_DECIMAL | N |
| U | (Unnamed) | - | - | **스킵** | - |
| V | pH기준 | `ph_standard` | varchar(30) | TRIM | N |
| W | 점,경도기준 | `viscosity_standard` | varchar(30) | TRIM | N |
| X | 비중기준 | `gravity_standard` | decimal(6,4) | TO_DECIMAL | N |
| Y | 실충진량 | `actual_fill_volume` | decimal(10,2) | TO_DECIMAL | N |

### 2.3 추적성 컬럼 (자동 생성)
| DB 컬럼 | 값 예시 |
|---------|--------|
| `source_file` | `"반완제품관리대장(2026).xlsx"` |
| `source_sheet` | `"2026-반완제품"` |
| `source_row` | `5` (Excel 행 번호, 1-based) |

### 2.4 샘플 데이터
```json
{
  "product_code": "BTBC009",
  "lot_no": "B6003",
  "manufacturing_date": "2026-01-05",
  "approval_date": "2026-01-06",
  "quantity_kg": 1000.00,
  "semi_test_no": "B2601006",
  "functionality": 0,
  "finished_product_code": "BTBC009",
  "production_date": null,
  "production_approval_date": null,
  "actual_quantity_ea": null,
  "finished_test_no": null,
  "ph_value": 6.16,
  "viscosity": 7500.00,
  "specific_gravity": null,
  "managed_item": null,
  "remarks": null,
  "theoretical_quantity_ea": 1020.41,
  "packaging_yield": null,
  "ph_standard": "6.00 +/- 1.00",
  "viscosity_standard": "7,000 +/- 2,500",
  "gravity_standard": 0.98,
  "actual_fill_volume": 980.00,
  "source_file": "반완제품관리대장(2026).xlsx",
  "source_sheet": "2026-반완제품",
  "source_row": 7
}
```

---

## 3. 완제품 시트 매핑 (finished_batches)

### 3.1 타겟 테이블
```sql
labdoc_demo_finished_batches
```

### 3.2 컬럼 매핑
| Excel 컬럼 | Excel 헤더 | DB 컬럼 | 데이터 타입 | 변환 규칙 | 필수 |
|------------|-----------|---------|-------------|-----------|------|
| A | P CODE | `product_code` | varchar(20) | TRIM | N |
| B | LOT | `lot_no` | varchar(30) | TRIM | **Y** |
| C | 생산일 | `production_date` | date | PARSE_DATE | N |
| D | 생산판정일 | `approval_date` | date | PARSE_DATE | N |
| E | 실생산량(ea) | `actual_quantity_ea` | int | TO_INT | N |
| F | 평균용량 | `average_volume` | decimal(10,2) | TO_DECIMAL | N |
| G | 완제품시험번호 | `finished_test_no` | varchar(15) | TRIM | **Y (PK)** |
| H | PH | `ph_value` | decimal(5,2) | TO_DECIMAL | N |
| I | 관리품 | `managed_item` | int | TO_INT (0/1) | N |
| J | 비고 | `remarks` | text | TRIM/TO_INT* | N |
| K | 제조일 | `bulk_manufacturing_date` | date | PARSE_DATE | N |
| L | 이론생산량(ea) | `theoretical_quantity_ea` | decimal(12,2) | TO_DECIMAL | N |
| M | 포장수율(%) | `packaging_yield` | decimal(6,2) | TO_DECIMAL | N |
| N | (Unnamed) | - | - | **스킵** | - |
| O | 실충진량 | `actual_fill_volume` | decimal(10,2) | TO_DECIMAL | N |

> **NOTE**: `비고` 컬럼이 숫자(0)인 경우도 있음. 문자열로 변환 권장.

### 3.3 추적성 컬럼 (자동 생성)
| DB 컬럼 | 값 예시 |
|---------|--------|
| `source_file` | `"반완제품관리대장(2026).xlsx"` |
| `source_sheet` | `"2026-완제품"` |
| `source_row` | `3` |

### 3.4 샘플 데이터
```json
{
  "product_code": "FJCRT02",
  "lot_no": "C5259",
  "production_date": "2026-01-02",
  "approval_date": "2026-01-05",
  "actual_quantity_ea": 2298,
  "average_volume": 100.00,
  "finished_test_no": "P2601006",
  "ph_value": 6.61,
  "managed_item": 1,
  "remarks": "0",
  "bulk_manufacturing_date": "2025-12-26",
  "theoretical_quantity_ea": 7250.00,
  "packaging_yield": 31.70,
  "actual_fill_volume": 100.00,
  "source_file": "반완제품관리대장(2026).xlsx",
  "source_sheet": "2026-완제품",
  "source_row": 7
}
```

---

## 4. OEM 시트 매핑 (oem_products)

### 4.1 타겟 테이블
```sql
labdoc_demo_oem_products
```

### 4.2 컬럼 매핑
| Excel 컬럼 | Excel 헤더 | DB 컬럼 | 데이터 타입 | 변환 규칙 | 필수 |
|------------|-----------|---------|-------------|-----------|------|
| A | P CODE | `product_code` | varchar(20) | TRIM | N |
| B | LOT | `lot_no` | varchar(30) | TRIM | N |
| C | 제품명 | `product_name` | text | TRIM | N |
| D | 입고일 | `receiving_date` | date | PARSE_DATE | N |
| E | 생산판정일 | `approval_date` | date | PARSE_DATE | N |
| F | 입고수량(ea) | `received_quantity_ea` | int | TO_INT | N |
| G | 완제품시험번호 | `finished_test_no` | varchar(15) | TRIM | N |
| H | PH | `ph_value` | decimal(5,2)** | PARSE_PH | N |
| I | 관리품 | `managed_item` | int | TO_INT (0/1) | N |
| J | 비고 | `remarks` | text | TRIM | N |

> **NOTE**: OEM 시트의 PH 컬럼에 기준값(예: "6.0 +/- 1.0")이 들어있는 경우 있음. 파싱 주의.

### 4.3 PH 값 파싱 규칙 (PARSE_PH)
```python
def parse_ph(value):
    if pd.isna(value):
        return None
    # "6.0 +/- 1.0" 형식인 경우 NULL 처리 (기준값)
    if isinstance(value, str) and ('+/-' in value or '±' in value):
        return None
    try:
        return float(value)
    except:
        return None
```

### 4.4 추적성 컬럼 (자동 생성)
| DB 컬럼 | 값 예시 |
|---------|--------|
| `source_file` | `"반완제품관리대장(2026).xlsx"` |
| `source_sheet` | `"2026-OEM"` |
| `source_row` | `4` |

### 4.5 샘플 데이터
```json
{
  "product_code": "BTBS003",
  "lot_no": "A07BF1",
  "product_name": "바스파 오스트레일리안 바쓰 솔트- 쏠티 씨",
  "receiving_date": "2026-01-09",
  "approval_date": "2026-01-12",
  "received_quantity_ea": 480,
  "finished_test_no": null,
  "ph_value": null,
  "managed_item": null,
  "remarks": "이노맥스 입고",
  "source_file": "반완제품관리대장(2026).xlsx",
  "source_sheet": "2026-OEM",
  "source_row": 4
}
```

---

## 5. 시험번호 형식 검증

### 5.1 반제품시험번호 (semi_test_no)
```
형식: B + YY + MM + SEQ(3자리)
예시: B2601001, B2601002, ...
정규식: ^B\d{7}$
```

### 5.2 완제품시험번호 (finished_test_no)
```
형식: P + YY + MM + SEQ(3자리)
예시: P2601001, P2601002, ...
정규식: ^P\d{7}$
```

### 5.3 OEM 완제품시험번호 (2021년)
```
형식: E + YY + MM + SEQ(3자리)
예시: E2101001, E2101002, ...
정규식: ^E\d{7}$
```

### 5.4 검증 쿼리
```sql
-- 반제품시험번호 형식 검증
SELECT semi_test_no, source_file, source_row
FROM labdoc_demo_production_batches
WHERE semi_test_no !~ '^B\d{7}$';

-- 완제품시험번호 형식 검증
SELECT finished_test_no, source_file, source_row
FROM labdoc_demo_finished_batches
WHERE finished_test_no !~ '^P\d{7}$';
```

---

## 6. LOT 번호 패턴

### 6.1 패턴 분류
| Prefix | 의미 | 예시 |
|--------|------|------|
| B | 벌크(Bulk) | B6001, B6002 |
| S | 소용량 | S6001, S6002 |
| M | 중간 | M6001, M6002 |
| H | 완제품 | H5111, H5111-1 |
| C | 크림류 | C5259, C5259-1 |
| E | 에센스/기타 | E6001 |

### 6.2 LOT 번호 형식
```
기본형: [PREFIX][YMMM] 예: B6001 (2026년 1번)
확장형: [PREFIX][YMMM]-[N] 예: H5111-1 (분할 배치)
```

---

## 7. 테이블 간 관계 (Soft Reference)

### 7.1 반완제품 ↔ 완제품 매칭
```
production_batches.finished_test_no ↔ finished_batches.finished_test_no
```

### 7.2 매칭 검증 쿼리
```sql
-- 매칭 건수 확인
SELECT COUNT(*) AS match_count
FROM labdoc_demo_production_batches pb
JOIN labdoc_demo_finished_batches fb 
  ON pb.finished_test_no = fb.finished_test_no
WHERE pb.finished_test_no IS NOT NULL;

-- 연도별 매칭 분석
SELECT 
  SUBSTRING(pb.source_file FROM '\d{4}') AS year,
  COUNT(*) AS match_count
FROM labdoc_demo_production_batches pb
JOIN labdoc_demo_finished_batches fb 
  ON pb.finished_test_no = fb.finished_test_no
WHERE pb.finished_test_no IS NOT NULL
GROUP BY 1
ORDER BY 1;

-- 미매칭 건 분석 (반완제품에 완제품시험번호 있으나 완제품 테이블에 없음)
SELECT pb.finished_test_no, pb.source_file, pb.source_row
FROM labdoc_demo_production_batches pb
WHERE pb.finished_test_no IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM labdoc_demo_finished_batches fb
    WHERE fb.finished_test_no = pb.finished_test_no
  );
```

### 7.3 예상 매칭 수 (2026년 기준)
```
반완제품 시트에서 완제품시험번호 있는 행: 33
완제품 시트 시험번호: 59
매칭되는 시험번호: 33
```

---

## 8. 제품코드 참조 (Soft Reference)

### 8.1 참조 관계
```
production_batches.product_code → labdoc_demo_products.product_code (Soft)
production_batches.finished_product_code → labdoc_demo_products.product_code (Soft)
finished_batches.product_code → labdoc_demo_products.product_code (Soft)
oem_products.product_code → labdoc_demo_products.product_code (Soft)
```

### 8.2 Soft Reference 처리 규칙
- FK 제약조건 **없음** (Orphan 허용)
- 매칭 안 되는 제품코드도 그대로 삽입
- ETL 완료 후 매칭률 리포트 생성

### 8.3 매칭률 확인 쿼리
```sql
-- 반완제품 제품코드 매칭률
SELECT 
  COUNT(*) AS total,
  COUNT(p.id) AS matched,
  ROUND(100.0 * COUNT(p.id) / NULLIF(COUNT(*), 0), 2) AS match_rate
FROM labdoc_demo_production_batches pb
LEFT JOIN labdoc_demo_products p ON pb.product_code = p.product_code;

-- 미매칭 제품코드 목록
SELECT DISTINCT pb.product_code
FROM labdoc_demo_production_batches pb
WHERE NOT EXISTS (
  SELECT 1 FROM labdoc_demo_products p
  WHERE p.product_code = pb.product_code
);
```

---

## 9. 데이터 변환 함수

### 9.1 TRIM
```python
def trim_value(value):
    if pd.isna(value):
        return None
    return str(value).strip() or None
```

### 9.2 PARSE_DATE
```python
def parse_date(value):
    if pd.isna(value):
        return None
    if isinstance(value, datetime):
        return value.date()
    try:
        return pd.to_datetime(value).date()
    except:
        return None
```

### 9.3 TO_DECIMAL
```python
def to_decimal(value, precision=2):
    if pd.isna(value):
        return None
    try:
        return round(float(value), precision)
    except:
        return None
```

### 9.4 TO_INT
```python
def to_int(value):
    if pd.isna(value):
        return None
    try:
        return int(float(value))
    except:
        return None
```

---

## 10. 검증 포인트

### 10.1 유니크 제약조건
- [ ] `semi_test_no` UNIQUE (production_batches)
- [ ] `finished_test_no` UNIQUE (finished_batches)

### 10.2 데이터 범위 검증
```sql
-- pH 범위 검증 (0~14)
SELECT COUNT(*) FROM labdoc_demo_production_batches
WHERE ph_value IS NOT NULL AND (ph_value < 0 OR ph_value > 14);

SELECT COUNT(*) FROM labdoc_demo_finished_batches
WHERE ph_value IS NOT NULL AND (ph_value < 0 OR ph_value > 14);

-- 포장수율 범위 검증 (0~105%, 일부 초과 허용)
SELECT COUNT(*) FROM labdoc_demo_production_batches
WHERE packaging_yield IS NOT NULL AND packaging_yield > 105;

-- 기능성 플래그 검증 (0 또는 1)
SELECT COUNT(*) FROM labdoc_demo_production_batches
WHERE functionality IS NOT NULL AND functionality NOT IN (0, 1);
```

### 10.3 Row Count 검증
```sql
-- 예상 레코드 수
-- production_batches: ~6,336
-- finished_batches: ~6,307
-- oem_products: ~307

SELECT 
  'production_batches' AS table_name, 
  COUNT(*) AS row_count 
FROM labdoc_demo_production_batches
UNION ALL
SELECT 
  'finished_batches', 
  COUNT(*) 
FROM labdoc_demo_finished_batches
UNION ALL
SELECT 
  'oem_products', 
  COUNT(*) 
FROM labdoc_demo_oem_products;
```

### 10.4 관계 정합성 검증
```sql
-- 반완제품 ↔ 완제품 매칭 (예상: 연도별 가변)
SELECT COUNT(*) AS matched_count
FROM labdoc_demo_production_batches pb
JOIN labdoc_demo_finished_batches fb 
  ON pb.finished_test_no = fb.finished_test_no
WHERE pb.finished_test_no IS NOT NULL;
```

---

## 11. 에러 처리

### 11.1 빈 행 스킵
```python
# B CODE(반완제품) 또는 P CODE(완제품/OEM)가 NULL이면 스킵
if pd.isna(row['B CODE']) or str(row['B CODE']).strip() == '':
    continue  # 반완제품 시트
```

### 11.2 중복 키 처리
```sql
-- UPSERT 사용 권장
INSERT INTO labdoc_demo_production_batches (...)
VALUES (...)
ON CONFLICT (semi_test_no) DO NOTHING;
```

### 11.3 타입 변환 실패
```python
# 변환 실패 시 NULL 삽입, 로그 기록
try:
    value = float(row['제조량(kg)'])
except:
    value = None
    log_warning(f"Row {idx}: 제조량 변환 실패 - {row['제조량(kg)']}")
```

---

## 12. ETL 실행 순서

1. **반완제품 시트** → `production_batches` 먼저 처리
2. **완제품 시트** → `finished_batches` 처리
3. **OEM 시트** → `oem_products` 처리
4. **관계 검증** → 매칭 쿼리 실행

> 순서 이유: production_batches에 finished_test_no가 있으므로, 나중에 finished_batches와 조인 검증 가능

---

## 13. 체크리스트

### ETL 전
- [ ] 소스 파일 6개 존재 확인
- [ ] DDL 실행 완료 (테이블 생성)
- [ ] 제품 마스터 데이터 로드 완료 (선택)

### ETL 중
- [ ] 각 파일별 시트명 패턴 확인
- [ ] 헤더 행 위치 확인 (반완제품: 1, 완제품: 0, OEM: 2)
- [ ] 빈 행 스킵 로직 적용
- [ ] source_file, source_sheet, source_row 기록

### ETL 후
- [ ] Row Count 검증 (6,336 / 6,307 / 307)
- [ ] UNIQUE 제약 위반 없음 확인
- [ ] pH 범위 검증 통과
- [ ] 반완제품 ↔ 완제품 매칭 관계 확인
- [ ] 리포트 생성 (`reports/` 폴더)

---

## 14. 참고: 연도별 시트명 변화

| 연도 | 반완제품 시트 | 완제품 시트 | OEM 시트 |
|------|--------------|-------------|----------|
| 2021 | 2021-반완제품 | 2021-완제품 | **OEM_2021** |
| 2022 | 2022-반완제품 | 2022-완제품 | 2022-OEM |
| 2023 | 2023-반완제품 | 2023-완제품 | 2023-OEM |
| 2024 | 2024-반완제품 | 2024-완제품 | 2024-OEM |
| 2025 | 2025-반완제품 | 2025-완제품 | 2025-OEM |
| 2026 | 2026-반완제품 | 2026-완제품 | 2026-OEM |

> **주의**: 2021년 OEM 시트명이 `OEM_2021`로 다른 연도와 패턴이 다름

---

## 부록 A: 전체 컬럼 대응표 (반완제품)

| # | Excel Col | Excel Header | DB Column | Type | Transform |
|---|-----------|--------------|-----------|------|-----------|
| 1 | A | B CODE | product_code | varchar(20) | TRIM |
| 2 | B | LOT | lot_no | varchar(30) | TRIM |
| 3 | C | 제조일 | manufacturing_date | date | PARSE_DATE |
| 4 | D | 제조판정일 | approval_date | date | PARSE_DATE |
| 5 | E | 제조량(kg) | quantity_kg | decimal(12,2) | TO_DECIMAL |
| 6 | F | 반제품시험번호 | semi_test_no | varchar(15) | TRIM |
| 7 | G | 기능성 | functionality | int | TO_INT |
| 8 | H | P CODE | finished_product_code | varchar(20) | TRIM |
| 9 | I | 생산일 | production_date | date | PARSE_DATE |
| 10 | J | 생산판정일 | production_approval_date | date | PARSE_DATE |
| 11 | K | 실생산량(ea) | actual_quantity_ea | int | TO_INT |
| 12 | L | 평균용량 | - | - | SKIP |
| 13 | M | 완제품시험번호 | finished_test_no | varchar(15) | TRIM |
| 14 | N | PH | ph_value | decimal(5,2) | TO_DECIMAL |
| 15 | O | 점,경도 | viscosity | decimal(12,2) | TO_DECIMAL |
| 16 | P | 비중 | specific_gravity | decimal(6,4) | TO_DECIMAL |
| 17 | Q | 관리품 | managed_item | int | TO_INT |
| 18 | R | 비고 | remarks | text | TRIM |
| 19 | S | 이론생산량(ea) | theoretical_quantity_ea | decimal(12,2) | TO_DECIMAL |
| 20 | T | 포장수율(%) | packaging_yield | decimal(6,2) | TO_DECIMAL |
| 21 | U | (Unnamed) | - | - | SKIP |
| 22 | V | pH기준 | ph_standard | varchar(30) | TRIM |
| 23 | W | 점,경도기준 | viscosity_standard | varchar(30) | TRIM |
| 24 | X | 비중기준 | gravity_standard | decimal(6,4) | TO_DECIMAL |
| 25 | Y | 실충진량 | actual_fill_volume | decimal(10,2) | TO_DECIMAL |

---

*문서 생성일: 2026-02-02*  
*버전: 1.0*
