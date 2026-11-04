@echo off
setlocal
title EMS Costing Server

:: Change working directory to the project folder
cd /d "%~dp0"

echo ========================================================
echo               EMS COSTING APPLICATION
echo ========================================================
echo.

:: Check for node_modules
if not exist "node_modules\next\" (
    echo [INFO] First time run detected. Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
)

echo [1/3] Clearing any existing processes on port 3000...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo [2/3] Starting development server...
start /B "" npm run dev

echo [3/3] Opening application in your browser...
:: Wait 3 seconds for server startup
timeout /t 3 /nobreak >nul
start http://localhost:3000

echo.
echo ========================================================
echo  Status: Server is RUNNING at http://localhost:3000
echo.
echo  - Press any key in this window to STOP the server & close
echo  - Or close this window (click [X]) to exit
echo ========================================================
echo.

:: Wait for user input to stop
pause >nul

echo.
echo Stopping EMS Costing server...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /T /PID %%a >nul 2>&1
)

echo Server stopped.
timeout /t 1 /nobreak >nul
exit
