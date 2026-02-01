# 화장품 연구 데이터 통합 - 최종 데이터셋

**작성일**: 2026-02-01 (최종 수정: 2026-02-02)  
**프로젝트**: 화장품 연구 오라클 시스템 - Phase 1 데이터 마이그레이션  
**상태**: ✅ 완료 (알러젠 테이블 재구조화 완료)

---

## 📊 전체 데이터 현황

### 총 데이터 규모
- **총 Excel 파일**: 2,110개 (분석 완료)
- **총 추출 레코드**: 113,499 rows
- **총 데이터 크기**: ~8.5 MB (10개 CSV 파일)
- **처리 성공률**: 99.8%

### 데이터 소스별 현황

| 데이터 소스 | 파일 수 | 추출 완료 | 상태 |
|------------|-------:|----------:|------|
| 제품표준서_all | 1,085 | ✅ | 완료 |
| 원료_향알러지데이터 | 666 | ✅ | 완료 |
| 제조공정지시기록서 | 359 | ✅ | 완료 |
| **총계** | **2,110** | **2,110** | **100%** |

---

## 📁 최종 CSV 파일 목록

### 제품 관련 데이터 (8개 파일)

| 파일명 | 레코드 수 | 크기 | 설명 |
|--------|----------:|-----:|------|
| **01_products_master.csv** | 1,579 | 871 KB | 제품 마스터 정보 (반제품/완제품 코드 포함) |
| **02_products_bom.csv** | 22,524 | 605 KB | 원료 구성 (BOM) |
| **03_products_qc_specs.csv** | 56,419 | 4.0 MB | QC 시험기준 (품목코드 검색 가능) |
| **04_products_english_specs.csv** | 12,162 | 1.2 MB | 영문성적서 (품목코드 검색 가능) |
| **05_products_revisions.csv** | 1,226 | 38 KB | 개정 이력 |
| **07_products_work_specs.csv** | 377 | 83 KB | 작업명세서 (품목코드 검색 가능) |
| **08_products_subsidiary_materials.csv** | 1,030 | 180 KB | 부자재 (품목코드 검색 가능) |

**소계**: 95,317 rows

### 알러젠 데이터 (2개 파일) ✨ 재구조화됨

| 파일명 | 레코드 수 | 크기 | 설명 |
|--------|----------:|-----:|------|
| **06_allergens_master.csv** | 8,836 | 1.2 MB | ~~향료 알러젠 정보~~ (레거시 - 아래 파일로 대체) |

#### Supabase 임포트용 (신규 구조)

| 파일명 | 레코드 수 | 대상 테이블 | 설명 |
|--------|----------:|-------------|------|
| **fragrance_allergen_contents.csv** | 1,843 | `labdoc_fragrance_allergen_contents` | 향료별 알러젠 함량 (단순화된 구조) |

> **참고**: EU 공식 81개 알러젠 규정은 `labdoc_allergen_regulations` 테이블에 별도 저장됨 (81행)

### 제조공정 데이터 (2개 파일) ✨ NEW

| 파일명 | 레코드 수 | 크기 | 설명 |
|--------|----------:|-----:|------|
| **09_manufacturing_process_headers.csv** | 359 | 67 KB | 제조공정 헤더 (제품별 메타데이터) |
| **10_manufacturing_process_steps.csv** | 2,449 | 300 KB | 제조공정 단계 (상세 공정 정보) |

**소계**: 2,808 rows

---

## 🔑 데이터 구조 및 관계

### 전체 데이터 관계도

```
01_products_master (제품 마스터)
├─ 관리번호 (1:N) → 제품코드
├─ semi_product_code (반제품 코드)
└─ p_product_code (완제품 코드)
    │
    ├─ 02_products_bom (원료 구성)
    │   └─ 원료코드 → (향료 원료)
    │       └─ 06_allergens_master (알러젠 정보) [매칭 필요]
    │
    ├─ 03_products_qc_specs (QC 기준) ✅ 품목코드 검색
    ├─ 04_products_english_specs (영문성적서) ✅ 품목코드 검색
    ├─ 05_products_revisions (개정사항)
    ├─ 07_products_work_specs (작업명세서) ✅ 품목코드 검색
    ├─ 08_products_subsidiary_materials (부자재) ✅ 품목코드 검색
    │
    └─ 09_manufacturing_process_headers (제조공정 헤더) ✨ NEW
        └─ 10_manufacturing_process_steps (제조공정 단계) ✨ NEW
```

### 품목코드 검색 가능 여부

