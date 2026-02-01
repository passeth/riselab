-- ============================================================
-- Row Count Verification
-- Purpose: Verify table row counts against expected values from source Excel
-- Expected counts are based on source Excel file analysis
-- ============================================================

-- ============================================================
-- 1. SUMMARY VIEW - All Tables
-- ============================================================
SELECT 
    'labdoc_demo_products' AS table_name,
    COUNT(*) AS actual_count,
    1571 AS expected_count,
    CASE 
        WHEN COUNT(*) = 1571 THEN '✓ PASS' 
        WHEN COUNT(*) BETWEEN 1550 AND 1600 THEN '~ CLOSE'
        ELSE '✗ CHECK' 
    END AS status
FROM labdoc_demo_products

UNION ALL

SELECT 
    'labdoc_demo_ingredients',
    COUNT(*),
    1066,
    CASE 
        WHEN COUNT(*) = 1066 THEN '✓ PASS'
        WHEN COUNT(*) BETWEEN 1050 AND 1080 THEN '~ CLOSE'
        ELSE '✗ CHECK'
    END
FROM labdoc_demo_ingredients

UNION ALL

SELECT 
    'labdoc_demo_suppliers',
    COUNT(*),
    150,  -- Estimated from unique supplier codes
    CASE 
        WHEN COUNT(*) BETWEEN 100 AND 200 THEN '✓ PASS'
        ELSE '✗ CHECK'
    END
FROM labdoc_demo_suppliers

UNION ALL

SELECT 
    'labdoc_demo_purified_water_tests',
    COUNT(*),
    365,  -- Approximately 1 test per day for 2025
    CASE 
        WHEN COUNT(*) BETWEEN 350 AND 380 THEN '✓ PASS'
        ELSE '✗ CHECK'
    END
FROM labdoc_demo_purified_water_tests

UNION ALL

SELECT 
    'labdoc_demo_purified_water_test_results',
    COUNT(*),
    4380,  -- 365 tests × 12 items
    CASE 
        WHEN COUNT(*) BETWEEN 4300 AND 4500 THEN '✓ PASS'
        ELSE '✗ CHECK'
    END
FROM labdoc_demo_purified_water_test_results

UNION ALL

SELECT 
    'labdoc_demo_material_receipts',
    COUNT(*),
    11000,  -- Approximately 11,000 receipts
    CASE 
        WHEN COUNT(*) BETWEEN 10000 AND 12000 THEN '✓ PASS'
        ELSE '✗ CHECK'
    END
FROM labdoc_demo_material_receipts

UNION ALL

SELECT 
    'labdoc_demo_production_batches',
    COUNT(*),
    9600,  -- Approximately 9,600 batches
    CASE 
        WHEN COUNT(*) BETWEEN 9000 AND 10000 THEN '✓ PASS'
        ELSE '✗ CHECK'
    END
FROM labdoc_demo_production_batches

UNION ALL

SELECT 
    'labdoc_demo_finished_batches',
    COUNT(*),
    7200,  -- Approximately 7,200 finished batches
    CASE 
        WHEN COUNT(*) BETWEEN 7000 AND 7500 THEN '✓ PASS'
        ELSE '✗ CHECK'
    END
FROM labdoc_demo_finished_batches

UNION ALL

SELECT 
    'labdoc_demo_oem_products',
    COUNT(*),
    60,  -- Approximately 60 OEM products
    CASE 
        WHEN COUNT(*) BETWEEN 50 AND 70 THEN '✓ PASS'
        ELSE '✗ CHECK'
    END
FROM labdoc_demo_oem_products

ORDER BY table_name;


-- ============================================================
-- 2. DOMAIN-SPECIFIC BREAKDOWNS
-- ============================================================

-- ------------------------------------------------------------
-- 2.1 정제수 (Purified Water) Domain
-- Expected: tests × 12 = results
-- ------------------------------------------------------------
SELECT 
    '정제수 Domain' AS domain,
    t.test_count,
    r.result_count,
    t.test_count * 12 AS expected_results,
    CASE 
        WHEN r.result_count = t.test_count * 12 THEN '✓ PASS (tests × 12 = results)'
        ELSE '✗ CHECK: results should be tests × 12'
    END AS status
FROM 
    (SELECT COUNT(*) AS test_count FROM labdoc_demo_purified_water_tests) t,
    (SELECT COUNT(*) AS result_count FROM labdoc_demo_purified_water_test_results) r;

-- Verify each test has exactly 12 results
SELECT 
    'Tests with exactly 12 results' AS check_item,
    COUNT(*) AS tests_with_12_results,
    (SELECT COUNT(*) FROM labdoc_demo_purified_water_tests) AS total_tests,
    CASE 
        WHEN COUNT(*) = (SELECT COUNT(*) FROM labdoc_demo_purified_water_tests) 
        THEN '✓ PASS'
        ELSE '✗ CHECK: some tests missing results'
    END AS status
FROM (
    SELECT test_id, COUNT(*) AS result_count
    FROM labdoc_demo_purified_water_test_results
    GROUP BY test_id
    HAVING COUNT(*) = 12
) sub;


