@echo off
echo ==========================================
echo QMS Core - Local Run Script
echo ==========================================
echo Current Directory: %CD%
echo Target Directory: c:\Users\Kepv\Downloads\qms-core-main
echo.
echo 1. Navigating to project folder...
cd /d "c:\Users\Kepv\Downloads\qms-core-main"

echo 2. Installing dependencies (this may take a minute)...
call npm install

echo 3. Starting QMS Platform...
echo.
echo ==========================================
echo Project will be available at:
echo Frontend: http://localhost:8080
echo Auth Dashboard: http://localhost:3001/api/auth/dashboard
echo ==========================================
echo.
npm run dev

pause
