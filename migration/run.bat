@echo off
echo ========================================
echo 제품표준서 Excel to CSV 변환 도구
echo ========================================
echo.

REM Python 설치 확인
python --version >nul 2>&1
if errorlevel 1 (
    echo [오류] Python이 설치되어 있지 않습니다.
    echo Python 3.8 이상을 설치해주세요.
    pause
    exit /b 1
)

REM 의존성 설치 확인
echo [1/3] 의존성 확인 중...
pip install -r requirements.txt --quiet

REM 설정 파일 확인
if not exist config.py (
    echo [주의] config.py 파일이 없습니다.
    echo config.example.py를 config.py로 복사 중...
    copy config.example.py config.py
    echo [알림] config.py가 생성되었습니다. 
    echo 파일을 열어 SOURCE_DIR 경로를 실제 데이터 경로로 수정해주세요.
    pause
    exit /b 1
)

echo [2/3] 변환 시작...
python export_to_csv.py

echo.
echo [3/3] 완료!
echo 결과 파일은 설정된 출력 폴더(기본: csv_output)에서 확인하세요.
echo.
pause