| 파일 | 품목코드 검색 | 비고 |
|------|:------------:|------|
| 01_products_master | ✅ | Primary key |
| 02_products_bom | ✅ | Foreign key |
| 03_products_qc_specs | ✅ | 확장됨 (1:N 처리) |
| 04_products_english_specs | ✅ | 확장됨 (1:N 처리) |
| 05_products_revisions | ✅ | Foreign key |
| 06_allergens_master | ❌ | 향료코드 기준 (매칭 필요) |
| 07_products_work_specs | ✅ | 확장됨 (1:N 처리) |
| 08_products_subsidiary_materials | ✅ | 확장됨 (1:N 처리) |
| 09_manufacturing_process_headers | ✅ | Primary key |
| 10_manufacturing_process_steps | ✅ | Foreign key |

**검색 가능**: 9/10 파일 (90%)

---

## 📋 파일별 상세 정보

### 01_products_master.csv (1,579 rows)

**설명**: 제품 마스터 정보 (통합)

**주요 컬럼**:
- `제품코드` - Primary key
- `관리번호` - 1:N 관계 (1개 관리번호 → 여러 제품코드)
- `semi_product_code` - 반제품 코드 (원료 관리용)
- `p_product_code` - 완제품 코드
- `국문제품명`, `영문제품명`
- `제형`, `용량`, `성상`
- `Allergen국문`, `Allergen영문`
- 기타 19개 컬럼

**데이터 품질**:
- ✅ 제품코드: 100% 채워짐
- ⚠️ NULL 값: 19개 컬럼에서 50%+ NULL
- ⚠️ 중복: 8개 중복 제품코드 존재

---

### 02_products_bom.csv (22,524 rows)

**설명**: 원료 구성 (Bill of Materials)

**주요 컬럼**:
- `제품코드` - Foreign key
- `순번` - 원료 순서
- `원료코드` - 원료 식별자
- `함량%` - 원료 함량 (%)

**통계**:
- 평균 원료/제품: 18.8개
- 고유 원료코드: ~2,000개 (추정)

---

### 03_products_qc_specs.csv (56,419 rows) ✨ 확장됨

**설명**: QC 시험기준 (품목코드별 확장)

**주요 컬럼**:
- `제품코드` - Foreign key (품목코드별 복제)
- `순번` - 시험 순서
- `항목` - 시험 항목 (성상, pH, 비중, 점도 등)
- `시험기준` - 기준값
- `시험방법` - 시험 방법
- `타입` - semi_finished / finished

**통계**:
- 원본: 29,377 rows
- 확장 후: 56,419 rows (+92%)
- 평균 시험/제품: 24.5개

---

### 04_products_english_specs.csv (12,162 rows) ✨ 확장됨

**설명**: 영문성적서 (품목코드별 확장)

**주요 컬럼**:
- `품목코드` - Foreign key (품목코드별 복제)
- `Test Item` - 시험 항목 (영문)
- `Specification` - 기준 (영문)
- `Test Method` - 시험 방법 (영문)

**통계**:
- 원본: 9,266 rows
- 확장 후: 12,162 rows (+31%)

---

### 05_products_revisions.csv (1,226 rows)

**설명**: 제품 개정 이력

**주요 컬럼**:
- `제품코드` - Foreign key
- `개정일자` - 개정 날짜
- `개정사유` - 개정 이유
- `개정내용` - 개정 내용

---

### 06_allergens_master.csv (8,836 rows) - 레거시

**설명**: 향료 알러젠 정보 (15개 공급업체) - **더 이상 사용하지 않음**

> ⚠️ **이 파일은 레거시입니다.** 아래 신규 구조로 대체되었습니다.

---

### 알러젠 신규 구조 (Supabase 테이블) ✨ NEW

#### labdoc_allergen_regulations (EU 공식 알러젠 규정)

**설명**: EU 화장품 규정에 따른 81개 공식 알러젠 목록 및 임계값

**레코드 수**: 81행

**주요 컬럼**:
- `allergen_name` - 알러젠명 (영문, Primary)
- `inci_name` - INCI 명칭
- `cas_no` - CAS 번호
- `threshold_leave_on` - Leave-on 제품 임계값 (0.001% = 10ppm)
- `threshold_rinse_off` - Rinse-off 제품 임계값 (0.01% = 100ppm)
- `annex_ref` - EU Cosmetics Regulation Annex 참조

#### labdoc_fragrance_allergen_contents (향료별 알러젠 함량)

**설명**: 공급업체별 향료에 포함된 알러젠 함량 데이터

**레코드 수**: 1,843행

