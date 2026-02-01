-- ============================================================================
-- 제품표준서 Migration Schema
-- Source: 94 Excel .xls files from 04_01_제품표준서
-- Target: Supabase (PostgreSQL)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. 제품 기본 정보 (Products)
-- ============================================================================
CREATE TABLE IF NOT EXISTS lab_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- 기본사항 (입력란 A2:C11)
  korean_name TEXT NOT NULL,              -- 국문제품명 (B3)
  english_name TEXT,                      -- 영문제품명 (B4)
  management_code TEXT UNIQUE,            -- 관리번호 (B5) e.g., EVCO-1000
  created_date DATE,                      -- 작성일자 (B6)
  product_code TEXT UNIQUE NOT NULL,      -- 제품코드 (B7) e.g., FJSL002
  appearance TEXT,                        -- 성상 (B8)
  packaging_unit TEXT,                    -- 포장단위 (B9)
  author TEXT,                            -- 작성자 (B10)
  usage_instructions TEXT,                -- 사용법 (B11)
  
  -- 제품표준서 탭 추가 정보
  storage_method TEXT,                    -- 저장방법 (제품표준서 D18)
  shelf_life TEXT,                        -- 사용기한 (제품표준서 D19)
  
  -- Metadata
  source_file TEXT,                       -- 원본 Excel 파일명
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lab_products_product_code ON lab_products(product_code);
CREATE INDEX IF NOT EXISTS idx_lab_products_management_code ON lab_products(management_code);
CREATE INDEX IF NOT EXISTS idx_lab_products_korean_name ON lab_products(korean_name);

-- ============================================================================
-- 2. 제품 BOM (Product Bill of Materials)
-- ============================================================================
CREATE TABLE IF NOT EXISTS lab_product_bom (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES lab_products(id) ON DELETE CASCADE,
  
  -- BOM 데이터 (입력란 A12:C53)
  sequence_no INT NOT NULL,               -- 순번 (A열)
  material_code TEXT NOT NULL,            -- 원료코드 (B열) - references lab_ingredients
  content_ratio DECIMAL(10,6) NOT NULL,   -- 함량% (C열)
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(product_id, sequence_no)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lab_product_bom_product_id ON lab_product_bom(product_id);
CREATE INDEX IF NOT EXISTS idx_lab_product_bom_material_code ON lab_product_bom(material_code);

-- ============================================================================
-- 3. 제품 개정사항 (Product Revisions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS lab_product_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES lab_products(id) ON DELETE CASCADE,
  
  -- 개정사항 (제품표준서 A23:D27, 최대 5건)
  revision_no INT NOT NULL,               -- 일련번호 (A열)
  revision_date DATE,                     -- 개정년월일 (B열)
  revision_content TEXT,                  -- 개정사항 (C-D열)
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(product_id, revision_no)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lab_product_revisions_product_id ON lab_product_revisions(product_id);

-- ============================================================================
-- 4. 제품 QC 시험기준 (Product QC Specifications)
-- Dynamic structure - different products have different test items
-- ============================================================================
CREATE TABLE IF NOT EXISTS lab_product_qc_specs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES lab_products(id) ON DELETE CASCADE,
  
  -- QC 데이터 (입력란 E-I열)
  qc_type TEXT NOT NULL CHECK (qc_type IN ('semi_finished', 'finished')),
  sequence_no INT,                        -- 순번 (E열)
  test_item TEXT NOT NULL,                -- 항목 (F열)
  specification TEXT,                     -- 시험기준 (G:H열 merged)
  test_method TEXT,                       -- 시험방법 (I열)
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lab_product_qc_specs_product_id ON lab_product_qc_specs(product_id);
CREATE INDEX IF NOT EXISTS idx_lab_product_qc_specs_qc_type ON lab_product_qc_specs(qc_type);

-- ============================================================================
-- 5. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE lab_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_product_bom ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_product_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_product_qc_specs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all
CREATE POLICY "Allow authenticated read access" ON lab_products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON lab_product_bom
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON lab_product_revisions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON lab_product_qc_specs
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert/update/delete
CREATE POLICY "Allow authenticated write access" ON lab_products
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated write access" ON lab_product_bom
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated write access" ON lab_product_revisions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated write access" ON lab_product_qc_specs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- 6. Helper Functions
-- ============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to lab_products
CREATE TRIGGER update_lab_products_updated_at
  BEFORE UPDATE ON lab_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. Comments for Documentation
-- ============================================================================

COMMENT ON TABLE lab_products IS '제품 기본 정보 - 입력란 기본사항 + 제품표준서 추가 정보';
COMMENT ON TABLE lab_product_bom IS '제품 BOM (Bill of Materials) - 입력란 원료 함량표';
COMMENT ON TABLE lab_product_revisions IS '제품 개정사항 - 제품표준서 개정 이력';
COMMENT ON TABLE lab_product_qc_specs IS '제품 QC 시험기준 - 입력란 반제품/완제품 시험기준';

COMMENT ON COLUMN lab_products.product_code IS '제품코드 (UNIQUE) - 예: FJSL002';
COMMENT ON COLUMN lab_products.management_code IS '관리번호 (UNIQUE) - 예: EVCO-1000';
COMMENT ON COLUMN lab_product_bom.material_code IS '원료코드 - lab_ingredients 테이블 참조';
COMMENT ON COLUMN lab_product_qc_specs.qc_type IS 'QC 유형: semi_finished (반제품) or finished (완제품)';
