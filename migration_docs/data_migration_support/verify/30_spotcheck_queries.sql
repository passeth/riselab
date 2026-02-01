-- ============================================================
-- Spot Check Queries
-- Purpose: Sample data verification for manual comparison with source Excel
-- Usage: Compare results with original Excel files to verify data integrity
-- ============================================================

-- ============================================================
-- 1. 정제수 (Purified Water) SPOT CHECKS
-- ============================================================

-- ------------------------------------------------------------
-- 1.1 특정 날짜 전체 결과 (년말 데이터 확인)
-- Compare with: 정제수시험성적서 Excel, 2025-12-31 row
-- ------------------------------------------------------------
SELECT 
    t.test_date,
    t.inspector,
    t.source_file,
    r.test_item_code,
    r.result_value,
    r.result_numeric,
    r.judgment
FROM labdoc_demo_purified_water_tests t
JOIN labdoc_demo_purified_water_test_results r ON t.id = r.test_id
WHERE t.test_date = '2025-12-31'
ORDER BY r.test_item_code;


-- ------------------------------------------------------------
-- 1.2 특정 날짜 전체 결과 (년초 데이터 확인)
-- Compare with: 정제수시험성적서 Excel, 2025-01-02 row
-- ------------------------------------------------------------
SELECT 
    t.test_date,
    t.inspector,
    t.source_file,
    r.test_item_code,
    r.result_value,
    r.result_numeric,
    r.judgment
FROM labdoc_demo_purified_water_tests t
JOIN labdoc_demo_purified_water_test_results r ON t.id = r.test_id
WHERE t.test_date = '2025-01-02'
ORDER BY r.test_item_code;


-- ------------------------------------------------------------
-- 1.3 월별 테스트 건수 분포
-- Expected: 각 월 약 28-31건
-- ------------------------------------------------------------
SELECT 
    EXTRACT(MONTH FROM test_date) AS month,
    COUNT(*) AS test_count,
    MIN(test_date) AS first_test,
    MAX(test_date) AS last_test
FROM labdoc_demo_purified_water_tests
GROUP BY EXTRACT(MONTH FROM test_date)
ORDER BY month;


-- ============================================================
-- 2. 원료입고 (Material Receipts) SPOT CHECKS
-- ============================================================

-- ------------------------------------------------------------
-- 2.1 특정 시험번호 상세
-- Compare with: 원료입고시험성적서 Excel
-- Sample test numbers: R2601001, R2601002, R2612999
-- ------------------------------------------------------------
SELECT *
FROM labdoc_demo_material_receipts
WHERE test_no = 'R2601001';

SELECT *
FROM labdoc_demo_material_receipts
WHERE test_no LIKE 'R2612%'
ORDER BY test_no
LIMIT 5;


-- ------------------------------------------------------------
-- 2.2 특정 원료코드 입고 내역
-- Sample ingredient for verification
-- ------------------------------------------------------------
SELECT 
    test_no,
    receipt_date,
    ingredient_code,
    ingredient_name,
    supplier_code,
    quantity_kg,
    lot_no,
    final_judgment
FROM labdoc_demo_material_receipts
WHERE ingredient_code = (
    SELECT ingredient_code 
    FROM labdoc_demo_material_receipts 
    LIMIT 1
)
ORDER BY receipt_date
LIMIT 10;


-- ------------------------------------------------------------
-- 2.3 월별 입고 건수 분포
-- Expected: 상대적으로 균등 분포
-- ------------------------------------------------------------
SELECT 
    EXTRACT(MONTH FROM receipt_date) AS month,
    COUNT(*) AS receipt_count,
    SUM(quantity_kg)::NUMERIC(12,2) AS total_kg
FROM labdoc_demo_material_receipts
GROUP BY EXTRACT(MONTH FROM receipt_date)
ORDER BY month;


-- ============================================================
-- 3. 반완제품 (Production Batches) SPOT CHECKS
-- ============================================================

-- ------------------------------------------------------------
-- 3.1 특정 반제품시험번호 상세
-- Compare with: 반완제품시험성적서 Excel
-- Sample: B2601001
-- ------------------------------------------------------------
SELECT *
FROM labdoc_demo_production_batches
WHERE semi_test_no = 'B2601001';

SELECT *
FROM labdoc_demo_production_batches
WHERE semi_test_no LIKE 'B2612%'
ORDER BY semi_test_no
LIMIT 5;


-- ------------------------------------------------------------
-- 3.2 특정 제품코드 배치 내역
-- ------------------------------------------------------------
SELECT 
    semi_test_no,
    manufacture_date,
    product_code,
    product_name,
    lot_no,
    batch_size_kg,
    ph_value,
    viscosity,
    final_judgment
FROM labdoc_demo_production_batches
WHERE product_code = (
    SELECT product_code 
    FROM labdoc_demo_production_batches 
    LIMIT 1
)
ORDER BY manufacture_date
LIMIT 10;


-- ------------------------------------------------------------
-- 3.3 월별 생산 배치 분포
-- ------------------------------------------------------------
SELECT 
    EXTRACT(MONTH FROM manufacture_date) AS month,
    COUNT(*) AS batch_count,
    SUM(batch_size_kg)::NUMERIC(12,2) AS total_kg
