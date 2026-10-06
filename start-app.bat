@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-app.ps1"
if errorlevel 1 (
  echo.
  echo EvidenceHub could not be started.
  pause
)
endlocal
