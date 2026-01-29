import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import * as path from 'path'

const supabaseUrl = 'https://usvjbuudnofwhmclwhfl.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzdmpidXVkbm9md2htY2x3aGZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTQxNzk0OCwiZXhwIjoyMDYwOTkzOTQ4fQ.VolU6FRMVFC2V4Ihjwod2BjE2bvfI9kPEivCe1AgO7U'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const DATA_DIR = '/Users/seulkiji/(주)에바스코스메틱 Dropbox/JI SEULKI/claude/@ongoing_LAB doc/200_연구실 문서 샘플'

interface IngredientMaster {
  코드번호: string
  원료명: string
  제조원?: string
  납품처?: string
  채취방법?: string
  채취장소?: string
}

interface IngredientComponent {
  코드번호: string
  원료명: string
  성분순서: number
  영문_INCI: string
  한글_INCI: string
  CAS_번호: string
  조성비: number
  Function: string
  제조국: string
}

interface TestSpec {
  코드번호: string
  원료명: string
  시험항목: string
  시험기준: string
}

async function loadExcelFile<T>(filePath: string, sheetName: string): Promise<T[]> {
  const workbook = XLSX.readFile(filePath)
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found in ${filePath}`)
  }
  return XLSX.utils.sheet_to_json<T>(sheet)
}

async function migrateIngredients() {
  console.log('📦 Migrating ingredients...')
  
  const filePath = path.join(DATA_DIR, '에바스_원료_통합데이터.xlsx')
  const data = await loadExcelFile<IngredientMaster>(filePath, '원료마스터')
  
  const ingredients = data.map(row => ({
    code: row.코드번호,
    name: row.원료명,
    manufacturer: row.제조원 || null,
    supplier: row.납품처 || null,
    sampling_method: row.채취방법 || null,
    sampling_location: row.채취장소 || null
  }))

  const batchSize = 100
  for (let i = 0; i < ingredients.length; i += batchSize) {
    const batch = ingredients.slice(i, i + batchSize)
    const { error } = await supabase.from('ingredients').upsert(batch, { onConflict: 'code' })
    if (error) {
      console.error(`Error at batch ${i}:`, error)
      throw error
    }
    console.log(`  ✓ Migrated ${Math.min(i + batchSize, ingredients.length)}/${ingredients.length} ingredients`)
  }
  
  console.log(`✅ Migrated ${ingredients.length} ingredients`)
}

async function migrateComponents() {
  console.log('🧬 Migrating ingredient components...')
  
  const filePath = path.join(DATA_DIR, '원료_마스터_테이블_전체.xlsx')
  const data = await loadExcelFile<IngredientComponent>(filePath, '원료_마스터')
  
  const components = data.map(row => ({
    ingredient_code: row.코드번호,
    component_order: row.성분순서,
    inci_name_en: row.영문_INCI || null,
    inci_name_kr: row.한글_INCI || null,
    cas_number: row.CAS_번호 || null,
    composition_ratio: row.조성비 || null,
    function: row.Function || null,
    country_of_origin: row.제조국 || null
  }))

  const batchSize = 200
  for (let i = 0; i < components.length; i += batchSize) {
    const batch = components.slice(i, i + batchSize)
    const { error } = await supabase.from('ingredient_components').insert(batch)
    if (error) {
      console.error(`Error at batch ${i}:`, error)
      if (error.code !== '23505') throw error
    }
    console.log(`  ✓ Migrated ${Math.min(i + batchSize, components.length)}/${components.length} components`)
  }
  
  console.log(`✅ Migrated ${components.length} components`)
}

async function migrateTestSpecs() {
  console.log('📋 Migrating test specifications...')
  
  const filePath = path.join(DATA_DIR, '에바스_원료_통합데이터.xlsx')
  const data = await loadExcelFile<TestSpec>(filePath, '시험기준템플릿')
  
  const uniqueSpecs = new Map<string, { ingredient_code: string; test_item: string; specification: string; display_order: number }>()
  
  data.forEach((row, idx) => {
    const key = `${row.코드번호}-${row.시험항목}`
    if (!uniqueSpecs.has(key) && row.시험항목 && row.시험기준) {
      uniqueSpecs.set(key, {
        ingredient_code: row.코드번호,
        test_item: row.시험항목,
        specification: row.시험기준,
        display_order: idx
      })
    }
  })

  const specs = Array.from(uniqueSpecs.values())
  
  const batchSize = 200
  for (let i = 0; i < specs.length; i += batchSize) {
    const batch = specs.slice(i, i + batchSize)
    const { error } = await supabase.from('test_specifications').upsert(batch, { 
      onConflict: 'ingredient_code,test_item' 
    })
    if (error) {
      console.error(`Error at batch ${i}:`, error)
      if (error.code !== '23505') throw error
    }
    console.log(`  ✓ Migrated ${Math.min(i + batchSize, specs.length)}/${specs.length} test specs`)
  }
  
  console.log(`✅ Migrated ${specs.length} test specifications`)
}

async function main() {
  console.log('🚀 Starting data migration to Supabase...\n')
  
  try {
    await migrateIngredients()
    console.log()
    await migrateComponents()
    console.log()
    await migrateTestSpecs()
    console.log('\n🎉 Migration completed successfully!')
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

main()
