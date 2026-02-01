-- ============================================================================
-- DDL Migration: labdoc_demo_ Demo Tables
-- ============================================================================
-- File: 0001_create_labdoc_demo_tables.sql
-- Description: QC Demo 데이터 마이그레이션을 위한 테이블 생성
-- Created: 2026-02-02
-- Version: 1.0
--
-- 테이블 목록 (총 10개):
-- [마스터 테이블]
--   1. labdoc_demo_products - 제품 마스터 (기존에서 복사)
--   2. labdoc_demo_ingredients - 원료 마스터 (기존에서 복사)
--   3. labdoc_demo_suppliers - 공급업체 마스터
--   4. labdoc_demo_purified_water_test_items - 정제수 시험항목 마스터
-- [정제수 도메인]
--   5. labdoc_demo_purified_water_tests - 테스트 헤더
--   6. labdoc_demo_purified_water_test_results - 테스트 결과 (1:N)
-- [원료입고 도메인]
--   7. labdoc_demo_material_receipts - 원료입고 기록
-- [반완제품 도메인]
--   8. labdoc_demo_production_batches - 벌크/반제품 생산
--   9. labdoc_demo_finished_batches - 완제품 생산
--  10. labdoc_demo_oem_products - OEM 입고
-- ============================================================================

-- ############################################################################
-- SECTION 1: EXTENSIONS & FUNCTIONS
-- ############################################################################

-- UUID 생성 확장 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- Trigger Function: updated_at 자동 갱신
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION labdoc_demo_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION labdoc_demo_update_updated_at() IS 
    'Demo 테이블 updated_at 컬럼 자동 갱신 트리거 함수';


-- ############################################################################
-- SECTION 2: DROP EXISTING TABLES (순서 중요: FK 역순)
-- ############################################################################

-- 트랜잭션 테이블 먼저 삭제
DROP TABLE IF EXISTS labdoc_demo_purified_water_test_results CASCADE;
DROP TABLE IF EXISTS labdoc_demo_purified_water_tests CASCADE;
DROP TABLE IF EXISTS labdoc_demo_material_receipts CASCADE;
DROP TABLE IF EXISTS labdoc_demo_oem_products CASCADE;
DROP TABLE IF EXISTS labdoc_demo_finished_batches CASCADE;
DROP TABLE IF EXISTS labdoc_demo_production_batches CASCADE;

-- 마스터 테이블 삭제
DROP TABLE IF EXISTS labdoc_demo_purified_water_test_items CASCADE;
DROP TABLE IF EXISTS labdoc_demo_suppliers CASCADE;
DROP TABLE IF EXISTS labdoc_demo_ingredients CASCADE;
DROP TABLE IF EXISTS labdoc_demo_products CASCADE;


-- ############################################################################
-- SECTION 3: MASTER TABLES
-- ############################################################################

-- ============================================================================
-- 3.1 labdoc_demo_products (제품 마스터)
-- Source: 기존 labdoc_products 테이블에서 복사 (데모용)
-- ============================================================================
CREATE TABLE labdoc_demo_products (
    -- === PK ===
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- === 업무키 ===
    product_code varchar(30) UNIQUE NOT NULL,
    
    -- === 제품 정보 ===
    korean_name text,
    english_name text,
    management_code varchar(20),
    
    -- === 타임스탬프 ===
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz
);

-- 인덱스
CREATE INDEX idx_demo_products_korean_name ON labdoc_demo_products(korean_name);
CREATE INDEX idx_demo_products_management_code ON labdoc_demo_products(management_code);

-- 트리거
CREATE TRIGGER update_labdoc_demo_products_updated_at
    BEFORE UPDATE ON labdoc_demo_products
    FOR EACH ROW EXECUTE FUNCTION labdoc_demo_update_updated_at();

-- 코멘트
COMMENT ON TABLE labdoc_demo_products IS '제품 마스터 데모용 복사본 (JOIN 참조용)';
COMMENT ON COLUMN labdoc_demo_products.product_code IS '제품코드 (B CODE 또는 P CODE)';
COMMENT ON COLUMN labdoc_demo_products.korean_name IS '제품 한글명';
COMMENT ON COLUMN labdoc_demo_products.english_name IS '제품 영문명';
COMMENT ON COLUMN labdoc_demo_products.management_code IS '관리코드';


