import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// .env.local에서 환경변수 로드
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8')
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim()
      }
    })
  }
}

loadEnv()

// Supabase 연결 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://usvjbuudnofwhmclwhfl.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY를 찾을 수 없습니다')
  console.error('   .env.local 파일에 SUPABASE_SERVICE_ROLE_KEY가 있는지 확인하세요')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface BomRow {
  prdcode: string | null
  생산품목명: string | null
  품목구분: string | null
  bom버전: string | null
  materialcode: string | null
  sort: string | null
}

interface LabProduct {
  prdcode: string
  product_name: string
  semi_product_code: string | null
  p_product_code: string | null
  category: string | null
  bom_version: string | null
}

async function createTable() {
  console.log('📦 Creating lab_products table...')
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS lab_products (
        prdcode VARCHAR(50) PRIMARY KEY,
        product_name VARCHAR(200) NOT NULL,
        semi_product_code VARCHAR(50),
        p_product_code VARCHAR(50),
        category VARCHAR(100),
        bom_version VARCHAR(20),
        status VARCHAR(20) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_lab_products_semi ON lab_products(semi_product_code);
      CREATE INDEX IF NOT EXISTS idx_lab_products_category ON lab_products(category);
      CREATE INDEX IF NOT EXISTS idx_lab_products_status ON lab_products(status);
    `
  })
  
  if (error) {
    // RPC가 없을 수 있음 - 테이블 직접 확인
    console.log('⚠️ RPC 없음, 테이블 존재 여부 확인...')
    const { error: checkError } = await supabase.from('lab_products').select('prdcode').limit(1)
    
    if (checkError && checkError.code === '42P01') {
      console.error('❌ lab_products 테이블이 없습니다. Supabase Dashboard에서 먼저 테이블을 생성해주세요.')
      console.log('\n📋 실행할 SQL:\n')
      console.log(`
CREATE TABLE IF NOT EXISTS lab_products (
    prdcode VARCHAR(50) PRIMARY KEY,
    product_name VARCHAR(200) NOT NULL,
    semi_product_code VARCHAR(50),
    p_product_code VARCHAR(50),
    category VARCHAR(100),
    bom_version VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_products_semi ON lab_products(semi_product_code);
CREATE INDEX IF NOT EXISTS idx_lab_products_category ON lab_products(category);
CREATE INDEX IF NOT EXISTS idx_lab_products_status ON lab_products(status);
      `)
      return false
    }
    console.log('✅ lab_products 테이블 확인됨')
  } else {
    console.log('✅ lab_products 테이블 생성 완료')
  }
  return true
}

async function migrateProducts() {
  console.log('\n🔍 Step 1: 완제품 목록 조회 (sort = [제품])...')
  
  // 1. 완제품 목록 가져오기
  const { data: finishedProducts, error: err1 } = await supabase
    .from('bom_master')
    .select('prdcode, 생산품목명, 품목구분, bom버전')
    .eq('sort', '[제품]')
    .not('prdcode', 'is', null)
  
  if (err1) {
    console.error('❌ 완제품 조회 실패:', err1)
    return
  }
  
  // 고유 완제품 추출
  const uniqueProducts = new Map<string, { product_name: string; category: string | null; bom_version: string | null }>()
  for (const row of finishedProducts || []) {
    if (row.prdcode && !uniqueProducts.has(row.prdcode)) {
      uniqueProducts.set(row.prdcode, {
        product_name: row.생산품목명 || row.prdcode,
        category: row.품목구분,
        bom_version: row.bom버전
      })
    }
  }
  console.log(`  → ${uniqueProducts.size}개 고유 완제품 발견`)
  
  // 2. 완제품 → P제품 매핑
  console.log('\n🔍 Step 2: P제품 매핑 조회...')
  const { data: pMappings, error: err2 } = await supabase
    .from('bom_master')
    .select('prdcode, materialcode')
    .eq('sort', '[제품]')
    .like('materialcode', 'P%')
  
  if (err2) {
    console.error('❌ P제품 매핑 조회 실패:', err2)
    return
  }
  
  const productToP = new Map<string, string>()
  for (const row of pMappings || []) {
    if (row.prdcode && row.materialcode) {
      productToP.set(row.prdcode, row.materialcode)
    }
  }
  console.log(`  → ${productToP.size}개 완제품-P제품 매핑 발견`)
  
  // 3. P제품 → B제품(반제품) 매핑
  console.log('\n🔍 Step 3: 반제품(B코드) 매핑 조회...')
  const { data: bMappings, error: err3 } = await supabase
    .from('bom_master')
    .select('prdcode, materialcode')
    .eq('sort', '[반제품]')
    .like('prdcode', 'P%')
    .like('materialcode', 'B%')
  
  if (err3) {
    console.error('❌ 반제품 매핑 조회 실패:', err3)
    return
  }
  
  const pToB = new Map<string, string>()
  for (const row of bMappings || []) {
    if (row.prdcode && row.materialcode) {
      pToB.set(row.prdcode, row.materialcode)
    }
  }
  console.log(`  → ${pToB.size}개 P제품-반제품 매핑 발견`)
  
  // 4. 최종 데이터 구성
  console.log('\n📦 Step 4: lab_products 데이터 구성...')
  const labProducts: LabProduct[] = []
  
  for (const [prdcode, info] of uniqueProducts) {
    const pCode = productToP.get(prdcode) || null
    const bCode = pCode ? (pToB.get(pCode) || null) : null
    
    labProducts.push({
      prdcode,
      product_name: info.product_name,
      semi_product_code: bCode,
      p_product_code: pCode,
      category: info.category,
      bom_version: info.bom_version
    })
  }
  
  const withSemi = labProducts.filter(p => p.semi_product_code).length
  console.log(`  → 총 ${labProducts.length}개 제품`)
  console.log(`  → 반제품 매핑 완료: ${withSemi}개`)
  console.log(`  → 반제품 매핑 없음: ${labProducts.length - withSemi}개`)
  
  // 5. 데이터 삽입
  console.log('\n💾 Step 5: lab_products 테이블에 삽입...')
  
  const batchSize = 100
  let inserted = 0
  
  for (let i = 0; i < labProducts.length; i += batchSize) {
    const batch = labProducts.slice(i, i + batchSize)
    
    const { error: insertErr } = await supabase
      .from('lab_products')
      .upsert(batch, { onConflict: 'prdcode' })
    
    if (insertErr) {
      console.error(`❌ 삽입 오류 (batch ${i}):`, insertErr)
      continue
    }
    
    inserted += batch.length
    console.log(`  ✓ ${inserted}/${labProducts.length} 완료`)
  }
  
  console.log(`\n✅ 마이그레이션 완료: ${inserted}개 제품`)
}

async function verifyMigration() {
  console.log('\n🔍 마이그레이션 검증...')
  
  const { data, error } = await supabase
    .from('lab_products')
    .select('*')
    .limit(10)
  
  if (error) {
    console.error('❌ 검증 실패:', error)
    return
  }
  
  console.log(`\n📊 샘플 데이터 (처음 10개):`)
  console.table(data?.map(p => ({
    prdcode: p.prdcode,
    product_name: p.product_name?.substring(0, 20) + '...',
    semi_code: p.semi_product_code,
    p_code: p.p_product_code
  })))
  
  // 통계
  const { count: total } = await supabase
    .from('lab_products')
    .select('*', { count: 'exact', head: true })
  
  const { count: withSemi } = await supabase
    .from('lab_products')
    .select('*', { count: 'exact', head: true })
    .not('semi_product_code', 'is', null)
  
  console.log(`\n📈 통계:`)
  console.log(`  총 제품 수: ${total}`)
  console.log(`  반제품 매핑 완료: ${withSemi}`)
  console.log(`  반제품 매핑 없음: ${(total || 0) - (withSemi || 0)}`)
}

async function main() {
  console.log('🚀 lab_products 마이그레이션 시작\n')
  console.log('=' .repeat(50))
  
  const tableReady = await createTable()
  if (!tableReady) {
    console.log('\n⚠️ 테이블 생성 후 다시 실행해주세요.')
    return
  }
  
  await migrateProducts()
  await verifyMigration()
  
  console.log('\n' + '='.repeat(50))
  console.log('🎉 완료!')
}

main().catch(console.error)
