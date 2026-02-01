-- ============================================================
-- Soft FK Match Rate Analysis
-- Purpose: Verify soft reference matching quality
-- Note: No FK constraints exist, tracking match rates for data quality
-- ============================================================

-- ============================================================
-- 1. MASTER DATA REFERENCES
-- ============================================================

-- ------------------------------------------------------------
-- 1.1 material_receipts → ingredients 매칭률
-- Expected: >95% match rate
-- ------------------------------------------------------------
SELECT 
    'material_receipts.ingredient_code → ingredients' AS reference,
    COUNT(*) AS total_rows,
    COUNT(i.ingredient_code) AS matched_rows,
    COUNT(*) - COUNT(i.ingredient_code) AS unmatched_rows,
    ROUND(100.0 * COUNT(i.ingredient_code) / NULLIF(COUNT(*), 0), 2) AS match_rate_pct,
    CASE 
        WHEN 100.0 * COUNT(i.ingredient_code) / NULLIF(COUNT(*), 0) >= 95 THEN '✓ PASS (≥95%)'
        WHEN 100.0 * COUNT(i.ingredient_code) / NULLIF(COUNT(*), 0) >= 80 THEN '~ ACCEPTABLE (≥80%)'
        ELSE '✗ CHECK (<80%)'
    END AS status
FROM labdoc_demo_material_receipts r
LEFT JOIN labdoc_demo_ingredients i ON r.ingredient_code = i.ingredient_code;


-- ------------------------------------------------------------
-- 1.2 material_receipts → suppliers 매칭률
-- Expected: >95% match rate
-- ------------------------------------------------------------
SELECT 
    'material_receipts.supplier_code → suppliers' AS reference,
    COUNT(*) AS total_rows,
    COUNT(s.supplier_code) AS matched_rows,
    COUNT(*) - COUNT(s.supplier_code) AS unmatched_rows,
    ROUND(100.0 * COUNT(s.supplier_code) / NULLIF(COUNT(*), 0), 2) AS match_rate_pct,
    CASE 
        WHEN 100.0 * COUNT(s.supplier_code) / NULLIF(COUNT(*), 0) >= 95 THEN '✓ PASS (≥95%)'
        WHEN 100.0 * COUNT(s.supplier_code) / NULLIF(COUNT(*), 0) >= 80 THEN '~ ACCEPTABLE (≥80%)'
        ELSE '✗ CHECK (<80%)'
    END AS status
FROM labdoc_demo_material_receipts r
LEFT JOIN labdoc_demo_suppliers s ON r.supplier_code = s.supplier_code;


-- ------------------------------------------------------------
-- 1.3 production_batches → products 매칭률
-- Expected: >95% match rate
-- ------------------------------------------------------------
SELECT 
    'production_batches.product_code → products' AS reference,
    COUNT(*) AS total_rows,
    COUNT(p.product_code) AS matched_rows,
    COUNT(*) - COUNT(p.product_code) AS unmatched_rows,
    ROUND(100.0 * COUNT(p.product_code) / NULLIF(COUNT(*), 0), 2) AS match_rate_pct,
    CASE 
        WHEN 100.0 * COUNT(p.product_code) / NULLIF(COUNT(*), 0) >= 95 THEN '✓ PASS (≥95%)'
        WHEN 100.0 * COUNT(p.product_code) / NULLIF(COUNT(*), 0) >= 80 THEN '~ ACCEPTABLE (≥80%)'
        ELSE '✗ CHECK (<80%)'
    END AS status
FROM labdoc_demo_production_batches b
LEFT JOIN labdoc_demo_products p ON b.product_code = p.product_code;


-- ------------------------------------------------------------
-- 1.4 finished_batches → products 매칭률
-- Expected: >95% match rate
-- ------------------------------------------------------------
SELECT 
    'finished_batches.product_code → products' AS reference,
    COUNT(*) AS total_rows,
    COUNT(p.product_code) AS matched_rows,
    COUNT(*) - COUNT(p.product_code) AS unmatched_rows,
    ROUND(100.0 * COUNT(p.product_code) / NULLIF(COUNT(*), 0), 2) AS match_rate_pct,
    CASE 
        WHEN 100.0 * COUNT(p.product_code) / NULLIF(COUNT(*), 0) >= 95 THEN '✓ PASS (≥95%)'
        WHEN 100.0 * COUNT(p.product_code) / NULLIF(COUNT(*), 0) >= 80 THEN '~ ACCEPTABLE (≥80%)'
        ELSE '✗ CHECK (<80%)'
    END AS status
FROM labdoc_demo_finished_batches fb
LEFT JOIN labdoc_demo_products p ON fb.product_code = p.product_code;