-- ============================================================================
-- 3.2 labdoc_demo_ingredients (원료 마스터)
-- Source: 기존 labdoc_ingredients 테이블에서 복사 (데모용)
-- ============================================================================
CREATE TABLE labdoc_demo_ingredients (
    -- === PK ===
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- === 업무키 ===
    ingredient_code varchar(20) UNIQUE NOT NULL,
    
    -- === 원료 정보 ===
    ingredient_name text,
    manufacturer text,
    origin_country text,
    
    -- === 타임스탬프 ===
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz
);

-- 인덱스
CREATE INDEX idx_demo_ingredients_name ON labdoc_demo_ingredients(ingredient_name);
CREATE INDEX idx_demo_ingredients_manufacturer ON labdoc_demo_ingredients(manufacturer);

-- 트리거
CREATE TRIGGER update_labdoc_demo_ingredients_updated_at
    BEFORE UPDATE ON labdoc_demo_ingredients
    FOR EACH ROW EXECUTE FUNCTION labdoc_demo_update_updated_at();

-- 코멘트
COMMENT ON TABLE labdoc_demo_ingredients IS '원료 마스터 데모용 복사본 (JOIN 참조용)';
COMMENT ON COLUMN labdoc_demo_ingredients.ingredient_code IS '원료코드 (MXX-NNNN 형식)';
COMMENT ON COLUMN labdoc_demo_ingredients.ingredient_name IS '원료명';
COMMENT ON COLUMN labdoc_demo_ingredients.manufacturer IS '제조사';
COMMENT ON COLUMN labdoc_demo_ingredients.origin_country IS '원산지';


-- ============================================================================
-- 3.3 labdoc_demo_suppliers (공급업체 마스터)
-- Source: 원료입고 데이터에서 추출
-- ============================================================================
CREATE TABLE labdoc_demo_suppliers (
    -- === PK ===
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- === 업무키 ===
    supplier_name varchar(100) UNIQUE NOT NULL,
    
    -- === 추가 정보 ===
    supplier_name_normalized varchar(100),
    
    -- === 타임스탬프 ===
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz
);

-- 인덱스
CREATE INDEX idx_demo_suppliers_normalized ON labdoc_demo_suppliers(supplier_name_normalized);

-- 트리거
CREATE TRIGGER update_labdoc_demo_suppliers_updated_at
    BEFORE UPDATE ON labdoc_demo_suppliers
    FOR EACH ROW EXECUTE FUNCTION labdoc_demo_update_updated_at();

-- 코멘트
COMMENT ON TABLE labdoc_demo_suppliers IS '원료 공급업체 마스터';
COMMENT ON COLUMN labdoc_demo_suppliers.supplier_name IS '공급업체명 (원본)';
COMMENT ON COLUMN labdoc_demo_suppliers.supplier_name_normalized IS '정규화된 공급업체명 (트림, 공백 처리)';


-- ============================================================================
-- 3.4 labdoc_demo_purified_water_test_items (정제수 시험항목 마스터)
-- Source: 정제수성적서 시험항목 정의 (12개)
-- ============================================================================
CREATE TABLE labdoc_demo_purified_water_test_items (
    -- === PK ===
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- === 업무키 ===
    item_code varchar(30) UNIQUE NOT NULL,
    
    -- === 항목 정보 ===
    item_name_ko varchar(50) NOT NULL,
    item_name_en varchar(50),
    specification text,
    test_frequency varchar(10),
    result_type varchar(20),
    sort_order int,
    
    -- === 타임스탬프 ===
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz
);

-- 인덱스
CREATE INDEX idx_demo_pw_items_frequency ON labdoc_demo_purified_water_test_items(test_frequency);
CREATE INDEX idx_demo_pw_items_sort ON labdoc_demo_purified_water_test_items(sort_order);

-- 트리거
CREATE TRIGGER update_labdoc_demo_pw_items_updated_at
    BEFORE UPDATE ON labdoc_demo_purified_water_test_items
    FOR EACH ROW EXECUTE FUNCTION labdoc_demo_update_updated_at();

