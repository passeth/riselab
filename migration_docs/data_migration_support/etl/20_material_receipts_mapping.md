# 원료입고 ETL 매핑 정의 (Material Receipts ETL Mapping)

본 문서는 원료입고 관리대장 Excel 파일에서 데이터를 추출하여 `labdoc_demo_material_receipts` 및 `labdoc_demo_suppliers` 테이블로 마이그레이션하기 위한 매핑 정의를 제공합니다.

---

## 1. 소스 파일 정보

### 1.1 파일 위치 및 패턴
```
위치: migration_docs/서식 샘플/원료입고 관리대장/
패턴: 원료입고 관리대장(YYYY).xls
```

### 1.2 파일 목록
| 파일명 | 예상 행수 | 비고 |
|--------|----------|------|
| 원료입고 관리대장(2016).xls | ~0* | 시험번호 형식 상이 |
| 원료입고 관리대장(2017).xls | ~1,998 | |
| 원료입고 관리대장(2018).xls | ~1,427 | |
| 원료입고 관리대장(2019).xls | ~2,237 | |
| 원료입고 관리대장(2020).xls | ~1,464 | |
| 원료입고 관리대장(2021).xls | ~1,708 | |
| 원료입고 관리대장(2022).xls | ~2,211 | |
| 원료입고 관리대장(2023).xls | ~2,372 | |
| 원료입고 관리대장(2024).xls | ~1,634 | 컬럼 구조 변경 |
| 원료입고 관리대장(2025).xls | ~1,476 | |
| 원료입고 관리대장(2026).xls | ~108 | 진행 중 |

**총 예상 데이터: ~16,600+ rows**

> *2016년 파일은 시험번호 형식이 `YYMMNNNN` (R 접두어 없음)으로 별도 처리 필요

---

## 2. 시트 처리 규칙

### 2.1 처리 대상 시트
| 시트명 | 처리 | 비고 |
|--------|------|------|
| 1월 ~ 12월 | **추출** | 월별 데이터 |
| 양식 | 스킵 | 빈 양식 템플릿 |
| List | 스킵 | 마스터 데이터 (별도 처리) |
| Sheet1, Sheet2 | 스킵 | 임시/작업용 시트 |

### 2.2 특이 사항
- **2016년**: 1월, 2월 시트 없음 (3월부터 존재)
- **헤더 위치**: 모든 시트에서 **3번째 행 (index 2)**

---

## 3. 컬럼 매핑 정의

### 3.1 연도별 컬럼 구조 차이

| 연도 | 컬럼 수 | 시험번호 위치 | 차이점 |
|------|---------|--------------|--------|
| 2016-2023 | 9 | index 7 | 표준 구조 |
| 2024-2026 | 10 | index 8 | Lot No 병합 잔재 (index 3) 추가 |

### 3.2 컬럼 매핑 (2016-2023, 9컬럼)

| Index | Excel 헤더 | DB 컬럼 | 데이터 타입 | 변환 규칙 |
|-------|-----------|---------|------------|----------|
| 0 | 입고일 | `receipt_date` | DATE | DATE 파싱, **Forward-Fill** |
| 1 | 원료코드 | `ingredient_code` | VARCHAR(20) | TRIM, UPPER |
| 2 | 원료명 | `ingredient_name` | VARCHAR(200) | TRIM |
| 3 | Lot No | `lot_no` | VARCHAR(50) | TRIM, TO_STRING |
| 4 | 입고량(kg) | `quantity_kg` | DECIMAL(10,2) | NUMERIC 변환 |
| 5 | 공급처 | `supplier_name` | VARCHAR(100) | TRIM, 정규화 |
| 6 | COA유무 | `coa_reference` | VARCHAR(50) | TRIM |
| 7 | 시험번호 | `test_no` | VARCHAR(20) | TRIM (**PK**) |
| 8 | 비고 | `remarks` | TEXT | TRIM, NULL if empty |

### 3.3 컬럼 매핑 (2024-2026, 10컬럼)

| Index | Excel 헤더 | DB 컬럼 | 데이터 타입 | 변환 규칙 |
|-------|-----------|---------|------------|----------|
| 0 | 입고일 | `receipt_date` | DATE | DATE 파싱, **Forward-Fill** |
| 1 | 원료코드 | `ingredient_code` | VARCHAR(20) | TRIM, UPPER |
| 2 | 원료명 | `ingredient_name` | VARCHAR(200) | TRIM |
| 3 | (병합 잔재) | - | - | **스킵** |
| 4 | Lot No | `lot_no` | VARCHAR(50) | TRIM, TO_STRING |
| 5 | 입고량(kg) | `quantity_kg` | DECIMAL(10,2) | NUMERIC 변환 |
| 6 | 공급처 | `supplier_name` | VARCHAR(100) | TRIM, 정규화 |
| 7 | COA유무 | `coa_reference` | VARCHAR(50) | TRIM |
| 8 | 시험번호 | `test_no` | VARCHAR(20) | TRIM (**PK**) |
| 9 | 비고 | `remarks` | TEXT | TRIM, NULL if empty |

---

