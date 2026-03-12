#!/bin/bash
set -e

echo "--- 1. Pulling Latest Code from GitHub ---"
cd /home/ubuntu/StockPredictionApp
git pull origin main

echo "--- 2. Building Frontend ---"
cd frontend
npm install
export VITE_API_URL="/api"
npm run build

echo "--- 3. Updating Backend & Seeding Database ---"
cd ../backend
npm install
node seedSources.js
pm2 restart prediction-backend

echo "--- 4. Updating Nginx Config ---"
cd /home/ubuntu/StockPredictionApp
sudo cp nginx_prod.conf /etc/nginx/sites-available/StockPredictionApp
sudo systemctl reload nginx

echo "--- 5. Fixing Permissions ---"
sudo chmod 755 /home/ubuntu
sudo chmod -R 755 /home/ubuntu/StockPredictionApp/frontend/dist

echo "================================================="
echo " Update Complete! Application is fully refreshed."
echo "================================================="
