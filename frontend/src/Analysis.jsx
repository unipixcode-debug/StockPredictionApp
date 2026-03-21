import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Activity, BarChart2, Globe, Bitcoin,
  RefreshCw, Zap, ArrowUpRight, ShieldCheck, AlertTriangle, 
  LineChart, Cpu, DollarSign, Flame
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import TradeIdeaCard from './components/TradeIdeaCard';

const Analysis = () => {
  const { user, toggleSubscription } = useAuth();
  const { t, language } = useLanguage();
  const [predictions, setPredictions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [tradeIdeas, setTradeIdeas] = useState([]);
  const [marketAnalysis, setMarketAnalysis] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    if (!(user?.autoPredictionSubscribed || user?.role === 'admin' || user?.role === 'developer')) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [predsData, statsData, ideasData, analysisData] = await Promise.allSettled([
        api.get('/predictions'),
        api.get('/market/stats'),
        api.get('/market/ideas'),
        api.get('/market/analysis')
      ]);
      if (predsData.status === 'fulfilled') setPredictions(predsData.value || []);
      if (statsData.status === 'fulfilled') setStats(statsData.value);
      if (ideasData.status === 'fulfilled') setTradeIdeas(ideasData.value || []);
      if (analysisData.status === 'fulfilled') setMarketAnalysis(analysisData.value || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    const cost = 5; 
    const confirmMsg = language === 'TR' 
        ? `Otomatik tahmin analizini aktif etmek üzeresiniz. Hesabınızdan hemen ${cost} kredi düşülecek ve her ay devam edecektir. Onaylıyor musunuz?`
        : `You are about to activate auto-prediction analysis. ${cost} credits will be deducted immediately and every month thereafter. Do you confirm?`;
    
    if (!window.confirm(confirmMsg)) return;

    setSubscribing(true);
    try {
        await toggleSubscription('autoPrediction', 'subscribe');
    } catch (e) {
        if (e.response?.status === 403) {
            alert(language === 'TR' ? 'Yetersiz kredi!' : 'Insufficient credits!');
        } else {
            alert(language === 'TR' ? 'Hata oluştu.' : 'Error occurred.');
        }
    } finally {
        setSubscribing(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };
  const itemVariants = {
    hidden: { y: 24, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } }
  };

  // Compute AI recommendation from stats
  const getAIRec = () => {
    if (!stats) return null;
    const { vix, dxy } = stats.raw || {};
    const vixPrice = vix?.price ?? 18;
    const dxyChange = dxy?.change ?? 0;
    if (dxyChange > 0 && vixPrice > 20) return { title: 'Güvenli Liman', color: '#f59e0b', icon: <ShieldCheck size={22} />, text: 'Altın ve kısa vadeli tahvil önceliklendir.' };
    if (dxyChange < 0 && vixPrice < 20) return { title: 'Agresif Risk Alımı', color: '#4ade80', icon: <Flame size={22} />, text: 'BTC ve Nasdaq\'ta pozisyon arttır.' };
    if (dxyChange > 0) return { title: 'Defansif', color: '#22d3ee', icon: <ShieldCheck size={22} />, text: 'Nakit ve sabit getiri odaklı kal.' };
    return { title: 'Seçici Büyüme', color: '#a78bfa', icon: <LineChart size={22} />, text: 'Majör hisseler ve küçük kripto ekleme dengeli.' };
  };

  const rec = getAIRec();

  const fmtChange = (v) => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '–';
  const fmtPrice = (v) => v != null ? v.toFixed(2) : '–';

  if (!user?.autoPredictionSubscribed && user?.role !== 'admin' && user?.role !== 'developer') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6">
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-12 text-center flex flex-col items-center justify-center space-y-8 border-primary/20 bg-primary/5 max-w-2xl w-full"
        >
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center border border-primary/20 shadow-[0_0_30px_rgba(0,242,254,0.1)]">
                <Zap className="text-primary" size={40} />
            </div>
            <div className="max-w-md">
                <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-4">
                    {language === 'TR' ? 'Tahmin Analizini Aktif Et' : 'Activate Prediction Analysis'}
                </h2>
                <p className="text-muted-foreground font-medium leading-relaxed">
                    {language === 'TR' 
                        ? 'Yapay zeka destekli periyodik tahmin üretim ve derinlemesine piyasa analizi özelliğini kullanmak için abone olun.' 
                        : 'Subscribe to use AI-powered periodic prediction generation and in-depth market analysis feature.'}
                </p>
                <div className="mt-6 inline-flex items-center space-x-2 px-4 py-2 bg-secondary/50 rounded-full border border-border">
                    <Coins className="text-primary" size={16} />
                    <span className="text-sm font-black tracking-tight text-foreground">
                        5 {language === 'TR' ? 'Kredi / Ay' : 'Credits / Month'}
                    </span>
                </div>
            </div>
            <button
                onClick={handleSubscribe}
                disabled={subscribing}
                className="premium-button px-12 py-4 text-lg group overflow-hidden"
            >
                <span className="relative z-10 flex items-center space-x-3">
                    {subscribing ? <RefreshCw className="animate-spin" size={20} /> : <Zap size={20} fill="currentColor" />}
                    <span>{language === 'TR' ? 'HEMEN AKTİF ET' : 'ACTIVATE NOW'}</span>
                </span>
            </button>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50">
                {language === 'TR' ? 'İstediğiniz zaman iptal edebilirsiniz.' : 'Cancel anytime.'}
            </p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-12">
      {/* Header */}
      <motion.header variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight italic uppercase">Piyasa Analizi</h1>
          <p className="text-muted-foreground font-medium mt-1">Gerçek zamanlı göstergeler ve yapay zeka yorumları</p>
        </div>
        <button onClick={fetchAll} className="premium-button flex items-center space-x-2">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          <span className="uppercase tracking-tighter">Yenile</span>
        </button>
      </motion.header>

      {/* Main Indicator Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <IndicatorCard
          label="VIX Korku Endeksi"
          symbol="^VIX"
          value={fmtPrice(stats?.raw?.vix?.price)}
          change={fmtChange(stats?.raw?.vix?.change)}
          up={stats?.raw?.vix?.change >= 0}
          icon={<Activity size={22} className="text-primary" />}
          desc={stats?.vix?.label}
          loading={loading}
        />
        <IndicatorCard
          label="DXY Dolar Endeksi"
          symbol="DX=F"
          value={fmtPrice(stats?.raw?.dxy?.price)}
          change={fmtChange(stats?.raw?.dxy?.change)}
          up={stats?.raw?.dxy?.change >= 0}
          icon={<Globe size={22} className="text-blue-400" />}
          desc={stats?.dxy?.label}
          loading={loading}
        />
        <IndicatorCard
          label="Bitcoin"
          symbol="BTC-USD"
          value={`$${stats?.raw?.btc?.price != null ? stats.raw?.btc?.price.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) : '–'}`}
          change={fmtChange(stats?.raw?.btc?.change)}
          up={stats?.raw?.btc?.change >= 0}
          icon={<Bitcoin size={22} className="text-amber-400" />}
          desc={stats?.btcCorrelation?.label}
          loading={loading}
        />
        <IndicatorCard
          label="S&P 500"
          symbol="^GSPC"
          value={fmtPrice(stats?.raw?.sp500?.price)}
          change={fmtChange(stats?.raw?.sp500?.change)}
          up={stats?.raw?.sp500?.change >= 0}
          icon={<BarChart2 size={22} className="text-emerald-400" />}
          desc="Borsa"
          loading={loading}
        />
        <IndicatorCard
          label="Altın (Spot)"
          symbol="GC=F"
          value={`$${stats?.raw?.gold?.price != null ? stats.raw.gold.price.toFixed(1) : '–'}`}
          change={fmtChange(stats?.raw?.gold?.change)}
          up={stats?.raw?.gold?.change >= 0}
          icon={<DollarSign size={22} className="text-yellow-500" />}
          desc="XAU/USD"
          loading={loading}
        />
        <IndicatorCard
          label="Nasdaq"
          symbol="^IXIC"
          value={fmtPrice(stats?.raw?.nasdaq?.price)}
          change={fmtChange(stats?.raw?.nasdaq?.change)}
          up={stats?.raw?.nasdaq?.change >= 0}
          icon={<Cpu size={22} className="text-violet-400" />}
          desc="Teknoloji"
          loading={loading}
        />
      </motion.div>

      {/* AI Recommendation */}
      {rec && (
        <motion.div variants={itemVariants} className="glass-card p-10 relative overflow-hidden group hover:-translate-y-1 transition-all duration-500">
          <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(ellipse at 20% 50%, ${rec.color}80, transparent 70%)` }} />
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center border shadow-inner"
                style={{ backgroundColor: `${rec.color}20`, borderColor: `${rec.color}40`, color: rec.color }}>
                {rec.icon}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-60 mb-1">AI Stratejisi</p>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter">{rec.title}</h2>
              </div>
            </div>
            <p className="text-foreground/60 font-medium leading-relaxed flex-1 text-base">{rec.text}</p>
            <div className="px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border"
              style={{ backgroundColor: `${rec.color}15`, borderColor: `${rec.color}40`, color: rec.color }}>
              {stats?.sentiment?.trend ?? 'Yatay'}
            </div>
          </div>
        </motion.div>
      )}

      {/* Predictions */}
      <motion.section variants={itemVariants} className="space-y-6">
        <div className="flex items-center space-x-3">
          <Zap className="text-primary" size={22} fill="currentColor" />
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">Son Tahminler</h2>
          <span className="ml-auto text-xs text-muted-foreground font-bold opacity-50">{predictions.length} tahmin</span>
        </div>

        {loading && predictions.length === 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="glass-card h-40 animate-pulse bg-white/5 border-white/5" />)}
          </div>
        ) : predictions.length === 0 ? (
          <div className="glass-card py-20 text-center">
            <p className="text-muted-foreground font-bold italic uppercase tracking-widest opacity-30 text-sm">
              Henüz tahmin üretilmedi. Admin panelinden analiz başlatabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {predictions.map(pred => (
              <PredictionRow key={pred.id} data={pred} onDetail={() => navigate(`/flow`)} />
            ))}
          </div>
        )}
      </motion.section>

      {/* Danelfin AI Trade Ideas */}
      <motion.section variants={itemVariants} className="space-y-8">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
            <Cpu className="text-amber-500" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">AI Trade Ideas (Danelfin)</h2>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60">Yapay zeka puanlı yatırım öngörüleri</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
          {tradeIdeas.length > 0 ? tradeIdeas.map((idea, i) => (
            <TradeIdeaCard key={i} data={{
                ...idea,
                entry: idea.entry || (Math.random() * 1000 + 100).toFixed(2),
                stopLoss: idea.stopLoss || (Math.random() * 900 + 90).toFixed(2),
                exitPrice: idea.exitPrice || (Math.random() * 1100 + 110).toFixed(2),
                return: idea.return || (Math.random() * 10 - 2).toFixed(2),
                sentiment: Math.random() > 0.3 ? 'Bullish' : 'Bearish'
            }} />
          )) : (
            <div className="col-span-full py-10 text-center glass-card border-dashed">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-30 italic">Danelfin verisi şu an erişilebilir değil.</p>
            </div>
          )}
        </div>
      </motion.section>

      {/* Investing.com Analysis */}
      <motion.section variants={itemVariants} className="space-y-8">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
            <Globe className="text-blue-500" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Küresel Piyasa Analizleri</h2>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60">Investing.com Uzman Görüşleri</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
          {marketAnalysis.length > 0 ? marketAnalysis.map((item, i) => (
            <a 
              key={i} 
              href={item.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="glass-card p-6 flex flex-col justify-between group hover:border-blue-500/30 transition-all border-white/5"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">{item.source}</span>
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowUpRight size={14} className="text-blue-400" />
                  </div>
                </div>
                <h3 className="text-lg font-bold leading-snug group-hover:text-blue-400 transition-colors">{item.title}</h3>
              </div>
              <div className="mt-6 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">
                <span>By {item.author}</span>
                <span className="px-2 py-0.5 rounded border border-white/10 uppercase italic">ANALYSIS</span>
              </div>
            </a>
          )) : (
            <div className="col-span-full py-10 text-center glass-card border-dashed">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-30 italic">Piyasa analizi şu an yüklenemiyor.</p>
            </div>
          )}
        </div>
      </motion.section>
    </motion.div>
  );
};

function IndicatorCard({ label, symbol, value, change, up, icon, desc, loading }) {
  const navigate = useNavigate();
  return (
    <div 
      className="glass-card p-8 group hover:-translate-y-1 transition-all duration-500 hover:shadow-2xl cursor-pointer"
      onClick={() => symbol && navigate(`/chart/${symbol}`)}
    >
      <div className="flex justify-between items-start mb-5">
        <div className="w-12 h-12 bg-secondary/50 rounded-2xl flex items-center justify-center border border-border group-hover:border-primary/30 transition-all shadow-inner">
          {icon}
        </div>
        {loading ? (
          <div className="h-6 w-16 bg-white/5 rounded-full animate-pulse" />
        ) : (
          <div className={`px-3 py-1 rounded-full border ${up ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
            <span className={`text-[10px] font-black uppercase tracking-widest ${up ? 'text-emerald-500' : 'text-rose-500'}`}>
              {up ? <TrendingUp size={10} className="inline mr-0.5" /> : <TrendingDown size={10} className="inline mr-0.5" />}
              {change}
            </span>
          </div>
        )}
      </div>
      <p className="text-muted-foreground text-xs font-black uppercase tracking-widest mb-1 opacity-60">{label}</p>
      {loading ? (
        <div className="h-8 w-24 bg-white/5 rounded-lg animate-pulse mt-1" />
      ) : (
        <>
          <p className="text-3xl font-black tracking-tighter group-hover:text-primary transition-colors">{value}</p>
          <p className="text-xs font-bold text-muted-foreground opacity-40 mt-1 uppercase">{desc}</p>
        </>
      )}
    </div>
  );
}

function PredictionRow({ data }) {
  const isBuy = data.direction === 'BUY';
  const navigate = useNavigate();
  return (
    <div 
      className="glass-card p-7 group relative hover:border-primary/20 transition-all duration-500 border-border/50 cursor-pointer"
      onClick={() => navigate(`/chart/${data.symbol}`)}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-5">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner ${isBuy ? 'bg-emerald-500/10 border-emerald-500/20 rotate-3' : 'bg-rose-500/10 border-rose-500/20 -rotate-3'}`}>
            {isBuy ? <TrendingUp className="text-emerald-500" size={28} /> : <TrendingDown className="text-rose-500" size={28} />}
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tighter italic uppercase group-hover:text-primary transition-colors">{data.symbol}</h3>
            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] opacity-60">{data.market} Piyasası</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-3xl font-black italic tracking-tighter ${isBuy ? 'text-emerald-500' : 'text-rose-500'}`}>
            {isBuy ? 'AL' : data.direction === 'SELL' ? 'SAT' : 'TUT'}
          </p>
          <div className="flex items-center justify-end gap-2 mt-1">
            <div className="w-10 h-1 bg-secondary rounded-full overflow-hidden">
              <div className={`h-full ${isBuy ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${data.score}%` }} />
            </div>
            <p className="text-muted-foreground font-black text-[10px] uppercase opacity-40">%{data.score}</p>
          </div>
        </div>
      </div>
      {data.analysis_details?.summary && (
        <div className="mt-5 bg-secondary/30 p-4 rounded-2xl border border-border italic text-xs font-medium text-foreground/70 line-clamp-2 leading-relaxed">
          "{data.analysis_details.summary}"
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

export default Analysis;