## 4. 데이터 변환 규칙

### 4.1 날짜 Forward-Fill 규칙

입고일이 **병합 셀**로 되어 있어 첫 행에만 값이 존재합니다.

```
원본 데이터:
  Row 3: 2026-01-05 | MUP-0004 | ...
  Row 4: NULL       | MKH-0005 | ...
  Row 5: NULL       | MKL-0001 | ...
  Row 6: 2026-01-06 | MOM-0005 | ...

Forward-Fill 적용 후:
  Row 3: 2026-01-05 | MUP-0004 | ...
  Row 4: 2026-01-05 | MKH-0005 | ...  <- 이전 값으로 채움
  Row 5: 2026-01-05 | MKL-0001 | ...  <- 이전 값으로 채움
  Row 6: 2026-01-06 | MOM-0005 | ...
```

**구현 로직 (Pandas)**:
```python
df['receipt_date'] = df['receipt_date'].ffill()
```

### 4.2 시험번호 형식 검증

| 연도 | 패턴 | 정규식 | 예시 |
|------|------|--------|------|
| 2016 | YYMMNNNN | `^\d{7}$` | 1603001, 1612108 |
| 2017+ | RYYMMNNN | `^R\d{7}$` | R2601001, R2301108 |

**검증 로직**:
```python
# 2017년 이후
df['is_valid_test_no'] = df['test_no'].str.match(r'^R\d{7}$', na=False)

# 2016년
df['is_valid_test_no'] = df['test_no'].str.match(r'^\d{7}$', na=False)
```

### 4.3 원료코드 형식 검증

```
패턴: MXX-NNNN
예시: MAA-0001, MBB-0002, MFS-0097, MUP-0004
정규식: ^M[A-Z]{2}-\d{4}$
```

**주의**: 일부 소문자 존재 가능 → `UPPER()` 변환 필수

```python
df['ingredient_code'] = df['ingredient_code'].str.strip().str.upper()
```

### 4.4 공급업체 정규화

| 원본 | 정규화 결과 | 규칙 |
|------|------------|------|
| `" (주)블루켐 "` | `(주)블루켐` | 앞뒤 공백 제거 |
| `(주)블루켐\n` | `(주)블루켐` | 줄바꿈 문자 제거 |
| `(주)블루켐㈜` | 그대로 유지 | 특수문자는 유지 |
| `주식회사 블루켐` | 그대로 유지 | 별칭 매핑은 별도 |

**구현**:
```python
df['supplier_name_normalized'] = df['supplier_name'].str.strip().str.replace(r'\s+', ' ', regex=True)
```

**예상 공급업체 수**: ~137개

---

## 5. 타겟 테이블

### 5.1 labdoc_demo_suppliers (공급업체 마스터)

| 컬럼명 | 데이터 타입 | 설명 | 소스 |
|--------|------------|------|------|
| `id` | UUID | PK, auto-gen | - |
| `supplier_name` | VARCHAR(100) | 공급업체명 | 정규화된 공급처 |
| `created_at` | TIMESTAMPTZ | 생성일시 | NOW() |

**생성 방식**: 원료입고 데이터에서 DISTINCT 추출

```sql
INSERT INTO labdoc_demo_suppliers (supplier_name)
SELECT DISTINCT supplier_name_normalized
FROM staging_material_receipts
WHERE supplier_name_normalized IS NOT NULL
ON CONFLICT (supplier_name) DO NOTHING;
```

### 5.2 labdoc_demo_material_receipts (원료입고 기록)

| 컬럼명 | 데이터 타입 | 제약조건 | 소스 |
|--------|------------|---------|------|
| `id` | UUID | PK, auto-gen | - |
| `test_no` | VARCHAR(20) | **UNIQUE** | 시험번호 |
| `receipt_date` | DATE | NOT NULL | 입고일 |
| `ingredient_code` | VARCHAR(20) | | 원료코드 |
| `ingredient_name` | VARCHAR(200) | | 원료명 |
| `lot_no` | VARCHAR(50) | | Lot No |
| `quantity_kg` | DECIMAL(10,2) | | 입고량(kg) |
| `supplier_name` | VARCHAR(100) | | 공급처 |
| `coa_reference` | VARCHAR(50) | | COA유무 |
| `remarks` | TEXT | | 비고 |
| `source_file` | VARCHAR(100) | | 소스 파일명 |
| `source_sheet` | VARCHAR(20) | | 소스 시트명 |
| `source_row` | INTEGER | | Excel 행 번호 |
| `created_at` | TIMESTAMPTZ | | NOW() |

---

## 6. Soft Reference 처리

### 6.1 원료코드 참조 (ingredient_code)

```
참조 대상: labdoc_demo_ingredients.ingredient_code
처리 방식: Soft Reference (FK 제약 없음)
예상 매칭률: ~95%
```

**미매칭 처리**:
- 그대로 삽입 (orphan 허용)
- 매칭률 리포트로 추후 확인