-- ------------------------------------------------------------
-- 1.5 oem_products → products 매칭률
-- Expected: >90% match rate
-- ------------------------------------------------------------
SELECT 
    'oem_products.product_code → products' AS reference,
    COUNT(*) AS total_rows,
    COUNT(p.product_code) AS matched_rows,
    COUNT(*) - COUNT(p.product_code) AS unmatched_rows,
    ROUND(100.0 * COUNT(p.product_code) / NULLIF(COUNT(*), 0), 2) AS match_rate_pct,
    CASE 
        WHEN 100.0 * COUNT(p.product_code) / NULLIF(COUNT(*), 0) >= 90 THEN '✓ PASS (≥90%)'
        WHEN 100.0 * COUNT(p.product_code) / NULLIF(COUNT(*), 0) >= 70 THEN '~ ACCEPTABLE (≥70%)'
        ELSE '✗ CHECK (<70%)'
    END AS status
FROM labdoc_demo_oem_products oem
LEFT JOIN labdoc_demo_products p ON oem.product_code = p.product_code;


-- ============================================================
-- 2. INTERNAL REFERENCES (Cross-Table)
-- ============================================================

-- ------------------------------------------------------------
-- 2.1 purified_water_test_results → purified_water_tests 매칭률
-- Expected: 100% (hard FK in design)
-- ------------------------------------------------------------
SELECT 
    'test_results.test_id → tests (should be 100%)' AS reference,
    COUNT(*) AS total_rows,
    COUNT(t.id) AS matched_rows,
    COUNT(*) - COUNT(t.id) AS orphan_rows,
    ROUND(100.0 * COUNT(t.id) / NULLIF(COUNT(*), 0), 2) AS match_rate_pct,
    CASE 
        WHEN COUNT(*) = COUNT(t.id) THEN '✓ PASS (100%)'
        ELSE '✗ FAIL (orphan results exist)'
    END AS status
FROM labdoc_demo_purified_water_test_results r
LEFT JOIN labdoc_demo_purified_water_tests t ON r.test_id = t.id;


-- ------------------------------------------------------------
-- 2.2 반완제품 ↔ 완제품 Cross-Reference 매칭
-- Expected: 33 matched pairs (based on finished_test_no linkage)
-- ------------------------------------------------------------
SELECT 
    'production ↔ finished via finished_test_no (33 expected)' AS reference,
    COUNT(*) AS matched_count,
    CASE 
        WHEN COUNT(*) >= 33 THEN '✓ PASS (≥33 matches)'
        WHEN COUNT(*) >= 30 THEN '~ CLOSE (≥30)'
        ELSE '✗ CHECK (<30 matches)'
    END AS status
FROM labdoc_demo_production_batches pb
JOIN labdoc_demo_finished_batches fb 
    ON pb.finished_test_no = fb.finished_test_no
WHERE pb.finished_test_no IS NOT NULL;

-- Count of production_batches with finished_test_no set
SELECT 
    'production_batches with finished_test_no' AS reference,
    COUNT(*) AS total_batches,
    COUNT(finished_test_no) AS has_finished_ref,
    COUNT(*) - COUNT(finished_test_no) AS no_finished_ref,
    ROUND(100.0 * COUNT(finished_test_no) / NULLIF(COUNT(*), 0), 2) AS linkage_pct
FROM labdoc_demo_production_batches;


-- ============================================================
-- 3. UNMATCHED RECORDS DETAIL (for investigation)
-- ============================================================

-- ------------------------------------------------------------
-- 3.1 Unmatched ingredient codes in material_receipts
-- Top 20 for investigation
-- ------------------------------------------------------------
SELECT 
    r.ingredient_code AS unmatched_code,
    COUNT(*) AS occurrence_count,
    'material_receipts' AS source_table
FROM labdoc_demo_material_receipts r
LEFT JOIN labdoc_demo_ingredients i ON r.ingredient_code = i.ingredient_code
WHERE i.ingredient_code IS NULL
GROUP BY r.ingredient_code
ORDER BY COUNT(*) DESC
LIMIT 20;


-- ------------------------------------------------------------
-- 3.2 Unmatched supplier codes in material_receipts
-- Top 20 for investigation
-- ------------------------------------------------------------
SELECT 
    r.supplier_code AS unmatched_code,
    COUNT(*) AS occurrence_count,
    'material_receipts' AS source_table
FROM labdoc_demo_material_receipts r
LEFT JOIN labdoc_demo_suppliers s ON r.supplier_code = s.supplier_code
WHERE s.supplier_code IS NULL
GROUP BY r.supplier_code
ORDER BY COUNT(*) DESC
LIMIT 20;