-- 코멘트
COMMENT ON TABLE labdoc_demo_purified_water_test_items IS '정제수 시험항목 마스터 (12개 항목)';
COMMENT ON COLUMN labdoc_demo_purified_water_test_items.item_code IS '항목 코드 (영문 snake_case)';
COMMENT ON COLUMN labdoc_demo_purified_water_test_items.item_name_ko IS '항목명 (한글)';
COMMENT ON COLUMN labdoc_demo_purified_water_test_items.item_name_en IS '항목명 (영문)';
COMMENT ON COLUMN labdoc_demo_purified_water_test_items.specification IS '시험 기준/규격';
COMMENT ON COLUMN labdoc_demo_purified_water_test_items.test_frequency IS '검사 빈도 (daily/weekly)';
COMMENT ON COLUMN labdoc_demo_purified_water_test_items.result_type IS '결과 타입 (pass_fail/numeric/pass_fail_na)';
COMMENT ON COLUMN labdoc_demo_purified_water_test_items.sort_order IS '정렬 순서';


-- ############################################################################
-- SECTION 4: PURIFIED WATER DOMAIN (정제수)
-- ############################################################################

-- ============================================================================
-- 4.1 labdoc_demo_purified_water_tests (정제수 테스트 헤더)
-- Source: 정제수성적서 일별 검사 기록
-- ============================================================================
CREATE TABLE labdoc_demo_purified_water_tests (
    -- === PK ===
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- === 검사 기본 정보 ===
    test_date date NOT NULL,
    material_name varchar(50) DEFAULT '정제수',
    sample_amount varchar(20) DEFAULT '200 g',
    sampling_location varchar(50),
    
    -- === 담당자 ===
    collector varchar(50),
    inspector varchar(50),
    
    -- === 종합 결과 ===
    overall_result varchar(20) DEFAULT '적합',
    
    -- === 추적성 ===
    source_file text,
    source_sheet text,
    source_row int,
    
    -- === 타임스탬프 ===
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz,
    
    -- === 제약조건 ===
    CONSTRAINT uq_demo_pw_test_date UNIQUE (test_date, source_file)
);

-- 인덱스
CREATE INDEX idx_demo_pw_tests_date ON labdoc_demo_purified_water_tests(test_date);
CREATE INDEX idx_demo_pw_tests_inspector ON labdoc_demo_purified_water_tests(inspector);
CREATE INDEX idx_demo_pw_tests_result ON labdoc_demo_purified_water_tests(overall_result);

-- 트리거
CREATE TRIGGER update_labdoc_demo_pw_tests_updated_at
    BEFORE UPDATE ON labdoc_demo_purified_water_tests
    FOR EACH ROW EXECUTE FUNCTION labdoc_demo_update_updated_at();

-- 코멘트
COMMENT ON TABLE labdoc_demo_purified_water_tests IS '정제수성적서 일별 검사 기록 헤더';
COMMENT ON COLUMN labdoc_demo_purified_water_tests.test_date IS '검사 일자';
COMMENT ON COLUMN labdoc_demo_purified_water_tests.material_name IS '검체명';
COMMENT ON COLUMN labdoc_demo_purified_water_tests.sample_amount IS '검체량';
COMMENT ON COLUMN labdoc_demo_purified_water_tests.sampling_location IS '채취 장소';
COMMENT ON COLUMN labdoc_demo_purified_water_tests.collector IS '시료 채취자';
COMMENT ON COLUMN labdoc_demo_purified_water_tests.inspector IS '검사 수행자';
COMMENT ON COLUMN labdoc_demo_purified_water_tests.overall_result IS '종합 판정 (적합/부적합)';
COMMENT ON COLUMN labdoc_demo_purified_water_tests.source_file IS '데이터 추적용 원본 파일명';
COMMENT ON COLUMN labdoc_demo_purified_water_tests.source_sheet IS '원본 시트명';
COMMENT ON COLUMN labdoc_demo_purified_water_tests.source_row IS '원본 행 번호';


-- ============================================================================
-- 4.2 labdoc_demo_purified_water_test_results (정제수 테스트 결과)
-- Source: 정제수성적서 항목별 검사 결과 (1:N 관계)
-- NOTE: 이 테이블만 FK 제약조건 사용 (부모 테이블과 강결합)
-- ============================================================================
CREATE TABLE labdoc_demo_purified_water_test_results (
    -- === PK ===
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- === FK (Hard Reference) ===
    test_id uuid NOT NULL REFERENCES labdoc_demo_purified_water_tests(id) ON DELETE CASCADE,
    
    -- === 시험항목 정보 ===
    test_item_code varchar(30) NOT NULL,
    test_item_name varchar(50),
    specification text,
    
    -- === 결과값 ===
    result_value text,
    result_numeric decimal(10,4),
    judgment varchar(20),
    
    -- === 검사 빈도 ===
    test_frequency varchar(10),
    
    -- === 타임스탬프 ===
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz,
    
    -- === 제약조건 ===
    CONSTRAINT uq_demo_pw_result UNIQUE (test_id, test_item_code)
);

