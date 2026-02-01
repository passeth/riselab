# 상세 작업 가이드

이 문서는 제품표준서 마이그레이션 도구의 상세 사용법과 설정 방법을 설명합니다.

## 1. 사전 준비

### Python 설치
- Python 3.8 버전 이상이 필요합니다. 
- [python.org](https://www.python.org/)에서 다운로드할 수 있으며, 설치 시 **"Add Python to PATH"** 옵션을 반드시 체크해주세요.

### 파일 백업
- 원본 Excel 파일은 항상 별도의 장소에 백업해 두는 것을 권장합니다. 이 도구는 파일을 읽기만 하고 수정하지 않지만, 안전한 작업을 위해 백업은 필수입니다.

## 2. 상세 설정 (config.py)

`config.example.py`를 복사하여 만든 `config.py` 파일에서 다음 항목을 설정합니다.

- **SOURCE_DIR**: 제품표준서(.xls) 파일들이 들어있는 폴더의 전체 경로입니다.
    - 예: `SOURCE_DIR = r"C:\Documents\StandardDocs"`
    - 주의: 경로 앞에 `r`을 붙이면 백슬래시(`\`) 처리가 편리합니다.
- **OUTPUT_DIR**: 결과 CSV 파일이 생성될 폴더명입니다. 기본값은 `"csv_output"`입니다.
- **LOG_FILE**: 처리 과정이 기록될 로그 파일명입니다.

## 3. 실행 방법

### 기본 실행 (Windows)
`run.bat` 파일을 더블 클릭합니다. 이 스크립트는 다음을 수행합니다:
1. Python 설치 확인
2. 필요한 라이브러리(pandas, tqdm, xlrd) 설치
3. `config.py` 존재 여부 확인
4. 변환 스크립트 실행

### 명령행(CLI) 실행 옵션
고급 사용자는 직접 터미널에서 옵션을 주어 실행할 수 있습니다.

```bash
# 전체 변환 실행
python export_to_csv.py

# 테스트 실행 (파일 생성 없이 로그만 확인)
python export_to_csv.py --dry-run

# 특정 파일 하나만 변환 테스트
python export_to_csv.py --file "테스트제품.xls"
```

## 4. 결과 확인 및 활용

### 생성된 파일 구조
- **products.csv**: 제품명, 코드, 작성자, 사용법 등 마스터 정보
- **bom.csv**: 제품별 원료 코드와 함량 정보 (제품코드로 연결)
- **qc_specs.csv**: 제품별 품질 관리 검사 항목 및 기준 (제품코드로 연결)
- **revisions.csv**: 개정 이력 정보 (제품코드로 연결)

### 중복 데이터 처리
`duplicates_`로 시작하는 파일들은 동일한 제품 코드가 여러 파일에서 발견된 경우입니다. 
- 이 데이터들은 데이터베이스 임포트 시 충돌을 일으킬 수 있으므로, 엑셀 원본을 확인하여 어떤 파일이 최신인지 확인한 후 수동으로 정리해야 합니다.

## 5. 데이터베이스 임포트 가이드

생성된 CSV 파일들은 다음과 같은 순서로 임포트하는 것을 권장합니다.

1. `products.csv` 임포트 (기본 제품 정보 생성)
2. `bom.csv`, `qc_specs.csv`, `revisions.csv` 임포트 (제품코드를 외래키로 연결)

**Supabase/PostgreSQL 사용 시 팁:**
- 모든 CSV 파일은 UTF-8-SIG 인코딩으로 저장되어 있어, 한글이 깨지지 않고 정상적으로 임포트됩니다.
- 임포트 툴(예: DBeaver, Supabase Dashboard)에서 CSV 파일을 선택하면 자동으로 컬럼이 매핑됩니다.
