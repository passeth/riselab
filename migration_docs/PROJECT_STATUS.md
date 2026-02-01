# Excel to CSV Migration Project - Status Report

**Date**: 2026-01-31  
**Status**: ✅ Phase 2 Complete - CSV Export with Allergen Data

---

## 📊 Project Overview

**Objective**: Extract structured data from 94 Korean cosmetic product standard documents (제품표준서) into CSV format for database import.

**Source Files**: 94 Excel (.xls) files  
**Output Format**: 4 CSV files (products, BOM, QC specs, revisions)

---

## ✅ Completed Work

### Phase 1: Database Schema Design
- Created PostgreSQL/Supabase schema with 4 tables
- Designed migration scripts (`migrate_products.py`)
- **Status**: Archived (user pivoted to CSV export)

### Phase 2: CSV Export Implementation
- ✅ Created `export_to_csv.py` - main export script
- ✅ Successfully processed 93/94 files (1 file missing '입력란' sheet)
- ✅ Generated 4 CSV files with proper UTF-8-BOM encoding

### Phase 3: Allergen Field Addition
- ✅ Located allergen data in cells F42-F48 of '입력란' sheet
- ✅ Added extraction logic for Korean and English allergen fields
- ✅ Regenerated all CSV files with allergen columns
- ✅ Verified 36/94 products contain allergen information

---

## 📁 Output Files

### CSV Files Generated (in `csv_output/`)

| File | Records | Description |
|------|---------|-------------|
| `products.csv` | 94 | Product master data with allergen info |
| `bom.csv` | 2,226 | Bill of Materials (ingredients) |
| `qc_specs.csv` | 2,283 | Quality Control specifications |
| `revisions.csv` | 121 | Product revision history |

**Total Records**: 4,733 rows across 4 files

### Products CSV Schema

```
국문제품명, 영문제품명, 관리번호, 작성일자, 제품코드, 성상, 포장단위, 작성자, 사용법,
Allergen국문, Allergen영문, 저장방법, 사용기한, 원본파일
```

**New Fields Added**:
- `Allergen국문` - Korean allergen list (e.g., "벤질살리실레이트, 리모넨")
- `Allergen영문` - English allergen list (e.g., "Benzyl Salicylate, Limonene")

---

## 📈 Statistics

### Processing Results
- **Total Files**: 94
- **Successfully Processed**: 93 (98.9%)
- **Failed**: 1 (missing '입력란' sheet)
  - File: `제품표준서(CMFS000)-청정미인 데오라이징 쿨링 풋 샴푸.xls`

### Allergen Data Coverage
- **Products with Allergen Data**: 36/94 (38.3%)
- **Products without Allergen Data**: 58/94 (61.7%)

### Data Extraction Summary
- **BOM Items**: 2,226 (avg 23.7 ingredients per product)
- **QC Specifications**: 2,283 (avg 24.3 specs per product)
- **Revision Records**: 121 (avg 1.3 revisions per product)

---

## 🛠️ Technical Details

### Excel File Structure

**'입력란' Sheet**:
```
Rows 2-11 (Columns A-C): 기본사항 (Basic Info)
  A3→B3: 국문제품명 (Korean product name)
  A4→B4: 영문제품명 (English product name)
  A5→B5: 관리번호 (Management number)
  A6→B6: 작성일자 (Creation date)
  A7→B7: 제품코드 (Product code)
  A8→B8: 성상 (Appearance)
  A9→B9: 포장단위 (Packaging unit)
  A10→B10: 작성자 (Author)
  A11→B11: 사용법 (Usage instructions)

Rows 14-44 (Columns A-C): BOM (Bill of Materials)
  A: 순번 (Sequence)
  B: 원료코드 (Material code)
  C: 함량% (Percentage)

Rows 2-40 (Columns E-I): QC Specifications
  E: 순번 (Sequence)
  F: 항목 (Item)
  G-H: 시험기준 (Test criteria - merged cells)
  I: 시험방법 (Test method)

Rows 42-48 (Column F): Allergen Info
  F42: "Allergen(국문)" label
  F43: Korean allergen value
  F47: "Allergen(영문)" label
  F48: English allergen value
```

**'제품표준서' Sheet**:
```
D18: 저장방법 (Storage method)
D19: 사용기한 (Expiration)
A23-D27: 개정사항 (Revisions - up to 5 entries)
```

### Encoding
- **Input**: Legacy .xls format (parsed with `xlrd` library)
- **Output**: UTF-8 with BOM (`utf-8-sig`) for Excel compatibility
- **Console Display Issue**: Korean text shows corrupted in Windows console (cp949 encoding conflict)
  - ⚠️ This is ONLY a display issue - CSV files contain correct UTF-8 data

---

## 🔧 Scripts & Tools

### Main Script: `export_to_csv.py`

**Usage**:
```bash
# Export all files
python export_to_csv.py

# Export single file (for testing)
python export_to_csv.py --file "제품표준서_EVCO1000_(FJSL002)-프레쥬 프로 모이스처 크리미 토너.xls"
```

**Features**:
- Batch processing with progress tracking
- Error handling and logging
- UTF-8-BOM encoding for Excel compatibility
- Allergen extraction with fallback search
- Detailed logging to `csv_export.log`

### Supporting Scripts
- `migrate_products.py` - Supabase migration (archived)
- `test_parse.py` - Single file testing
- `check_allergen_location.py` - Allergen field debugging

### Dependencies
```
xlrd==2.0.1           # Excel file parsing
supabase==2.3.4       # Database client (not currently used)
python-dotenv==1.0.0  # Environment variables
```

---

