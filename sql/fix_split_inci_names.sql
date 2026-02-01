-- ============================================
-- INCI Name Split Issue Fix
-- Date: 2025-02-01
-- Description: Fix incorrectly split INCI names due to CSV parsing issues
-- ============================================

-- ============================================
-- 1. MAV-0002: Vitamin-E Acetate (5 rows → 1 row)
-- Original: 3,4-dihydro-2 / 5 / 7,8-tetramethyl-2-(4 / 8 / 12-trimethyltridecyl)-2Hbenzopyran-6-yl ace
-- Fixed: Tocopheryl Acetate (CAS: 7695-91-2)
-- ============================================
UPDATE labdoc_components 
SET inci_name_en = 'Tocopheryl Acetate',
    composition_ratio = 100.0000
WHERE ingredient_code = 'MAV-0002' AND component_order = 1;

DELETE FROM labdoc_components 
WHERE ingredient_code = 'MAV-0002' AND component_order > 1;

-- ============================================
-- 2. MAP-0030: 1,2-Hexanediol split (rows 3-4)
-- Original: "1" (CAS: 6920-22-5) + "2Hexandiol" (CAS: -)
-- Fixed: 1,2-Hexanediol (CAS: 6920-22-5)
-- ============================================
UPDATE labdoc_components 
SET inci_name_en = '1,2-Hexanediol',
    composition_ratio = 0.2500
WHERE ingredient_code = 'MAP-0030' AND component_order = 3;

DELETE FROM labdoc_components 
WHERE ingredient_code = 'MAP-0030' AND component_order = 4;

UPDATE labdoc_components 
SET component_order = component_order - 1
WHERE ingredient_code = 'MAP-0030' AND component_order > 4;

-- ============================================
-- 3. MAE-0014: Composition ratios in INCI column
-- Original: "97.899" / "2" / "0.1" / "0.001" (numbers as INCI names)
-- Fixed: Water / 1,2-Hexanediol / Ethylhexylglycerin (using CAS lookup)
-- ============================================
UPDATE labdoc_components 
SET inci_name_en = 'Water',
    composition_ratio = 97.899
WHERE ingredient_code = 'MAE-0014' AND cas_number = '7732-18-5';

UPDATE labdoc_components 
SET inci_name_en = '1,2-Hexanediol',
    composition_ratio = 2.0000
WHERE ingredient_code = 'MAE-0014' AND cas_number = '6920-22-5';

UPDATE labdoc_components 
SET inci_name_en = 'Ethylhexylglycerin',
    composition_ratio = 0.1000
WHERE ingredient_code = 'MAE-0014' AND cas_number = '70445-33-9';

DELETE FROM labdoc_components 
WHERE ingredient_code = 'MAE-0014' AND inci_name_en = '0.001';

-- ============================================
-- 4. MAL-0022: Invalid "to" entry
-- Original: "to" (100%) + "3" (CAS: 6920-22-5)
-- Fixed: 1,2-Hexanediol 3%
-- ============================================
UPDATE labdoc_components 
SET inci_name_en = '1,2-Hexanediol',
    composition_ratio = 3.0000
WHERE ingredient_code = 'MAL-0022' AND cas_number = '6920-22-5';

DELETE FROM labdoc_components 
WHERE ingredient_code = 'MAL-0022' AND inci_name_en = 'to';

UPDATE labdoc_components 
SET component_order = 1
WHERE ingredient_code = 'MAL-0022' AND inci_name_en = '1,2-Hexanediol';

-- ============================================
-- 5. Clean up newline characters in INCI names
-- ============================================
UPDATE labdoc_components 
SET inci_name_en = REPLACE(REPLACE(inci_name_en, E'\n', ' '), E'\r', '')
WHERE inci_name_en LIKE '%' || chr(10) || '%' OR inci_name_en LIKE '%' || chr(13) || '%';

UPDATE labdoc_components 
SET inci_name_en = REGEXP_REPLACE(inci_name_en, '\s+', ' ', 'g')
WHERE inci_name_en LIKE '%  %';

UPDATE labdoc_components 
SET inci_name_en = TRIM(inci_name_en)
WHERE inci_name_en != TRIM(inci_name_en);

-- ============================================
-- CAS Number Reference (for future fixes)
-- ============================================
-- 7695-91-2  = Tocopheryl Acetate
-- 6920-22-5  = 1,2-Hexanediol
-- 70445-33-9 = Ethylhexylglycerin
-- 7732-18-5  = Water
-- 107-88-0   = Butylene Glycol
-- 1117-86-8  = Caprylyl Glycol
