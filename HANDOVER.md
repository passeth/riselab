# Riselab 프로젝트 인수인계 문서

**작성일**: 2026-02-02  
**프로젝트**: 에바스코스메틱 화장품 연구 오라클 시스템  
**상태**: 데이터 마이그레이션 완료, UI/기능 구현 대기

---

## 1. 프로젝트 개요

### 목표
화장품 제조사의 제품표준서, 원료 정보, 알러젠 데이터, 제조공정 정보를 통합 관리하는 시스템 구축

### 기술 스택
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **배포**: Vercel (예정)

---

## 2. 현재 상태 요약

### 완료된 작업

| 항목 | 상태 | 비고 |
|------|:----:|------|
| 데이터 추출 (Excel → CSV) | ✅ | 2,110개 파일 처리 |
| Supabase 스키마 설계 | ✅ | 15개 테이블 |
| 데이터 임포트 | ✅ | 92,300+ rows |
| TypeScript 타입 정의 | ✅ | `src/types/database.ts` |
| 기본 페이지 구조 | ✅ | 4개 페이지 |

### 미완료 작업

| 항목 | 우선순위 | 설명 |
|------|:--------:|------|
| 제품 목록 페이지 UI | HIGH | 검색, 필터, 페이지네이션 |
| 제품 상세 페이지 UI | HIGH | BOM, QC, 알러젠 표시 |
| 원료 상세 페이지 UI | HIGH | 성분, 규격, 문서 링크 |
| 알러젠 라벨링 계산 | MEDIUM | 제품별 알러젠 임계값 판단 |
| 제조공정 조회 | MEDIUM | 공정 단계 시각화 |
| 검색 기능 | MEDIUM | 전문 검색 (Full-text) |
| RAG 시스템 | LOW | AI 질의응답 |

---

## 3. 데이터베이스 현황

### Supabase 테이블 (15개)

| 테이블명 | 레코드 수 | 설명 |
|----------|----------:|------|
| `labdoc_products` | 1,571 | 제품 마스터 |
| `labdoc_product_bom` | 22,524 | 원료 구성 (BOM) |
| `labdoc_product_qc_specs` | 32,736 | QC 시험 규격 |
| `labdoc_product_english_specs` | 11,857 | 영문 규격 |
| `labdoc_product_revisions` | 199 | 개정 이력 |
| `labdoc_product_work_specs` | 377 | 작업 명세서 |
| `labdoc_product_subsidiary_materials` | 1,030 | 부자재 |
| `labdoc_ingredients` | 1,066 | 원료 마스터 |
| `labdoc_ingredient_specs` | 4,106 | 원료 규격 |
| `labdoc_ingredient_components` | 2,000 | 원료 성분 |
| `labdoc_test_specs` | 4,040 | 시험 규격 |
| `labdoc_manufacturing_processes` | 1,232 | 제조공정 헤더 |
| `labdoc_manufacturing_process_steps` | 9,221 | 제조공정 단계 |
| `labdoc_allergen_regulations` | 81 | EU 알러젠 규정 |
| `labdoc_fragrance_allergen_contents` | 1,260 | 향료별 알러젠 함량 |

**총 레코드**: ~92,300 rows

---

## 4. 코드베이스 구조

```
riselab/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # 메인 페이지 (대시보드)
│   │   ├── products/
│   │   │   ├── page.tsx              # 제품 목록
│   │   │   └── [productCode]/page.tsx    # 제품 상세
│   │   └── ingredients/
│   │       └── [code]/page.tsx       # 원료 상세
│   │
│   ├── types/
│   │   └── database.ts               # Supabase 타입 정의
│   │
│   └── lib/
│       └── supabase.ts               # Supabase 클라이언트
│
├── migration_docs/                   # 마이그레이션 문서
│   ├── SUPABASE_SCHEMA_GUIDE.md      # ⭐ 테이블 스키마 가이드
│   └── ...
│
├── csv_output/                       # 추출된 CSV 데이터
│   ├── Data_prep/
│   │   └── README_UPDATED.md         # ⭐ 데이터 현황
│   └── supabase_import/              # 임포트용 CSV
│
└── HANDOVER.md                       # 이 문서
```

---

## 5. 핵심 참조 문서

### 필수 읽기 (Plan 전)

| 순서 | 문서 | 경로 | 내용 |
|:----:|------|------|------|
| 1 | **스키마 가이드** | `migration_docs/SUPABASE_SCHEMA_GUIDE.md` | 테이블 구조, ERD, 쿼리 예시 |
| 2 | **데이터 현황** | `csv_output/Data_prep/README_UPDATED.md` | 데이터 규모, 품질, 관계 |
| 3 | **타입 정의** | `src/types/database.ts` | TypeScript 인터페이스 |

### 참고 문서

| 문서 | 경로 | 내용 |
|------|------|------|
| 마이그레이션 README | `migration_docs/README_MIGRATION.md` | 마이그레이션 과정 |
| 퀵스타트 | `migration_docs/QUICKSTART.md` | 빠른 시작 가이드 |
| 구현 요약 | `migration_docs/IMPLEMENTATION_SUMMARY.md` | 구현 내역 |

---

## 6. 주요 데이터 관계

