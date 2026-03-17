# ============================================================
#   StockPredictionApp - Temiz Başlatma Kılavuzu
# ============================================================
#
#  Sıralama: 0) PostgreSQL DB → 1) Backend → 2) Frontend → 3) Mobile
# ============================================================


# -----------------------------------------------------------
# 0) PostgreSQL VERİTABANI (Her PC başlatmadan once)
# -----------------------------------------------------------
#   Veri dizini : C:\Projeler\PythonProje\db_data
#   Port        : 5432
#
#   [A] Bat dosyası ile başlatmak (PowerShell'de):
#       .\start_postgres.bat
#
#   [B] Direkt komut ile başlatmak (PowerShell):
#       & "C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" start -D "C:\Projeler\PythonProje\db_data" -l "C:\Projeler\PythonProje\db_data\logfile"
#
#   [C] Durdurmak:
#       & "C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" stop -D "C:\Projeler\PythonProje\db_data"
#
#   [D] Çalışıyor mu kontrol:
#       netstat -ano | findstr :5432
#
#   [E] psql ile veritabanına bağlan:
#       & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U erdem -d prediction_db
#       (psql icinde -> tablo listesi: \dt   |   cikis: \q)
# -----------------------------------------------------------


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