-- 인덱스
CREATE INDEX idx_demo_pw_results_test_id ON labdoc_demo_purified_water_test_results(test_id);
CREATE INDEX idx_demo_pw_results_item ON labdoc_demo_purified_water_test_results(test_item_code);
CREATE INDEX idx_demo_pw_results_judgment ON labdoc_demo_purified_water_test_results(judgment);
CREATE INDEX idx_demo_pw_results_frequency ON labdoc_demo_purified_water_test_results(test_frequency);

-- 트리거
CREATE TRIGGER update_labdoc_demo_pw_results_updated_at
    BEFORE UPDATE ON labdoc_demo_purified_water_test_results
    FOR EACH ROW EXECUTE FUNCTION labdoc_demo_update_updated_at();

-- 코멘트
COMMENT ON TABLE labdoc_demo_purified_water_test_results IS '정제수성적서 항목별 검사 결과';
COMMENT ON COLUMN labdoc_demo_purified_water_test_results.test_id IS '테스트 헤더 FK';
COMMENT ON COLUMN labdoc_demo_purified_water_test_results.test_item_code IS '시험항목 코드 (영문 snake_case)';
COMMENT ON COLUMN labdoc_demo_purified_water_test_results.test_item_name IS '항목명 (한글)';
COMMENT ON COLUMN labdoc_demo_purified_water_test_results.specification IS '시험 기준';
COMMENT ON COLUMN labdoc_demo_purified_water_test_results.result_value IS '결과값 (텍스트)';
COMMENT ON COLUMN labdoc_demo_purified_water_test_results.result_numeric IS 'pH 등 숫자형 결과 저장용';
COMMENT ON COLUMN labdoc_demo_purified_water_test_results.judgment IS '판정 결과: 적합/부적합/NA';
COMMENT ON COLUMN labdoc_demo_purified_water_test_results.test_frequency IS '검사 빈도 (daily/weekly)';


-- ############################################################################
-- SECTION 5: MATERIAL RECEIPTS DOMAIN (원료입고)
-- ############################################################################

-- ============================================================================
-- 5.1 labdoc_demo_material_receipts (원료입고 기록)
-- Source: 원료입고 관리대장 Excel (2016-2026)
-- ============================================================================
CREATE TABLE labdoc_demo_material_receipts (
    -- === PK ===
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- === 업무키 ===
    test_no varchar(15) UNIQUE NOT NULL,
    
    -- === 입고 정보 ===
    receipt_date date NOT NULL,
    ingredient_code varchar(20),
    ingredient_name text,
    lot_no varchar(50),
    quantity_kg decimal(12,2),
    
    -- === 공급업체 (Soft Reference) ===
    supplier_id uuid,
    supplier_name varchar(100),
    
    -- === COA 참조 ===
    coa_reference varchar(50),
    
    -- === 비고 ===
    remarks text,
    
    -- === 추적성 ===
    source_file text,
    source_sheet text,
    source_row int,
    
    -- === 타임스탬프 ===
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz
);

-- 인덱스
CREATE INDEX idx_demo_receipts_date ON labdoc_demo_material_receipts(receipt_date);
CREATE INDEX idx_demo_receipts_ingredient ON labdoc_demo_material_receipts(ingredient_code);
CREATE INDEX idx_demo_receipts_supplier ON labdoc_demo_material_receipts(supplier_id);
CREATE INDEX idx_demo_receipts_supplier_name ON labdoc_demo_material_receipts(supplier_name);
CREATE INDEX idx_demo_receipts_lot ON labdoc_demo_material_receipts(lot_no);
CREATE INDEX idx_demo_receipts_date_ingredient ON labdoc_demo_material_receipts(receipt_date, ingredient_code);

-- 트리거
CREATE TRIGGER update_labdoc_demo_receipts_updated_at
    BEFORE UPDATE ON labdoc_demo_material_receipts
    FOR EACH ROW EXECUTE FUNCTION labdoc_demo_update_updated_at();

