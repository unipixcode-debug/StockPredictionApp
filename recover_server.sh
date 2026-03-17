#!/bin/bash
set -e

echo "--- Fixing PostgreSQL Password for 'erdem' ---"
sudo -u postgres psql -c "ALTER USER erdem WITH PASSWORD 'erdem';"

echo "--- Updating .env file ---"
sed -i 's/^DB_PASS=.*/DB_PASS=erdem/' /home/ubuntu/StockPredictionApp/backend/.env

echo "--- Re-seeding Data Sources ---"
cd /home/ubuntu/StockPredictionApp/backend
node seedSources.js

echo "--- Restarting Backend with PM2 ---"
pm2 restart prediction-backend || pm2 start index.js --name prediction-backend
pm2 save

echo "--- Verifying Data Persistence ---"
sudo -u postgres psql -d prediction_db -c "SELECT relname, n_live_tup FROM pg_stat_user_tables;"

echo "--- Recovery Complete ---"
