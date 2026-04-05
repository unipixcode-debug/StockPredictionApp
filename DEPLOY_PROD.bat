@echo off
set "KEY_PATH=C:\Users\erdem\.ssh\OracleServer3-24.key"
set "SERVER_IP=80.225.246.21"
set "GIT_SSH=C:\Program Files\Git\usr\bin\ssh.exe"

echo ----------------------------------------------------
echo    StockPredictionApp - ROBUST DEPLOYER (Git Engine)
echo ----------------------------------------------------

echo 1. Checking SSH Key...
if exist "%KEY_PATH%" (
    echo [OK] Key found.
) else (
    echo [ERROR] SSH key not found at: "%KEY_PATH%"
    pause
    exit /b
)

echo 2. Syncing Local Changes to GitHub...
git add .
git commit -m "feat: synchronized dashboard and scanner charts with yellow forecasts"
git push origin main

echo 3. Triggering Remote Update on Oracle Server (%SERVER_IP%)...
if exist "%GIT_SSH%" (
    "%GIT_SSH%" -o StrictHostKeyChecking=no -i "%KEY_PATH%" ubuntu@%SERVER_IP% "cd /home/ubuntu/StockPredictionApp && bash update.sh"
) else (
    echo [WARNING] Git SSH not in default path, trying standard ssh...
    ssh -o StrictHostKeyChecking=no -i "%KEY_PATH%" ubuntu@%SERVER_IP% "cd /home/ubuntu/StockPredictionApp && bash update.sh"
)

echo.
echo ----------------------------------------------------
echo    DEPLOYMENT COMPLETE! 
echo    Please refresh https://unipixcode.xyz/ with Ctrl+F5.
echo ----------------------------------------------------
pause
