-- =====================================================
-- LAB_PRODUCTS (완제품-반제품 매핑 테이블)
-- 완제품 코드와 해당 반제품 코드를 매핑하여 성분 조회에 사용
-- =====================================================

-- 1. 테이블 생성
CREATE TABLE IF NOT EXISTS lab_products (
    prdcode VARCHAR(50) PRIMARY KEY,              -- 완제품코드
    product_name VARCHAR(200) NOT NULL,           -- 제품명
    semi_product_code VARCHAR(50),                -- 반제품코드 (B-xxx)
    p_product_code VARCHAR(50),                   -- P제품코드 (중간 참조용)
    category VARCHAR(100),                        -- 품목구분
    bom_version VARCHAR(20),                      -- BOM 버전
    status VARCHAR(20) DEFAULT 'active',          -- active, discontinued, development
    notes TEXT,                                   -- 관리자 메모
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_lab_products_semi ON lab_products(semi_product_code);
CREATE INDEX IF NOT EXISTS idx_lab_products_category ON lab_products(category);
CREATE INDEX IF NOT EXISTS idx_lab_products_status ON lab_products(status);

-- 3. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_lab_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_lab_products_updated ON lab_products;
CREATE TRIGGER trigger_lab_products_updated
    BEFORE UPDATE ON lab_products
    FOR EACH ROW
    EXECUTE FUNCTION update_lab_products_updated_at();

-- 4. 코멘트
COMMENT ON TABLE lab_products IS '완제품-반제품 매핑 테이블. 완제품의 성분은 매핑된 반제품(B코드)의 lab_components를 조회';
COMMENT ON COLUMN lab_products.prdcode IS '완제품 코드 (bom_master의 [제품] sort에서 추출)';
COMMENT ON COLUMN lab_products.semi_product_code IS '반제품 코드 (B로 시작). lab_ingredients와 조인하여 성분 조회';
COMMENT ON COLUMN lab_products.p_product_code IS 'P제품 코드 (완제품→P제품→반제품 체인의 중간값)';
