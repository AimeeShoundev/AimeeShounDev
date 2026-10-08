@echo off
cd /d "%~dp0"
echo Starting the Pizza Shop game...
where py >nul 2>&1
if %errorlevel%==0 (
  start "" "http://localhost:8765"
  py -m http.server 8765
) else (
  where python >nul 2>&1
  if %errorlevel%==0 (
    start "" "http://localhost:8765"
    python -m http.server 8765
  ) else (
    echo Python is not installed. Install Python or run: npx serve .
    pause
  )
)