FROM labdoc_demo_production_batches
GROUP BY EXTRACT(MONTH FROM manufacture_date)
ORDER BY month;


-- ============================================================
-- 4. 완제품 (Finished Batches) SPOT CHECKS
-- ============================================================

-- ------------------------------------------------------------
-- 4.1 특정 완제품시험번호 상세
-- Compare with: 완제품시험성적서 Excel
-- ------------------------------------------------------------
SELECT *
FROM labdoc_demo_finished_batches
WHERE finished_test_no LIKE 'F2601%'
ORDER BY finished_test_no
LIMIT 5;


-- ------------------------------------------------------------
-- 4.2 월별 완제품 배치 분포
-- ------------------------------------------------------------
SELECT 
    EXTRACT(MONTH FROM manufacture_date) AS month,
    COUNT(*) AS batch_count
FROM labdoc_demo_finished_batches
GROUP BY EXTRACT(MONTH FROM manufacture_date)
ORDER BY month;


-- ============================================================
-- 5. OEM 제품 SPOT CHECKS
-- ============================================================

-- ------------------------------------------------------------
-- 5.1 OEM 제품 전체 목록 (작은 테이블)
-- Expected: ~60건
-- ------------------------------------------------------------
SELECT 
    oem_test_no,
    product_code,
    product_name,
    client_name,
    manufacture_date,
    lot_no,
    final_judgment
FROM labdoc_demo_oem_products
ORDER BY manufacture_date
LIMIT 20;


-- ============================================================
-- 6. CROSS-REFERENCE SPOT CHECKS
-- ============================================================

-- ------------------------------------------------------------
-- 6.1 반완제품 ↔ 완제품 매칭 33개 상세 리스트
-- Expected: 33 matched pairs via finished_test_no
-- ------------------------------------------------------------
SELECT 
    pb.semi_test_no,
    pb.product_code AS bulk_product,
    pb.product_name AS bulk_product_name,
    pb.lot_no AS bulk_lot,
    pb.manufacture_date AS bulk_date,
    fb.finished_test_no,
    fb.product_code AS finished_product,
    fb.product_name AS finished_product_name,
    fb.lot_no AS finished_lot,
    fb.manufacture_date AS finished_date
FROM labdoc_demo_production_batches pb
JOIN labdoc_demo_finished_batches fb 
    ON pb.finished_test_no = fb.finished_test_no
WHERE pb.finished_test_no IS NOT NULL
ORDER BY pb.semi_test_no;


-- ------------------------------------------------------------
-- 6.2 제품코드 매칭 확인 (products master)
-- 상위 10개 제품별 배치 수
-- ------------------------------------------------------------
SELECT 
    p.product_code,
    p.product_name,
    COUNT(DISTINCT pb.semi_test_no) AS production_batches,
    COUNT(DISTINCT fb.finished_test_no) AS finished_batches
FROM labdoc_demo_products p
LEFT JOIN labdoc_demo_production_batches pb ON p.product_code = pb.product_code
LEFT JOIN labdoc_demo_finished_batches fb ON p.product_code = fb.product_code
GROUP BY p.product_code, p.product_name
ORDER BY production_batches + finished_batches DESC
LIMIT 10;


-- ------------------------------------------------------------
-- 6.3 원료-공급업체 매칭 확인
-- ------------------------------------------------------------
SELECT 
    i.ingredient_code,
    i.ingredient_name,
    s.supplier_code,
    s.supplier_name,
    COUNT(r.test_no) AS receipt_count,
    SUM(r.quantity_kg)::NUMERIC(12,2) AS total_quantity_kg
FROM labdoc_demo_ingredients i
JOIN labdoc_demo_material_receipts r ON i.ingredient_code = r.ingredient_code
JOIN labdoc_demo_suppliers s ON r.supplier_code = s.supplier_code
GROUP BY i.ingredient_code, i.ingredient_name, s.supplier_code, s.supplier_name
ORDER BY receipt_count DESC
LIMIT 20;


-- ============================================================
-- 7. RANDOM SAMPLES (for visual verification)
-- ============================================================

-- ------------------------------------------------------------
-- 7.1 정제수 테스트 랜덤 20건
-- ------------------------------------------------------------
SELECT * 
FROM labdoc_demo_purified_water_tests
ORDER BY RANDOM() 
LIMIT 20;


-- ------------------------------------------------------------
-- 7.2 원료입고 랜덤 20건
-- ------------------------------------------------------------
SELECT 
    test_no,
    receipt_date,
    ingredient_code,
    ingredient_name,
    supplier_code,
    quantity_kg,
    lot_no,
    final_judgment,
    source_file
FROM labdoc_demo_material_receipts
ORDER BY RANDOM() 
LIMIT 20;


-- ------------------------------------------------------------
-- 7.3 반완제품 랜덤 20건
-- ------------------------------------------------------------
SELECT 
    semi_test_no,
    manufacture_date,
    product_code,
    product_name,
    lot_no,
    batch_size_kg,
    ph_value,
    viscosity,
    final_judgment
