@echo off
echo ==========================================
echo   SMART Q-GEN - Push to GitHub
echo ==========================================
echo.
echo STEP 1: Get your GitHub Personal Access Token
echo   Go to: https://github.com/settings/tokens/new
echo   - Note: SMART-Q-GEN
echo   - Scope: check "repo" (full)
echo   - Click Generate token
echo   - COPY the token (ghp_xxxxxxxxxxxx)
echo.
set /p TOKEN=PASTE YOUR TOKEN HERE AND PRESS ENTER: 
echo.
echo Setting remote URL with token...
git remote set-url origin https://ARIJIT-off:%TOKEN%@github.com/ARIJIT-off/SMART-Q-GENERATOR.git
echo.
echo Pushing to GitHub...
git push -u origin main
echo.
echo ==========================================
if %ERRORLEVEL%==0 (
    echo SUCCESS! Code is now on GitHub.
    echo.
    echo NEXT STEPS - Deploy to Vercel:
    echo 1. Backend: https://vercel.com/new - Root Dir: backend
    echo 2. Frontend: https://vercel.com/new - Root Dir: frontend
    echo See README.md for full environment variables list.
) else (
    echo PUSH FAILED. Check your token and try again.
)
echo ==========================================
echo.
echo Removing token from remote URL for security...
git remote set-url origin https://github.com/ARIJIT-off/SMART-Q-GENERATOR.git
echo Done. Token cleared from config.
pause
