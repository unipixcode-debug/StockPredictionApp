$keyPath = "C:\Projeler\Oracleserverac\24GB\ssh-key-2026-03-14 (2).key"
$ip = "80.225.246.21"

Write-Host "--- StockPredictionApp Production Deployer ---" -ForegroundColor Cyan
Write-Host "1. Verifying SSH Key..." -ForegroundColor Yellow
if (Test-Path $keyPath) {
    Write-Host "OK" -ForegroundColor Green
} else {
    Write-Host "FAILED: SSH key not found at $keyPath" -ForegroundColor Red
    exit
}

Write-Host "2. Triggering Remote Update on Oracle Server ($ip)..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no -i $keyPath ubuntu@$ip "cd /home/ubuntu/StockPredictionApp && bash update.sh"

Write-Host "`nDONE! Please refresh https://unipixcode.xyz with Ctrl+F5." -ForegroundColor Green
pause