FROM labdoc_demo_production_batches
ORDER BY RANDOM() 
LIMIT 20;


-- ------------------------------------------------------------
-- 7.4 완제품 랜덤 20건
-- ------------------------------------------------------------
SELECT 
    finished_test_no,
    manufacture_date,
    product_code,
    product_name,
    lot_no,
    ph_value,
    final_judgment
FROM labdoc_demo_finished_batches
ORDER BY RANDOM() 
LIMIT 20;


-- ============================================================
-- 8. DATA CONSISTENCY CHECKS
-- ============================================================

-- ------------------------------------------------------------
-- 8.1 검사원(Inspector) 목록 확인
-- 정제수 테스트의 검사원 분포
-- ------------------------------------------------------------
SELECT 
    inspector,
    COUNT(*) AS test_count,
    MIN(test_date) AS first_test,
    MAX(test_date) AS last_test
FROM labdoc_demo_purified_water_tests
GROUP BY inspector
ORDER BY test_count DESC;


-- ------------------------------------------------------------
-- 8.2 Source file 분포 확인
-- 데이터 출처 확인
-- ------------------------------------------------------------
SELECT 
    source_file,
    COUNT(*) AS record_count
FROM labdoc_demo_purified_water_tests
GROUP BY source_file
ORDER BY record_count DESC;

SELECT 
    source_file,
    COUNT(*) AS record_count
FROM labdoc_demo_material_receipts
GROUP BY source_file
ORDER BY record_count DESC
LIMIT 10;


-- ------------------------------------------------------------
-- 8.3 LOT 번호 패턴 확인
-- ------------------------------------------------------------
SELECT 
    LEFT(lot_no, 4) AS lot_prefix,
    COUNT(*) AS count
FROM labdoc_demo_material_receipts
WHERE lot_no IS NOT NULL
GROUP BY LEFT(lot_no, 4)
ORDER BY count DESC
LIMIT 10;


-- ============================================================
-- 9. BOUNDARY CASE CHECKS
-- ============================================================

-- ------------------------------------------------------------
-- 9.1 첫 번째와 마지막 레코드 (시계열 순서)
-- ------------------------------------------------------------
-- 정제수: 가장 오래된/최신 테스트
(SELECT '정제수 첫번째' AS type, * FROM labdoc_demo_purified_water_tests ORDER BY test_date ASC LIMIT 1)
UNION ALL
(SELECT '정제수 마지막', * FROM labdoc_demo_purified_water_tests ORDER BY test_date DESC LIMIT 1);

-- 원료입고: 가장 오래된/최신 입고
(SELECT '원료입고 첫번째' AS type, test_no, receipt_date, ingredient_code, quantity_kg 
 FROM labdoc_demo_material_receipts ORDER BY receipt_date ASC LIMIT 1)
UNION ALL
(SELECT '원료입고 마지막', test_no, receipt_date, ingredient_code, quantity_kg 
 FROM labdoc_demo_material_receipts ORDER BY receipt_date DESC LIMIT 1);


-- ------------------------------------------------------------
-- 9.2 극단값 확인 (max/min)
-- ------------------------------------------------------------
-- 가장 큰 배치
SELECT 
    '최대 배치' AS type,
    semi_test_no,
    product_name,
    batch_size_kg
FROM labdoc_demo_production_batches
WHERE batch_size_kg = (SELECT MAX(batch_size_kg) FROM labdoc_demo_production_batches);

-- 가장 많이 입고된 원료
SELECT 
    '최다 입고 원료' AS type,
    ingredient_code,
    ingredient_name,
    COUNT(*) AS receipt_count,
    SUM(quantity_kg)::NUMERIC(12,2) AS total_kg
FROM labdoc_demo_material_receipts
GROUP BY ingredient_code, ingredient_name
ORDER BY receipt_count DESC
LIMIT 1;


-- ============================================================
-- 10. QUICK SUMMARY FOR VERIFICATION REPORT
-- ============================================================
SELECT 
    '정제수 테스트' AS domain,
    COUNT(*) AS total_records,
    MIN(test_date)::TEXT AS date_range_start,
    MAX(test_date)::TEXT AS date_range_end
FROM labdoc_demo_purified_water_tests

UNION ALL

SELECT 
    '원료입고',
    COUNT(*),
    MIN(receipt_date)::TEXT,
    MAX(receipt_date)::TEXT
FROM labdoc_demo_material_receipts

UNION ALL

SELECT 
    '반완제품',
    COUNT(*),
    MIN(manufacture_date)::TEXT,
    MAX(manufacture_date)::TEXT
FROM labdoc_demo_production_batches

UNION ALL

SELECT 
    '완제품',
    COUNT(*),
    MIN(manufacture_date)::TEXT,
    MAX(manufacture_date)::TEXT
FROM labdoc_demo_finished_batches

UNION ALL

SELECT 
    'OEM 제품',
    COUNT(*),
    MIN(manufacture_date)::TEXT,
    MAX(manufacture_date)::TEXT
FROM labdoc_demo_oem_products

ORDER BY domain;
