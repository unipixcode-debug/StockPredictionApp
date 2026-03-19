# 🚀 UltraThink: Sunucu Mimari Haritası & Operasyon Rehberi

Bu döküman, **StockPredictionApp** projesinin sunucu (OracleServer3-24) üzerindeki yerleşimini, servis bağımlılıklarını ve güncelleme protokollerini tanımlar. Tüm gelecek geliştirmeler bu haritaya sadık kalınarak yapılmalıdır.

---

## 🏗️ 1. Dosya Sistemi Yapısı (File System)

### 🌐 Frontend (Yayın Dizini)
*   **Dizin:** `/var/www/html/StockPredictionApp/dist/`
*   **Açıklama:** Nginx tarafından doğrudan internete sunulan (Static Assets) son derlenmiş dosyalardır.
*   **Kritik Dosyalar:**
    *   `index.html`: Ana giriş noktası.
    *   `assets/`: Hash'lenmiş JS ve CSS dosyaları.
*   **Güncelleme Protokolü:** Yerelde `npm run build` yapıldıktan sonra `dist` içeriği buraya aktarılır. Önce `/var/www/html/StockPredictionApp/dist/` dizini temizlenmeli, sonra yeni dosyalar aktarılmalıdır.

### 🧠 Backend (Uygulama Dizini)
*   **Dizin:** `/home/ubuntu/StockPredictionApp/backend/`
*   **Açıklama:** Node.js API servisinin çalıştığı ana dizindir.
*   **Kritik Dosyalar:**
    *   `index.js`: API sunucusu başlangıç dosyası.
    *   `routes/`: API uç noktaları.
    *   `services/`: İş mantığı (AI, Cache, Credits).
    *   `.env`: Gizli anahtarlar ve DB bağlantı bilgileri.
*   **Loglar:** `/home/ubuntu/StockPredictionApp/backend/server.log`

---

## ⚙️ 2. Nginx Yapılandırması (Reverse Proxy)

*   **Yapılandırma Dosyası:** `/etc/nginx/sites-available/StockPredictionApp`
*   **Domain:** `unipixcode.xyz` / `www.unipixcode.xyz`
*   **Protokoller:** HTTP (80) -> HTTPS (443) Yönlendirmeli.
*   **Önemli Yönlendirmeler:**
    *   `/`: Frontend dosyalarını sunar (`root /var/www/html/StockPredictionApp/dist`).
    *   `/api`: Backend API'ye yönlendirir (`proxy_pass http://localhost:5000`).
*   **Servis Yönetimi:** `sudo systemctl restart nginx`

---

## 🗄️ 3. Veritabanı (PostgreSQL)

*   **Veritabanı Adı:** `prediction_db`
*   **Kullanıcı:** `postgres` (Unix local auth)
*   **Bağlantı Portu:** `5432`
*   **Kritik Tablolar:**
    *   `GlobalSettings`: Paketler (`token_packages`) ve sistem ayarlarını tutar.
    *   `Users`: Kullanıcı kredileri ve bilgileri.
    *   `AIProviders`: AI servis durumları ve gecikme verileri.

---

## 🛠️ 4. Operasyonel Protokoller (Deployment)

### Frontend Güncelleme:
1.  **Yerelde:** `cd frontend && npm run build`
2.  **Temizlik (Sunucu):** `ssh OracleServer3-24 "sudo rm -rf /var/www/html/StockPredictionApp/dist/*"`
3.  **Aktarım:** `scp -r dist/* OracleServer3-24:/var/www/html/StockPredictionApp/dist/`
4.  **Doğrulama:** `ssh OracleServer3-24 "ls -lt /var/www/html/StockPredictionApp/dist/index.html"`

### Backend Güncelleme:
1.  **Aktarım:** İlgili dosyalar (`scp -r ...`) `/home/ubuntu/StockPredictionApp/backend/` dizinine aktarılır.
2.  **Yeniden Başlatma:** `ssh OracleServer3-24 "pkill -f '/home/ubuntu/StockPredictionApp/backend/index.js' && nohup node /home/ubuntu/StockPredictionApp/backend/index.js > /home/ubuntu/StockPredictionApp/backend/server.log 2>&1 &"`

---

> [!CAUTION]
> **DİKKAT:** Her zaman `/var/www/html/StockPredictionApp/dist/` dizinine yazma iznini (`chown -R ubuntu:ubuntu`) kontrol edin. İzin hatası alırsanız `sudo` ile müdahale edin.
