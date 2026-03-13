import React, { createContext, useState, useContext, useEffect } from 'react';

const LanguageContext = createContext();

const translations = {
  TR: {
    // Sidebar
    Dashboard: "Dashboard",
    News: "Haberler",
    MoneyFlow: "Para Akışı",
    AdminPanel: "Admin Panel",
    Analysis: "Analiz",
    LightMode: "Aydınlık Mod",
    DarkMode: "Karanlık Mod",
    Logout: "Güvenli Çıkış",
    GlobalAnalysis: "Global Market Analysis",

    // MoneyFlow
    MoneyFlowTitle: "Küresel Likidite Akışı",
    MoneyFlowDesc: "Varlık sınıfları arası canlı sermaye rotasyonu",
    Rotation: "Rotasyon",
    ExamineDetails: "Detayları İncele",
    HideDetails: "Detayları Gizle",
    Hour: "SAAT",
    Day: "GÜN",
    Week: "HAFTA",
    Month: "AY",
    Year: "YIL",

    // Admin Panel
    SystemManagement: "Sistem Yönetimi",
    SystemManagementDesc: "Veri kaynaklarını ve altyapı ayarlarını yapılandırın",
    AdminModeActive: "Admin Modu Aktif",
    NewSource: "Yeni Kaynak",
    SourceDescription: "Kaynak Tanımı",
    DataType: "Veri Tipi",
    EndpointURL: "Uç Nokta (URL)",
    ConnectSource: "Kaynağı Sisteme Bağla",
    AppearanceTheme: "Görünüm & Tema",
    PrimaryColor: "Ana Renk (Primary)",
    ColorDesc: "Sistemin tüm neon ışık efektlerini değiştirir",
    PresetPalettes: "Hazır Paletler",
    ActiveInfrastructure: "Aktif Altyapı",
    Records: "Kayıt",
    NoDynamicSources: "Bağlı dinamik kaynak bulunamadı.",
    Active: "Aktif",
    Passive: "Pasif",
    Delete: "Sil",

    // News Reader
    AIPoweredTranslation: "Yapay Zeka Destekli Derin Çeviri",
    OpenOriginalArticle: "Orijinal Makaleyi Aç",
    ArticleError: "Makale içeriği okunamadı veya bu kaynak bot erişimine izin vermiyor.",

    // Dashboard
    LiveBulletin: "Canlı Bülten",
    BTC_Correlation: "BTC Korelasyon",
    VIX_Fear: "VIX Korku Endeksi",
    DXY_Value: "DXY Dolar Endeksi",
    MarketSentiment: "Piyasa Duyarlılığı",
    LatestPredictions: "Son Tahminler",
    SearchSymbolPlaceholder: "Sembol ör: AAPL, BTC-USD",
    All: "Hepsi",
    Crypto: "Kripto",
    Stocks_Category: "Borsa",
    AnalysisError: "Analiz sırasında bir hata oluştu.",
    Analysis_Momentum: "Güçlü momentum ve kurumsal talep artışı.",
    Analysis_AI: "Yapay zeka çip talebinde rekor beklenti.",
    Analysis_Gold: "Enflasyon verileri öncesi konsolidasyon.",
    NoPredictions: "Henüz tahmin üretilmedi.",
    Buy: "AL",
    Sell: "SAT",
    Hold: "TUT",
    Market: "Piyasası",
    Score: "Puan",
    ShowDetails: "Detayları Gör",
    HideDetailsDashboard: "Gizle",
    AISummary: "Yapay Zeka Karar Özeti",
    NoAISummary: "Detaylı analiz metni bulunamadı. Lütfen daha sonra tekrar deneyin.",
    ConfidenceScore: "Güven Skoru",
    CreatedAt: "Oluşturulma",
    AITrendChart: "Makine Öğrenimi (ML) vs. Yapay Zeka (AI) Trendi",
    AILine: "Yapay Zeka (AI)",
    MLLine: "Gelişmiş Makine Öğr. (ML)",
    Entry: "Giriş",
    Target: "Hedef",
    StopLoss: "Zarar Kes",
    RequestReceived: "İstek Talebiniz Alındı",
    RequestReceivedDesc: "En kısa sürede tahmininiz görüntülenecektir. Sayfayı değiştirseniz bile sistem analizi tamamlayacaktır.",
    SubAssets: "Alt Varlıklar",
    AnalysisResults: "Analiz Sonuçları",

    // News
    NewsTitle: "Akıllı Haber Bülteni",
    NewsDesc: "Yapay zeka tarafından filtrelenmiş anlık küresel piyasa gelişmeleri",
    Refresh: "Yenile",
    AllSources: "Tümü",
    NoNews: "Bu kaynakta piyasa haberi bulunamadı.",
    OtherSource: "Diğer Kaynak",
    NoSnippet: "Haber detayı için kaynağa gidiniz.",
    AIRead: "Yapay Zeka Okuması",
    GoToSource: "Kaynağa Git"
  },
  EN: {
    // Sidebar
    Dashboard: "Dashboard",
    News: "News",
    MoneyFlow: "Money Flow",
    AdminPanel: "Admin Panel",
    Analysis: "Analysis",
    LightMode: "Light Mode",
    DarkMode: "Dark Mode",
    Logout: "Secure Logout",
    GlobalAnalysis: "Global Market Analysis",

    // MoneyFlow
    MoneyFlowTitle: "Global Liquidity Flow",
    MoneyFlowDesc: "Live capital rotation across asset classes",
    Rotation: "Rotation",
    ExamineDetails: "Examine Details",
    HideDetails: "Hide Details",
    Hour: "HOUR",
    Day: "DAY",
    Week: "WEEK",
    Month: "MONTH",
    Year: "YEAR",

    // Admin Panel
    SystemManagement: "System Management",
    SystemManagementDesc: "Configure data sources and infrastructure settings",
    AdminModeActive: "Admin Mode Active",
    NewSource: "New Source",
    SourceDescription: "Source Description",
    DataType: "Data Type",
    EndpointURL: "Endpoint (URL)",
    ConnectSource: "Connect Source to System",
    AppearanceTheme: "Appearance & Theme",
    PrimaryColor: "Primary Color",
    ColorDesc: "Changes all neon light effects of the system",
    PresetPalettes: "Preset Palettes",
    ActiveInfrastructure: "Active Infrastructure",
    Records: "Records",
    NoDynamicSources: "No dynamic sources found.",
    Active: "Active",
    Passive: "Passive",
    Delete: "Delete",

    // News Reader
    AIPoweredTranslation: "AI Powered Deep Translation & Summary",
    OpenOriginalArticle: "Open Original Article",
    ArticleError: "Article content could not be read or this source does not allow bot access.",

    // Dashboard
    LiveBulletin: "Live Bulletin",
    BTC_Correlation: "BTC Correlation",
    VIX_Fear: "VIX Fear Index",
    DXY_Value: "DXY Dollar Index",
    MarketSentiment: "Market Sentiment",
    LatestPredictions: "Latest Predictions",
    SearchSymbolPlaceholder: "Symbol e.g.: AAPL, BTC-USD",
    All: "All",
    Crypto: "Crypto",
    Stocks_Category: "Stocks",
    AnalysisError: "An error occurred during analysis.",
    Analysis_Momentum: "Strong momentum and increasing institutional demand.",
    Analysis_AI: "Record expectations in AI chip demand.",
    Analysis_Gold: "Consolidation before inflation data.",
    NoPredictions: "No predictions generated yet.",
    Buy: "BUY",
    Sell: "SELL",
    Hold: "HOLD",
    Market: "Market",
    Score: "Score",
    ShowDetails: "Show Details",
    HideDetailsDashboard: "Hide",
    AISummary: "AI Decision Summary",
    NoAISummary: "Detailed analysis text not found. Please try again later.",
    ConfidenceScore: "Confidence Score",
    CreatedAt: "Created At",
    AITrendChart: "Machine Learning (ML) vs. AI Trend",
    AILine: "AI (Artificial Intelligence)",
    MLLine: "Advanced ML",
    Entry: "Entry",
    Target: "Target",
    StopLoss: "Stop Loss",
    RequestReceived: "Request Received",
    RequestReceivedDesc: "Your prediction will be displayed shortly. The system will complete the analysis even if you navigate away.",
    SubAssets: "Sub Assets",
    AnalysisResults: "Analysis Results",

    // News
    NewsTitle: "Smart News Bulletin",
    NewsDesc: "Real-time global market developments filtered by AI",
    Refresh: "Refresh",
    AllSources: "All",
    NoNews: "No market news found for this source.",
    OtherSource: "Other Source",
    NoSnippet: "Visit the source for news details.",
    AIRead: "AI Interpretation",
    GoToSource: "Go to Source"
  }
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('appLanguage') || 'TR';
  });

  useEffect(() => {
    localStorage.setItem('appLanguage', language);
  }, [language]);

  const toggleLanguage = (lang) => {
    setLanguage(lang);
  };

  const t = (key) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
