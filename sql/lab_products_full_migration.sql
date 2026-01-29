-- =====================================================
-- LAB_PRODUCTS 전체 마이그레이션 SQL
-- Supabase SQL Editor에서 실행
-- =====================================================

-- ===== PART 1: 테이블 생성 =====

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

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_lab_products_semi ON lab_products(semi_product_code);
CREATE INDEX IF NOT EXISTS idx_lab_products_category ON lab_products(category);
CREATE INDEX IF NOT EXISTS idx_lab_products_status ON lab_products(status);

-- ===== PART 2: 트리거 =====

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

-- ===== PART 3: 데이터 마이그레이션 =====

-- 마이그레이션 로직:
-- 1. [제품] sort에서 고유 prdcode 추출 (완제품)
-- 2. [제품]의 materialcode 중 P로 시작하는 것 = P제품코드
-- 3. [반제품] sort에서 prdcode=P제품코드인 행의 materialcode 중 B로 시작하는 것 = 반제품코드

INSERT INTO lab_products (prdcode, product_name, semi_product_code, p_product_code, category, bom_version)
WITH 
-- Step 1: 완제품 목록
finished_products AS (
    SELECT DISTINCT ON (prdcode)
        prdcode,
        생산품목명 AS product_name,
        품목구분 AS category,
        bom버전 AS bom_version
    FROM bom_master
    WHERE sort = '[제품]'
      AND prdcode IS NOT NULL
    ORDER BY prdcode, created_at DESC NULLS LAST
),

-- Step 2: 완제품 → P제품 매핑
product_to_p AS (
    SELECT DISTINCT ON (prdcode)
        prdcode,
        materialcode AS p_code
    FROM bom_master
    WHERE sort = '[제품]'
      AND materialcode LIKE 'P%'
    ORDER BY prdcode
),

-- Step 3: P제품 → 반제품(B코드) 매핑
p_to_b AS (
    SELECT DISTINCT ON (prdcode)
        prdcode AS p_code,
        materialcode AS b_code
    FROM bom_master
    WHERE sort = '[반제품]'
      AND prdcode LIKE 'P%'
      AND materialcode LIKE 'B%'
    ORDER BY prdcode
)

-- 최종 조인
SELECT 
    fp.prdcode,
    COALESCE(fp.product_name, fp.prdcode) AS product_name,
    p2b.b_code AS semi_product_code,
    p2p.p_code AS p_product_code,
    fp.category,
    fp.bom_version
FROM finished_products fp
LEFT JOIN product_to_p p2p ON fp.prdcode = p2p.prdcode
LEFT JOIN p_to_b p2b ON p2p.p_code = p2b.p_code
ON CONFLICT (prdcode) DO UPDATE SET
    product_name = EXCLUDED.product_name,
    semi_product_code = COALESCE(EXCLUDED.semi_product_code, lab_products.semi_product_code),
    p_product_code = COALESCE(EXCLUDED.p_product_code, lab_products.p_product_code),
    category = EXCLUDED.category,
    bom_version = EXCLUDED.bom_version,
    updated_at = NOW();

-- ===== PART 4: 검증 =====

-- 마이그레이션 결과 확인
SELECT 
    '총 제품 수' AS metric,
    COUNT(*)::TEXT AS value
FROM lab_products
UNION ALL
SELECT 
    '반제품 매핑 완료',
    COUNT(*)::TEXT
FROM lab_products WHERE semi_product_code IS NOT NULL
UNION ALL
SELECT 
    '반제품 매핑 없음',
    COUNT(*)::TEXT
FROM lab_products WHERE semi_product_code IS NULL;

-- 샘플 데이터 확인
SELECT 
    prdcode,
    LEFT(product_name, 30) AS product_name,
    semi_product_code,
    p_product_code,
    category
FROM lab_products
LIMIT 20;
