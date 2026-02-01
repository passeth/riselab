-- ============================================================================
-- 제품표준서 Migration Schema v2
-- Source: Data_prep CSV files (13 files, ~107K rows total)
-- Target: Supabase (PostgreSQL)
-- Prefix: labdoc_ (to avoid conflict with existing lab_ tables)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. 제품 마스터 (Products Master)
-- Source: 01_products_master.csv (1,579 rows -> 1,571 after dedup)
-- ============================================================================
CREATE TABLE IF NOT EXISTS labdoc_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Core identifiers
  product_code TEXT UNIQUE NOT NULL,           -- 제품코드 (FJSL002)
  management_code TEXT,                        -- 관리번호 (EVCO-1000)
  
  -- Product names
  korean_name TEXT NOT NULL,                   -- 국문제품명
  english_name TEXT,                           -- 영문제품명
  
  -- Basic info
  appearance TEXT,                             -- 성상
  packaging_unit TEXT,                         -- 포장단위
  created_date DATE,                           -- 작성일자
  author TEXT,                                 -- 작성자
  usage_instructions TEXT,                     -- 사용법
  
  -- Allergen info
  allergen_korean TEXT,                        -- Allergen국문
  allergen_english TEXT,                       -- Allergen영문
  
  -- Storage & shelf life
  storage_method TEXT,                         -- 저장방법
  shelf_life TEXT,                             -- 사용기한
  
  -- Physical specs
  label_volume TEXT,                           -- 표시용량
  fill_volume TEXT,                            -- 충진용량
  specific_gravity DECIMAL(10,4),              -- 비중
  ph_standard TEXT,                            -- pH기준
  viscosity_standard TEXT,                     -- 점,경도기준
  
  -- Regulatory
  raw_material_report INT,                     -- 원료목록보고 (0/1)
  standardized_name INT,                       -- 표준화명칭적용 (0/1)
  responsible_seller INT,                      -- 책임판매업적용 (0/1)
  
  -- Labeling
  recycling_grade TEXT,                        -- 재활용등급표시
  label_position TEXT,                         -- 라벨부착위치
  functional_claim TEXT,                       -- 기능성
  
  -- ERP codes
  semi_product_code TEXT,                      -- 반제품코드
  p_product_code TEXT,                         -- 완제품코드
  
  -- Source tracking
  source_file TEXT,                            -- 원본파일
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_labdoc_products_product_code ON labdoc_products(product_code);
CREATE INDEX IF NOT EXISTS idx_labdoc_products_management_code ON labdoc_products(management_code);
CREATE INDEX IF NOT EXISTS idx_labdoc_products_korean_name ON labdoc_products(korean_name);

-- ============================================================================
-- 2. 원료 마스터 (Ingredients Master)  
-- Source: 11_ingredients_master.csv (1,066 rows)
-- ============================================================================
CREATE TABLE IF NOT EXISTS labdoc_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  ingredient_code TEXT UNIQUE NOT NULL,        -- 원료코드 (MAA-0001)
  ingredient_name TEXT NOT NULL,               -- 원료명
  manufacturer TEXT,                           -- 제조업체
  origin_country TEXT,                         -- 원산지
  purchase_type TEXT,                          -- 채거래
  purchase_method TEXT,                        -- 채거방법
  
  -- Document URLs (from ingredient_files_uploaded_summary.csv)
  coa_urls TEXT[] DEFAULT '{}',                -- COA 문서 URLs
  composition_urls TEXT[] DEFAULT '{}',        -- 성분비 문서 URLs
  msds_kr_urls TEXT[] DEFAULT '{}',            -- MSDS 국문 URLs
  msds_en_urls TEXT[] DEFAULT '{}',            -- MSDS 영문 URLs
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_labdoc_ingredients_code ON labdoc_ingredients(ingredient_code);
CREATE INDEX IF NOT EXISTS idx_labdoc_ingredients_name ON labdoc_ingredients(ingredient_name);