-- ------------------------------------------------------------
-- 3.3 Unmatched product codes in production_batches
-- Top 20 for investigation
-- ------------------------------------------------------------
SELECT 
    b.product_code AS unmatched_code,
    COUNT(*) AS occurrence_count,
    'production_batches' AS source_table
FROM labdoc_demo_production_batches b
LEFT JOIN labdoc_demo_products p ON b.product_code = p.product_code
WHERE p.product_code IS NULL
GROUP BY b.product_code
ORDER BY COUNT(*) DESC
LIMIT 20;


-- ------------------------------------------------------------
-- 3.4 Unmatched product codes in finished_batches
-- Top 20 for investigation
-- ------------------------------------------------------------
SELECT 
    fb.product_code AS unmatched_code,
    COUNT(*) AS occurrence_count,
    'finished_batches' AS source_table
FROM labdoc_demo_finished_batches fb
LEFT JOIN labdoc_demo_products p ON fb.product_code = p.product_code
WHERE p.product_code IS NULL
GROUP BY fb.product_code
ORDER BY COUNT(*) DESC
LIMIT 20;


-- ============================================================
-- 4. SUMMARY REPORT
-- ============================================================
SELECT 
    reference,
    total_rows,
    matched_rows,
    unmatched_rows,
    match_rate_pct,
    status
FROM (
    SELECT 
        'material_receipts → ingredients' AS reference,
        COUNT(*) AS total_rows,
        COUNT(i.ingredient_code) AS matched_rows,
        COUNT(*) - COUNT(i.ingredient_code) AS unmatched_rows,
        ROUND(100.0 * COUNT(i.ingredient_code) / NULLIF(COUNT(*), 0), 2) AS match_rate_pct,
        CASE WHEN 100.0 * COUNT(i.ingredient_code) / NULLIF(COUNT(*), 0) >= 95 THEN '✓ PASS' ELSE '✗ CHECK' END AS status,
        1 AS sort_order
    FROM labdoc_demo_material_receipts r
    LEFT JOIN labdoc_demo_ingredients i ON r.ingredient_code = i.ingredient_code
    
    UNION ALL
    
    SELECT 
        'material_receipts → suppliers',
        COUNT(*),
        COUNT(s.supplier_code),
        COUNT(*) - COUNT(s.supplier_code),
        ROUND(100.0 * COUNT(s.supplier_code) / NULLIF(COUNT(*), 0), 2),
        CASE WHEN 100.0 * COUNT(s.supplier_code) / NULLIF(COUNT(*), 0) >= 95 THEN '✓ PASS' ELSE '✗ CHECK' END,
        2
    FROM labdoc_demo_material_receipts r
    LEFT JOIN labdoc_demo_suppliers s ON r.supplier_code = s.supplier_code
    
    UNION ALL
    
    SELECT 
        'production_batches → products',
        COUNT(*),
        COUNT(p.product_code),
        COUNT(*) - COUNT(p.product_code),
        ROUND(100.0 * COUNT(p.product_code) / NULLIF(COUNT(*), 0), 2),
        CASE WHEN 100.0 * COUNT(p.product_code) / NULLIF(COUNT(*), 0) >= 95 THEN '✓ PASS' ELSE '✗ CHECK' END,
        3
    FROM labdoc_demo_production_batches b
    LEFT JOIN labdoc_demo_products p ON b.product_code = p.product_code
    
    UNION ALL
    
    SELECT 
        'finished_batches → products',
        COUNT(*),
        COUNT(p.product_code),
        COUNT(*) - COUNT(p.product_code),
        ROUND(100.0 * COUNT(p.product_code) / NULLIF(COUNT(*), 0), 2),
        CASE WHEN 100.0 * COUNT(p.product_code) / NULLIF(COUNT(*), 0) >= 95 THEN '✓ PASS' ELSE '✗ CHECK' END,
        4
    FROM labdoc_demo_finished_batches fb
    LEFT JOIN labdoc_demo_products p ON fb.product_code = p.product_code
    
    UNION ALL
    
    SELECT 
        'oem_products → products',
        COUNT(*),
        COUNT(p.product_code),
        COUNT(*) - COUNT(p.product_code),
        ROUND(100.0 * COUNT(p.product_code) / NULLIF(COUNT(*), 0), 2),
        CASE WHEN 100.0 * COUNT(p.product_code) / NULLIF(COUNT(*), 0) >= 90 THEN '✓ PASS' ELSE '✗ CHECK' END,
        5
    FROM labdoc_demo_oem_products oem
    LEFT JOIN labdoc_demo_products p ON oem.product_code = p.product_code
) sub
ORDER BY sort_order;