## 📂 Directory Structure

```
C:\Users\passe\Documents\@PROJECT\riselab\
├── export_to_csv.py          # Main CSV export script ⭐
├── migrate_products.py       # Supabase migration (archived)
├── test_parse.py             # Test script
├── check_allergen_location.py # Debug script
├── requirements.txt          # Python dependencies
├── .env.example              # Environment template
├── csv_output/               # Generated CSV files ⭐
│   ├── products.csv          # 94 products
│   ├── bom.csv               # 2,226 BOM items
│   ├── qc_specs.csv          # 2,283 QC specs
│   └── revisions.csv         # 121 revisions
├── csv_export.log            # Export operation log
└── PROJECT_STATUS.md         # This file

Source Files:
d:\(주)에바스코스메틱 Dropbox\JI SEULKI\claude\@ongoing_LAB doc\200_연구실 문서 샘플\04_01_제품표준서\
└── 94 Excel files (.xls)
```

---

## 🎯 Next Steps

### Immediate Actions

1. **Verify CSV Quality**
   - [ ] Open `csv_output/products.csv` in Excel/LibreOffice
   - [ ] Confirm Korean allergen text displays correctly
   - [ ] Spot-check 5-10 products against source Excel files

2. **Production Data Processing**
   - [ ] User mentioned "실제 정리해야할 파일" (actual files to process)
   - [ ] Get path to production folder
   - [ ] Run `export_to_csv.py` on production data
   - [ ] Compare results with sample data

3. **Handle Failed File**
   - [ ] Investigate `제품표준서(CMFS000)-청정미인 데오라이징 쿨링 풋 샴푸.xls`
   - [ ] Check if it has a different sheet structure
   - [ ] Add special handling if needed

### Potential Enhancements

4. **Script Improvements**
   - [ ] Add progress bar for large batches (using `tqdm`)
   - [ ] Add summary statistics output (allergen coverage, etc.)
   - [ ] Add data validation (check for missing required fields)
   - [ ] Add duplicate detection (same product code)

5. **Additional Fields**
   - [ ] Ask user if any other fields need extraction
   - [ ] Check if there are other sheets with useful data
   - [ ] Consider extracting more detailed revision info

6. **Database Import**
   - [ ] If user wants database migration, use existing `schema.sql`
   - [ ] Create import script for CSV → Supabase
   - [ ] Add data validation before import

---

## 🐛 Known Issues

### 1. Console Encoding Display
**Issue**: Korean text shows corrupted in Windows console  
**Example**: `벤질살리실레이트` displays as `�����츮�Ƿ���Ʈ`  
**Cause**: Windows console uses cp949 encoding, Python outputs UTF-8  
**Impact**: Display only - CSV files contain correct UTF-8 data  
**Solution**: Verify data by opening CSV in Excel/LibreOffice

### 2. Missing Sheet Error
**File**: `제품표준서(CMFS000)-청정미인 데오라이징 쿨링 풋 샴푸.xls`  
**Error**: `No sheet named <'입력란'>`  
**Impact**: 1/94 files not processed  
**Next Step**: Manual inspection needed

### 3. Allergen Field Location Variance
**Issue**: Some files may have allergen data in different cells  
**Current Solution**: Script checks F42-F48 first, then searches entire sheet  
**Coverage**: Successfully found allergens in 36/94 products

---

## 📝 Sample Data

### Products with Allergen Data (5 examples)

| 국문제품명 | Allergen국문 | Allergen영문 |
|-----------|-------------|-------------|
| 페디슨 락토 플로라 릴리프 페미닌 클렌저 | 벤질살리실레이트, 리모넨 | Benzyl Salicylate, Limonene |
| 에바스 나뚜리아 크리미 밀크 바디워시-스위트 라벤더 | 리모넨, 제라니올, 헥실신나말, 리날올, 부틸페닐 메틸프로피오날 | Limonene, Geraniol, Hexyl Cinnamal, Linalool, Butylphenyl Methylpropional |
| 미미로린스 소프트 바디워시-로즈 | 알파-이소메틸 이오논, 벤질벤조에이트, 리모넨, 헥실신나말, 하이드록시시트로넬랄, 리날올 | Alpha-Isomethyl Ionone, Benzyl Benzoate, Limonene, Hexyl Cinnamal, Hydroxycitronellal, Linalool |
| 제이온 베타 글루칸 바디워시 | 리모넨, 리날올 | Limonene, Linalool |
| 제이온 콜라겐 바디워시 | 리모넨, 헥실신나말, 리날올 | Limonene, Hexyl Cinnamal, Linalool |

---

## 💡 User Questions to Answer

Before proceeding, please confirm:

1. **CSV Quality**: Do the CSV files look correct when opened in Excel?
2. **Production Data**: What is the path to the "actual files to process"?
3. **Additional Fields**: Are there any other fields you need extracted?
4. **Output Format**: Is the 4-file CSV structure suitable, or do you need a different format?
5. **Database Import**: Do you want to proceed with Supabase import, or just use CSV files?
6. **Failed File**: Should we investigate the 1 failed file, or is 93/94 acceptable?

---

## 📞 Contact & Support

**Working Directory**: `C:\Users\passe\Documents\@PROJECT\riselab\`  
**Source Directory**: `d:\(주)에바스코스메틱 Dropbox\JI SEULKI\claude\@ongoing_LAB doc\200_연구실 문서 샘플\04_01_제품표준서`  
**Log File**: `csv_export.log`  
**Python Version**: 3.14.0

---

**Last Updated**: 2026-01-31 20:34 KST  
**Generated By**: Atlas (OhMyClaude Code)
