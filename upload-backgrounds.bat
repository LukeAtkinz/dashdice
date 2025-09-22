@echo off
echo Uploading background images to Firebase Storage...
echo.

REM Get Firebase access token
echo Getting Firebase access token...
for /f "tokens=*" %%i in ('firebase auth:print-access-token') do set ACCESS_TOKEN=%%i

if "%ACCESS_TOKEN%"=="" (
    echo Error: Could not get Firebase access token. Please run 'firebase login' first.
    pause
    exit /b 1
)

echo Access token obtained successfully.
echo.

REM Upload each background file
echo Uploading All For Glory.jpg...
curl -X POST ^
  -H "Authorization: Bearer %ACCESS_TOKEN%" ^
  -H "Content-Type: image/jpeg" ^
  --data-binary "@public/backgrounds/All For Glory.jpg" ^
  "https://firebasestorage.googleapis.com/v0/b/dashdice-d1b86.firebasestorage.app/o?name=backgrounds%%2FAll%%20For%%20Glory.jpg"

echo.
echo Uploading Long Road Ahead.jpg...
curl -X POST ^
  -H "Authorization: Bearer %ACCESS_TOKEN%" ^
  -H "Content-Type: image/jpeg" ^
  --data-binary "@public/backgrounds/Long Road Ahead.jpg" ^
  "https://firebasestorage.googleapis.com/v0/b/dashdice-d1b86.firebasestorage.app/o?name=backgrounds%%2FLong%%20Road%%20Ahead.jpg"

echo.
echo Uploading Relax.png...
curl -X POST ^
  -H "Authorization: Bearer %ACCESS_TOKEN%" ^
  -H "Content-Type: image/png" ^
  --data-binary "@public/backgrounds/Relax.png" ^
  "https://firebasestorage.googleapis.com/v0/b/dashdice-d1b86.firebasestorage.app/o?name=backgrounds%%2FRelax.png"

echo.
echo Uploading New Day.mp4...
curl -X POST ^
  -H "Authorization: Bearer %ACCESS_TOKEN%" ^
  -H "Content-Type: video/mp4" ^
  --data-binary "@public/backgrounds/New Day.mp4" ^
  "https://firebasestorage.googleapis.com/v0/b/dashdice-d1b86.firebasestorage.app/o?name=backgrounds%%2FNew%%20Day.mp4"

echo.
echo Uploading On A Mission.mp4...
curl -X POST ^
  -H "Authorization: Bearer %ACCESS_TOKEN%" ^
  -H "Content-Type: video/mp4" ^
  --data-binary "@public/backgrounds/On A Mission.mp4" ^
  "https://firebasestorage.googleapis.com/v0/b/dashdice-d1b86.firebasestorage.app/o?name=backgrounds%%2FOn%%20A%%20Mission.mp4"

echo.
echo Uploading Underwater.mp4...
curl -X POST ^
  -H "Authorization: Bearer %ACCESS_TOKEN%" ^
  -H "Content-Type: video/mp4" ^
  --data-binary "@public/backgrounds/Underwater.mp4" ^
  "https://firebasestorage.googleapis.com/v0/b/dashdice-d1b86.firebasestorage.app/o?name=backgrounds%%2FUnderwater.mp4"

echo.
echo Upload complete!
echo.
echo You can verify the uploads at:
echo https://console.firebase.google.com/project/dashdice-d1b86/storage
echo.
pause
