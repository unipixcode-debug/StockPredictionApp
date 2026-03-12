# Proje Geliştirme Kayıtları (Stock Prediction App)

Bu doküman, projenin başından itibaren yapılan tüm işlemleri, alınan kararları ve karşılaşılan engellerin çözüm aşamalarını içeren özet bir **Konuşma ve İlerleme Kaydı**dır.

## 1. Aşama: Planlama ve Mimari Kararlar
- **Proje Amacı:** Hisse senetleri (US & BIST) ve kripto paralar için (Örn. BTC-USD) makroekonomik veriler (VIX korku endeksi, Altın, Dolar Endeksi) ve piyasa haberlerini (duyarlılık analizi) kullanarak yapay zeka destekli yatırım tavsiyeleri (BUY/SELL/HOLD) üreten ve bunları kullanıcı ara yüzünde sunan bir sistem geliştirmek.
- **Teknoloji Yığını:**
  - **Backend:** Node.js, Express.js, Sequelize ORM.
  - **Veritabanı:** PostgreSQL.
  - **Frontend:** React, Vite, Tailwind CSS, Lucide Icons.
  - **Auth:** Google OAuth (Passport.js).
- **Yapay Zeka Geçişi:** Daha önce Python ile yazılmış yerel `scanner.py` mantığını Node.js aktararak daha merkezi, performanslı ve tekil bir mimari oluşturma kararı alındı (Kullanıcı onayı ile).

## 2. Aşama: Veritabanı ve Backend Kurulumu
- **PostgreSQL Sorunları:** OneDrive eşitleme (sync) engelleri ve izin hataları yüzünden ilk aşamalarda PostgreSQL kurumunda `initdb` hataları alındı. Sonrasında C locale ve trust modlarıyla veritabanı lokal proje klasörü altında izole bir şekilde başarıyla ayağa kaldırıldı.
- **Backend Modülleri:** 
  - `PredictionEngine`: Yahoo Finance verileri, makro göstergeler (VIX, DXY, Altın) ve dinamik RSS haber okuyucusu üzerinden duyarlılık puanlaması üreten birleştirilmiş bir motor geliştirildi.
  - İlk tahmin (`BTC-USD` üzerinde) 5000 portunda çalışan lokal sunucu ile başarılı şekilde test edildi ve veritabanına kaydedildi.

## 3. Aşama: Frontend Geliştirme (Premium Dashboard)
- Legacy Vite sürümü Vite 5 ve React 18'e yükseltildi.
- "Glassmorphism" ve koyu tema (dark mode) barındıran üst düzey bir arayüz iskeleti oluşturuldu.
- `react-router-dom` ile sayfalar arası pürüzsüz geçiş altyapısı kuruldu (Dashboard, Admin Panel, Analysis vb.).
- Uygulama 3000 portunda başarıyla çalıştırıldı.

## 4. Aşama: Yönetici Paneli (Admin Panel) ve Dinamik Kaynaklar
- Backend'e `DataSource` adında yeni bir tablo eklendi.
- Frontend tarafında bu tabloyu yönetecek, yeni RSS haber veya API kaynakları eklemeyi/silmeyi sağlayacak bir Yönetici Paneli tasarlandı. Veri kaynakları başarılı bir şekilde PostgreSQL veritabanıyla konuşur hale getirildi.

## 5. Aşama: Google OAuth Hazırlıkları
- Kullanıcı gizliliğini ve üyelik sistemini sağlamak için Passport.js entegre edildi. 
- Google'dan alınacak `CLIENT_ID` ve `CLIENT_SECRET` bilgileri beklenmektedir.
- Frontend'e kimlik denetimi ve şık bir "Google ile Giriş Yap" ekranı eklendi.

## Sıradaki Hedefler
- [ ] **Yetkilendirme:** Google API bilgilerinin sisteme girilmesi ve gerçek bir kullanıcı girişi yapılması.
- [x] **Yapay Zeka (LLM):** Gemini veya OpenAI API entegrasyonuyla `NewsService` modülündeki kelime tabanlı basit duyarlılık analizinin *gerçek yapay zeka çıkarımına* dönüştürülmesi. (Gemini @google/genai projesi eklendi, sadece GEMINI_API_KEY bekleniyor)
- [ ] **Gelişmiş Analiz Ekranı:** Kullanıcıların belirli hisseler üzerine detaylı dashboardları görüntüleyebileceği `Analysis` arayüzünün tamamlanması.
