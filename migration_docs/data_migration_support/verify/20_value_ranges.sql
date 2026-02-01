-- ============================================================
-- Value Range Validation
-- Purpose: Check for out-of-bounds values in numeric/date fields
-- ============================================================

-- ============================================================
-- 1. pH VALUE VALIDATION (0 ~ 14)
-- ============================================================

-- ------------------------------------------------------------
-- 1.1 purified_water pH values
-- Expected: 5.0 ~ 7.0 (normal purified water range)
-- Acceptable: 0 ~ 14 (valid pH scale)
-- ------------------------------------------------------------
SELECT 
    'purified_water pH' AS check_item,
    MIN(result_numeric) AS min_val,
    MAX(result_numeric) AS max_val,
    AVG(result_numeric)::NUMERIC(5,2) AS avg_val,
    COUNT(*) AS total_records,
    COUNT(*) FILTER (WHERE result_numeric < 0 OR result_numeric > 14) AS violations,
    CASE 
        WHEN COUNT(*) FILTER (WHERE result_numeric < 0 OR result_numeric > 14) = 0 
        THEN '✓ PASS (all within 0-14)'
        ELSE '✗ FAIL: ' || COUNT(*) FILTER (WHERE result_numeric < 0 OR result_numeric > 14) || ' violations'
    END AS status
FROM labdoc_demo_purified_water_test_results
WHERE test_item_code = 'ph';


-- ------------------------------------------------------------
-- 1.2 production_batches pH values
-- Expected: 3.0 ~ 9.0 (typical cosmetic product range)
-- Acceptable: 0 ~ 14 (valid pH scale)
-- ------------------------------------------------------------
SELECT 
    'production_batches pH' AS check_item,
    MIN(ph_value) AS min_val,
    MAX(ph_value) AS max_val,
    AVG(ph_value)::NUMERIC(5,2) AS avg_val,
    COUNT(*) AS total_records,
    COUNT(*) FILTER (WHERE ph_value < 0 OR ph_value > 14) AS violations,
    CASE 
        WHEN COUNT(*) FILTER (WHERE ph_value < 0 OR ph_value > 14) = 0 
        THEN '✓ PASS'
        ELSE '✗ FAIL'
    END AS status
FROM labdoc_demo_production_batches
WHERE ph_value IS NOT NULL;


-- ------------------------------------------------------------
-- 1.3 finished_batches pH values
-- Expected: 3.0 ~ 9.0 (typical cosmetic product range)
-- Acceptable: 0 ~ 14 (valid pH scale)
-- ------------------------------------------------------------
SELECT 
    'finished_batches pH' AS check_item,
    MIN(ph_value) AS min_val,
    MAX(ph_value) AS max_val,
    AVG(ph_value)::NUMERIC(5,2) AS avg_val,
    COUNT(*) AS total_records,
    COUNT(*) FILTER (WHERE ph_value < 0 OR ph_value > 14) AS violations,
    CASE 
        WHEN COUNT(*) FILTER (WHERE ph_value < 0 OR ph_value > 14) = 0 
        THEN '✓ PASS'
        ELSE '✗ FAIL'
    END AS status
FROM labdoc_demo_finished_batches
WHERE ph_value IS NOT NULL;


-- ============================================================
-- 2. QUANTITY VALIDATION (>= 0)
-- ============================================================

-- ------------------------------------------------------------
-- 2.1 material_receipts quantity_kg
-- Expected: > 0 (positive quantities)
-- Acceptable: >= 0 (no negative)
-- ------------------------------------------------------------
SELECT 
    'material_receipts quantity_kg' AS check_item,
    MIN(quantity_kg) AS min_val,
    MAX(quantity_kg) AS max_val,
    AVG(quantity_kg)::NUMERIC(10,2) AS avg_val,
    COUNT(*) AS total_records,
    COUNT(*) FILTER (WHERE quantity_kg < 0) AS negative_violations,
    COUNT(*) FILTER (WHERE quantity_kg = 0) AS zero_count,
    CASE 
        WHEN COUNT(*) FILTER (WHERE quantity_kg < 0) = 0 
        THEN '✓ PASS (no negatives)'
        ELSE '✗ FAIL: ' || COUNT(*) FILTER (WHERE quantity_kg < 0) || ' negative values'
    END AS status
FROM labdoc_demo_material_receipts;