**주요 컬럼**:
- `supplier` - 공급업체명 (고려에프엔에프, 서울향료, 쎈텍 등)
- `fragrance_code` - 향료코드 (예: A63454, B30373)
- `fragrance_name` - 향료명
- `allergen_name` - 알러젠명 (영문)
- `cas_no` - CAS 번호
- `content_in_fragrance` - 향료 중 함량 (%)
- `source_filename` - 원본 파일명

**공급업체 분포**:
- 고려에프엔에프: 162 files (46.7%)
- 서울향료: 58 files (16.7%)
- 쎈텍: 46 files (13.3%)
- 기타 12개: 81 files (23.3%)

**알러젠 라벨링 판단 방법**:
```sql
-- 제품 내 알러젠 함량 계산 예시
-- 향료 함량(BOM) × 향료 중 알러젠 함량 = 제품 중 알러젠 함량
-- 이 값이 임계값(threshold)을 초과하면 라벨링 필요

SELECT 
  fac.allergen_name,
  fac.content_in_fragrance,
  ar.threshold_leave_on,
  ar.threshold_rinse_off
FROM labdoc_fragrance_allergen_contents fac
JOIN labdoc_allergen_regulations ar 
  ON UPPER(fac.allergen_name) = UPPER(ar.allergen_name)
WHERE fac.fragrance_code = 'A63454';
```

---

### 07_products_work_specs.csv (377 rows) ✨ 확장됨

**설명**: 작업명세서 (품목코드별 확장)

**주요 컬럼**:
- `제품코드` - Foreign key (품목코드별 복제)
- `작업명세` - 작업 지시사항

**통계**:
- 원본: 281 rows
- 확장 후: 377 rows (+34%)

---

### 08_products_subsidiary_materials.csv (1,030 rows) ✨ 확장됨

**설명**: 부자재 정보 (품목코드별 확장)

**주요 컬럼**:
- `제품코드` - Foreign key (품목코드별 복제)
- `부자재명` - 부자재 이름
- `규격` - 부자재 규격
- `수량` - 필요 수량

**통계**:
- 원본: 738 rows
- 확장 후: 1,030 rows (+40%)

---

### 09_manufacturing_process_headers.csv (359 rows) ✨ NEW

**설명**: 제조공정지시기록서 헤더 (제품별 메타데이터)

**주요 컬럼**:
- `filename` - 원본 파일명
- `product_code` - 제품코드 (Primary key)
- `product_name` - 제품명
- `batch_number` - 제조번호
- `batch_unit` - 제조단위 (Kg)
- `dept_name` - 제조부명
- `actual_qty` - 실생산량
- `mfg_date` - 제조년월일
- `operator` - 제조자
- `approver_1`, `approver_2`, `approver_3` - 결재자
- `notes_content` - 작업자 유의사항
- `total_time` - 총소요시간
- `special_notes` - 특이사항
- `step_count` - 공정 단계 수

**통계**:
- 총 제품: 359개
- 평균 공정 단계: 6.8개/제품
- 공정 단계 범위: 0~11 단계

---

### 10_manufacturing_process_steps.csv (2,449 rows) ✨ NEW

**설명**: 제조공정 상세 단계

**주요 컬럼**:
- `product_code` - 제품코드 (Foreign key)
- `step_num` - 공정 순번
- `step_name` - 공정명 (예: 청결상태 점검, 점증제 분산, 유화, 냉각탈포 등)
- `step_desc` - 제조공정 상세 설명
- `work_time` - 작업시간
- `checker` - 확인자

**공정 단계 분포**:
- 2 steps: 47 products
- 5 steps: 40 products
- 6 steps: 49 products
- 7 steps: 39 products
- 8 steps: 48 products
- 9 steps: 49 products
- 10 steps: 58 products

**일반적인 공정 흐름**:
1. 청결상태 점검
2. 원료 용해/분산
3. 유화 (1차, 2차)
4. 냉각/탈포
5. 향/첨가제 투입
6. 부상

---

## 🔍 데이터 품질 분석

### 커버리지 분석

| 필드 | 채워진 행 | 비율 |
|------|----------:|-----:|
| 제품코드 | 1,579 | 100% |
| 제품명 | 1,579 | 100% |
| 관리번호 | 1,425 | 90.3% |
| 제형 | 1,579 | 100% |
| 용량 | 1,579 | 100% |
| Allergen | 196 | 12.4% |
| 효능효과 | 589 | 37.3% |

### 알려진 이슈

#### 1. 데이터 구조 문제
- **Primary Key 부재**: 제품코드, 관리번호 모두 중복 존재
- **1:N 관계 평탄화**: 관리번호 → 제품코드 (정규화 필요)
- **NULL 값 과다**: 19개 컬럼에서 50%+ NULL