-- 코멘트
COMMENT ON TABLE labdoc_demo_material_receipts IS '원료입고 기록';
COMMENT ON COLUMN labdoc_demo_material_receipts.test_no IS '시험번호 (RYYMMNNN 형식, 예: R2601001)';
COMMENT ON COLUMN labdoc_demo_material_receipts.receipt_date IS '입고일';
COMMENT ON COLUMN labdoc_demo_material_receipts.ingredient_code IS '원료코드 (MXX-NNNN) - ingredients soft ref';
COMMENT ON COLUMN labdoc_demo_material_receipts.ingredient_name IS '원료명';
COMMENT ON COLUMN labdoc_demo_material_receipts.lot_no IS '공급업체 Lot 번호';
COMMENT ON COLUMN labdoc_demo_material_receipts.quantity_kg IS '입고량 (kg)';
COMMENT ON COLUMN labdoc_demo_material_receipts.supplier_id IS '공급업체 ID - suppliers soft ref';
COMMENT ON COLUMN labdoc_demo_material_receipts.supplier_name IS '공급업체명 (원본값 보존)';
COMMENT ON COLUMN labdoc_demo_material_receipts.coa_reference IS 'COA 파일 위치/참조';
COMMENT ON COLUMN labdoc_demo_material_receipts.remarks IS '비고';
COMMENT ON COLUMN labdoc_demo_material_receipts.source_file IS '원본 파일명';
COMMENT ON COLUMN labdoc_demo_material_receipts.source_sheet IS '원본 시트명';
COMMENT ON COLUMN labdoc_demo_material_receipts.source_row IS '원본 행번호';


-- ############################################################################
-- SECTION 6: PRODUCTION DOMAIN (반완제품/완제품)
-- ############################################################################

-- ============================================================================
-- 6.1 labdoc_demo_production_batches (벌크/반제품 생산)
-- Source: 반완제품관리대장 - 반완제품(벌크) 시트
-- ============================================================================
CREATE TABLE labdoc_demo_production_batches (
    -- === PK ===
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- === 업무키 ===
    semi_test_no varchar(15) UNIQUE NOT NULL,
    
    -- === 제품 정보 (Soft Reference) ===
    product_code varchar(30),
    lot_no varchar(30) NOT NULL,
    
    -- === 제조 정보 ===
    manufacturing_date date,
    approval_date date,
    quantity_kg decimal(12,2),
    functionality int DEFAULT 0,
    
    -- === 품질 측정값 ===
    ph_value decimal(5,2),
    ph_standard varchar(30),
    viscosity decimal(12,2),
    viscosity_standard varchar(30),
    specific_gravity decimal(6,4),
    gravity_standard decimal(6,4),
    
    -- === 포장 정보 (완제품 연결) ===
    finished_product_code varchar(30),
    finished_test_no varchar(15),
    production_date date,
    production_approval_date date,
    actual_quantity_ea int,
    theoretical_quantity_ea decimal(12,2),
    packaging_yield decimal(6,2),
    actual_fill_volume decimal(10,2),
    
    -- === 관리 필드 ===
    managed_item int DEFAULT 0,
    remarks text,
    
    -- === 추적성 ===
    source_file text,
    source_sheet text,
    source_row int,
    
    -- === 타임스탬프 ===
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz
);

-- 인덱스
CREATE INDEX idx_demo_batches_product ON labdoc_demo_production_batches(product_code);
CREATE INDEX idx_demo_batches_lot ON labdoc_demo_production_batches(lot_no);
CREATE INDEX idx_demo_batches_mfg_date ON labdoc_demo_production_batches(manufacturing_date);
CREATE INDEX idx_demo_batches_finished ON labdoc_demo_production_batches(finished_test_no);
CREATE INDEX idx_demo_batches_finished_product ON labdoc_demo_production_batches(finished_product_code);
CREATE INDEX idx_demo_batches_prod_date ON labdoc_demo_production_batches(production_date);

-- 트리거
CREATE TRIGGER update_labdoc_demo_batches_updated_at
    BEFORE UPDATE ON labdoc_demo_production_batches
    FOR EACH ROW EXECUTE FUNCTION labdoc_demo_update_updated_at();