-- ============================================================================
-- 3. 제품 BOM (Bill of Materials)
-- Source: 02_products_bom.csv (22,524 rows)
-- ============================================================================
CREATE TABLE IF NOT EXISTS labdoc_product_bom (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  product_code TEXT NOT NULL,                  -- FK to labdoc_products.product_code
  sequence_no INT NOT NULL,                    -- 순번
  ingredient_code TEXT NOT NULL,               -- FK to labdoc_ingredients.ingredient_code
  content_ratio DECIMAL(10,6),                 -- 함량%
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(product_code, sequence_no)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_labdoc_bom_product_code ON labdoc_product_bom(product_code);
CREATE INDEX IF NOT EXISTS idx_labdoc_bom_ingredient_code ON labdoc_product_bom(ingredient_code);

-- ============================================================================
-- 4. 제품 QC 규격 (QC Specifications)
-- Source: 03_products_qc_specs.csv (56,419 rows -> ~32K after dedup)
-- ============================================================================
CREATE TABLE IF NOT EXISTS labdoc_product_qc_specs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  product_code TEXT NOT NULL,                  -- FK to labdoc_products
  qc_type TEXT NOT NULL,                       -- QC유형 (반제품/완제품)
  sequence_no INT,                             -- 순번
  test_item TEXT NOT NULL,                     -- 항목
  specification TEXT,                          -- 시험기준
  test_method TEXT,                            -- 시험방법
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_labdoc_qc_product_code ON labdoc_product_qc_specs(product_code);
CREATE INDEX IF NOT EXISTS idx_labdoc_qc_type ON labdoc_product_qc_specs(qc_type);

-- ============================================================================
-- 5. 제품 영문 규격 (English Specifications)
-- Source: 04_products_english_specs.csv (12,162 rows)
-- ============================================================================
CREATE TABLE IF NOT EXISTS labdoc_product_english_specs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  management_code TEXT NOT NULL,               -- 관리번호
  product_name TEXT,                           -- 제품명 (영문)
  product_code TEXT,                           -- 품목코드
  test_item TEXT NOT NULL,                     -- TEST
  specification TEXT,                          -- SPECIFICATION
  result TEXT,                                 -- RESULT
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_labdoc_eng_mgmt_code ON labdoc_product_english_specs(management_code);
CREATE INDEX IF NOT EXISTS idx_labdoc_eng_product_code ON labdoc_product_english_specs(product_code);

-- ============================================================================
-- 6. 제품 개정사항 (Product Revisions)
-- Source: 05_products_revisions.csv (1,226 rows -> filtered)
-- ============================================================================
CREATE TABLE IF NOT EXISTS labdoc_product_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  product_code TEXT NOT NULL,                  -- FK to labdoc_products
  revision_no INT NOT NULL,                    -- 일련번호
  revision_date DATE,                          -- 개정년월일
  revision_content TEXT,                       -- 개정사항
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(product_code, revision_no)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_labdoc_rev_product_code ON labdoc_product_revisions(product_code);

-- ============================================================================
-- 7. 향료 마스터 (Fragrances Master)
-- Source: 06_allergens_master.csv (extracted unique fragrances)
-- ============================================================================
CREATE TABLE IF NOT EXISTS labdoc_fragrances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  supplier TEXT NOT NULL,                      -- 공급업체
  fragrance_code TEXT NOT NULL,                -- 향료코드
  fragrance_name TEXT,                         -- 향료명
  source_filename TEXT,                        -- 원본 파일명
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier, fragrance_code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_labdoc_frag_code ON labdoc_fragrances(fragrance_code);

-- ============================================================================
-- 8. 알러젠 마스터 (Allergens Master)
-- Source: 06_allergens_master.csv (extracted unique allergens)
-- ============================================================================
CREATE TABLE IF NOT EXISTS labdoc_allergens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  allergen_name TEXT NOT NULL,                 -- 알러젠명
  inci_name TEXT,                              -- INCI명
  cas_no TEXT,                                 -- CAS번호
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(allergen_name, inci_name, cas_no)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_labdoc_allergen_name ON labdoc_allergens(allergen_name);

-- ============================================================================
-- 9. 향료-알러젠 연결 (Fragrance-Allergen Composition)
-- Source: 06_allergens_master.csv (8,836 rows)
-- ============================================================================
CREATE TABLE IF NOT EXISTS labdoc_fragrance_allergens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  fragrance_id UUID NOT NULL REFERENCES labdoc_fragrances(id) ON DELETE CASCADE,
  allergen_id UUID NOT NULL REFERENCES labdoc_allergens(id) ON DELETE CASCADE,
  
  content_in_fragrance DECIMAL(12,8),          -- 향료중함량
  content_in_product DECIMAL(12,8),            -- 제품중함량
  leave_on_label TEXT,                         -- Leave-on라벨
  rinse_off_label TEXT,                        -- Rinse-off라벨
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(fragrance_id, allergen_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_labdoc_fa_fragrance ON labdoc_fragrance_allergens(fragrance_id);
CREATE INDEX IF NOT EXISTS idx_labdoc_fa_allergen ON labdoc_fragrance_allergens(allergen_id);

-- ============================================================================
-- 10. 작업 규격 (Work Specifications)
-- Source: 07_products_work_specs.csv (377 rows)
-- ============================================================================
CREATE TABLE IF NOT EXISTS labdoc_product_work_specs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  management_code TEXT,                        -- 관리번호
  product_code TEXT NOT NULL,                  -- 제품코드
  product_name TEXT,                           -- 제품명
  
  contents_notes TEXT,                         -- 내용물관련사항
  production_cautions TEXT,                    -- 생산시주의사항
  label_volume TEXT,                           -- 표시용량
  fill_volume TEXT,                            -- 충진용량
  color TEXT,                                  -- 색상
  remarks TEXT,                                -- 비고
  source_filename TEXT,                        -- 원본파일명
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_labdoc_work_product_code ON labdoc_product_work_specs(product_code);
CREATE INDEX IF NOT EXISTS idx_labdoc_work_mgmt_code ON labdoc_product_work_specs(management_code);

-- ============================================================================
-- 11. 부자재 (Subsidiary Materials)
-- Source: 08_products_subsidiary_materials.csv (1,030 rows)
-- ============================================================================
CREATE TABLE IF NOT EXISTS labdoc_product_subsidiary_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  management_code TEXT,                        -- 관리번호
  product_code TEXT NOT NULL,                  -- 제품코드
  material_name TEXT NOT NULL,                 -- 부자재명
  material_spec TEXT,                          -- 부자재사양
  vendor TEXT,                                 -- 업체
  sequence_no INT,                             -- 순번 (ordering)
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_labdoc_sub_product_code ON labdoc_product_subsidiary_materials(product_code);
CREATE INDEX IF NOT EXISTS idx_labdoc_sub_mgmt_code ON labdoc_product_subsidiary_materials(management_code);

-- ============================================================================
-- 12. 제조공정 헤더 (Manufacturing Process Headers)
-- Source: 09_manufacturing_process_headers.csv (359 rows)
-- Note: FK constraint relaxed (product_code as TEXT only, not FK)
-- ============================================================================
CREATE TABLE IF NOT EXISTS labdoc_manufacturing_processes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  product_code TEXT NOT NULL,                  -- 제품코드 (some orphans, no FK)
  source_filename TEXT UNIQUE,                 -- 원본파일명 (unique identifier)
  product_name TEXT,                           -- 제품명
  
  batch_number TEXT,                           -- 배치번호
  batch_unit TEXT,                             -- 배치단위
  dept_name TEXT,                              -- 담당부서
  actual_qty TEXT,                             -- 실제수량
  mfg_date DATE,                               -- 제조일자
  operator TEXT,                               -- 작업자
  approver_1 TEXT,                             -- 승인자1
  approver_2 TEXT,                             -- 승인자2
  approver_3 TEXT,                             -- 승인자3
  notes_content TEXT,                          -- 비고내용
  total_time TEXT,                             -- 총소요시간
  special_notes TEXT,                          -- 특기사항
  step_count INT,                              -- 공정단계수
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_labdoc_mfg_product_code ON labdoc_manufacturing_processes(product_code);

-- ============================================================================
-- 13. 제조공정 단계 (Manufacturing Process Steps)
-- Source: 10_manufacturing_process_steps.csv (2,598 rows)
-- ============================================================================
CREATE TABLE IF NOT EXISTS labdoc_manufacturing_process_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  process_id UUID NOT NULL REFERENCES labdoc_manufacturing_processes(id) ON DELETE CASCADE,
  
  step_num INT NOT NULL,                       -- 단계번호
  step_type TEXT,                              -- 공정유형
  step_name TEXT,                              -- 공정명
  step_desc TEXT,                              -- 공정설명
  work_time TEXT,                              -- 작업시간
  checker TEXT,                                -- 확인자
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(process_id, step_num)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_labdoc_step_process ON labdoc_manufacturing_process_steps(process_id);

-- ============================================================================
-- 14. 원료 품질규격 (Ingredient Quality Specifications)
-- Source: 12_ingredients_specs.csv (4,106 rows)
-- ============================================================================
CREATE TABLE IF NOT EXISTS labdoc_ingredient_specs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  ingredient_code TEXT NOT NULL,               -- FK to labdoc_ingredients
  ingredient_name TEXT,                        -- 원료명
  spec_item TEXT NOT NULL,                     -- 규격항목
  spec_standard TEXT,                          -- 규격기준
  result_value TEXT,                           -- 결과값
  result_date DATE,                            -- 결과일자
  test_method TEXT,                            -- 시험방법
  remarks TEXT,                                -- 비고
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_labdoc_ing_spec_code ON labdoc_ingredient_specs(ingredient_code);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION labdoc_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_labdoc_products_updated_at ON labdoc_products;
CREATE TRIGGER update_labdoc_products_updated_at
  BEFORE UPDATE ON labdoc_products
  FOR EACH ROW EXECUTE FUNCTION labdoc_update_updated_at();

DROP TRIGGER IF EXISTS update_labdoc_ingredients_updated_at ON labdoc_ingredients;
CREATE TRIGGER update_labdoc_ingredients_updated_at
  BEFORE UPDATE ON labdoc_ingredients
  FOR EACH ROW EXECUTE FUNCTION labdoc_update_updated_at();

-- ============================================================================
-- Table Comments
-- ============================================================================

COMMENT ON TABLE labdoc_products IS '제품표준서 제품 마스터 (01_products_master.csv)';
COMMENT ON TABLE labdoc_ingredients IS '원료 마스터 (11_ingredients_master.csv + 문서 URLs)';
COMMENT ON TABLE labdoc_product_bom IS '제품 BOM - 원료 구성 (02_products_bom.csv)';
COMMENT ON TABLE labdoc_product_qc_specs IS '제품 QC 규격 (03_products_qc_specs.csv)';
COMMENT ON TABLE labdoc_product_english_specs IS '제품 영문 규격 (04_products_english_specs.csv)';
COMMENT ON TABLE labdoc_product_revisions IS '제품 개정이력 (05_products_revisions.csv)';
COMMENT ON TABLE labdoc_fragrances IS '향료 마스터 (06_allergens_master.csv에서 추출)';
COMMENT ON TABLE labdoc_allergens IS '알러젠 마스터 (06_allergens_master.csv에서 추출)';
COMMENT ON TABLE labdoc_fragrance_allergens IS '향료-알러젠 구성 (06_allergens_master.csv)';
COMMENT ON TABLE labdoc_product_work_specs IS '작업 규격 (07_products_work_specs.csv)';
COMMENT ON TABLE labdoc_product_subsidiary_materials IS '부자재 정보 (08_products_subsidiary_materials.csv)';
COMMENT ON TABLE labdoc_manufacturing_processes IS '제조공정 헤더 (09_manufacturing_process_headers.csv)';
COMMENT ON TABLE labdoc_manufacturing_process_steps IS '제조공정 단계 (10_manufacturing_process_steps.csv)';
COMMENT ON TABLE labdoc_ingredient_specs IS '원료 품질규격 (12_ingredients_specs.csv)';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