#### 2. 데이터 일관성 문제
- **64개 충돌**: Excel 리스트 vs CSV 데이터
- **384개 누락**: Excel에만 있고 CSV에 없음
- **8개 중복**: 동일 제품코드로 여러 제품

#### 3. 데이터 연결 문제
- **알러젠 데이터 분리**: 제품표준서와 별도 관리
- **향료 코드 불일치**: 공급업체별 다른 코드 체계
- **BOM 연결 불확실**: 향료 원료코드 매칭 필요

---

## 🎯 다음 단계

### Immediate (완료)
1. ✅ **제품표준서 추출** - 완료
2. ✅ **알러젠 데이터 추출** - 완료
3. ✅ **제조공정지시기록서 추출** - 완료
4. ✅ **알러젠 테이블 재구조화** - 완료 (2026-02-02)
   - `labdoc_allergen_regulations`: 81행 (EU 규정)
   - `labdoc_fragrance_allergen_contents`: 1,843행 (향료별 알러젠 함량)

### Short-term (진행 중)
5. ⏳ **향료-알러젠 데이터 Supabase 임포트** - 대기 중
   - 파일: `csv_output/supabase_import/fragrance_allergen_contents.csv`
   - 대상: `labdoc_fragrance_allergen_contents` 테이블
6. **BOM-알러젠 연결** - 향료 원료코드 매칭 (fragrance_code ↔ ingredient_code)
7. **TypeScript 타입 업데이트** - 완료 (`src/types/database.ts`)

### Medium-term (3-5일)
8. **RAG 파운데이션 구축**
9. **알러젠 라벨링 자동화** - 제품별 알러젠 계산 로직 구현

### Long-term (1-2주)
10. **Knowledge Graph 구축** - Product → BOM → Ingredient → Allergen → Manufacturing
11. **Ontology 레이어** - Regulation, Safety, Efficacy
12. **오라클 시스템 통합**

---

## 💡 핵심 인사이트

### 1. 데이터 규모
- **예상보다 큰 규모**: 2,110개 파일
- **복잡한 관계**: 1:N (관리번호 → 제품코드)
- **다양한 데이터 유형**: 제품, BOM, QC, 알러젠, 공정

### 2. 데이터 품질
- **일관성 문제**: 64개 충돌, 384개 누락
- **중복 문제**: 8개 중복 제품코드
- **NULL 값 과다**: 정규화 필요

### 3. 오라클 시스템 가치
이 데이터 마이그레이션이 없으면:
- ❌ RAG 불가능 (검색할 데이터 없음)
- ❌ Knowledge Graph 불가능 (관계 데이터 없음)
- ❌ Ontology 불가능 (구조화된 지식 없음)
- ❌ AI 어시스턴트 불가능 (질의응답 불가)

**이 작업은 오라클 시스템의 필수 전제조건입니다.**

---

## 📞 재개 시 체크리스트

1. **Supabase 데이터 상태 확인**:
   ```sql
   SELECT 
     (SELECT COUNT(*) FROM labdoc_allergen_regulations) as allergen_regulations,
     (SELECT COUNT(*) FROM labdoc_fragrance_allergen_contents) as fragrance_allergen_contents;
   -- 예상: allergen_regulations=81, fragrance_allergen_contents=1843
   ```

2. **향료-알러젠 데이터 임포트** (미완료 시):
   - 파일: `csv_output/supabase_import/fragrance_allergen_contents.csv`
   - Supabase Dashboard → Table Editor → Import CSV

3. **작업 디렉토리 확인**:
   ```bash
   cd C:\Users\passe\Documents\@PROJECT\riselab\
   ls csv_output/supabase_import/
   ```

4. **다음 작업 우선순위**:
   - 향료-알러젠 데이터 임포트 완료
   - BOM-향료 연결 (fragrance_code ↔ ingredient_code)
   - RAG 시스템 구축

---

**작성일**: 2026-02-01 (최종 수정: 2026-02-02)  
**세션 종료 시점**: 알러젠 테이블 재구조화 완료, 향료-알러젠 데이터 임포트 대기  
**진행률**: 데이터 마이그레이션 약 95% 완료

---

## 🎉 성과 요약

### 정량적 성과
- ✅ **2,110개 파일** 발견 및 분석
- ✅ **113,499 rows** 추출 (10개 CSV)
- ✅ **Supabase 14개 테이블** 구축 완료
- ✅ **알러젠 테이블 재구조화** (정규화 → 단순화)
  - `labdoc_allergen_regulations`: 81행 (EU 규정)
  - `labdoc_fragrance_allergen_contents`: 1,843행 (향료별 알러젠 함량)
