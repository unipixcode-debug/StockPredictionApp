# Borsa & Crypto Tahmin Uygulaması - Uygulama Planı

Amerikan borsası, Crypto ve Türk borsası (BIST) için tahminler üreten, hem mobil (iOS/Android) hem web üzerinden kullanılabilen, üyelik sistemi içeren tam kapsamlı bir platform.

## Teknoloji Yığını (Tech Stack)

| Katman | Teknoloji |
|---|---|
| **Backend** | Node.js + Express + PostgreSQL (Sequelize/Prisma) |
| **Auth** | Google OAuth (Passport.js) + JWT |
| **Web Frontend** | React + Vite |
| **Mobil** | React Native (Expo) |
| **Veri Kaynakları** | Yahoo Finance, Binance API (Crypto), BIST scraper, Haber API'leri |
| **Tahmin Motoru** | Node.js AI destekli. Haber duyarlılığı (Sentiment) + VIX, Altın, BTC/USD korelasyon hesapları içerir |
| **Deployment** | (1 GB RAM Optimize) Mevcut Oracle VM (Node.js + Nginx reverse proxy) |

---

## User Review Required

> [!NOTE]
> **Admin Paneli:** Veri kaynaklarını (API URL'leri, anahtarlar, scraper ayarları) dinamik olarak ekleyip yönetebileceğiniz bir arayüz eklenecek.
> **Auth & Database:** Google OAuth ve PostgreSQL seçildi. Proje `c:\Users\erdem\OneDrive\PythonProje\StockPredictionApp` klasörüne sıfırdan kurulacak.

---

## Proposed Changes

### Backend — Node.js

#### [NEW] `PredictionApp/backend/` (yeni proje klasörü)

- `server.js` — Express app entry point
- `routes/auth.js` — Kayıt, giriş, Google OAuth
- `routes/predictions.js` — Tahminleri getir/listele
- `routes/admin.js` — Admin panel API'leri
- `models/User.js` — Kullanıcı şeması (email, role: user/admin, googleId, ...)
- `models/Prediction.js` — Tahmin şeması (symbol, market, prediction, score, date, confidence)
- `services/dataFetcher.js` — Arka planda piyasa verisi ve haber başlıkları çeker
- `services/predictionEngine.js` — AI destekli kural motoru. Mantık:
  - VIX (Korku endeksi), Altın (Güvenli liman), DXY (Dolar endeksi) ve BTC/USD korelasyon ağırlıkları hesaplanır.
  - İlgili finansal ürünün son 24 saatlik haberlerinden AI ile bir "Duyarlılık Skoru (Sentiment Score)" çıkarılır.
  - Teknik indikatörler API verisiyle harmanlanıp nihai puan oluşturulur.

**API Endpoints:**
```
POST /api/auth/register          → Email/şifre ile kayıt
POST /api/auth/login             → Email/şifre ile giriş
POST /api/auth/google            → Google OAuth
GET  /api/predictions            → Tüm tahminleri listele (filtre: market, sembol)
GET  /api/predictions/:symbol    → Belirli sembol tahmini
GET  /api/admin/users            → [Admin] Kullanıcı listesi
PUT  /api/admin/settings         → [Admin] Sistem ayarları
POST /api/admin/sources          → [Admin] Yeni veri kaynağı ekle
GET  /api/admin/sources          → [Admin] Veri kaynaklarını listele
DELETE /api/admin/sources/:id    → [Admin] Veri kaynağını kaldır
```

---

### Web Frontend — React + Vite

#### [NEW] `PredictionApp/frontend/`

- **Login / Register sayfası** (Google ile giriş butonu dahil)
- **User Dashboard:** Market kategorileri (Crypto, US, BIST) → tahmin kartları
- **Admin Panel:** Kullanıcı yönetimi, dinamik veri kaynakları (ekleme/çıkarma/düzenleme) ve tahmin ayarları.

---

### Mobil — Expo (React Native)

#### [NEW] `PredictionApp/mobile/`

- **Auth Stack:** Giriş / Kayıt / Google ile Giriş
- **Ana Ekran:** Kategori seçimi (🇺🇸 US Borsası | ₿ Crypto | 🇹🇷 BIST)
- **Tahmin Ekranı:** Sembol için güncel tahmin + güven skoru + grafik

---

## Proje Klasör Yapısı

```
PredictionApp/
├── backend/       → Node.js API Server
├── frontend/      → React Web (Admin + User)
└── mobile/        → Expo React Native (iOS+Android)
```

---

## Verification Plan

### Automated Tests
- Backend: `npm test` (Jest ile endpoint testleri)
- Auth akışı: Google OAuth callback test

### Manual Verification
- Web üzerinden kayıt/giriş yap, tahminleri gör
- Admin panelden kullanıcı listesini gör
- Expo Go ile mobil tahmin ekranını test et
- APK build edip Android cihaza yükle