```sql
-- 매칭률 확인 쿼리
SELECT 
  COUNT(*) AS total,
  COUNT(i.id) AS matched,
  ROUND(COUNT(i.id)::NUMERIC / COUNT(*) * 100, 2) AS match_rate
FROM labdoc_demo_material_receipts mr
LEFT JOIN labdoc_demo_ingredients i 
  ON mr.ingredient_code = i.ingredient_code;
```

### 6.2 공급업체 참조 (supplier_name)

```
참조 대상: labdoc_demo_suppliers.supplier_name
처리 방식: 동일 ETL에서 먼저 생성 후 참조
예상 매칭률: 100% (자동 생성)
```

---

## 7. 추적성 컬럼 (Traceability)

각 레코드의 원본 위치 추적을 위해 다음 컬럼을 유지합니다:

| 컬럼 | 예시 값 | 용도 |
|------|--------|------|
| `source_file` | `원료입고 관리대장(2026).xls` | 원본 파일 식별 |
| `source_sheet` | `1월` | 원본 시트 식별 |
| `source_row` | `5` | Excel 행 번호 (1-based) |

**구현**:
```python
df['source_file'] = filename
df['source_sheet'] = sheet_name
df['source_row'] = df.index + 4  # header=2, 0-based index → 1-based Excel row
```

---

## 8. 검증 포인트

### 8.1 데이터 품질 검증

| 검증 항목 | 기대 결과 | 검증 쿼리 |
|----------|----------|----------|
| test_no UNIQUE 충돌 | 0건 | `SELECT test_no, COUNT(*) FROM ... GROUP BY test_no HAVING COUNT(*) > 1` |
| receipt_date NOT NULL | 0건 | `SELECT COUNT(*) FROM ... WHERE receipt_date IS NULL` |
| quantity_kg >= 0 | 전체 | `SELECT COUNT(*) FROM ... WHERE quantity_kg < 0` |
| ingredient_code 형식 | 95%+ | `SELECT COUNT(*) FROM ... WHERE ingredient_code ~ '^M[A-Z]{2}-\d{4}$'` |

### 8.2 정합성 검증

```sql
-- 연도별 건수 확인
SELECT 
  EXTRACT(YEAR FROM receipt_date) AS year,
  COUNT(*) AS count
FROM labdoc_demo_material_receipts
GROUP BY 1
ORDER BY 1;

-- 월별 평균 건수
SELECT 
  EXTRACT(MONTH FROM receipt_date) AS month,
  COUNT(*) / COUNT(DISTINCT EXTRACT(YEAR FROM receipt_date)) AS avg_count
FROM labdoc_demo_material_receipts
GROUP BY 1
ORDER BY 1;
```

### 8.3 체크리스트

- [ ] test_no UNIQUE 충돌 없음
- [ ] receipt_date NULL 없음 (Forward-Fill 정상 동작)
- [ ] quantity_kg 음수 없음
- [ ] ingredient_code 매칭률 95% 이상
- [ ] 공급업체 정규화 완료 (~137개)
- [ ] source_* 추적 컬럼 정상 기록

---

## 9. ETL 처리 흐름

```
1. 파일 순회
   └── 연도 오름차순 (2016 → 2026)

2. 시트 순회 (각 파일)
   └── 월 순서 (1월 → 12월)

3. 데이터 추출
   ├── header=2로 읽기
   ├── 컬럼 수 감지 (9 vs 10)
   └── 적절한 인덱스 매핑 적용

4. 데이터 변환
   ├── Forward-Fill (receipt_date)
   ├── TRIM/UPPER (ingredient_code)
   ├── 정규화 (supplier_name)
   └── 추적 컬럼 추가

5. 검증
   ├── test_no 형식 검증
   ├── 빈 행 제거
   └── 중복 검사

6. 적재
   ├── suppliers 테이블 (DISTINCT)
   └── material_receipts 테이블
```

---

## 10. 에러 처리

| 에러 유형 | 처리 방법 | 로그 레벨 |
|----------|----------|----------|
| 날짜 파싱 실패 | NULL 유지, Forward-Fill에서 처리 | WARN |
| 수량 변환 실패 | NULL 삽입 | WARN |
| test_no 중복 | `ON CONFLICT DO NOTHING` | ERROR |
| 시트 없음 | 스킵 | INFO |

---

## 11. 참고 사항

### 11.1 2016년 특별 처리

2016년 파일은 시험번호 형식이 다르므로 별도 처리가 필요합니다:

```python
# 2016년 시험번호 변환 (옵션)
# YYMMNNNN → RYYMMNNN 형식으로 통일 가능
# 예: 1603001 → R1603001

if year == 2016:
    df['test_no'] = 'R' + df['test_no'].astype(str)
```

### 11.2 List 시트 활용

`List` 시트에는 원료 마스터 데이터가 포함되어 있을 수 있습니다:
- 별도 `labdoc_demo_ingredients` ETL에서 활용 검토
- 현재 ETL에서는 스킵

### 11.3 COA 참조 형식

COA유무 컬럼 값 예시:
```
328'(7), 248b(4), 249(4), 345(7)
```
- 숫자+문자 조합
- 괄호 안 숫자는 페이지 또는 섹션 번호로 추정
- 별도 파싱 없이 원본 값 유지
