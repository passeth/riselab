-- ============================================================================
-- File: 010_copy_products_ingredients.sql
-- Description: Copy data from production tables to demo tables
-- 
-- Source Tables:
--   - labdoc_products (~1,571 rows)
--   - labdoc_ingredients (~1,066 rows)
--
-- Target Tables:
--   - labdoc_demo_products
--   - labdoc_demo_ingredients
--
-- Notes:
--   - Idempotent: Can be re-run safely
--   - Uses TRUNCATE for clean re-runs
--   - ON CONFLICT for safety
--   - Does NOT modify source tables
--
-- Created: 2026-02-02
-- ============================================================================

-- ============================================================================
-- SECTION 1: labdoc_demo_products
-- Expected: ~1,571 rows
-- ============================================================================

-- 1.1 Clear existing data (for re-run)
TRUNCATE TABLE labdoc_demo_products RESTART IDENTITY CASCADE;

-- 1.2 Copy data from source
-- Columns: product_code, korean_name, english_name, management_code
INSERT INTO labdoc_demo_products (
    product_code,
    korean_name,
    english_name,
    management_code
)
SELECT 
    product_code,
    korean_name,
    english_name,
    management_code
FROM labdoc_products
ON CONFLICT (product_code) DO NOTHING;

-- ============================================================================
-- SECTION 2: labdoc_demo_ingredients
-- Expected: ~1,066 rows
-- ============================================================================

-- 2.1 Clear existing data (for re-run)
TRUNCATE TABLE labdoc_demo_ingredients RESTART IDENTITY CASCADE;

-- 2.2 Copy data from source
-- Columns: ingredient_code, ingredient_name, manufacturer, origin_country
INSERT INTO labdoc_demo_ingredients (
    ingredient_code,
    ingredient_name,
    manufacturer,
    origin_country
)
SELECT 
    ingredient_code,
    ingredient_name,
    manufacturer,
    origin_country
FROM labdoc_ingredients
ON CONFLICT (ingredient_code) DO NOTHING;

-- ============================================================================
-- SECTION 3: Verification Queries
-- Run these after migration to verify data integrity
-- ============================================================================

-- 3.1 Products count comparison
SELECT 
    'labdoc_products' AS table_name,
    (SELECT COUNT(*) FROM labdoc_products) AS source_count,
    (SELECT COUNT(*) FROM labdoc_demo_products) AS target_count,
    (SELECT COUNT(*) FROM labdoc_products) - (SELECT COUNT(*) FROM labdoc_demo_products) AS diff;

-- 3.2 Ingredients count comparison
SELECT 
    'labdoc_ingredients' AS table_name,
    (SELECT COUNT(*) FROM labdoc_ingredients) AS source_count,
    (SELECT COUNT(*) FROM labdoc_demo_ingredients) AS target_count,
    (SELECT COUNT(*) FROM labdoc_ingredients) - (SELECT COUNT(*) FROM labdoc_demo_ingredients) AS diff;

-- 3.3 Sample data verification (Products - first 5)
SELECT 
    product_code,
    korean_name,
    management_code
FROM labdoc_demo_products
ORDER BY product_code
LIMIT 5;

-- 3.4 Sample data verification (Ingredients - first 5)
SELECT 
    ingredient_code,
    ingredient_name,
    manufacturer,
    origin_country
FROM labdoc_demo_ingredients
ORDER BY ingredient_code
LIMIT 5;

-- ============================================================================
-- End of migration script
-- ============================================================================