-- ------------------------------------------------------------
-- 2.2 production_batches batch_size_kg
-- Expected: > 0 (positive batch sizes)
-- ------------------------------------------------------------
SELECT 
    'production_batches batch_size_kg' AS check_item,
    MIN(batch_size_kg) AS min_val,
    MAX(batch_size_kg) AS max_val,
    AVG(batch_size_kg)::NUMERIC(10,2) AS avg_val,
    COUNT(*) AS total_records,
    COUNT(*) FILTER (WHERE batch_size_kg < 0) AS negative_violations,
    CASE 
        WHEN COUNT(*) FILTER (WHERE batch_size_kg < 0) = 0 
        THEN '✓ PASS'
        ELSE '✗ FAIL'
    END AS status
FROM labdoc_demo_production_batches
WHERE batch_size_kg IS NOT NULL;


-- ============================================================
-- 3. YIELD/PERCENTAGE VALIDATION (0 ~ 110%)
-- ============================================================

-- ------------------------------------------------------------
-- 3.1 production_batches packaging_yield
-- Expected: 95% ~ 102% (typical manufacturing range)
-- Acceptable: 0% ~ 110% (allowing some overfill)
-- ------------------------------------------------------------
SELECT 
    'production_batches packaging_yield' AS check_item,
    MIN(packaging_yield) AS min_val,
    MAX(packaging_yield) AS max_val,
    AVG(packaging_yield)::NUMERIC(5,2) AS avg_val,
    COUNT(*) AS total_records,
    COUNT(*) FILTER (WHERE packaging_yield < 0) AS below_zero,
    COUNT(*) FILTER (WHERE packaging_yield > 110) AS above_110,
    CASE 
        WHEN COUNT(*) FILTER (WHERE packaging_yield < 0 OR packaging_yield > 110) = 0 
        THEN '✓ PASS (0-110%)'
        ELSE '✗ CHECK: ' || COUNT(*) FILTER (WHERE packaging_yield < 0 OR packaging_yield > 110) || ' out of range'
    END AS status
FROM labdoc_demo_production_batches
WHERE packaging_yield IS NOT NULL;


-- ------------------------------------------------------------
-- 3.2 finished_batches fill_rate/yield
-- Expected: 95% ~ 105%
-- ------------------------------------------------------------
SELECT 
    'finished_batches fill_rate' AS check_item,
    MIN(fill_rate) AS min_val,
    MAX(fill_rate) AS max_val,
    AVG(fill_rate)::NUMERIC(5,2) AS avg_val,
    COUNT(*) AS total_records,
    COUNT(*) FILTER (WHERE fill_rate < 0 OR fill_rate > 110) AS violations,
    CASE 
        WHEN COUNT(*) FILTER (WHERE fill_rate < 0 OR fill_rate > 110) = 0 
        THEN '✓ PASS'
        ELSE '✗ CHECK'
    END AS status
FROM labdoc_demo_finished_batches
WHERE fill_rate IS NOT NULL;


-- ============================================================
-- 4. DATE VALIDATION
-- ============================================================

-- ------------------------------------------------------------
-- 4.1 Required dates NOT NULL
-- ------------------------------------------------------------
SELECT 
    'material_receipts.receipt_date NULL' AS check_item,
    COUNT(*) AS total_records,
    COUNT(*) FILTER (WHERE receipt_date IS NULL) AS null_count,
    CASE 
        WHEN COUNT(*) FILTER (WHERE receipt_date IS NULL) = 0 
        THEN '✓ PASS'
        ELSE '✗ FAIL: ' || COUNT(*) FILTER (WHERE receipt_date IS NULL) || ' NULL values'
    END AS status
FROM labdoc_demo_material_receipts

UNION ALL

SELECT 
    'production_batches.manufacture_date NULL',
    COUNT(*),
    COUNT(*) FILTER (WHERE manufacture_date IS NULL),
    CASE 
        WHEN COUNT(*) FILTER (WHERE manufacture_date IS NULL) = 0 
        THEN '✓ PASS'
        ELSE '✗ FAIL: ' || COUNT(*) FILTER (WHERE manufacture_date IS NULL) || ' NULL values'
    END
FROM labdoc_demo_production_batches

UNION ALL

