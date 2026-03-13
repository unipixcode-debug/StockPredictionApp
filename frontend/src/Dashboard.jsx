import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Activity,
  ArrowUpRight, Globe, Bitcoin, RefreshCw, Zap, Newspaper,
  Search, Play, ChevronDown, ChevronUp, Cpu, Bot
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine
} from 'recharts';
import api from './api';
import { useLanguage } from './LanguageContext';

const Dashboard = () => {
  const [predictions, setPredictions] = useState([]);
  const [stats, setStats] = useState(null);
  const [news, setNews] = useState([]);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [searchSymbol, setSearchSymbol] = useState('');
  const [statsError, setStatsError] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [filter, setFilter] = useState(t('All'));
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef(null);

  const symbolSuggestions = [
    { name: 'BTC-USD', market: 'Crypto' }, { name: 'ETH-USD', market: 'Crypto' }, { name: 'SOL-USD', market: 'Crypto' },
    { name: 'AAPL', market: 'US Stock' }, { name: 'NVDA', market: 'US Stock' }, { name: 'TSLA', market: 'US Stock' },
    { name: 'THYAO.IS', market: 'BIST' }, { name: 'ASELS.IS', market: 'BIST' }, { name: 'EREGL.IS', market: 'BIST' },
    { name: 'XAU-USD', market: 'Commodity' }, { name: 'EURUSD=X', market: 'FX' }
  ];

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
      const response = await api.post('/predictions/analyze', { symbol: searchSymbol.toUpperCase() });
      setPredictions(prev => [response, ...prev]);
      setSearchSymbol('');
    } catch (error) {
      console.error("Analysis request failed", error);
      setErrorMsg("An error occurred during analysis. Please try again.");
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setLoadingAnalysis(false);
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
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight italic uppercase">{t('Dashboard')}</h1>
          <p className="text-muted-foreground font-medium mt-1">{t('GlobalAnalysis')}</p>
        </div>
        <div className="flex items-center space-x-4">
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
          value={stats?.vix?.price != null ? stats.vix.price.toFixed(1) : '–'}
          trend={fmtChange(stats?.raw?.vix?.change)}
          trendUp={(stats?.raw?.vix?.change ?? 0) < 0}
          icon={<Activity className="text-primary" />}
          loading={loading}
        />
        <StatCard
          label={t('DXY_Value')}
          value={stats?.dxy?.price != null ? stats.dxy.price.toFixed(1) : '–'}
          trend={fmtChange(stats?.raw?.dxy?.change)}
          trendUp={(stats?.raw?.dxy?.change ?? 0) >= 0}
          icon={<Globe className="text-blue-400" />}
          loading={loading}
        />
        <StatCard
          label={t('MarketSentiment')}
          value={stats?.sentiment?.label ?? '–'}
          trend={stats?.sentiment?.trend ?? '…'}
          trendUp={stats?.sentiment?.pressureScore != null && stats.sentiment.pressureScore < 50}
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
                    {symbolSuggestions
                      .filter(s => s.name.toLowerCase().includes(searchSymbol.toLowerCase()))
                      .slice(0, 5)
                      .map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setSearchSymbol(s.name);
                            setShowSuggestions(false);
                          }}
                          className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-black">
                              {s.name.substring(0, 1)}
                            </div>
                            <span className="text-sm font-bold text-foreground">{s.name}</span>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">{s.market}</span>
                        </button>
                      ))}
                    {symbolSuggestions.filter(s => s.name.toLowerCase().includes(searchSymbol.toLowerCase())).length === 0 && (
                      <div className="px-5 py-3 text-xs text-muted-foreground font-medium italic">
                        Öneri bulunamadı: "{searchSymbol}"
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex bg-secondary/30 p-1.5 rounded-2xl border border-border backdrop-blur-md w-full sm:w-auto justify-center">
              {[t('All'), t('Crypto'), t('Stocks_Category')].map((tab) => (
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

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {loading && predictions.length === 0 ? (
            [1, 2, 3, 4].map(i => (
              <div key={i} className="glass-card h-48 animate-pulse bg-white/5 border-white/5" />
            ))
          ) : (
            predictions
              .filter(p => {
                if (filter === t('All')) return true;
                if (filter === t('Crypto')) return p.market?.toLowerCase().includes('crypto');
                return p.market?.toLowerCase().includes('stock') || p.market?.toLowerCase().includes('bist');
              })
              .slice(0, 5) // Limit to top 5 most recent
              .map(pred => (
              <motion.div key={pred.id} variants={itemVariants}>
                <PredictionCard data={pred} />
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

function PredictionCard({ data }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const isBuy = data.direction === 'BUY';
  const isHold = data.direction === 'HOLD';
  const colorClass = isBuy ? 'text-emerald-500' : isHold ? 'text-amber-500' : 'text-rose-500';
  const bgClass = isBuy ? 'bg-emerald-500/10 border-emerald-500/20' : isHold ? 'bg-amber-500/10 border-amber-500/20' : 'bg-rose-500/10 border-rose-500/20';

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
                  <div className="flex items-center space-x-2 mb-6">
                    <h4 className="text-xs font-black tracking-widest uppercase text-muted-foreground">{t('AITrendChart')}</h4>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.analysis_details.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={isBuy ? "#10b981" : "#e11d48"} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={isBuy ? "#10b981" : "#e11d48"} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.3} />
                        <XAxis hide dataKey="time" />
                        <YAxis 
                          hide 
                          domain={['dataMin - 0.1', 'dataMax + 0.1']}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const item = payload[0].payload;
                              return (
                                <div className="bg-[#0c0c0e] border border-white/10 p-3 rounded-xl shadow-2xl">
                                  <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">
                                    {item.isPrediction ? "🤖 ML Tahmini" : "📊 Gerçek Veri"}
                                  </p>
                                  <p className="text-sm font-black italic">
                                    ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <ReferenceLine y={data.entryPrice} stroke="#60a5fa" strokeDasharray="5 5" label={{ value: 'ENTRY', position: 'left', fill: '#60a5fa', fontSize: 10, fontWeight: 'black' }} />
                        <ReferenceLine y={data.targetPrice} stroke="#10b981" label={{ value: 'TARGET', position: 'left', fill: '#10b981', fontSize: 10, fontWeight: 'black' }} />
                        <ReferenceLine y={data.stopLoss} stroke="#e11d48" label={{ value: 'STOP', position: 'left', fill: '#e11d48', fontSize: 10, fontWeight: 'black' }} />
                        
                        <Area
                          type="monotone"
                          dataKey="price"
                          stroke={isBuy ? "#10b981" : "#e11d48"}
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorPrice)"
                          animationDuration={2000}
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
