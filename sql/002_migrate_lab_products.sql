-- =====================================================
-- LAB_PRODUCTS 데이터 마이그레이션
-- bom_master에서 완제품-반제품 매핑 추출
-- =====================================================

-- 마이그레이션 로직 설명:
-- 1. [제품] sort에서 고유 prdcode 추출 (완제품)
-- 2. [제품]의 materialcode 중 P로 시작하는 것 = P제품코드
-- 3. [반제품] sort에서 prdcode=P제품코드인 행의 materialcode 중 B로 시작하는 것 = 반제품코드
-- 
-- 체인: 완제품(prdcode) → P제품(materialcode) → 반제품(B코드)

-- 기존 데이터 삭제 (재실행 시)
-- TRUNCATE TABLE lab_products;

-- 메인 마이그레이션 쿼리
INSERT INTO lab_products (prdcode, product_name, semi_product_code, p_product_code, category, bom_version)
WITH 
-- Step 1: 완제품 목록 (sort = '[제품]'의 고유 prdcode)
finished_products AS (
    SELECT DISTINCT 
        prdcode,
        FIRST_VALUE(생산품목명) OVER (PARTITION BY prdcode ORDER BY created_at DESC NULLS LAST) AS product_name,
        FIRST_VALUE(품목구분) OVER (PARTITION BY prdcode ORDER BY created_at DESC NULLS LAST) AS category,
        FIRST_VALUE(bom버전) OVER (PARTITION BY prdcode ORDER BY created_at DESC NULLS LAST) AS bom_version
    FROM bom_master
    WHERE sort = '[제품]'
      AND prdcode IS NOT NULL
),

-- Step 2: 완제품 → P제품 매핑 ([제품]의 materialcode 중 P로 시작)
product_to_p AS (
    SELECT DISTINCT
        prdcode,
        materialcode AS p_code
    FROM bom_master
    WHERE sort = '[제품]'
      AND materialcode LIKE 'P%'
),

-- Step 3: P제품 → 반제품(B코드) 매핑 ([반제품]에서 prdcode=P코드, materialcode가 B로 시작)
p_to_b AS (
    SELECT DISTINCT
        prdcode AS p_code,
        materialcode AS b_code
    FROM bom_master
    WHERE sort = '[반제품]'
      AND prdcode LIKE 'P%'
      AND materialcode LIKE 'B%'
),

-- Step 4: 전체 체인 조인
full_mapping AS (
    SELECT 
        fp.prdcode,
        fp.product_name,
        fp.category,
        fp.bom_version,
        p2p.p_code,
        p2b.b_code
    FROM finished_products fp
    LEFT JOIN product_to_p p2p ON fp.prdcode = p2p.prdcode
    LEFT JOIN p_to_b p2b ON p2p.p_code = p2b.p_code
)

-- 최종 삽입 (중복 prdcode 방지 - 첫 번째 B코드 선택)
SELECT DISTINCT ON (prdcode)
    prdcode,
    product_name,
    b_code AS semi_product_code,
    p_code AS p_product_code,
    category,
    bom_version
FROM full_mapping
ORDER BY prdcode, b_code NULLS LAST
ON CONFLICT (prdcode) DO UPDATE SET
    product_name = EXCLUDED.product_name,
    semi_product_code = COALESCE(EXCLUDED.semi_product_code, lab_products.semi_product_code),
    p_product_code = COALESCE(EXCLUDED.p_product_code, lab_products.p_product_code),
    category = EXCLUDED.category,
    bom_version = EXCLUDED.bom_version,
    updated_at = NOW();

-- 마이그레이션 결과 확인
SELECT 
    COUNT(*) AS total_products,
    COUNT(semi_product_code) AS with_semi_product,
    COUNT(*) - COUNT(semi_product_code) AS without_semi_product
FROM lab_products;
