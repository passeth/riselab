# 🚀 빠른 시작 가이드

## 현재 상태

✅ **완료된 것:**
- Python 3.14.0 설치됨
- 필수 라이브러리 설치 완료
- Excel 파싱 테스트 성공
- 마이그레이션 스크립트 준비 완료

⏳ **남은 것:**
- Supabase 연결 설정
- 실제 마이그레이션 실행

---

## 방법 1: 대화형 설정 (추천)

```bash
python setup_env.py
```

프롬프트에 따라 Supabase URL과 Key를 입력하면 자동으로 `.env` 파일이 생성됩니다.

---

## 방법 2: 수동 설정

### 1단계: .env 파일 생성

`.env.example`을 복사하여 `.env` 파일 생성:

```bash
cp .env.example .env
```

### 2단계: Supabase 정보 입력

`.env` 파일을 열어서 수정:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key-here
```

**Supabase 정보 찾는 방법:**
1. Supabase Dashboard 접속
2. Settings > API 메뉴
3. Project URL 복사 → `SUPABASE_URL`
4. service_role key 복사 → `SUPABASE_KEY`

---

## 3단계: 데이터베이스 스키마 생성

1. Supabase Dashboard > SQL Editor
2. `schema.sql` 파일 내용 복사
3. SQL Editor에 붙여넣기
4. Run 버튼 클릭

**생성되는 테이블:**
- `lab_products` - 제품 기본 정보
- `lab_product_bom` - 원료 함량표
- `lab_product_qc_specs` - QC 시험기준
- `lab_product_revisions` - 개정사항

---

## 4단계: 테스트 실행

### Dry Run (데이터 삽입 없이 미리보기)

```bash
python migrate_products.py --dry-run
```

### 단일 파일 테스트

```bash
python migrate_products.py --file "제품표준서_EVCO1000_(FJSL002)-프레쥬 프로 모이스처 크리미 토너.xls"
```

### 전체 마이그레이션 (94개 파일)

```bash
python migrate_products.py
```

---

## 5단계: 결과 확인

### 로그 파일 확인

```bash
cat migration.log
```

### Supabase에서 확인

1. Supabase Dashboard > Table Editor
2. `lab_products` 테이블 확인
3. 데이터가 정상적으로 들어갔는지 확인

---

## 문제 해결

### "SUPABASE_URL and SUPABASE_KEY environment variables required"

→ `.env` 파일이 없거나 내용이 비어있습니다.
→ `python setup_env.py` 실행하거나 수동으로 `.env` 파일 생성

### "Material codes not found in lab_ingredients"

→ BOM의 원료코드가 `lab_ingredients` 테이블에 없습니다.
→ 원료 마스터 데이터를 먼저 입력하거나 `--skip-validation` 플래그 사용

### "No sheet named <'입력란'>"

→ 해당 Excel 파일의 구조가 다릅니다.
→ 파일 구조를 확인하고 스크립트 수정 필요

---

## 다음 작업

사용자가 언급한 **"실제 정리해야할 파일"** 폴더 경로를 알려주시면:
1. 해당 폴더의 파일 구조 분석
2. 필요시 스크립트 조정
3. 전체 마이그레이션 실행

---

## 파일 목록

| 파일 | 용도 |
|------|------|
| `schema.sql` | Supabase 데이터베이스 스키마 |
| `migrate_products.py` | 메인 마이그레이션 스크립트 |
| `setup_env.py` | 대화형 환경변수 설정 도구 |
| `test_parse.py` | Excel 파싱 테스트 스크립트 |
| `requirements.txt` | Python 라이브러리 목록 |
| `.env.example` | 환경변수 템플릿 |
| `README_MIGRATION.md` | 상세 사용 설명서 |
| `TEST_RESULTS.md` | 테스트 결과 보고서 |
| `QUICKSTART.md` | 이 파일 |

---

## 지원

문제가 발생하면 `migration.log` 파일을 확인하세요.
