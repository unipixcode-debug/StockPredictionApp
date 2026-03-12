# ============================================================
#   StockPredictionApp - Temiz Başlatma Kılavuzu
# ============================================================
#
#  Her bileşeni AYRI bir terminal penceresinde çalıştır.
#  Sıralama önemli: önce Backend, sonra Frontend, sonra Mobile.
# ============================================================


# -----------------------------------------------------------
# 1) BACKEND  (Node.js / Express + PostgreSQL)
# -----------------------------------------------------------
#   Dizin: StockPredictionApp/backend
#
#   İlk kurulum (sadece bir kez):
#     cd backend
#     npm install
#
#   Geliştirme modu (nodemon - dosya değişince otomatik restart):
cd backend
npm run dev

#   Canlı / production modu:
#     npm start
#
#   Backend çalışıyor mu kontrol:
#     http://localhost:5000/api/market/stats
# -----------------------------------------------------------


# -----------------------------------------------------------
# 2) FRONTEND  (Vite + React)
# -----------------------------------------------------------
#   Dizin: StockPredictionApp/frontend
#
#   İlk kurulum (sadece bir kez):
#     cd frontend
#     npm install
#
#   Geliştirme modu:
cd frontend
npm run dev

#   Tarayıcıda aç:
#     http://localhost:5173
# -----------------------------------------------------------


# -----------------------------------------------------------
# 3) MOBILE  (Expo / React Native)
# -----------------------------------------------------------
#   Dizin: StockPredictionApp/mobile
#
#   İlk kurulum (sadece bir kez):
#     cd mobile
#     npm install
#
#   Expo başlat (QR kod ile telefona bağlan):
cd mobile
npx expo start

#   Sadece Android emülatörde aç:
#     npx expo start --android
#
#   Sadece iOS simülatörde aç:
#     npx expo start --ios
#
#   Expo cache temizleyerek başlat (sorun varsa):
#     npx expo start --clear
# -----------------------------------------------------------


# ============================================================
#   POWERSHELL İLE TEK SATIRDA (3 sekme açar)
# ============================================================
#
#   Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd backend; npm run dev'
#   Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd frontend; npm run dev'
#   Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd mobile; npx expo start'
#
# ============================================================


# ============================================================
#   BAĞLANTI NOTLARI
# ============================================================
#
#   Backend API URL   : http://localhost:5000/api
#   Frontend URL      : http://localhost:5173
#   Mobile Backend URL: http://192.168.1.7:5000/api   ← yerel IP (Wi-Fi)
#
#   Mobile için backend IP'yi güncel tut:
#     mobile/app/(tabs)/money-flow.tsx  → API_BASE sabiti
#
#   PostgreSQL çalışıyor mu kontrol (PowerShell):
#     Get-Service -Name postgresql*
#     net start postgresql-x64-16   ← sürüme göre değiştir
#
# ============================================================