-- 코멘트
COMMENT ON TABLE labdoc_demo_production_batches IS '벌크/반제품 생산 배치 기록';
COMMENT ON COLUMN labdoc_demo_production_batches.semi_test_no IS '반제품시험번호 (B + 년도2자리 + 순번5자리, 예: B2601001)';
COMMENT ON COLUMN labdoc_demo_production_batches.product_code IS 'B CODE - 벌크 제품 코드 (products soft ref)';
COMMENT ON COLUMN labdoc_demo_production_batches.lot_no IS '배치번호 (B6001, S6001 등)';
COMMENT ON COLUMN labdoc_demo_production_batches.manufacturing_date IS '제조일';
COMMENT ON COLUMN labdoc_demo_production_batches.approval_date IS '제조판정일 (품질 승인)';
COMMENT ON COLUMN labdoc_demo_production_batches.quantity_kg IS '제조량(kg)';
COMMENT ON COLUMN labdoc_demo_production_batches.functionality IS '기능성 여부 (0/1)';
COMMENT ON COLUMN labdoc_demo_production_batches.ph_value IS 'pH 측정값';
COMMENT ON COLUMN labdoc_demo_production_batches.ph_standard IS 'pH 기준 (예: 6.00 +/- 1.00)';
COMMENT ON COLUMN labdoc_demo_production_batches.viscosity IS '점,경도 측정값';
COMMENT ON COLUMN labdoc_demo_production_batches.viscosity_standard IS '점,경도 기준';
COMMENT ON COLUMN labdoc_demo_production_batches.specific_gravity IS '비중 측정값';
COMMENT ON COLUMN labdoc_demo_production_batches.gravity_standard IS '비중 기준';
COMMENT ON COLUMN labdoc_demo_production_batches.finished_product_code IS 'P CODE - 완제품 코드';
COMMENT ON COLUMN labdoc_demo_production_batches.finished_test_no IS '완제품시험번호 - finished_batches와 연결';
COMMENT ON COLUMN labdoc_demo_production_batches.production_date IS '생산일 (포장)';
COMMENT ON COLUMN labdoc_demo_production_batches.production_approval_date IS '생산판정일 (포장 승인)';
COMMENT ON COLUMN labdoc_demo_production_batches.actual_quantity_ea IS '실생산량(ea)';
COMMENT ON COLUMN labdoc_demo_production_batches.theoretical_quantity_ea IS '이론 생산량';
COMMENT ON COLUMN labdoc_demo_production_batches.packaging_yield IS '포장수율(%)';
COMMENT ON COLUMN labdoc_demo_production_batches.actual_fill_volume IS '실제 충전량';
COMMENT ON COLUMN labdoc_demo_production_batches.managed_item IS '관리 항목 플래그';
COMMENT ON COLUMN labdoc_demo_production_batches.remarks IS '비고';


-- ============================================================================
-- 6.2 labdoc_demo_finished_batches (완제품 생산)
-- Source: 반완제품관리대장 - 완제품 시트
-- ============================================================================
CREATE TABLE labdoc_demo_finished_batches (
    -- === PK ===
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- === 업무키 ===
    finished_test_no varchar(15) UNIQUE NOT NULL,
    
    -- === 제품 정보 (Soft Reference) ===
    product_code varchar(30),
    lot_no varchar(30) NOT NULL,
    
    -- === 생산 정보 ===
    production_date date,
    approval_date date,
    actual_quantity_ea int,
    average_volume decimal(10,2),
    
    -- === 품질 측정값 ===
    ph_value decimal(5,2),
    
    -- === 원본 벌크 정보 ===
    bulk_manufacturing_date date,
    
    -- === 반제품 연결 (Soft Reference) ===
    semi_test_no varchar(15),
    
    -- === 기타 필드 ===
    theoretical_quantity_ea decimal(12,2),
    packaging_yield decimal(6,2),
    actual_fill_volume decimal(10,2),
    managed_item int DEFAULT 0,
    remarks text,
    
    -- === 추적성 ===
    source_file text,
    source_sheet text,
    source_row int,
    
    -- === 타임스탬프 ===
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz
);

-- 인덱스
CREATE INDEX idx_demo_finished_product ON labdoc_demo_finished_batches(product_code);
CREATE INDEX idx_demo_finished_lot ON labdoc_demo_finished_batches(lot_no);
CREATE INDEX idx_demo_finished_semi ON labdoc_demo_finished_batches(semi_test_no);
CREATE INDEX idx_demo_finished_prod_date ON labdoc_demo_finished_batches(production_date);
CREATE INDEX idx_demo_finished_bulk_date ON labdoc_demo_finished_batches(bulk_manufacturing_date);

-- 트리거
CREATE TRIGGER update_labdoc_demo_finished_updated_at
    BEFORE UPDATE ON labdoc_demo_finished_batches
    FOR EACH ROW EXECUTE FUNCTION labdoc_demo_update_updated_at();

