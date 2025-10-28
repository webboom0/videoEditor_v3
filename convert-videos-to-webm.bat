@echo off
echo 비디오 파일을 WebM 형식으로 변환하는 스크립트입니다.
echo.
echo 주요 기능:
echo 1. MP4, MOV 파일을 WebM 형식으로 변환
echo 2. 검정색 배경을 투명하게 처리
echo 3. Canvas에서 chromakey로 검정색 제거 (threshold: 50)
echo.

REM 대상 파일 목록
echo 변환 대상 파일:
echo - scene1-1.mp4
echo - scene1-2.mov
echo - scene2-1.mp4
echo - scene1-1-transparent.mp4
echo.

echo 변환 시작...
echo.

REM scene1-1.mp4 -> WebM (일반)
echo [1/4] scene1-1.mp4 변환 중...
ffmpeg -i "public/files/video/scene1-1.mp4" -c:v libvpx-vp9 -pix_fmt yuv420p -b:v 2M -c:a libopus -b:a 96k "public/files/video/scene1-1.webm" -y
if %errorlevel% equ 0 (
    echo ✓ scene1-1.webm 변환 완료
) else (
    echo ✗ scene1-1.webm 변환 실패
)
echo.

REM scene1-1-transparent.mp4 -> WebM (투명용)
echo [2/4] scene1-1-transparent.mp4 변환 중...
ffmpeg -i "public/files/video/scene1-1-transparent.mp4" -c:v libvpx-vp9 -pix_fmt yuv420p -b:v 2M -c:a libopus -b:a 96k "public/files/video/scene1-1-transparent-compatible.webm" -y
if %errorlevel% equ 0 (
    echo ✓ scene1-1-transparent-compatible.webm 변환 완료
) else (
    echo ✗ scene1-1-transparent-compatible.webm 변환 실패
)
echo.

REM scene1-2.mov -> WebM (일반)
echo [3/4] scene1-2.mov 변환 중...
ffmpeg -i "public/files/video/scene1-2.mov" -c:v libvpx-vp9 -pix_fmt yuv420p -b:v 2M -c:a libopus -b:a 96k "public/files/video/scene1-2.webm" -y
if %errorlevel% equ 0 (
    echo ✓ scene1-2.webm 변환 완료
) else (
    echo ✗ scene1-2.webm 변환 실패
)
echo.

REM scene2-1.mp4 -> WebM (일반)
echo [4/4] scene2-1.mp4 변환 중...
ffmpeg -i "public/files/video/scene2-1.mp4" -c:v libvpx-vp9 -pix_fmt yuv420p -b:v 2M -c:a libopus -b:a 96k "public/files/video/scene2-1.webm" -y
if %errorlevel% equ 0 (
    echo ✓ scene2-1.webm 변환 완료
) else (
    echo ✗ scene2-1.webm 변환 실패
)
echo.

echo.
echo ========================================
echo 변환 완료!
echo ========================================
echo.
echo 변환된 파일:
echo - public/files/video/scene1-1.webm
echo - public/files/video/scene1-1-transparent-compatible.webm
echo - public/files/video/scene1-2.webm
echo - public/files/video/scene2-1.webm
echo.
echo 사용 방법:
echo 1. JSON 파일에서 src 속성을 "/files/video/파일명.webm"으로 설정
echo 2. transparent-compatible.webm 파일은 Canvas에서 자동으로 검정색 배경 제거
echo 3. 검정색 제거 threshold는 50으로 설정됨 (CanvasPreview.js에서 조정 가능)
echo.
pause

