@echo off
setlocal EnableDelayedExpansion
title Flight Tracker - Startup

rem === Paths ===
set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"

echo ==================================================
echo  Flight Tracker - Dev Startup
echo  Backend : Django  ^(http://127.0.0.1:8000^)
echo  Frontend: Vite + React ^(http://localhost:5173^)
echo ==================================================
echo.

rem === 1. Check Python ===
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found in PATH. Install Python 3.10+ and retry.
    pause
    exit /b 1
)

rem === 2. Check Node ===
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found in PATH. Install Node.js LTS and retry.
    pause
    exit /b 1
)

rem === 3. Backend venv ===
if not exist "%BACKEND%\venv\Scripts\python.exe" (
    echo [Backend] Creating virtual environment...
    python -m venv "%BACKEND%\venv"
    if errorlevel 1 (
        echo [ERROR] Failed to create venv.
        pause
        exit /b 1
    )
)

rem === 4. Backend .env ===
if not exist "%BACKEND%\.env" (
    if exist "%BACKEND%\.env1" (
        echo [Backend] Creating .env from .env1...
        copy /Y "%BACKEND%\.env1" "%BACKEND%\.env" >nul
    ) else (
        echo [WARN] No backend\.env or backend\.env1 found. Django will use defaults.
    )
)

rem === 5. Install Python deps + migrate ===
echo [Backend] Installing requirements...
"%BACKEND%\venv\Scripts\python.exe" -m pip install --upgrade pip
"%BACKEND%\venv\Scripts\python.exe" -m pip install -r "%ROOT%requirements.txt"
if errorlevel 1 (
    echo [ERROR] pip install failed.
    pause
    exit /b 1
)

echo [Backend] Running migrations...
pushd "%BACKEND%"
"%BACKEND%\venv\Scripts\python.exe" manage.py migrate
if errorlevel 1 (
    echo [ERROR] Django migrate failed.
    popd
    pause
    exit /b 1
)
popd

rem === 6. Frontend .env ===
if not exist "%FRONTEND%\.env" (
    if exist "%FRONTEND%\.env2" (
        echo [Frontend] Creating .env from .env2...
        copy /Y "%FRONTEND%\.env2" "%FRONTEND%\.env" >nul
    )
)

rem === 7. Install Node deps ===
if not exist "%FRONTEND%\node_modules" (
    echo [Frontend] Installing npm packages (first run, may take a minute)...
    pushd "%FRONTEND%"
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed.
        popd
        pause
        exit /b 1
    )
    popd
) else (
    echo [Frontend] node_modules found, skipping npm install.
)

rem === 8. Launch servers in separate windows ===
echo.
echo Starting backend and frontend...
echo   Backend  -^> http://127.0.0.1:8000/api/health/
echo   Frontend -^> http://localhost:5173
echo.

start "FlightTracker-Backend" /D "%BACKEND%" cmd /k ""%BACKEND%\venv\Scripts\python.exe" manage.py runserver 127.0.0.1:8000"
start "FlightTracker-Frontend" /D "%FRONTEND%" cmd /k "npm run dev"

rem === 9. Open browser ===
timeout /t 5 /nobreak >nul
start "" "http://localhost:5173"

echo Done. Two new windows opened for backend and frontend.
echo Close those windows to stop the servers.
pause