SELECT 
    'finished_batches.manufacture_date NULL',
    COUNT(*),
    COUNT(*) FILTER (WHERE manufacture_date IS NULL),
    CASE 
        WHEN COUNT(*) FILTER (WHERE manufacture_date IS NULL) = 0 
        THEN '✓ PASS'
        ELSE '✗ FAIL: ' || COUNT(*) FILTER (WHERE manufacture_date IS NULL) || ' NULL values'
    END
FROM labdoc_demo_finished_batches

UNION ALL

SELECT 
    'purified_water_tests.test_date NULL',
    COUNT(*),
    COUNT(*) FILTER (WHERE test_date IS NULL),
    CASE 
        WHEN COUNT(*) FILTER (WHERE test_date IS NULL) = 0 
        THEN '✓ PASS'
        ELSE '✗ FAIL: ' || COUNT(*) FILTER (WHERE test_date IS NULL) || ' NULL values'
    END
FROM labdoc_demo_purified_water_tests;


-- ------------------------------------------------------------
-- 4.2 Date ranges (should be within 2025)
-- Expected: 2025-01-01 to 2025-12-31 for demo data
-- ------------------------------------------------------------
SELECT 
    'material_receipts date range' AS check_item,
    MIN(receipt_date) AS earliest_date,
    MAX(receipt_date) AS latest_date,
    CASE 
        WHEN MIN(receipt_date) >= '2025-01-01' AND MAX(receipt_date) <= '2025-12-31'
        THEN '✓ PASS (within 2025)'
        ELSE '~ INFO: dates outside 2025'
    END AS status
FROM labdoc_demo_material_receipts

UNION ALL

SELECT 
    'production_batches date range',
    MIN(manufacture_date),
    MAX(manufacture_date),
    CASE 
        WHEN MIN(manufacture_date) >= '2025-01-01' AND MAX(manufacture_date) <= '2025-12-31'
        THEN '✓ PASS (within 2025)'
        ELSE '~ INFO: dates outside 2025'
    END
FROM labdoc_demo_production_batches

UNION ALL

SELECT 
    'finished_batches date range',
    MIN(manufacture_date),
    MAX(manufacture_date),
    CASE 
        WHEN MIN(manufacture_date) >= '2025-01-01' AND MAX(manufacture_date) <= '2025-12-31'
        THEN '✓ PASS (within 2025)'
        ELSE '~ INFO: dates outside 2025'
    END
FROM labdoc_demo_finished_batches

UNION ALL

SELECT 
    'purified_water_tests date range',
    MIN(test_date),
    MAX(test_date),
    CASE 
        WHEN MIN(test_date) >= '2025-01-01' AND MAX(test_date) <= '2025-12-31'
        THEN '✓ PASS (within 2025)'
        ELSE '~ INFO: dates outside 2025'
    END
FROM labdoc_demo_purified_water_tests;


-- ============================================================
-- 5. SPECIAL VALUE CHECKS
-- ============================================================

-- ------------------------------------------------------------
-- 5.1 Conductivity values (purified water)
-- Expected: 0 ~ 1.0 μS/cm for purified water
-- ------------------------------------------------------------
SELECT 
    'purified_water conductivity' AS check_item,
    MIN(result_numeric) AS min_val,
    MAX(result_numeric) AS max_val,
    COUNT(*) AS total_records,
    COUNT(*) FILTER (WHERE result_numeric < 0 OR result_numeric > 5) AS violations,
    CASE 
        WHEN COUNT(*) FILTER (WHERE result_numeric < 0 OR result_numeric > 5) = 0 
        THEN '✓ PASS (0-5 μS/cm)'
        ELSE '✗ CHECK: some values outside normal range'
    END AS status
FROM labdoc_demo_purified_water_test_results
WHERE test_item_code = 'conductivity';


-- ------------------------------------------------------------
-- 5.2 TOC values (purified water)
-- Expected: 0 ~ 500 ppb
-- ------------------------------------------------------------
SELECT 
    'purified_water TOC' AS check_item,
    MIN(result_numeric) AS min_val,
    MAX(result_numeric) AS max_val,
    COUNT(*) AS total_records,
    COUNT(*) FILTER (WHERE result_numeric < 0 OR result_numeric > 1000) AS violations,
    CASE 
        WHEN COUNT(*) FILTER (WHERE result_numeric < 0 OR result_numeric > 1000) = 0 
        THEN '✓ PASS (0-1000 ppb)'
        ELSE '✗ CHECK'
    END AS status