-- 코멘트
COMMENT ON TABLE labdoc_demo_finished_batches IS '완제품 생산 배치 기록';
COMMENT ON COLUMN labdoc_demo_finished_batches.finished_test_no IS '완제품시험번호 (P + 년도2자리 + 순번5자리, 예: P2601001)';
COMMENT ON COLUMN labdoc_demo_finished_batches.product_code IS 'P CODE - 완제품 코드 (products soft ref)';
COMMENT ON COLUMN labdoc_demo_finished_batches.lot_no IS '배치번호';
COMMENT ON COLUMN labdoc_demo_finished_batches.production_date IS '포장일 (생산일)';
COMMENT ON COLUMN labdoc_demo_finished_batches.approval_date IS '생산판정일 (승인일)';
COMMENT ON COLUMN labdoc_demo_finished_batches.actual_quantity_ea IS '실생산량(ea)';
COMMENT ON COLUMN labdoc_demo_finished_batches.average_volume IS '평균용량 (ml)';
COMMENT ON COLUMN labdoc_demo_finished_batches.ph_value IS 'pH 측정값';
COMMENT ON COLUMN labdoc_demo_finished_batches.bulk_manufacturing_date IS '제조일 (벌크 원본)';
COMMENT ON COLUMN labdoc_demo_finished_batches.semi_test_no IS '반제품시험번호 - production_batches와 연결';
COMMENT ON COLUMN labdoc_demo_finished_batches.theoretical_quantity_ea IS '이론 생산량';
COMMENT ON COLUMN labdoc_demo_finished_batches.packaging_yield IS '포장수율(%)';
COMMENT ON COLUMN labdoc_demo_finished_batches.actual_fill_volume IS '실제 충전량';
COMMENT ON COLUMN labdoc_demo_finished_batches.managed_item IS '관리 항목 플래그';
COMMENT ON COLUMN labdoc_demo_finished_batches.remarks IS '비고';


-- ============================================================================
-- 6.3 labdoc_demo_oem_products (OEM 입고)
-- Source: 반완제품관리대장 - OEM 시트
-- ============================================================================
CREATE TABLE labdoc_demo_oem_products (
    -- === PK ===
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- === 제품 정보 (Soft Reference) ===
    product_code varchar(30),
    product_name text,
    lot_no varchar(30),
    
    -- === 입고 정보 ===
    receiving_date date,
    approval_date date,
    received_quantity_ea int,
    
    -- === 품질 정보 ===
    finished_test_no varchar(15),
    ph_value decimal(5,2),
    
    -- === 관리 필드 ===
    managed_item int DEFAULT 0,
    remarks text,
    
    -- === 추적성 ===
    source_file text,
    source_sheet text,
    source_row int,
    
    -- === 타임스탬프 ===
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz
);

-- 인덱스
CREATE INDEX idx_demo_oem_product ON labdoc_demo_oem_products(product_code);
CREATE INDEX idx_demo_oem_date ON labdoc_demo_oem_products(receiving_date);
CREATE INDEX idx_demo_oem_lot ON labdoc_demo_oem_products(lot_no);
CREATE INDEX idx_demo_oem_finished ON labdoc_demo_oem_products(finished_test_no);

-- 트리거
CREATE TRIGGER update_labdoc_demo_oem_updated_at
    BEFORE UPDATE ON labdoc_demo_oem_products
    FOR EACH ROW EXECUTE FUNCTION labdoc_demo_update_updated_at();

-- 코멘트
COMMENT ON TABLE labdoc_demo_oem_products IS 'OEM 위탁생산 제품 입고 기록';
COMMENT ON COLUMN labdoc_demo_oem_products.product_code IS 'P CODE - 제품코드 (products soft ref)';
COMMENT ON COLUMN labdoc_demo_oem_products.product_name IS '제품명 (OEM 시트에서만 존재)';
COMMENT ON COLUMN labdoc_demo_oem_products.lot_no IS '배치번호';
COMMENT ON COLUMN labdoc_demo_oem_products.receiving_date IS '입고일';
COMMENT ON COLUMN labdoc_demo_oem_products.approval_date IS '판정일';
COMMENT ON COLUMN labdoc_demo_oem_products.received_quantity_ea IS '입고수량(ea)';
COMMENT ON COLUMN labdoc_demo_oem_products.finished_test_no IS '완제품시험번호';
COMMENT ON COLUMN labdoc_demo_oem_products.ph_value IS 'pH 측정값';
COMMENT ON COLUMN labdoc_demo_oem_products.managed_item IS '관리 항목 플래그';
COMMENT ON COLUMN labdoc_demo_oem_products.remarks IS '비고';


