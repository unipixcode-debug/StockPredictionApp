import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Activity,
  ArrowUpRight, Globe, Bitcoin, RefreshCw, Zap, Newspaper,
  Search, Play, ChevronDown, ChevronUp, Cpu, Bot, Trash2, Shield, AlertTriangle, Coins
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine, Line
} from 'recharts';
import api from './api';
import { useLanguage } from './LanguageContext';
import { useNavigate } from 'react-router-dom';

const DISCLAIMER_KEY = 'predictpro_disclaimer_accepted';

const Dashboard = () => {
  const [predictions, setPredictions] = useState([]);
  const [stats, setStats] = useState(null);
  const [news, setNews] = useState([]);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [searchSymbol, setSearchSymbol] = useState('');
  const [statsError, setStatsError] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [filter, setFilter] = useState(t('All'));
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef(null);

  // Show disclaimer on first visit
  useEffect(() => {
    if (!localStorage.getItem(DISCLAIMER_KEY)) {
      setShowDisclaimer(true);
    }
  }, []);

  const acceptDisclaimer = () => {
    localStorage.setItem(DISCLAIMER_KEY, 'true');
    setShowDisclaimer(false);
  };



  useEffect(() => {
    fetchData();
    return () => { if (retryTimerRef.current) clearTimeout(retryTimerRef.current); };
  }, [language]);

  // News Auto-Rotation
  useEffect(() => {
    if (news.length === 0) return;
    const interval = setInterval(() => {
      setCurrentNewsIndex((prev) => (prev + 1) % news.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [news]);

  const [liveSearchResults, setLiveSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced Live Search Effect
  useEffect(() => {
    if (searchSymbol.length < 2) {
      setLiveSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get(`/market/search?q=${searchSymbol}&_t=${Date.now()}`);
        setLiveSearchResults(res || []);
      } catch (error) {
        console.error(error);
      } finally {
        setIsSearching(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchSymbol]);

  const fetchData = async () => {
    setLoading(true);
    setStatsError(false);
    try {
      const [predsResult, statsResult, newsResult] = await Promise.allSettled([
        api.get('/predictions'),
        api.get('/market/stats'),
        api.get(`/market/news?lang=${language}`)
      ]);
      if (predsResult.status === 'fulfilled') setPredictions(predsResult.value || []);
      if (newsResult.status === 'fulfilled') setNews(newsResult.value || []);
      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value);
        retryCountRef.current = 0; // reset on success
      }
      // Fallback mock predictions if API fails
      if (predsResult.status === 'rejected') {
        setPredictions([
          { id: 1, symbol: 'BTC-USD', market: 'Crypto', direction: 'BUY', score: 88, analysis_details: { summary: t('Analysis_Momentum') } },
          { id: 2, symbol: 'NVDA', market: 'US Stock', direction: 'BUY', score: 92, analysis_details: { summary: t('Analysis_AI') } },
          { id: 3, symbol: 'XAU-USD', market: 'Commodity', direction: 'HOLD', score: 65, analysis_details: { summary: t('Analysis_Gold') } },
        ]);
      }
      // Auto-retry stats if they failed (backend may still be starting)
      if (statsResult.status === 'rejected') {
        setStatsError(true);
        if (retryCountRef.current < 3) {
          retryCountRef.current += 1;
          retryTimerRef.current = setTimeout(() => {
            api.get('/market/stats').then(data => {
              setStats(data);
              setStatsError(false);
            }).catch(() => { });
          }, 5000);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeRequest = async (e) => {
    e.preventDefault();
    if (!searchSymbol.trim()) return;

    setLoadingAnalysis(true);
    setShowNotification(true);
    setErrorMsg(null);
    // Notification will stay for a bit
    setTimeout(() => setShowNotification(false), 5000);

    try {
      const response = await api.post('/predictions/analyze', { symbol: searchSymbol.toUpperCase().trim() });
      setPredictions(prev => [response, ...prev]);
      setSearchSymbol('');
    } catch (error) {
      console.error("Analysis request failed", error);
      if (error?.status === 403 || error?.response?.status === 403) {
        setErrorMsg(`⚡ Yetersiz Kredi! Mevcut: ${error?.response?.data?.credits ?? '?'} / Gereken: 20`);
      } else {
        // Try to get detailed error message from backend
        const backendError = error?.response?.data?.error;
        if (backendError) {
             setErrorMsg(backendError);
        } else {
             setErrorMsg("An error occurred during analysis. Please try again.");
        }
      }
      setTimeout(() => setErrorMsg(null), 7000);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/predictions/${id}`);
      setPredictions(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error("Delete failed", error);
      setErrorMsg("Deletion failed.");
      setTimeout(() => setErrorMsg(null), 3000);
    }
  };

  const fmtChange = (v) => v != null ? `${v >= 0 ? '+' : ''}${parseFloat(v).toFixed(2)}%` : '–';


  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-12"
    >
      {/* Legal Disclaimer Modal */}
      <AnimatePresence>
        {showDisclaimer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border rounded-3xl p-8 max-w-xl w-full shadow-2xl"
            >
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 rounded-2xl bg-amber-500/10">
                  <AlertTriangle className="text-amber-400" size={28} />
                </div>
                <h2 className="text-2xl font-black uppercase italic tracking-tight">⚠️ Yasal Uyarı</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-8">
                Bu sayfada yer alan tüm içerikler yalnızca yapay zeka tabanlı algoritmik analizden oluşmakta olup
                yatırım tavsiyesi, finansal danışmanlık veya alım-satım önerisi niteliği taşımaz. SPK lisanslı bir
                yatırım danışmanı hizmeti verilmemektedir. Sunulan tahminler ve analizler geçmiş verilere dayanır;
                gelecekteki sonuçları garanti etmez. Yatırım kararlarınızı vermeden önce yetkili bir finansal
                danışmana başvurmanız tavsiye edilir. Doğabilecek zararlardan uygulama geliştiricisi sorumlu tutulamaz.
              </p>
              <button
                onClick={acceptDisclaimer}
                className="w-full premium-button flex items-center justify-center space-x-2 py-4"
              >
                <Shield size={18} />
                <span className="uppercase tracking-tighter font-black">Okudum, Anladım ve Kabul Ediyorum</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight italic uppercase">{t('Dashboard')}</h1>
          <p className="text-muted-foreground font-medium mt-1">{t('GlobalAnalysis')}</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => window.location.href = '/admin'}
            className="flex items-center space-x-2 px-4 py-2 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 hover:bg-rose-500/20 transition-all shadow-lg shadow-rose-500/10 group"
          >
            <Shield size={18} className="group-hover:rotate-12 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest">Admin</span>
          </button>
          <div className="px-4 py-2 bg-secondary/50 border border-border rounded-2xl flex items-center space-x-3 backdrop-blur-md">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_#00f2fe]" />
            <span className="text-xs font-black uppercase tracking-widest opacity-70">Online</span>
          </div>
          <button
            onClick={fetchData}
            className="premium-button flex items-center space-x-2">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            <span className="uppercase tracking-tighter">{t('Refresh')}</span>
          </button>
        </div>
      </header>

      {/* Live News Ticker */}
      {news.length > 0 && (
        <div className="flex items-center space-x-4 bg-primary/5 border border-primary/20 rounded-2xl p-4 overflow-hidden relative">
          <div className="flex items-center space-x-2 text-primary pr-4 border-r border-primary/20 shrink-0">
            <Newspaper size={18} className="animate-pulse" />
            <span className="text-xs font-black tracking-widest uppercase">{t('LiveBulletin')}</span>
          </div>
          <div className="flex-1 relative h-6 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentNewsIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex items-center pr-4"
              >
                <a
                  href={news[currentNewsIndex]?.link || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors truncate w-full"
                >
                  {news[currentNewsIndex]?.title}
                </a>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Stats Grid — Real Data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label={t('BTC_Correlation')}
          value={stats?.btcCorrelation?.label ?? '–'}
          trend={stats?.btcCorrelation?.trend ?? '…'}
          trendUp={(stats?.raw?.btc?.change ?? 0) >= 0}
          icon={<Bitcoin className="text-amber-400" />}
          loading={loading}
        />
        <StatCard
          label={t('VIX_Fear')}
          value={stats?.vix?.price != null ? stats.vix?.price?.toFixed(1) : '–'}
          trend={fmtChange(stats?.raw?.vix?.change)}
          trendUp={(stats?.raw?.vix?.change ?? 0) >= 0}
          icon={<Activity className="text-primary" />}
          loading={loading}
        />
        <StatCard
          label={t('DXY_Value')}
          value={stats?.dxy?.price != null ? stats.dxy?.price?.toFixed(1) : '–'}
          trend={fmtChange(stats?.raw?.dxy?.change)}
          trendUp={(stats?.raw?.dxy?.change ?? 0) >= 0}
          icon={<Globe className="text-blue-400" />}
          loading={loading}
        />
        <StatCard
          label={t('MarketSentiment')}
          value={stats?.sentiment?.label ?? '–'}
          trend={stats?.sentiment?.trend ?? '…'}
          trendUp={stats?.sentiment?.pressureScore != null && stats?.sentiment?.pressureScore < 50}
          icon={<TrendingUp className="text-emerald-400" />}
          loading={loading}
        />
      </div>

      {/* Predictions List */}
      <section className="space-y-8">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center justify-between md:justify-start space-x-4 w-full md:w-auto">
            <div className="flex items-center space-x-3">
              <Zap className="text-primary" size={24} fill="currentColor" />
              <h2 className="text-2xl font-black uppercase italic tracking-tighter">{t('LatestPredictions')}</h2>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:space-y-0 sm:space-x-4 w-full md:w-auto">
            {/* AI Request Search Bar with Dropdown */}
            <div className="relative flex-1 sm:w-64 group/search">
              <form onSubmit={handleAnalyzeRequest} className="relative">
                <input
                  type="text"
                  placeholder={t('SearchSymbolPlaceholder')}
                  value={searchSymbol}
                  onChange={(e) => setSearchSymbol(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  className="w-full bg-secondary/30 border border-border rounded-full py-2.5 pl-10 pr-12 text-sm font-bold placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors backdrop-blur-md uppercase placeholder:normal-case"
                />
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/search:text-primary transition-colors" />
                <button
                  type="submit"
                  disabled={loadingAnalysis || !searchSymbol.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loadingAnalysis ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                </button>
              </form>

              {/* Suggestions Dropdown */}
              <AnimatePresence>
                {showSuggestions && searchSymbol.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute z-50 left-0 right-0 mt-2 bg-[#0c0c0e]/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
                  >
                    {isSearching ? (
                      <div className="px-5 py-3 text-xs text-muted-foreground font-medium italic animate-pulse flex items-center justify-center">
                        <RefreshCw size={14} className="animate-spin mr-2" /> Canlı piyasa taranıyor...
                      </div>
                    ) : (
                      liveSearchResults.length > 0 ? (
                        liveSearchResults
                          .slice(0, 5)
                          .map((s, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setSearchSymbol(s.symbol);
                                setShowSuggestions(false);
                              }}
                              className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-black">
                                  {s.symbol.substring(0, 1)}
                                </div>
                                <span className="text-sm font-bold text-foreground">{s.symbol}</span>
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">{s.typeDisp || s.market || ''}</span>
                            </button>
                          ))
                      ) : (
                        searchSymbol.length >= 2 && (
                          <div className="px-5 py-3 text-xs text-muted-foreground font-medium italic">
                            Sonuç bulunamadı: "{searchSymbol}"
                          </div>
                        )
                      )
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex bg-secondary/30 p-1.5 rounded-2xl border border-border backdrop-blur-md w-full sm:w-auto justify-center">
              {[t('All'), t('Crypto'), t('Stocks_Category'), t('Commodities_Category')].map((tab) => (
                <button 
                  key={tab} 
                  onClick={() => setFilter(tab)}
                  className={`px-5 py-1.5 rounded-xl text-xs font-bold transition-all w-full sm:w-auto ${filter === tab ? 'bg-primary text-primary-foreground shadow-lg' : 'hover:bg-white/5 text-muted-foreground hover:text-foreground'}`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Async Request Notification */}
        <AnimatePresence>
          {showNotification && !errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-primary/10 border border-primary/30 p-4 rounded-2xl flex items-center space-x-4 backdrop-blur-xl"
            >
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                <Bot size={20} />
              </div>
              <div>
                <p className="text-sm font-black uppercase italic tracking-tighter">İstek Talebiniz Alındı</p>
                <p className="text-xs text-muted-foreground font-medium">En kısa sürede tahmininiz görüntülenecektir. Sayfayı değiştirseniz bile sistem analizi tamamlayacaktır.</p>
              </div>
            </motion.div>
          )}

          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl flex items-center space-x-4 backdrop-blur-xl"
            >
              <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center text-white">
                <Activity size={20} />
              </div>
              <div>
                <p className="text-sm font-black uppercase italic tracking-tighter text-rose-500">Analiz Hatası</p>
                <p className="text-xs text-muted-foreground font-medium">{errorMsg}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 gap-8 max-w-full">
          {loading && predictions.length === 0 ? (
            [1, 2, 3, 4].map(i => (
              <div key={i} className="glass-card h-48 animate-pulse bg-white/5 border-white/5" />
            ))
          ) : (
            predictions
              .filter(p => {
                if (filter === t('All')) return true;
                if (filter === t('Crypto')) return p.market?.toLowerCase().includes('crypto');
                if (filter === t('Commodities_Category')) return p.market?.toLowerCase().includes('commodity');
                return p.market?.toLowerCase().includes('stock') || p.market?.toLowerCase().includes('bist');
              })
              .slice(0, 20) // Limit to top 20 most recent to ensure visibility
              .map(pred => (
              <motion.div key={pred.id} variants={itemVariants}>
                <PredictionCard data={pred} onDelete={() => handleDelete(pred.id)} navigate={navigate} />
              </motion.div>
            ))
          )}
          {predictions.length === 0 && !loading && (
            <div className="xl:col-span-2 py-20 text-center glass-card">
              <p className="text-muted-foreground font-bold italic uppercase tracking-widest opacity-30 text-sm">Henüz tahmin üretilmedi.</p>
            </div>
          )}
        </div>
      </section>
    </motion.div>
  );
};

function StatCard({ label, value, trend, trendUp = true, icon, loading = false }) {
  return (
    <div className="glass-card p-10 group hover:-translate-y-1 transition-all duration-500 hover:shadow-2xl">
      <div className="flex justify-between items-start mb-6">
        <div className="w-16 h-16 bg-secondary/50 rounded-2xl flex items-center justify-center border border-border group-hover:border-primary/30 transition-all text-3xl shadow-inner">
          {icon}
        </div>
        {loading ? (
          <div className="h-7 w-20 bg-white/5 rounded-full animate-pulse" />
        ) : (
          <div className={`px-4 py-1.5 rounded-full border ${trendUp ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
            <span className={`text-sm font-black uppercase tracking-widest ${trendUp ? 'text-emerald-500' : 'text-rose-500'}`}>{trend}</span>
          </div>
        )}
      </div>
      <p className="text-muted-foreground text-sm font-black uppercase tracking-widest mb-2 opacity-60">{label}</p>
      {loading ? (
        <div className="h-10 w-24 bg-white/5 rounded-lg animate-pulse" />
      ) : (
        <p className="text-4xl font-black tracking-tighter uppercase italic">{value}</p>
      )}
    </div>
  );
}

function PredictionCard({ data, onDelete, navigate }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [showActualPath, setShowActualPath] = useState(false);
  const [postCreationData, setPostCreationData] = useState([]);
  const [fetchingComparison, setFetchingComparison] = useState(false);
  const isBuy = data.direction === 'BUY';
  const isHold = data.direction === 'HOLD';
  const colorClass = isBuy ? 'text-emerald-500' : isHold ? 'text-amber-500' : 'text-rose-500';
  const bgClass = isBuy ? 'bg-emerald-500/10 border-emerald-500/20' : isHold ? 'bg-amber-500/10 border-amber-500/20' : 'bg-rose-500/10 border-rose-500/20';

  useEffect(() => {
    if (expanded && !postCreationData.length) {
      fetchComparisonData();
    }
  }, [expanded]);

  useEffect(() => {
    let interval;
    if (showActualPath) {
      interval = setInterval(fetchComparisonData, 30000); // 30s auto-refresh for reality path
    }
    return () => clearInterval(interval);
  }, [showActualPath]);

  const fetchComparisonData = async () => {
    // Only fetch if prediction is at least 5 minutes old
    const age = Date.now() - new Date(data.createdAt).getTime();
    if (age < 5 * 60 * 1000) return;

    setFetchingComparison(true);
    try {
      // Fetch high-resolution 1m history for the reality check path (SQUARELY correctly)
      const res = await api.get(`/market/history?symbol=${data.symbol}&timeframe=1m&limit=1000`);
      if (Array.isArray(res)) {
        const createTime = new Date(data.createdAt).getTime();
        const relevant = res.filter(h => new Date(h.time).getTime() > createTime);
        setPostCreationData(relevant);
      }
    } catch (e) {
      console.warn("Comparison data fetch failed", e);
    } finally {
      setFetchingComparison(false);
    }
  };

  return (
    <div className={`glass-card p-8 group relative transition-all duration-500 border-border/50 ${expanded ? 'border-primary/30 shadow-[0_0_50px_rgba(0,242,254,0.05)]' : 'hover:border-primary/20 hover:shadow-[0_0_30px_rgba(0,242,254,0.05)]'}`}>
      <div className="flex justify-between items-start mb-6">
        <div 
          className="cursor-pointer group/sym"
          onClick={(e) => { e.stopPropagation(); navigate(`/chart/${data.symbol}`); }}
        >
          <h3 className="text-3xl font-black italic tracking-tighter group-hover/sym:text-primary transition-colors">{data.symbol}</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40">{data.market} {t('Market')}</p>
        </div>
        <div className={`p-4 rounded-2xl flex items-center shadow-lg ${isBuy ? 'bg-emerald-500/10 text-emerald-500 shadow-emerald-500/20' : isHold ? 'bg-amber-500/10 text-amber-500 shadow-amber-500/20' : 'bg-rose-500/10 text-rose-500 shadow-rose-500/20'}`}>
          {isBuy ? <TrendingUp size={28} /> : isHold ? <Activity size={28} /> : <TrendingDown size={28} />}
        </div>
      </div>
      
      {/* Delete Button */}
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-full transition-all opacity-0 group-hover:opacity-100"
      >
        <Trash2 size={16} />
      </button>

      <div className="text-right">
        <p className={`text-4xl font-black italic tracking-tighter ${colorClass}`}>
          {isBuy ? t('Buy') : isHold ? t('Hold') : t('Sell')}
        </p>
        <div className="flex items-center justify-end space-x-2 mt-1">
          <div className="w-12 h-1 bg-secondary rounded-full overflow-hidden">
            <div className={`h-full ${isBuy ? 'bg-emerald-500' : isHold ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${data.score}%` }} />
          </div>
          <p className="text-muted-foreground font-black text-[10px] uppercase opacity-40">{t('Score')}: {data.score}</p>
        </div>
      </div>


      <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className={`flex-1 bg-secondary/30 p-4 rounded-2xl border border-border italic text-xs font-medium text-foreground/80 leading-relaxed transition-all duration-300 ${expanded ? '' : 'line-clamp-2'}`}>
          "{data.analysis_details?.summary}"
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="premium-button flex items-center space-x-2 shrink-0 group-hover:scale-105 transition-transform"
        >
          <span className="uppercase tracking-tighter text-sm">{expanded ? t('HideDetails') : t('ShowDetails')}</span>
          <div className="w-6 h-6 rounded-full bg-primary-foreground/10 flex items-center justify-center">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 32 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="border-t border-border/50 pt-8 overflow-hidden"
          >
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-black tracking-widest uppercase text-primary mb-3">Yapay Zeka Karar Özeti</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {data.analysis_details?.summary || 'Detaylı analiz metni bulunamadı. Lütfen daha sonra tekrar deneyin.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/20 rounded-2xl p-4 border border-border">
                  <span className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Güven Skoru</span>
                  <span className="text-xl font-black italic">{data.score}/100</span>
                </div>
                <div className="bg-secondary/20 rounded-2xl p-4 border border-border">
                  <span className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Oluşturulma</span>
                  <span className="text-sm font-bold mt-1 inline-block">
                    {new Date(data.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {data.analysis_details?.chartData && data.analysis_details.chartData.length > 0 && (
                <div className="pt-6 border-t border-border/30">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                    <div className="flex flex-col">
                      <h4 className="text-xs font-black tracking-widest uppercase text-muted-foreground">{t('AITrendChart')}</h4>
                      <p className="text-[9px] text-muted-foreground opacity-50 font-bold uppercase mt-1">Geriye Dönük Karşılaştırma Modu</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-6">
                      <div className="flex items-center space-x-2">
                         <div className="w-2 h-2 rounded-full bg-emerald-500" />
                         <span className="text-[10px] uppercase font-black tracking-tighter opacity-70">Gerçekleşen</span>
                      </div>
                      <div className="flex items-center space-x-2">
                         <div className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_8px_#facc15]" />
                         <span className="text-[10px] uppercase font-black tracking-tighter text-yellow-400">ML Tahmini</span>
                      </div>
                      <button 
                        onClick={() => setShowActualPath(!showActualPath)}
                        disabled={fetchingComparison && !postCreationData.length}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border transition-all ${showActualPath ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 font-black ring-1 ring-emerald-500/50' : 'bg-secondary/40 border-border text-muted-foreground hover:border-emerald-500/20'}`}
                      >
                        {fetchingComparison ? <RefreshCw size={12} className="animate-spin" /> : <Activity size={12} className={showActualPath ? 'animate-pulse' : ''} />}
                        <span className="text-[9px] font-black uppercase tracking-widest">
                          {showActualPath ? 'Gerçekliği Gizle' : (fetchingComparison && !postCreationData.length ? 'Veri Alınıyor...' : 'Gelişmeleri İzle')}
                        </span>
                      </button>
                    </div>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart 
                        data={data.analysis_details.chartData.map((d, i, arr) => {
                           // Find the first prediction index effectively properly SQUARELY
                           const firstPredIndex = arr.findIndex(item => item.isPrediction);
                           const splitPoint = firstPredIndex !== -1 ? firstPredIndex : 40;
                           
                           return {
                             ...d,
                             actual: d.time <= splitPoint ? d.price : null,
                             predicted: d.time >= splitPoint ? d.price : null,
                             transitionIdx: splitPoint
                           };
                        })} 
                        margin={{ top: 30, right: 80, left: 20, bottom: 20 }}
                      >
                        <defs>
                          <filter id="shadowPath" height="200%">
                            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                            <feOffset dx="0" dy="2" result="offsetblur" />
                            <feComponentTransfer>
                              <feFuncA type="linear" slope="0.5" />
                            </feComponentTransfer>
                            <feMerge>
                              <feMergeNode />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                          <linearGradient id={`splitLine-${data.id}`} x1="0" y1="0" x2="1" y2="0">
                            <stop offset="66.6%" stopColor={isBuy ? "#10b981" : "#e11d48"} />
                            <stop offset="66.6%" stopColor="#facc15" />
                          </linearGradient>
                          <linearGradient id={`splitArea-${data.id}`} x1="0" y1="0" x2="1" y2="0">
                            <stop offset="66.6%" stopColor={isBuy ? "#10b98120" : "#e11d4820"} />
                            <stop offset="66.6%" stopColor="#facc1530" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.1} />
                        <XAxis dataKey="time" type="number" domain={[-2, 65]} hide={false} height={0} tick={false} axisLine={false} padding={{ left: 20, right: 40 }} />
                        <YAxis 
                          hide 
                          domain={['dataMin - 2', 'dataMax + 2']}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const item = payload[0].payload;
                              return (
                                <div className="bg-[#0c0c0e]/90 border border-white/10 p-3 rounded-2xl shadow-2xl backdrop-blur-xl">
                                  <div className="flex items-center space-x-2 mb-1.5 opacity-60">
                                    <div className={`w-1.5 h-1.5 rounded-full ${item.isPrediction ? "bg-yellow-400" : "bg-emerald-500"}`} />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[#f5f5f7]">
                                      {item.isPrediction ? "ML Tahmini" : "Gerçek Veri"}
                                    </p>
                                  </div>
                                  <p className="text-sm font-black italic">
                                    ${item?.price?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "–"}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />

                        {/* Split point vertical line effectively properly SQUARELY correctly */}
                        <ReferenceLine 
                          x={data.analysis_details?.chartData?.find(d => d.isPrediction)?.time || 40} 
                          stroke="#ffffff40" 
                          strokeWidth={2} 
                          strokeDasharray="4 4"
                          label={{ 
                            value: 'HİPOTEZ →', 
                            position: 'top', 
                            fill: '#facc15', 
                            fontSize: 10, 
                            fontWeight: '900',
                            dy: -10
                          }} 
                        />

                        <ReferenceLine y={data.entryPrice} stroke="#60a5fa" strokeDasharray="5 5" label={{ value: 'GİRİŞ', position: 'left', fill: '#60a5fa', fontSize: 10, fontWeight: 'black' }} />
                        <ReferenceLine y={data.targetPrice} stroke="#10b981" label={{ value: 'HEDEF', position: 'left', fill: '#10b981', fontSize: 10, fontWeight: 'black' }} />
                        <ReferenceLine y={data.stopLoss} stroke="#e11d48" label={{ value: 'STOP', position: 'left', fill: '#e11d48', fontSize: 10, fontWeight: 'black' }} />
                        
                        {/* Reality Check: Actual Price Path after prediction SQUARELY correctly */}
                        {showActualPath && postCreationData && postCreationData.length > 0 && (
                          <Line
                            type="monotone"
                            data={postCreationData
                              .filter(d => (d.price || d.close) > 0) // No zero values effectively properly SQUARELY surely
                              .map((d, i) => ({ 
                               time: 40 + i, 
                               realPath: d.price || d.close 
                            }))}
                            dataKey="realPath"
                            stroke="#10b981"
                            strokeWidth={5}
                            dot={{ r: 2, fill: '#10b981' }}
                            filter="url(#shadowPath)"
                            animationDuration={2000}
                          />
                        )}

                        {/* Single Area with Gradient for Wow Effect effectively properly SQUARELY surely */}
                        <Area
                            type="monotone"
                            dataKey="price"
                            stroke={`url(#splitLine-${data.id})`}
                            strokeWidth={4}
                            fillOpacity={1}
                            fill={`url(#splitArea-${data.id})`}
                            animationDuration={2500}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gradient Overlay on Hover */}
      <div className={`absolute inset-x-0 bottom-0 h-1 bg-linear-to-r from-transparent via-primary/30 to-transparent transition-opacity ${expanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
    </div>
  );
}

export default Dashboard;
