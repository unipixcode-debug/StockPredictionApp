#!/bin/bash
set -e

echo "--- 1. Database Setup ---"
# Check if DB exists
DB_EXISTS=$(sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -w prediction_db | wc -l)
if [ "$DB_EXISTS" -eq 0 ]; then
    sudo -u postgres psql -c "CREATE DATABASE prediction_db;"
    echo "Database created."
else
    echo "Database already exists."
fi

USER_EXISTS=$(sudo -u postgres psql -t -c "SELECT 1 FROM pg_roles WHERE rolname='erdem'" | grep 1 | wc -l)
if [ "$USER_EXISTS" -eq 0 ]; then
    sudo -u postgres psql -c "CREATE USER erdem WITH PASSWORD 'prediction123';"
    echo "User created."
else
    echo "User already exists."
fi

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE prediction_db TO erdem;"

echo "--- 2. Backend Environment ---"
cat <<EOT > /home/ubuntu/StockPredictionApp/backend/.env
PORT=5000
DB_NAME=prediction_db
DB_USER=erdem
DB_PASS=prediction123
DB_HOST=localhost
JWT_SECRET=super_secret_deployment_key_123
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
EOT

echo "--- 3. Running Backend with PM2 ---"
cd /home/ubuntu/StockPredictionApp/backend
pm2 delete prediction-backend || true
pm2 start index.js --name "prediction-backend"
pm2 save

echo "--- 4. Frontend Build ---"
cd /home/ubuntu/StockPredictionApp/frontend
export VITE_API_URL="/api"
npm run build

echo "--- 5. Setup completed ---"