-- ------------------------------------------------------------
-- 2.2 원료입고 (Material Receipts) Domain
-- Expected: ~11,000 records
-- ------------------------------------------------------------
SELECT 
    '원료입고 Domain' AS domain,
    COUNT(*) AS total_receipts,
    COUNT(DISTINCT ingredient_code) AS unique_ingredients,
    COUNT(DISTINCT supplier_code) AS unique_suppliers,
    MIN(receipt_date) AS earliest_date,
    MAX(receipt_date) AS latest_date
FROM labdoc_demo_material_receipts;


-- ------------------------------------------------------------
-- 2.3 반완제품 (Production Batches) Domain
-- Expected: ~9,600 batches + ~7,200 finished + ~60 OEM
-- ------------------------------------------------------------
SELECT 
    '반완제품 Domain' AS domain,
    pb.batch_count AS production_batches,
    fb.finished_count AS finished_batches,
    oem.oem_count AS oem_products,
    pb.batch_count + fb.finished_count + oem.oem_count AS total_records
FROM 
    (SELECT COUNT(*) AS batch_count FROM labdoc_demo_production_batches) pb,
    (SELECT COUNT(*) AS finished_count FROM labdoc_demo_finished_batches) fb,
    (SELECT COUNT(*) AS oem_count FROM labdoc_demo_oem_products) oem;


-- ============================================================
-- 3. NULL COUNT SUMMARY
-- Verify required fields are not NULL
-- ============================================================
SELECT 
    'products.product_code NULL' AS check_item,
    COUNT(*) FILTER (WHERE product_code IS NULL) AS null_count,
    CASE WHEN COUNT(*) FILTER (WHERE product_code IS NULL) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END AS status
FROM labdoc_demo_products

UNION ALL

SELECT 
    'ingredients.ingredient_code NULL',
    COUNT(*) FILTER (WHERE ingredient_code IS NULL),
    CASE WHEN COUNT(*) FILTER (WHERE ingredient_code IS NULL) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END
FROM labdoc_demo_ingredients

UNION ALL

SELECT 
    'material_receipts.test_no NULL',
    COUNT(*) FILTER (WHERE test_no IS NULL),
    CASE WHEN COUNT(*) FILTER (WHERE test_no IS NULL) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END
FROM labdoc_demo_material_receipts

UNION ALL

SELECT 
    'production_batches.semi_test_no NULL',
    COUNT(*) FILTER (WHERE semi_test_no IS NULL),
    CASE WHEN COUNT(*) FILTER (WHERE semi_test_no IS NULL) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END
FROM labdoc_demo_production_batches

UNION ALL

SELECT 
    'finished_batches.finished_test_no NULL',
    COUNT(*) FILTER (WHERE finished_test_no IS NULL),
    CASE WHEN COUNT(*) FILTER (WHERE finished_test_no IS NULL) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END
FROM labdoc_demo_finished_batches

ORDER BY check_item;


-- ============================================================
-- 4. DUPLICATE CHECK
-- Verify unique constraints are valid
-- ============================================================
SELECT 
    'products.product_code duplicates' AS check_item,
    COUNT(*) - COUNT(DISTINCT product_code) AS duplicate_count,
    CASE WHEN COUNT(*) = COUNT(DISTINCT product_code) THEN '✓ PASS' ELSE '✗ FAIL' END AS status
FROM labdoc_demo_products

UNION ALL

SELECT 
    'ingredients.ingredient_code duplicates',
    COUNT(*) - COUNT(DISTINCT ingredient_code),
    CASE WHEN COUNT(*) = COUNT(DISTINCT ingredient_code) THEN '✓ PASS' ELSE '✗ FAIL' END
FROM labdoc_demo_ingredients

UNION ALL

SELECT 
    'suppliers.supplier_code duplicates',
    COUNT(*) - COUNT(DISTINCT supplier_code),
    CASE WHEN COUNT(*) = COUNT(DISTINCT supplier_code) THEN '✓ PASS' ELSE '✗ FAIL' END
FROM labdoc_demo_suppliers

UNION ALL

SELECT 
    'material_receipts.test_no duplicates',
    COUNT(*) - COUNT(DISTINCT test_no),
    CASE WHEN COUNT(*) = COUNT(DISTINCT test_no) THEN '✓ PASS' ELSE '✗ FAIL' END
FROM labdoc_demo_material_receipts

UNION ALL

SELECT 
    'production_batches.semi_test_no duplicates',
    COUNT(*) - COUNT(DISTINCT semi_test_no),
    CASE WHEN COUNT(*) = COUNT(DISTINCT semi_test_no) THEN '✓ PASS' ELSE '✗ FAIL' END
FROM labdoc_demo_production_batches

UNION ALL

SELECT 
    'finished_batches.finished_test_no duplicates',
    COUNT(*) - COUNT(DISTINCT finished_test_no),
    CASE WHEN COUNT(*) = COUNT(DISTINCT finished_test_no) THEN '✓ PASS' ELSE '✗ FAIL' END
FROM labdoc_demo_finished_batches

ORDER BY check_item;