```
labdoc_products (제품)
├── product_code (PK)
│
├─► labdoc_product_bom (원료 구성)
│   └── ingredient_code → labdoc_ingredients
│
├─► labdoc_product_qc_specs (QC 규격)
├─► labdoc_product_english_specs (영문 규격)
├─► labdoc_product_revisions (개정 이력)
├─► labdoc_product_work_specs (작업 명세)
├─► labdoc_product_subsidiary_materials (부자재)
│
└─► labdoc_manufacturing_processes (제조공정)
    └─► labdoc_manufacturing_process_steps (공정 단계)

labdoc_ingredients (원료)
├── ingredient_code (PK)
├─► labdoc_ingredient_specs (원료 규격)
└─► labdoc_ingredient_components (원료 성분)

labdoc_fragrance_allergen_contents (향료 알러젠)
├── fragrance_code
└── allergen_name → labdoc_allergen_regulations (EU 규정)
```

---

## 7. 페이지별 구현 가이드

### 7.1 제품 목록 페이지 (`/products`)

**필요 기능**:
- 제품 목록 테이블 (product_code, korean_name, management_code)
- 검색 (제품명, 제품코드)
- 필터 (제형별, 기능성 여부)
- 페이지네이션 (50개/페이지)

**주요 쿼리**:
```sql
SELECT product_code, korean_name, english_name, management_code, appearance
FROM labdoc_products
ORDER BY product_code
LIMIT 50 OFFSET 0;
```

### 7.2 제품 상세 페이지 (`/products/[productCode]`)

**필요 기능**:
- 기본 정보 (제품명, 성상, 용량 등)
- BOM 탭 (원료 목록, 함량)
- QC 탭 (시험 규격)
- 알러젠 탭 (라벨링 필요 여부 계산)
- 제조공정 탭 (공정 단계)

**주요 쿼리**:
```sql
-- 제품 기본 정보
SELECT * FROM labdoc_products WHERE product_code = $1;

-- BOM
SELECT b.*, i.ingredient_name 
FROM labdoc_product_bom b
LEFT JOIN labdoc_ingredients i ON b.ingredient_code = i.ingredient_code
WHERE b.product_code = $1
ORDER BY b.sequence_no;

-- QC 규격
SELECT * FROM labdoc_product_qc_specs 
WHERE product_code = $1 
ORDER BY sequence_no;
```

### 7.3 원료 상세 페이지 (`/ingredients/[code]`)

**필요 기능**:
- 기본 정보 (원료명, 제조사, 원산지)
- 성분 목록 (INCI명, CAS번호, 함량)
- 규격 (시험항목, 기준)
- 문서 링크 (COA, MSDS)

**주요 쿼리**:
```sql
-- 원료 기본 정보
SELECT * FROM labdoc_ingredients WHERE ingredient_code = $1;

-- 성분
SELECT * FROM labdoc_ingredient_components 
WHERE ingredient_code = $1 
ORDER BY component_order;
```

### 7.4 알러젠 라벨링 계산 로직

```sql
-- 제품에 사용된 향료의 알러젠 계산
-- 향료 함량(BOM) × 향료 중 알러젠 함량 = 제품 중 알러젠 함량
SELECT 
  fac.allergen_name,
  b.content_ratio AS fragrance_ratio,
  fac.content_in_fragrance,
  (b.content_ratio * fac.content_in_fragrance / 100) AS product_content,
  ar.threshold_leave_on,
  CASE 
    WHEN (b.content_ratio * fac.content_in_fragrance / 100) > ar.threshold_leave_on 
    THEN 'YES'
    ELSE 'NO'
  END AS labeling_required
FROM labdoc_product_bom b
JOIN labdoc_fragrance_allergen_contents fac 
  ON b.ingredient_code = fac.fragrance_code
LEFT JOIN labdoc_allergen_regulations ar 
  ON UPPER(fac.allergen_name) = UPPER(ar.allergen_name)
WHERE b.product_code = $1;
```

---

## 8. 개발 환경 설정

### 필수 환경 변수 (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=https://usvjbuudnofwhmclwhfl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 개발 서버 실행

```bash
cd C:\Users\passe\Documents\@PROJECT\riselab
npm install
npm run dev
```

---

## 9. Plan 시작 시 프롬프트 예시

```
Riselab 프로젝트 - 페이지/기능 구현 Plan

## 프로젝트 개요
화장품 제조사의 제품표준서 관리 시스템. Next.js + Supabase.

## 현재 상태
- 데이터: Supabase에 15개 테이블, 92,000+ rows 임포트 완료
- 페이지: 기본 구조만 존재 (실제 UI 미구현)

## 참조 문서
1. migration_docs/SUPABASE_SCHEMA_GUIDE.md - 테이블 스키마
2. csv_output/Data_prep/README_UPDATED.md - 데이터 현황
3. src/types/database.ts - TypeScript 타입

## 구현 목표
1. 제품 목록 페이지 - 검색, 필터, 페이지네이션
2. 제품 상세 페이지 - BOM, QC, 알러젠, 제조공정 탭
3. 원료 상세 페이지 - 성분, 규격, 문서 링크
4. 알러젠 라벨링 계산 기능

## 요청
위 목표에 대한 구현 계획을 수립해주세요.
우선순위, 의존 관계, 예상 시간을 포함해주세요.
```

---

## 10. 알려진 이슈 & 주의사항

### 데이터 품질
- 일부 제품에 `management_code` NULL
- 8개 중복 제품코드 존재 (동일 제품 다른 버전)
- 알러젠 데이터는 향료 코드 기준 (BOM의 ingredient_code와 매칭 필요)

### 테이블 관계
- `labdoc_manufacturing_processes.product_code`는 FK 없음 (orphan 허용)
- 향료-알러젠은 정규화 테이블(레거시)과 flat 테이블(신규) 공존

### 코드 스타일
- TypeScript strict mode
- Tailwind CSS 사용
- App Router (not Pages Router)

---

**작성자**: Claude AI  
**최종 수정**: 2026-02-02  
**다음 작업**: /plan 명령으로 구현 계획 수립
