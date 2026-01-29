-- =====================================================
-- EVAS Cosmetic Ingredient Management System
-- Supabase PostgreSQL Schema (lab_ prefix)
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. LAB_INGREDIENTS (원료마스터)
-- =====================================================
CREATE TABLE IF NOT EXISTS lab_ingredients (
    code VARCHAR(20) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    manufacturer VARCHAR(200),
    supplier VARCHAR(200),
    sampling_method VARCHAR(100),
    sampling_location VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_ingredients_name ON lab_ingredients(name);
CREATE INDEX IF NOT EXISTS idx_lab_ingredients_manufacturer ON lab_ingredients(manufacturer);

-- =====================================================
-- 2. LAB_COMPONENTS (원료 성분)
-- =====================================================
CREATE TABLE IF NOT EXISTS lab_components (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ingredient_code VARCHAR(20) NOT NULL REFERENCES lab_ingredients(code) ON DELETE CASCADE,
    component_order INTEGER NOT NULL,
    inci_name_en VARCHAR(500),
    inci_name_kr VARCHAR(500),
    cas_number VARCHAR(100),
    composition_ratio DECIMAL(10,4),
    function VARCHAR(200),
    country_of_origin VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(ingredient_code, component_order)
);

CREATE INDEX IF NOT EXISTS idx_lab_components_ingredient ON lab_components(ingredient_code);
CREATE INDEX IF NOT EXISTS idx_lab_components_inci_en ON lab_components(inci_name_en);
CREATE INDEX IF NOT EXISTS idx_lab_components_cas ON lab_components(cas_number);

-- =====================================================
-- 3. LAB_TEST_SPECS (시험기준 템플릿)
-- =====================================================
CREATE TABLE IF NOT EXISTS lab_test_specs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ingredient_code VARCHAR(20) NOT NULL REFERENCES lab_ingredients(code) ON DELETE CASCADE,
    test_item VARCHAR(200) NOT NULL,
    specification VARCHAR(500) NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(ingredient_code, test_item)
);

CREATE INDEX IF NOT EXISTS idx_lab_test_specs_ingredient ON lab_test_specs(ingredient_code);

-- =====================================================
-- 4. LAB_REPORTS (시험 성적서)
-- =====================================================
CREATE TABLE IF NOT EXISTS lab_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    report_number VARCHAR(50) UNIQUE,
    ingredient_code VARCHAR(20) NOT NULL REFERENCES lab_ingredients(code),
    ingredient_name VARCHAR(200),
    lot_number VARCHAR(100) NOT NULL,
    test_date DATE NOT NULL,
    tester_name VARCHAR(100) NOT NULL,
    overall_result VARCHAR(20) DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_reports_ingredient ON lab_reports(ingredient_code);
CREATE INDEX IF NOT EXISTS idx_lab_reports_date ON lab_reports(test_date DESC);
CREATE INDEX IF NOT EXISTS idx_lab_reports_lot ON lab_reports(lot_number);
CREATE INDEX IF NOT EXISTS idx_lab_reports_number ON lab_reports(report_number);

-- =====================================================
-- 5. LAB_REPORT_ITEMS (시험 성적서 항목)
-- =====================================================
CREATE TABLE IF NOT EXISTS lab_report_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES lab_reports(id) ON DELETE CASCADE,
    test_item VARCHAR(200) NOT NULL,
    specification VARCHAR(500) NOT NULL,
    test_result VARCHAR(500),
    judgment VARCHAR(20) DEFAULT 'PENDING',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_report_items_report ON lab_report_items(report_id);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Auto-generate report number (TR + YYYYMM + 4-digit seq)
CREATE OR REPLACE FUNCTION generate_lab_report_number()
RETURNS TRIGGER AS $$
DECLARE
    year_month VARCHAR(6);
    seq_num INTEGER;
    new_number VARCHAR(50);
BEGIN
    year_month := TO_CHAR(NEW.test_date, 'YYYYMM');

    SELECT COALESCE(MAX(
        CAST(SUBSTRING(report_number FROM 8 FOR 4) AS INTEGER)
    ), 0) + 1
    INTO seq_num
    FROM lab_reports
    WHERE report_number LIKE 'TR' || year_month || '%';

    new_number := 'TR' || year_month || LPAD(seq_num::TEXT, 4, '0');
    NEW.report_number := new_number;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_lab_report_number ON lab_reports;