FROM labdoc_demo_purified_water_test_results
WHERE test_item_code = 'toc';


-- ------------------------------------------------------------
-- 5.3 Viscosity values (production batches)
-- Expected: 0 ~ 100,000 cP (typical cosmetic range)
-- ------------------------------------------------------------
SELECT 
    'production_batches viscosity' AS check_item,
    MIN(viscosity) AS min_val,
    MAX(viscosity) AS max_val,
    AVG(viscosity)::NUMERIC(10,0) AS avg_val,
    COUNT(*) AS total_records,
    COUNT(*) FILTER (WHERE viscosity < 0) AS negative_violations,
    CASE 
        WHEN COUNT(*) FILTER (WHERE viscosity < 0) = 0 
        THEN '✓ PASS (no negatives)'
        ELSE '✗ FAIL'
    END AS status
FROM labdoc_demo_production_batches
WHERE viscosity IS NOT NULL;


-- ============================================================
-- 6. JUDGMENT VALUE VALIDATION
-- ============================================================

-- ------------------------------------------------------------
-- 6.1 Valid judgment values in purified_water_test_results
-- Expected: '적합' or '부적합' only
-- ------------------------------------------------------------
SELECT 
    'purified_water judgment values' AS check_item,
    judgment,
    COUNT(*) AS count,
    CASE 
        WHEN judgment IN ('적합', '부적합', 'PASS', 'FAIL') 
        THEN '✓ VALID'
        ELSE '✗ UNKNOWN VALUE'
    END AS status
FROM labdoc_demo_purified_water_test_results
GROUP BY judgment
ORDER BY count DESC;


-- ------------------------------------------------------------
-- 6.2 Valid judgment values in material_receipts
-- ------------------------------------------------------------
SELECT 
    'material_receipts judgment values' AS check_item,
    final_judgment,
    COUNT(*) AS count,
    CASE 
        WHEN final_judgment IN ('적합', '부적합', 'PASS', 'FAIL', '합격', '불합격') 
        THEN '✓ VALID'
        ELSE '✗ UNKNOWN VALUE'
    END AS status
FROM labdoc_demo_material_receipts
GROUP BY final_judgment
ORDER BY count DESC;


-- ============================================================
-- 7. SUMMARY REPORT
-- ============================================================
SELECT 
    'pH Values (all tables)' AS category,
    CASE 
        WHEN (
            SELECT COUNT(*) FROM labdoc_demo_purified_water_test_results 
            WHERE test_item_code = 'ph' AND (result_numeric < 0 OR result_numeric > 14)
        ) + (
            SELECT COUNT(*) FROM labdoc_demo_production_batches 
            WHERE ph_value IS NOT NULL AND (ph_value < 0 OR ph_value > 14)
        ) + (
            SELECT COUNT(*) FROM labdoc_demo_finished_batches 
            WHERE ph_value IS NOT NULL AND (ph_value < 0 OR ph_value > 14)
        ) = 0
        THEN '✓ ALL PASS'
        ELSE '✗ VIOLATIONS FOUND'
    END AS status

UNION ALL

SELECT 
    'Quantities (no negatives)',
    CASE 
        WHEN (
            SELECT COUNT(*) FROM labdoc_demo_material_receipts WHERE quantity_kg < 0
        ) + (
            SELECT COUNT(*) FROM labdoc_demo_production_batches WHERE batch_size_kg < 0
        ) = 0
        THEN '✓ ALL PASS'
        ELSE '✗ VIOLATIONS FOUND'
    END

UNION ALL

SELECT 
    'Required Dates (no NULLs)',
    CASE 
        WHEN (
            SELECT COUNT(*) FROM labdoc_demo_material_receipts WHERE receipt_date IS NULL
        ) + (
            SELECT COUNT(*) FROM labdoc_demo_production_batches WHERE manufacture_date IS NULL
        ) + (
            SELECT COUNT(*) FROM labdoc_demo_finished_batches WHERE manufacture_date IS NULL
        ) + (
            SELECT COUNT(*) FROM labdoc_demo_purified_water_tests WHERE test_date IS NULL
        ) = 0
        THEN '✓ ALL PASS'
        ELSE '✗ NULL VALUES FOUND'
    END;
