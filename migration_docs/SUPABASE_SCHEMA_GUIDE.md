# Supabase 테이블 구조 가이드

**프로젝트**: 에바스코스메틱 제품표준서 시스템
**작성일**: 2026-02-01 (최종 수정: 2026-02-02)
**테이블 Prefix**: `labdoc_` (기존 `lab_` 테이블과 충돌 방지)

---

## 목차

1. [전체 구조 개요](#1-전체-구조-개요)
2. [테이블 관계도 (ERD)](#2-테이블-관계도-erd)
3. [테이블별 상세 설명](#3-테이블별-상세-설명)
4. [주요 쿼리 예시](#4-주요-쿼리-예시)
5. [데이터 통계](#5-데이터-통계)

---

## 1. 전체 구조 개요

### 테이블 분류

| 분류                    | 테이블                                  | 설명                           |
| ----------------------- | --------------------------------------- | ------------------------------ |
| **마스터**        | `labdoc_products`                     | 제품 마스터 (핵심 테이블)      |
|                         | `labdoc_ingredients`                  | 원료 마스터 + 문서 URLs        |
|                         | `labdoc_fragrances`                   | 향료 마스터                    |
|                         | `labdoc_allergens`                    | 알러젠 마스터                  |
| **제품 상세**     | `labdoc_product_bom`                  | 제품별 원료 구성 (BOM)         |
|                         | `labdoc_product_qc_specs`             | 제품별 QC 시험 규격            |
|                         | `labdoc_product_english_specs`        | 영문 규격 (수출용)             |
|                         | `labdoc_product_revisions`            | 제품 개정 이력                 |
|                         | `labdoc_product_work_specs`           | 작업 명세서                    |
|                         | `labdoc_product_subsidiary_materials` | 부자재 정보                    |
| **제조공정**      | `labdoc_manufacturing_processes`      | 제조공정 헤더                  |
|                         | `labdoc_manufacturing_process_steps`  | 제조공정 단계                  |
| **원료 상세**     | `labdoc_ingredient_specs`             | 원료 품질 규격                 |
|                         | `labdoc_fragrance_allergens`          | ~~향료-알러젠 연결~~ (레거시) |
| **알러젠 (신규)** | `labdoc_allergen_regulations`         | EU 공식 81개 알러젠 규정 ✨    |
|                         | `labdoc_fragrance_allergen_contents`  | 향료별 알러젠 함량 ✨          |

### 핵심 식별자

| 식별자              | 설명                 | 예시                         |
| ------------------- | -------------------- | ---------------------------- |
| `product_code`    | 제품코드 (Primary)   | `FJSL002`, `AJBC002`     |
| `management_code` | 관리번호 (문서 기준) | `EVCO-1000`, `EVCO-1001` |
| `ingredient_code` | 원료코드             | `MAA-0001`, `MBB-0002`   |
| `fragrance_code`  | 향료코드             | `A63454`, `B12345`       |

---

## 2. 테이블 관계도 (ERD)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           MASTER TABLES                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────┐      ┌──────────────────────┐                 │
│  │  labdoc_products     │      │  labdoc_ingredients  │                 │
│  │  ──────────────────  │      │  ──────────────────  │                 │
│  │  PK: product_code    │      │  PK: ingredient_code │                 │
│  │  관리번호, 제품명,   │      │  원료명, 제조업체,   │                 │
│  │  성상, 포장단위 등   │      │  COA/MSDS URLs       │                 │
│  └──────────┬───────────┘      └──────────┬───────────┘                 │
│             │                              │                             │
│             │ 1:N                          │ 1:N                         │
│             ▼                              ▼                             │
│  ┌──────────────────────┐      ┌──────────────────────┐                 │
│  │  labdoc_product_bom  │──────│ labdoc_ingredient_   │                 │
│  │  ──────────────────  │      │ specs                │                 │
│  │  제품코드 + 순번     │      │  ──────────────────  │                 │
│  │  원료코드, 함량%     │      │  품질규격 항목       │                 │
│  └──────────────────────┘      └──────────────────────┘                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         PRODUCT DETAIL TABLES                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  labdoc_products (product_code)                                          │
│         │                                                                │
│         ├──► labdoc_product_qc_specs        (QC 시험 규격)              │
│         ├──► labdoc_product_english_specs   (영문 규격)                 │
│         ├──► labdoc_product_revisions       (개정 이력)                 │
│         ├──► labdoc_product_work_specs      (작업 명세서)               │
│         └──► labdoc_product_subsidiary_materials (부자재)               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                       FRAGRANCE & ALLERGEN TABLES                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────┐      ┌──────────────────────┐                 │
│  │  labdoc_fragrances   │      │  labdoc_allergens    │                 │
│  │  ──────────────────  │      │  ──────────────────  │                 │
│  │  PK: id (UUID)       │      │  PK: id (UUID)       │                 │
│  │  공급업체, 향료코드  │      │  알러젠명, INCI명    │                 │
│  │  향료명              │      │  CAS번호             │                 │
│  └──────────┬───────────┘      └──────────┬───────────┘                 │
│             │                              │                             │
│             │ 1:N                     N:1  │                             │
│             └──────────┬───────────────────┘                             │
│                        ▼                                                 │
│             ┌──────────────────────┐                                     │
│             │ labdoc_fragrance_    │                                     │
│             │ allergens            │                                     │
│             │ ──────────────────   │                                     │
│             │ fragrance_id (FK)    │                                     │
│             │ allergen_id (FK)     │                                     │
│             │ 향료중함량, 제품중함량│                                     │
│             └──────────────────────┘                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                       MANUFACTURING TABLES                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────┐                                        │
│  │ labdoc_manufacturing_        │                                        │
│  │ processes                    │                                        │
│  │ ────────────────────────     │                                        │
│  │ PK: id (UUID)                │                                        │
│  │ product_code (TEXT, no FK)   │  ◄── 일부 orphan 제품 존재            │
│  │ 배치정보, 승인자 등          │                                        │
│  └──────────────┬───────────────┘                                        │
│                 │                                                        │
│                 │ 1:N                                                    │
│                 ▼                                                        │
│  ┌──────────────────────────────┐                                        │
│  │ labdoc_manufacturing_        │                                        │
│  │ process_steps                │                                        │
│  │ ────────────────────────     │                                        │
│  │ FK: process_id               │                                        │
│  │ 단계번호, 공정명, 설명       │                                        │
│  └──────────────────────────────┘                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 테이블별 상세 설명

### 3.1 labdoc_products (제품 마스터)

> **용도**: 모든 화장품 제품의 기본 정보. 시스템의 핵심 테이블.

| 컬럼                    | 타입    | 설명                                                    |
| ----------------------- | ------- | ------------------------------------------------------- |
| `id`                  | UUID    | Primary Key (자동 생성)                                 |
| `product_code`        | TEXT    | **제품코드** (UNIQUE, NOT NULL) - 예: `FJSL002` |
| `management_code`     | TEXT    | 관리번호 - 예:`EVCO-1000`                             |
| `korean_name`         | TEXT    | 국문 제품명 (NOT NULL)                                  |
| `english_name`        | TEXT    | 영문 제품명                                             |
| `appearance`          | TEXT    | 성상 (예: 유백색 액상)                                  |
| `packaging_unit`      | TEXT    | 포장단위 (예: 500 mL)                                   |
| `created_date`        | DATE    | 작성일자                                                |
| `author`              | TEXT    | 작성자                                                  |
| `usage_instructions`  | TEXT    | 사용법                                                  |
| `allergen_korean`     | TEXT    | 알러젠 국문 표기                                        |
| `allergen_english`    | TEXT    | 알러젠 영문 표기                                        |
| `storage_method`      | TEXT    | 저장방법                                                |
| `shelf_life`          | TEXT    | 사용기한                                                |
| `label_volume`        | TEXT    | 표시용량                                                |
| `fill_volume`         | TEXT    | 충진용량                                                |
| `specific_gravity`    | DECIMAL | 비중                                                    |
| `ph_standard`         | TEXT    | pH 기준 (예: 5.2 ± 1.0)                                |
| `viscosity_standard`  | TEXT    | 점도 기준                                               |
| `raw_material_report` | INT     | 원료목록보고 여부 (0/1)                                 |
| `standardized_name`   | INT     | 표준화명칭 적용 (0/1)                                   |
| `responsible_seller`  | INT     | 책임판매업 적용 (0/1)                                   |
| `recycling_grade`     | TEXT    | 재활용등급표시                                          |
| `label_position`      | TEXT    | 라벨부착위치                                            |
| `functional_claim`    | TEXT    | 기능성 주장                                             |
| `semi_product_code`   | TEXT    | 반제품코드 (ERP)                                        |
| `p_product_code`      | TEXT    | 완제품코드 (ERP)                                        |
| `source_file`         | TEXT    | 원본 파일명                                             |

**인덱스**: `product_code`, `management_code`, `korean_name`

---

### 3.2 labdoc_ingredients (원료 마스터)

> **용도**: 화장품 원료 정보 및 관련 문서(COA, MSDS) URL 관리

| 컬럼                 | 타입   | 설명                                           |
| -------------------- | ------ | ---------------------------------------------- |
| `id`               | UUID   | Primary Key                                    |
| `ingredient_code`  | TEXT   | **원료코드** (UNIQUE) - 예: `MAA-0001` |
| `ingredient_name`  | TEXT   | 원료명 (NOT NULL)                              |
| `manufacturer`     | TEXT   | 제조업체                                       |
| `origin_country`   | TEXT   | 원산지                                         |
| `purchase_type`    | TEXT   | 구매유형                                       |
| `purchase_method`  | TEXT   | 구매방법                                       |
| `coa_urls`         | TEXT[] | COA 문서 URLs (배열)                           |
| `composition_urls` | TEXT[] | 성분비 문서 URLs (배열)                        |
| `msds_kr_urls`     | TEXT[] | MSDS 국문 URLs (배열)                          |
| `msds_en_urls`     | TEXT[] | MSDS 영문 URLs (배열)                          |

**인덱스**: `ingredient_code`, `ingredient_name`

---

### 3.3 labdoc_product_bom (제품 BOM)

> **용도**: 제품별 원료 구성 (Bill of Materials). 제품에 어떤 원료가 얼마나 들어가는지.

| 컬럼                | 타입    | 설명                         |
| ------------------- | ------- | ---------------------------- |
| `id`              | UUID    | Primary Key                  |
| `product_code`    | TEXT    | 제품코드 (FK → products)    |
| `sequence_no`     | INT     | 순번 (NOT NULL)              |
| `ingredient_code` | TEXT    | 원료코드 (FK → ingredients) |
| `content_ratio`   | DECIMAL | 함량 (%)                     |

**UNIQUE**: (`product_code`, `sequence_no`)

**인덱스**: `product_code`, `ingredient_code`

---

### 3.4 labdoc_product_qc_specs (QC 시험 규격)

> **용도**: 반제품/완제품 품질관리 시험 기준

| 컬럼              | 타입 | 설명                          |
| ----------------- | ---- | ----------------------------- |
| `id`            | UUID | Primary Key                   |
| `product_code`  | TEXT | 제품코드 (NOT NULL)           |
| `qc_type`       | TEXT | QC 유형 (반제품/완제품)       |
| `sequence_no`   | INT  | 순번                          |
| `test_item`     | TEXT | 시험 항목 (성상, pH, 비중 등) |
| `specification` | TEXT | 시험 기준                     |
| `test_method`   | TEXT | 시험 방법                     |

**인덱스**: `product_code`, `qc_type`

---

### 3.5 labdoc_product_english_specs (영문 규격)

> **용도**: 수출용 영문 성적서. 해외 바이어 제출용.

| 컬럼                | 타입 | 설명                |
| ------------------- | ---- | ------------------- |
| `id`              | UUID | Primary Key         |
| `management_code` | TEXT | 관리번호 (NOT NULL) |
| `product_name`    | TEXT | 영문 제품명         |
| `product_code`    | TEXT | 품목코드            |
| `test_item`       | TEXT | TEST 항목           |
| `specification`   | TEXT | SPECIFICATION       |
| `result`          | TEXT | RESULT              |

**인덱스**: `management_code`, `product_code`

---

### 3.6 labdoc_product_revisions (개정 이력)

> **용도**: 제품표준서 개정 이력 추적

| 컬럼                 | 타입 | 설명                |
| -------------------- | ---- | ------------------- |
| `id`               | UUID | Primary Key         |
| `product_code`     | TEXT | 제품코드 (NOT NULL) |
| `revision_no`      | INT  | 개정 일련번호       |
| `revision_date`    | DATE | 개정일              |
| `revision_content` | TEXT | 개정 내용           |

**UNIQUE**: (`product_code`, `revision_no`)

---

### 3.7 labdoc_fragrances (향료 마스터)

> **용도**: 향료 정보. 공급업체별 향료 코드 관리.

| 컬럼                | 타입 | 설명                                                 |
| ------------------- | ---- | ---------------------------------------------------- |
| `id`              | UUID | Primary Key (**fragrance_allergens에서 참조**) |
| `supplier`        | TEXT | 공급업체 (고려에프엔에프, 서울향료 등)               |
| `fragrance_code`  | TEXT | 향료코드                                             |
| `fragrance_name`  | TEXT | 향료명                                               |
| `source_filename` | TEXT | 원본 파일명                                          |

**UNIQUE**: (`supplier`, `fragrance_code`)

---

### 3.8 labdoc_allergens (알러젠 마스터)

> **용도**: EU 26종 알러젠 등 화장품 알러젠 정보

| 컬럼              | 타입 | 설명                                                 |
| ----------------- | ---- | ---------------------------------------------------- |
| `id`            | UUID | Primary Key (**fragrance_allergens에서 참조**) |
| `allergen_name` | TEXT | 알러젠명 (NOT NULL)                                  |
| `inci_name`     | TEXT | INCI 명칭                                            |
| `cas_no`        | TEXT | CAS 번호                                             |

**UNIQUE**: (`allergen_name`, `inci_name`, `cas_no`)

---

### 3.9 labdoc_fragrance_allergens (향료-알러젠 연결) - 레거시

> ⚠️ **이 테이블은 레거시입니다.** 아래 3.15, 3.16의 신규 구조로 대체되었습니다.
>
> **용도**: 향료에 포함된 알러젠 함량 정보. N:M 관계 테이블.

| 컬럼                     | 타입    | 설명                            |
| ------------------------ | ------- | ------------------------------- |
| `id`                   | UUID    | Primary Key                     |
| `fragrance_id`         | UUID    | FK → fragrances.id             |
| `allergen_id`          | UUID    | FK → allergens.id              |
| `content_in_fragrance` | DECIMAL | 향료 중 함량 (%)                |
| `content_in_product`   | DECIMAL | 제품 중 함량 (%)                |
| `leave_on_label`       | TEXT    | Leave-on 제품 라벨링 필요 여부  |
| `rinse_off_label`      | TEXT    | Rinse-off 제품 라벨링 필요 여부 |

**UNIQUE**: (`fragrance_id`, `allergen_id`)

---

### 3.10 labdoc_product_work_specs (작업 명세서)

> **용도**: 생산 현장 작업 지시 정보

| 컬럼                    | 타입 | 설명                |
| ----------------------- | ---- | ------------------- |
| `id`                  | UUID | Primary Key         |
| `management_code`     | TEXT | 관리번호            |
| `product_code`        | TEXT | 제품코드 (NOT NULL) |
| `product_name`        | TEXT | 제품명              |
| `contents_notes`      | TEXT | 내용물 관련 사항    |
| `production_cautions` | TEXT | 생산 시 주의사항    |
| `label_volume`        | TEXT | 표시용량            |
| `fill_volume`         | TEXT | 충진용량            |
| `color`               | TEXT | 색상                |
| `remarks`             | TEXT | 비고                |
| `source_filename`     | TEXT | 원본 파일명         |

---

### 3.11 labdoc_product_subsidiary_materials (부자재)

> **용도**: 제품 포장에 사용되는 부자재(용기, 캡, 펌프 등) 정보

| 컬럼                | 타입 | 설명                |
| ------------------- | ---- | ------------------- |
| `id`              | UUID | Primary Key         |
| `management_code` | TEXT | 관리번호            |
| `product_code`    | TEXT | 제품코드 (NOT NULL) |
| `material_name`   | TEXT | 부자재명 (NOT NULL) |
| `material_spec`   | TEXT | 부자재 사양         |
| `vendor`          | TEXT | 공급업체            |
| `sequence_no`     | INT  | 순번                |

---

### 3.12 labdoc_manufacturing_processes (제조공정 헤더)

> **용도**: 제조공정지시기록서 헤더. 배치 정보, 승인자 등 메타데이터.
>
> **참고**: 하나의 공정도(source_filename)가 여러 품목코드에 적용될 수 있음 (1:N 관계).
> 예: `BTBC004~10_바스파...xlsx` → BTBC004, BTBC005, ..., BTBC010 품목에 동일 공정 적용

| 컬럼                | 타입 | 설명                                                |
| ------------------- | ---- | --------------------------------------------------- |
| `id`              | UUID | Primary Key (**process_steps에서 참조**)      |
| `product_code`    | TEXT | 제품코드 (NOT NULL,**FK 없음** - orphan 허용) |
| `source_filename` | TEXT | 원본 파일명                                         |
| `product_name`    | TEXT | 제품명                                              |
| `batch_number`    | TEXT | 배치번호                                            |
| `batch_unit`      | TEXT | 배치단위 (Kg)                                       |
| `dept_name`       | TEXT | 담당부서                                            |
| `actual_qty`      | TEXT | 실생산량                                            |
| `mfg_date`        | DATE | 제조일자                                            |
| `operator`        | TEXT | 작업자                                              |
| `approver_1`      | TEXT | 승인자 1                                            |
| `approver_2`      | TEXT | 승인자 2                                            |
| `approver_3`      | TEXT | 승인자 3                                            |
| `notes_content`   | TEXT | 비고/유의사항                                       |
| `total_time`      | TEXT | 총소요시간                                          |
| `special_notes`   | TEXT | 특기사항                                            |
| `step_count`      | INT  | 공정 단계 수                                        |

**UNIQUE**: (`product_code`, `source_filename`) - 동일 품목+파일 조합 중복 방지

---

### 3.13 labdoc_manufacturing_process_steps (제조공정 단계)

> **용도**: 제조공정 상세 단계. 공정순서, 작업내용, 시간 등.
>
> **참고**: 동일 품목이 여러 공정도에서 참조될 수 있어 중복 허용됨.

| 컬럼           | 타입 | 설명                                        |
| -------------- | ---- | ------------------------------------------- |
| `id`         | UUID | Primary Key                                 |
| `process_id` | UUID | FK → manufacturing_processes.id (NOT NULL) |
| `step_num`   | INT  | 단계번호 (NOT NULL)                         |
| `step_type`  | TEXT | 공정유형 (제조공정/검사 등)                 |
| `step_name`  | TEXT | 공정명 (청결상태 점검, 유화 등)             |
| `step_desc`  | TEXT | 공정 설명 (상세 작업 내용)                  |
| `work_time`  | TEXT | 작업시간                                    |
| `checker`    | TEXT | 확인자                                      |

**인덱스**: `process_id`, `step_num`

---

### 3.14 labdoc_ingredient_specs (원료 품질규격)

> **용도**: 원료별 품질관리 규격 (입고 검사 기준)

| 컬럼                | 타입 | 설명                            |
| ------------------- | ---- | ------------------------------- |
| `id`              | UUID | Primary Key                     |
| `ingredient_code` | TEXT | 원료코드 (NOT NULL)             |
| `ingredient_name` | TEXT | 원료명                          |
| `spec_item`       | TEXT | 규격 항목 (성상, 중금속, pH 등) |
| `spec_standard`   | TEXT | 규격 기준                       |
| `result_value`    | TEXT | 검사 결과값                     |
| `result_date`     | DATE | 검사일                          |
| `test_method`     | TEXT | 시험방법                        |
| `remarks`         | TEXT | 비고                            |

---

### 3.15 labdoc_allergen_regulations (EU 알러젠 규정) ✨ NEW

> **용도**: EU 화장품 규정(EC No 1223/2009)에 따른 공식 알러젠 목록 및 라벨링 임계값.
>
> **배경**: EU는 화장품에 포함된 알러젠이 특정 농도를 초과할 경우 성분 표시를 의무화함.
>
> - Leave-on 제품: 0.001% (10 ppm) 초과 시 표시
> - Rinse-off 제품: 0.01% (100 ppm) 초과 시 표시

| 컬럼                    | 타입      | 설명                               |
| ----------------------- | --------- | ---------------------------------- |
| `id`                  | SERIAL    | Primary Key (자동 증가)            |
| `allergen_name`       | TEXT      | 알러젠명 (영문, NOT NULL, UNIQUE)  |
| `inci_name`           | TEXT      | INCI 명칭                          |
| `cas_no`              | TEXT      | CAS 번호                           |
| `threshold_leave_on`  | DECIMAL   | Leave-on 임계값 (기본값: 0.001%)   |
| `threshold_rinse_off` | DECIMAL   | Rinse-off 임계값 (기본값: 0.01%)   |
| `annex_ref`           | TEXT      | EU Cosmetics Regulation Annex 참조 |
| `created_at`          | TIMESTAMP | 생성일시                           |

**레코드 수**: 81개 (EU 공식 알러젠)

**주요 알러젠 예시**:

- LINALOOL (78-70-6) - 라벤더, 베르가못 등에 포함
- LIMONENE (5989-27-5) - 감귤류 향에 포함
- CITRONELLOL (106-22-9) - 장미, 제라늄 향에 포함
- GERANIOL (106-24-1) - 장미 향에 포함
- HEXYL CINNAMAL (101-86-0) - 재스민 향에 포함

---

### 3.16 labdoc_fragrance_allergen_contents (향료별 알러젠 함량) ✨ NEW

> **용도**: 공급업체별 향료에 포함된 알러젠 함량 데이터. 단순화된 flat 구조.
>
> **설계 철학**: 기존 정규화 구조(fragrances → fragrance_allergens → allergens)를 단순화하여
> 실무에서 바로 활용 가능한 형태로 저장. JOIN 없이 직접 조회 가능.

| 컬럼                     | 타입      | 설명                           |
| ------------------------ | --------- | ------------------------------ |
| `id`                   | SERIAL    | Primary Key (자동 증가)        |
| `supplier`             | TEXT      | 공급업체명 (고려에프엔에프 등) |
| `fragrance_code`       | TEXT      | 향료코드 (NOT NULL)            |
| `fragrance_name`       | TEXT      | 향료명                         |
| `allergen_name`        | TEXT      | 알러젠명 (영문, NOT NULL)      |
| `cas_no`               | TEXT      | CAS 번호                       |
| `content_in_fragrance` | DECIMAL   | 향료 중 함량 (%, NOT NULL)     |
| `source_filename`      | TEXT      | 원본 파일명                    |
| `created_at`           | TIMESTAMP | 생성일시                       |

**레코드 수**: 1,843개

**UNIQUE**: (`fragrance_code`, `fragrance_name`, `allergen_name`)

> ⚠️ 동일 향료코드에 여러 변형 존재 (예: 29954/BF, 29954/LF, 29954)

**인덱스**: `fragrance_code`, `allergen_name`, `supplier`

**사용 예시**:

```sql
-- 특정 향료의 알러젠 정보 조회
SELECT 
    allergen_name,
    cas_no,
    content_in_fragrance
FROM labdoc_fragrance_allergen_contents
WHERE fragrance_code = 'A63454'
ORDER BY content_in_fragrance DESC;

-- 라벨링 필요 여부 판단 (향료 1% 함유 제품 기준)
SELECT 
    fac.allergen_name,
    fac.content_in_fragrance,
    fac.content_in_fragrance * 0.01 AS content_in_product,  -- 향료 1% 함유 시
    ar.threshold_leave_on,
    CASE 
        WHEN fac.content_in_fragrance * 0.01 > ar.threshold_leave_on 
        THEN '라벨링 필요'
        ELSE '불필요'
    END AS leave_on_labeling
FROM labdoc_fragrance_allergen_contents fac
JOIN labdoc_allergen_regulations ar 
    ON UPPER(fac.allergen_name) = UPPER(ar.allergen_name)
WHERE fac.fragrance_code = 'A63454';
```

---

## 4. 주요 쿼리 예시

### 4.1 제품 정보 조회

```sql
-- 제품코드로 전체 정보 조회
SELECT * FROM labdoc_products 
WHERE product_code = 'FJSL002';

-- 제품명 검색 (한글)
SELECT product_code, korean_name, english_name, appearance
FROM labdoc_products
WHERE korean_name ILIKE '%모이스처%';
```

### 4.2 제품 BOM 조회

```sql
-- 특정 제품의 원료 구성
SELECT 
    b.sequence_no,
    b.ingredient_code,
    i.ingredient_name,
    b.content_ratio
FROM labdoc_product_bom b
LEFT JOIN labdoc_ingredients i ON b.ingredient_code = i.ingredient_code
WHERE b.product_code = 'FJSL002'
ORDER BY b.sequence_no;
```

### 4.3 QC 규격 조회

```sql
-- 반제품 QC 규격
SELECT test_item, specification, test_method
FROM labdoc_product_qc_specs
WHERE product_code = 'FJSL002' 
  AND qc_type = '반제품'
ORDER BY sequence_no;
```

### 4.4 알러젠 정보 조회 (신규 구조) ✨

```sql
-- 특정 향료의 알러젠 정보 (단순 조회)
SELECT 
    fragrance_name,
    allergen_name,
    cas_no,
    content_in_fragrance
FROM labdoc_fragrance_allergen_contents
WHERE fragrance_code = 'A63454'
ORDER BY content_in_fragrance DESC;

-- 라벨링 필요 여부 판단 (향료 함량 기반)
-- 예: 제품에 향료가 0.5% 함유된 경우
SELECT 
    fac.allergen_name,
    fac.content_in_fragrance AS "향료중함량(%)",
    ROUND(fac.content_in_fragrance * 0.005, 6) AS "제품중함량(%)",  -- 0.5% 향료 함유
    ar.threshold_leave_on AS "Leave-on임계값",
    CASE 
        WHEN fac.content_in_fragrance * 0.005 > ar.threshold_leave_on 
        THEN '✅ 필요'
        ELSE '❌ 불필요'
    END AS "라벨링필요"
FROM labdoc_fragrance_allergen_contents fac
LEFT JOIN labdoc_allergen_regulations ar 
    ON UPPER(TRIM(fac.allergen_name)) = UPPER(TRIM(ar.allergen_name))
WHERE fac.fragrance_code = 'A63454'
  AND fac.content_in_fragrance * 0.005 > 0.001  -- 유의미한 함량만
ORDER BY fac.content_in_fragrance DESC;

-- EU 규정 알러젠 목록 조회
SELECT allergen_name, inci_name, cas_no, threshold_leave_on, threshold_rinse_off
FROM labdoc_allergen_regulations
ORDER BY allergen_name;
```

### 4.4.1 알러젠 정보 조회 (레거시 구조)

> ⚠️ 아래 쿼리는 레거시 테이블 구조용입니다. 신규 프로젝트는 위 4.4 쿼리를 사용하세요.

```sql
-- 특정 향료의 알러젠 정보 (레거시)
SELECT 
    f.fragrance_name,
    a.allergen_name,
    a.inci_name,
    fa.content_in_fragrance,
    fa.leave_on_label
FROM labdoc_fragrance_allergens fa
JOIN labdoc_fragrances f ON fa.fragrance_id = f.id
JOIN labdoc_allergens a ON fa.allergen_id = a.id
WHERE f.fragrance_code = 'A63454'
ORDER BY fa.content_in_fragrance DESC;
```

### 4.5 제조공정 조회

```sql
-- 제품의 제조공정 전체 조회
SELECT 
    mp.product_name,
    mp.batch_unit,
    ms.step_num,
    ms.step_name,
    ms.step_desc,
    ms.work_time
FROM labdoc_manufacturing_processes mp
JOIN labdoc_manufacturing_process_steps ms ON mp.id = ms.process_id
WHERE mp.product_code = 'ADML000'
ORDER BY ms.step_num;
```

### 4.6 원료 문서 URL 조회

```sql
-- 특정 원료의 모든 문서 URL
SELECT 
    ingredient_code,
    ingredient_name,
    coa_urls,
    msds_kr_urls,
    msds_en_urls
FROM labdoc_ingredients
WHERE ingredient_code = 'MAA-0001';
```

### 4.7 통합 제품 뷰 (Dashboard용)

```sql
-- 제품 요약 정보 (BOM 수, QC 항목 수 포함)
SELECT 
    p.product_code,
    p.korean_name,
    p.management_code,
    COUNT(DISTINCT b.id) as bom_count,
    COUNT(DISTINCT q.id) as qc_count
FROM labdoc_products p
LEFT JOIN labdoc_product_bom b ON p.product_code = b.product_code
LEFT JOIN labdoc_product_qc_specs q ON p.product_code = q.product_code
GROUP BY p.product_code, p.korean_name, p.management_code
ORDER BY p.product_code;
```

---

## 5. 데이터 통계

### 테이블별 레코드 수

| 테이블                              |        레코드 수 | 비고                          |
| ----------------------------------- | ---------------: | ----------------------------- |
| labdoc_products                     |            1,571 | 제품 마스터                   |
| labdoc_ingredients                  |            1,066 | 원료 마스터                   |
| labdoc_product_bom                  |           22,524 | 제품당 평균 14개 원료         |
| labdoc_product_qc_specs             |           32,736 | 제품당 평균 21개 항목         |
| labdoc_product_english_specs        |           11,857 | 수출용 영문규격               |
| labdoc_product_revisions            |              199 | 개정 이력                     |
| labdoc_fragrances                   |              211 | 향료 마스터                   |
| labdoc_allergens                    |              299 | 알러젠 마스터                 |
| labdoc_fragrance_allergens          |            6,274 | 향료-알러젠 연결              |
| labdoc_product_work_specs           |              377 | 작업명세서                    |
| labdoc_product_subsidiary_materials |            1,030 | 부자재                        |
| labdoc_manufacturing_processes      |            1,232 | 제조공정 헤더 (1:N 펼침 적용) |
| labdoc_manufacturing_process_steps  |            9,221 | 제조공정 단계 (1:N 펼침 적용) |
| labdoc_ingredient_specs             |            4,106 | 원료 규격                     |
| labdoc_allergen_regulations         |               81 | EU 알러젠 규정 ✨             |
| labdoc_fragrance_allergen_contents  |            1,843 | 향료별 알러젠 함량 ✨         |
| **총계**                      | **94,627** |                               |

### 주요 관계 통계

- **제품당 평균 원료 수**: 14.3개
- **제품당 평균 QC 항목**: 20.8개
- **제조공정 평균 단계**: 7.5개
- **향료당 평균 알러젠**: 29.7개

---

## 부록: 테이블 생성 SQL

전체 스키마는 `migration_docs/schema_labdoc_v2.sql` 파일 참조.

## fragrance db 나중에 BOM 코드로 수정하는 쿼리

-- Bergamot Oil -> ZMM-0046
UPDATE labdoc_fragrances SET fragrance_code = 'ZMM-0046' WHERE fragrance_code = 'Bergamot Oil';
-- Cypress Oil -> MFS-0097
UPDATE labdoc_fragrances SET fragrance_code = 'MFS-0097' WHERE fragrance_code = 'Cypress Oil';
-- EUCALYPTUS OIL -> MFE-0020
UPDATE labdoc_fragrances SET fragrance_code = 'MFE-0020' WHERE fragrance_code = 'EUCALYPTUS OIL';
-- Litsea Cubeba Oil -> MFL-0011
UPDATE labdoc_fragrances SET fragrance_code = 'MFL-0011' WHERE fragrance_code = 'Litsea Cubeba Oil';
-- Peppermint Oil -> MFP-0038
UPDATE labdoc_fragrances SET fragrance_code = 'MFP-0038' WHERE fragrance_code = 'Peppermint Oil';
-- Tea Tree Oil -> MOT-0002
UPDATE labdoc_fragrances SET fragrance_code = 'MOT-0002' WHERE fragrance_code = 'Tea Tree Oil';
-- COLLAGEN 100813 -> MFC-0022
UPDATE labdoc_fragrances SET fragrance_code = 'MFC-0022' WHERE fragrance_code = 'COLLAGEN 100813';

---

## 변경 이력

| 날짜       | 버전  | 변경 내용                                                                                                                                                                                                                                               |
| ---------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-02-01 | 1.0   | 초기 작성                                                                                                                                                                                                                                               |
| 2026-02-01 | 1.1   | 제조공정 테이블 스키마 변경: (1)`source_filename` UNIQUE → `(product_code, source_filename)` 복합 UNIQUE, (2) `(process_id, step_num)` UNIQUE 제약 삭제. 1:N 품목코드 매핑 데이터 반영 (359→1,232행, 2,511→9,221행)                            |
| 2026-02-02 | 1.2   | 알러젠 테이블 재구조화: (1)`labdoc_allergen_regulations` 추가 (EU 공식 81개 알러젠), (2) `labdoc_fragrance_allergen_contents` 추가 (향료별 알러젠 함량 1,843행), (3) 기존 정규화 테이블(fragrances, allergens, fragrance_allergens)은 레거시로 표시 |
| 2026-02-02 | 1.2.1 | `labdoc_fragrance_allergen_contents` UNIQUE 제약 변경: `(fragrance_code, allergen_name)` → `(fragrance_code, fragrance_name, allergen_name)`. 동일 향료코드에 변형(BF/LF) 존재로 인한 중복 오류 해결                                             |

---

**작성자**: Claude AI
**최종 수정**: 2026-02-02
**버전**: 1.2.1
