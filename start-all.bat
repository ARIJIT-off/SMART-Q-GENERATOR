@echo off
echo ==========================================
echo    SMART Q-GEN — Starting All Services
echo ==========================================

echo.
echo [1/3] Starting Backend API on port 5000...
start "SMART Q-GEN Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"

echo [2/3] Starting Frontend on port 5173...
start "SMART Q-GEN Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo [3/3] Starting Python MCQ Service on port 8000...
start "SMART Q-GEN MCQ Service" cmd /k "cd /d "%~dp0mcq-service" && call venv\Scripts\activate && python app.py"

echo.
echo ==========================================
echo All services started!
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:5000
echo MCQ Svc:  http://localhost:8000
echo ==========================================
echo.
echo Make sure MongoDB is running separately.
pause