-- ############################################################################
-- SECTION 7: MASTER DATA INSERT (정제수 시험항목 12개)
-- ############################################################################

INSERT INTO labdoc_demo_purified_water_test_items 
    (item_code, item_name_ko, item_name_en, specification, test_frequency, result_type, sort_order) 
VALUES
    -- 일상 검사 항목 (5개)
    ('appearance', '성상', 'Appearance', '무색투명액상,무취,무미', 'daily', 'pass_fail', 1),
    ('ph', 'pH', 'pH', '5.0~7.0', 'daily', 'numeric', 2),
    ('chloride', '염화물', 'Chloride', '액이 변해선 안됨', 'daily', 'pass_fail', 3),
    ('sulfate', '황산염', 'Sulfate', '액이 변해선 안됨', 'daily', 'pass_fail', 4),
    ('heavy_metals', '중금속', 'Heavy Metals', '비교액보다 진해선 안됨', 'daily', 'pass_fail', 5),
    
    -- 주 1회 검사 항목 (7개)
    ('residual_chlorine', '잔류염소', 'Residual Chlorine', '색을 나타내선 안됨', 'weekly', 'pass_fail_na', 6),
    ('ammonia', '암모니아', 'Ammonia', '액이 변해선 안됨', 'weekly', 'pass_fail_na', 7),
    ('carbon_dioxide', '이산화탄소', 'Carbon Dioxide', '액이 변해선 안됨', 'weekly', 'pass_fail_na', 8),
    ('potassium', '칼륨', 'Potassium', '액이 변해선 안됨', 'weekly', 'pass_fail_na', 9),
    ('permanganate', '과망간산칼륨환원성물질', 'Permanganate Reducing', '홍색이 없어져선 안됨', 'weekly', 'pass_fail_na', 10),
    ('evaporation_residue', '증발잔류물', 'Evaporation Residue', '1mg 이하', 'weekly', 'pass_fail_na', 11),
    ('microorganism', '미생물', 'Microorganism', '100 CFU/g 이하', 'weekly', 'pass_fail_na', 12);


-- ############################################################################
-- SECTION 8: VERIFICATION QUERIES (주석 처리됨 - 필요시 실행)
-- ############################################################################

/*
-- 테이블 목록 확인
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name LIKE 'labdoc_demo_%'
ORDER BY table_name;

-- 인덱스 목록 확인
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_demo_%'
ORDER BY tablename, indexname;

-- 트리거 목록 확인
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%labdoc_demo%'
ORDER BY event_object_table;

-- 정제수 시험항목 확인
SELECT item_code, item_name_ko, test_frequency, result_type, sort_order
FROM labdoc_demo_purified_water_test_items
ORDER BY sort_order;

-- 테이블별 레코드 수 (마이그레이션 후 확인용)
SELECT 'labdoc_demo_products' AS table_name, COUNT(*) AS row_count FROM labdoc_demo_products
UNION ALL SELECT 'labdoc_demo_ingredients', COUNT(*) FROM labdoc_demo_ingredients
UNION ALL SELECT 'labdoc_demo_suppliers', COUNT(*) FROM labdoc_demo_suppliers
UNION ALL SELECT 'labdoc_demo_purified_water_test_items', COUNT(*) FROM labdoc_demo_purified_water_test_items
UNION ALL SELECT 'labdoc_demo_purified_water_tests', COUNT(*) FROM labdoc_demo_purified_water_tests
UNION ALL SELECT 'labdoc_demo_purified_water_test_results', COUNT(*) FROM labdoc_demo_purified_water_test_results
UNION ALL SELECT 'labdoc_demo_material_receipts', COUNT(*) FROM labdoc_demo_material_receipts
UNION ALL SELECT 'labdoc_demo_production_batches', COUNT(*) FROM labdoc_demo_production_batches
UNION ALL SELECT 'labdoc_demo_finished_batches', COUNT(*) FROM labdoc_demo_finished_batches
UNION ALL SELECT 'labdoc_demo_oem_products', COUNT(*) FROM labdoc_demo_oem_products;
*/


-- ############################################################################
-- END OF DDL MIGRATION
-- ############################################################################
-- Summary:
--   - Tables created: 10
--   - Indexes created: 28+
--   - Triggers created: 10
--   - Master data inserted: 12 purified water test items
-- ============================================================================
