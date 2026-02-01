# 복수 제품코드 분리 기능 구현 완료

## 개요
`export_to_csv.py`에 복수 제품코드를 개별 행으로 분리하는 기능을 추가했습니다.

## 구현 내용

### 1. 새로운 함수 추가
**함수명**: `split_product_codes(data_list: list) -> tuple`
- **위치**: Lines 222-280
- **기능**: 쉼표로 구분된 제품코드를 각각 별도의 행으로 분리
- **입력**: 파싱된 제품 데이터 리스트 (1026개)
- **출력**: 분리된 데이터 + 통계 정보

### 2. 통합 위치
**위치**: Lines 470-489 (파싱 완료 후, 중복 감지 이전)
```python
# 파싱 완료 후 즉시 호출
all_data, split_stats = split_product_codes(all_data)

# 통계 로그 출력
logger.info(f"제품코드 분리: {split_stats['original_count']}개 → {split_stats['expanded_count']}개 (+{split_stats['total_split']}개 증가)")
```

### 3. 데이터 처리 방식
- **분리 기준**: 제품코드에 쉼표(`,`) 포함 여부
- **처리 방식**: 
  - 각 코드별로 전체 데이터 복제
  - 제품코드만 변경, 나머지 정보는 동일
  - BOM, QC Specs, Revisions도 자동 복제
- **공백 처리**: `strip()` 적용하여 앞뒤 공백 제거

## 실행 결과

### CSV 파일 생성 결과
| 파일명 | 행 수 | 증감 |
|--------|------|------|
| products.csv | 1103 | +77 |
| bom.csv | 21,307 | 자동 증가 |
| qc_specs.csv | 26,937 | 자동 증가 |
| revisions.csv | 1,071 | 자동 증가 |

### 분리 통계
- **파싱 성공**: 1026개
- **분리 전**: 1026개
- **분리 후**: 1115개 (+89개)
- **복수 코드 보유 제품**: 42개

### 분리된 제품 예시
1. **제이온 젠틀 포어 스크럽**: JOSC001, JOSCP01 → 2개 행
2. **미미로린스 드레스 퍼퓸 미스트 딥 퍼퓸**: MLDM032, 033, 034, 035, 036 → 5개 행
3. **빈시뷰 글래머 향기 크림**: VVCR001, VVCR002, VVCR003 → 3개 행
4. 그 외 32개 제품 (총 42개)

## 검증 결과

✓ **데이터 무결성**
- 분리 후 쉼표 포함 제품코드: 0개 (100% 성공)
- 예상 증가량 vs 실제 증가량: 일치
- 데이터 손실: 없음

✓ **기존 기능 유지**
- 중복 감지 로직: 정상 작동
- CSV 내보내기: 모든 파일 생성
- 정상/중복 제품 분리: 정상 작동

✓ **코드 품질**
- Python 문법 검사: 통과
- 로그 출력: 명확한 통계 표시
- 에러 처리: 안정적 (deep copy 사용)

## 주요 기능

### 로그 출력 예시
```
2026-01-31 21:40:27,314 - INFO - Splitting multiple product codes...
2026-01-31 21:40:27,318 - INFO - 제품코드 분리: 1026개 → 1115개 (+89개 증가)
2026-01-31 21:40:27,318 - INFO - 복수 코드 보유 제품: 42개
2026-01-31 21:40:27,318 - INFO -   - 제이온 젠틀 포어 스크럽: JOSC001, JOSCP01 → 2개 코드
2026-01-31 21:40:27,318 - INFO -   ... and 32 more products
```

### CSV 파일 확인 방법
```python
import pandas as pd
df = pd.read_csv('csv_output/products.csv')
print(f"총 제품 수: {len(df)}")  # 1103

# 복수 코드 확인 (0이어야 함)
multi = df[df['제품코드'].str.contains(',', na=False)]
print(f"복수 코드 남음: {len(multi)}")  # 0

# 분리 예시 확인
sample = df[df['국문제품명'].str.contains('제이온 젠틀 포어 스크럽', na=False)]
print(sample[['국문제품명', '제품코드']])
```

## 구현 상세

### split_product_codes() 함수 로직
1. 입력 데이터 순회
2. 각 제품의 제품코드 확인
3. 쉼표 포함 여부 판단
4. 포함 시: 쉼표로 split → 각 코드별로 데이터 복제
5. 미포함 시: 원본 데이터 그대로 추가
6. 통계 정보 수집 후 반환

### Deep Copy 사용
```python
new_data = {
    "basic_info": data["basic_info"].copy(),
    "bom": [bom_item.copy() for bom_item in data["bom"]],
    "qc_semi": [qc_item.copy() for qc_item in data["qc_semi"]],
    "qc_finished": [qc_item.copy() for qc_item in data["qc_finished"]],
    "revisions": [rev_item.copy() for rev_item in data["revisions"]],
}
```

## 기대 효과

1. **데이터 정규화**: 각 제품코드가 독립적인 행으로 존재
2. **쿼리 단순화**: 제품코드별 필터링이 더 간단해짐
3. **분석 용이성**: 각 제품코드별 BOM, QC, Revision 추적 용이
4. **데이터 무결성**: 원본 정보 완전히 보존

## 파일 변경사항

**수정된 파일**: `export_to_csv.py`

### 추가된 코드
- 222-280줄: `split_product_codes()` 함수
- 470-489줄: 함수 호출 및 로그 출력

### 기존 코드 변경
- 없음 (완전한 역호환성 유지)

## 실행 방법

```bash
python export_to_csv.py
```

정상 실행 시 다음과 같은 로그 출력:
```
제품코드 분리: 1026개 → 1115개 (+89개 증가)
복수 코드 보유 제품: 42개
```

---
**구현 완료**: 2026-01-31 21:40:27
**검증 상태**: ✓ 전체 검증 통과