CREATE TRIGGER trigger_generate_lab_report_number
    BEFORE INSERT ON lab_reports
    FOR EACH ROW
    WHEN (NEW.report_number IS NULL)
    EXECUTE FUNCTION generate_lab_report_number();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_lab_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_lab_ingredients_updated ON lab_ingredients;
CREATE TRIGGER trigger_lab_ingredients_updated
    BEFORE UPDATE ON lab_ingredients
    FOR EACH ROW
    EXECUTE FUNCTION update_lab_updated_at();

DROP TRIGGER IF EXISTS trigger_lab_reports_updated ON lab_reports;
CREATE TRIGGER trigger_lab_reports_updated
    BEFORE UPDATE ON lab_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_lab_updated_at();

-- Auto-update overall_result based on item judgments
CREATE OR REPLACE FUNCTION update_lab_report_overall_result()
RETURNS TRIGGER AS $$
DECLARE
    fail_count INTEGER;
    pending_count INTEGER;
BEGIN
    SELECT
        COUNT(*) FILTER (WHERE judgment = 'FAIL'),
        COUNT(*) FILTER (WHERE judgment = 'PENDING' OR judgment IS NULL)
    INTO fail_count, pending_count
    FROM lab_report_items
    WHERE report_id = COALESCE(NEW.report_id, OLD.report_id);

    UPDATE lab_reports
    SET overall_result = CASE
        WHEN fail_count > 0 THEN 'FAIL'
        WHEN pending_count > 0 THEN 'PENDING'
        ELSE 'PASS'
    END
    WHERE id = COALESCE(NEW.report_id, OLD.report_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_lab_overall_result ON lab_report_items;
CREATE TRIGGER trigger_update_lab_overall_result
    AFTER INSERT OR UPDATE OR DELETE ON lab_report_items
    FOR EACH ROW
    EXECUTE FUNCTION update_lab_report_overall_result();

-- =====================================================
-- VIEWS
-- =====================================================

-- Ingredient summary with component count
CREATE OR REPLACE VIEW lab_ingredient_summary AS
SELECT
    i.code,
    i.name,
    i.manufacturer,
    i.supplier,
    COUNT(ic.id) as component_count,
    SUM(ic.composition_ratio) as total_ratio,
    ARRAY_AGG(ic.inci_name_en ORDER BY ic.component_order) as inci_names
FROM lab_ingredients i
LEFT JOIN lab_components ic ON i.code = ic.ingredient_code
GROUP BY i.code, i.name, i.manufacturer, i.supplier;

-- =====================================================
-- 6. LAB_PRODUCTS (완제품-반제품 매핑)
-- =====================================================
CREATE TABLE IF NOT EXISTS lab_products (
    prdcode VARCHAR(50) PRIMARY KEY,
    product_name VARCHAR(200) NOT NULL,
    semi_product_code VARCHAR(50),
    p_product_code VARCHAR(50),
    category VARCHAR(100),
    bom_version VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_products_semi ON lab_products(semi_product_code);
CREATE INDEX IF NOT EXISTS idx_lab_products_category ON lab_products(category);
CREATE INDEX IF NOT EXISTS idx_lab_products_status ON lab_products(status);

COMMENT ON TABLE lab_products IS '완제품-반제품 매핑 테이블. 완제품의 성분은 매핑된 반제품(B코드)의 lab_components를 조회';

-- lab_products updated_at trigger
DROP TRIGGER IF EXISTS trigger_lab_products_updated ON lab_products;
CREATE TRIGGER trigger_lab_products_updated
    BEFORE UPDATE ON lab_products
    FOR EACH ROW
    EXECUTE FUNCTION update_lab_updated_at();

-- Recent test reports with pass/fail counts
CREATE OR REPLACE VIEW lab_recent_reports AS
SELECT
    tr.id,
    tr.report_number,
    tr.ingredient_code,
    tr.ingredient_name,
    tr.lot_number,
    tr.test_date,
    tr.tester_name,
    tr.overall_result,
    COUNT(tri.id) as item_count,
    COUNT(*) FILTER (WHERE tri.judgment = 'PASS') as pass_count,
    COUNT(*) FILTER (WHERE tri.judgment = 'FAIL') as fail_count
FROM lab_reports tr
LEFT JOIN lab_report_items tri ON tr.id = tri.report_id
GROUP BY tr.id
ORDER BY tr.test_date DESC, tr.created_at DESC;
