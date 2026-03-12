import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from './api';
import { 
  ArrowRight, TrendingUp, TrendingDown, Info, 
  ChevronRight, ChevronDown, RefreshCw, BarChart2, 
  Zap, Wallet, Landmark, BarChart3, Globe2, Coins, HelpCircle, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from './LanguageContext';

const FlowArrow = ({ direction, color, amount, percentage }) => {
    const { t } = useLanguage();
    return (
        <div className="relative w-32 h-12 flex flex-col items-center justify-center group">
            <div className="absolute -top-16 flex flex-col items-center space-y-1 whitespace-nowrap">
                <motion.span 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={amount}
                    className={`text-2xl font-black italic tracking-tighter ${color === 'emerald' ? 'text-emerald-400' : 'text-rose-400'}`}
                >
                    {(amount || 0) < 0.1 
                        ? `$${((amount || 0) * 1000).toFixed(0)}M` 
                        : `$${(amount || 0).toFixed(1)}B`}
                </motion.span>
                <div className="flex items-center space-x-2 bg-white/5 border border-white/10 px-3 py-1 rounded-full backdrop-blur-md">
                    <div className={`w-1.5 h-1.5 rounded-full ${color === 'emerald' ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-60">
                        {(percentage || 0).toFixed(2)}% {t('Rotation')}
                    </span>
                </div>
            </div>

            <div className="relative w-full h-8 flex items-center justify-center">
                <motion.div
                    animate={{ 
                        scaleX: direction > 0 ? [1, 1.3, 1] : [1, 1.3, 1],
                        opacity: [0.4, 0.8, 0.4],
                        x: direction > 0 ? [0, 10, 0] : [0, -10, 0]
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className={`w-full h-2 rounded-full ${color === 'emerald' ? 'bg-emerald-500 shadow-[0_0_25px_#10b981]' : 'bg-rose-500 shadow-[0_0_25px_#f43f5e]'}`}
                />
                <ArrowRight 
                    size={32} 
                    strokeWidth={4}
                    className={`absolute ${direction > 0 ? 'right-[-12px]' : 'left-[-12px] rotate-180'} ${color === 'emerald' ? 'text-emerald-500' : 'text-rose-500'}`} 
                />
            </div>
        </div>
    );
};

const MoneyFlow = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState('1G');
    const [expandedAsset, setExpandedAsset] = useState(null);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [showGuide, setShowGuide] = useState(false);
    const navigate = useNavigate();
    const { t } = useLanguage();

    const timeframes = [
        { id: '1S', label: `1 ${t('Hour')}` },
        { id: '4S', label: `4 ${t('Hour')}` },
        { id: '1G', label: `1 ${t('Day')}` },
        { id: '1H', label: `1 ${t('Week')}` },
        { id: '1A', label: `1 ${t('Month')}` },
        { id: '1Y', label: `1 ${t('Year')}` },
        { id: '5Y', label: `5 ${t('Year')}` },
        { id: '10Y', label: `10 ${t('Year')}` },
    ];

    const fetchData = async () => {
        setLoading(true);
        try {
            const result = await api.get(`/market/flow?timeframe=${timeframe}`);
            if (!result || !result.assets) throw new Error('Invalid data structure');
            setData(result);
            setLastRefresh(new Date());
            setLoading(false);
        } catch (error) {
            console.error('Flow fetch error:', error);
            // Timeframe based mock multiplier
            const mult = timeframe === '1S' ? 0.1 : timeframe === '1G' ? 1 : timeframe === '1H' ? 2.5 : timeframe === '1A' ? 6 : timeframe === '1Y' ? 24 : 50;
            
            setData({
                assets: [
                    { id: 'commodities', name: 'EMTİA', value: 18.0, change: -0.15 * mult, flowAmount: 0.85 * mult, color: 'orange', unit: 'T$', icon: <Landmark />, subAssets: [{name: 'Altın', value: 14.5 * mult, change: 0.2 * mult}, {name: 'Petrol', value: 2.1 * mult, change: -0.4 * mult}, {name: 'Gümüş', value: 1.4 * mult, change: 1.1 * mult}, {name: 'Bakır', value: 0.8 * mult, change: -0.5 * mult}] },
                    { id: 'crypto', name: 'KRİPTO', value: 2.6, change: 1.2 * mult, flowAmount: 2.4 * mult, color: 'cyan', unit: 'T$', icon: <Coins />, subAssets: [{name: 'Bitcoin', value: 1.3 * mult, change: 1.5 * mult}, {name: 'Ethereum', value: 0.4 * mult, change: 0.8 * mult}, {name: 'Solana', value: 0.15 * mult, change: 2.4 * mult}, {name: 'BTC Dominans', value: 0.5 * mult, change: 0.1 * mult}, {name: 'Kripto Toplam', value: 2.6 * mult, change: 1.2 * mult}] },
                    { id: 'stocks', name: 'BORSALAR', value: 110.0, change: 0.8 * mult, flowAmount: 8.2 * mult, color: 'green', unit: 'T$', icon: <BarChart3 />, subAssets: [{name: 'S&P500', value: 45.0 * mult, change: 0.8 * mult}, {name: 'Nasdaq', value: 20.0 * mult, change: 1.2 * mult}, {name: 'BIST100', value: 0.35 * mult, change: -0.3 * mult}] },
                    { id: 'bonds', name: 'TAHVİLLER', value: 130.0, change: -0.2 * mult, flowAmount: 4.1 * mult, color: 'indigo', unit: 'T$', icon: <Wallet />, subAssets: [{name: 'ABD 10Y', value: 130.0 * mult, change: -0.2 * mult}, {name: 'ABD 2Y', value: 85.0 * mult, change: 0.1 * mult}, {name: 'Almanya 10Y', value: 30.0 * mult, change: -0.4 * mult}, {name: 'Türkiye 10Y', value: 0.15 * mult, change: 0.5 * mult}] }
                ],
                indicators: { vix: { price: 15.2, change: -2.1 }, dxy: { price: 104.1, change: 0.1 } }
            });
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [timeframe]);

    useEffect(() => {
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, [timeframe]);

    const goToChart = (symbol, name) => {
        navigate(`/chart/${symbol}?name=${encodeURIComponent(name)}`);
    };

    if (loading || !data) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="relative">
                    <RefreshCw className="animate-spin text-primary w-12 h-12" />
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                </div>
            </div>
        );
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12 pb-20"
        >
            {/* Header */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-10">
                <div className="space-y-4">
                    <div>
                        <h1 className="text-5xl font-black tracking-tighter uppercase italic">{t('MoneyFlowTitle') || 'Piyasa Para Akışı'}</h1>
                        <button 
                            onClick={() => setShowGuide(true)}
                            className="text-muted-foreground font-medium mt-2 text-lg hover:text-primary transition-colors flex items-center space-x-2 decoration-primary/30 underline underline-offset-8"
                        >
                            <span>Global varlık hareketleri ve likidite akış şeması</span>
                            <Info size={16} />
                        </button>
                    </div>
                    {/* Timeframe Selector */}
                    <div className="flex bg-secondary/30 p-2 rounded-3xl border border-border backdrop-blur-md self-start">
                        {timeframes.map((tf) => (
                            <button 
                                key={tf.id}
                                onClick={() => setTimeframe(tf.id)}
                                className={`
                                    px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all
                                    ${timeframe === tf.id 
                                        ? 'bg-primary text-primary-foreground shadow-[0_0_20px_rgba(0,242,254,0.3)]' 
                                        : 'hover:bg-white/5 text-muted-foreground hover:text-foreground'
                                    }
                                `}
                            >
                                {tf.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center flex-wrap gap-6">
                    <div className="px-6 py-3 bg-secondary/40 backdrop-blur-md rounded-4xl border border-border flex items-center space-x-4 shadow-inner">
                        <span className="text-xs font-black tracking-widest text-muted-foreground uppercase opacity-50">VIX:</span>
                        <span className={`text-xl font-black italic ${data?.indicators?.vix?.change > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {data?.indicators?.vix?.price?.toFixed(2)}
                        </span>
                    </div>
                    <div className="px-6 py-3 bg-secondary/40 backdrop-blur-md rounded-4xl border border-border flex items-center space-x-4 shadow-inner">
                        <span className="text-xs font-black tracking-widest text-muted-foreground uppercase opacity-50">DXY:</span>
                        <span className={`text-xl font-black italic ${data?.indicators?.dxy?.change > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {data?.indicators?.dxy?.price?.toFixed(2)}
                        </span>
                    </div>
                    <button 
                        onClick={() => setShowGuide(true)}
                        className="flex items-center space-x-3 px-6 py-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-2xl border border-primary/20 transition-all group lg:mr-4"
                    >
                        <HelpCircle size={20} />
                        <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">{t('HowToInterpret') || 'Nasıl Yorumlanır?'}</span>
                    </button>
                    <button onClick={fetchData} className="w-16 h-16 premium-button flex items-center justify-center rounded-4xl!">
                        <RefreshCw size={24} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Money Flow Schema */}
            <div className="relative overflow-x-auto pb-20 py-8 scrollbar-hide">
                <div className="flex items-start justify-center md:justify-start gap-12 lg:gap-20 min-w-[1280px] px-4 md:px-12 py-8">
                    {data.assets.map((asset, index) => {
                        const topSubAssets = asset.subAssets?.slice(0, 2) || [];
                        const hasMore = (asset.subAssets?.length || 0) > 2;

                        return (
                            <React.Fragment key={asset.id}>
                                <div className={`relative transition-all duration-500 ${expandedAsset === asset.id ? 'w-xl' : 'w-md'} flex flex-col gap-10`}>
                                    {/* Asset Box */}
                                    <div 
                                        className={`
                                            p-8 rounded-[3rem] border-2 transition-all duration-500 relative group overflow-hidden shadow-2xl
                                            ${asset.color === 'orange' ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40 shadow-amber-500/10' : ''}
                                            ${asset.color === 'cyan' ? 'bg-primary/5 border-primary/20 hover:border-primary/40 shadow-primary/10' : ''}
                                            ${asset.color === 'green' ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40 shadow-emerald-500/10' : ''}
                                            ${asset.color === 'indigo' ? 'bg-indigo-500/5 border-indigo-500/20 hover:border-indigo-500/40 shadow-indigo-500/10' : ''}
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-8">
                                            <div className="flex flex-col">
                                                <h3 className="font-black text-3xl tracking-tighter uppercase italic opacity-90">{asset.name}</h3>
                                                <div className="flex items-center space-x-3 mt-2">
                                                    <div className={`w-2 h-2 rounded-full ${asset.change > 0 ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">{t('MarketLiquidity') || 'Pazar Likiditesi'}</span>
                                                </div>
                                            </div>
                                            <div className="flex space-x-4">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); goToChart(asset.id, asset.name); }}
                                                    className="w-12 h-12 rounded-2xl bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-primary transition-all hover:shadow-[0_0_20px_rgba(0,242,254,0.1)] active:scale-90 shadow-inner"
                                                >
                                                    <BarChart2 size={24} />
                                                </button>
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner ${asset.change > 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
                                                    {asset.change > 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2 mb-10">
                                            <div className="flex items-baseline space-x-3">
                                                <span className="text-5xl font-black italic tracking-tighter">{asset.value.toFixed(1)}</span>
                                                <span className="text-xl font-black italic opacity-20">{asset.unit}</span>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <span className={`text-3xl font-black italic shadow-text ${asset.change > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {asset.change > 0 ? '+' : ''}{asset.change.toFixed(2)}%
                                                </span>
                                                <span className="text-xs font-bold text-muted-foreground opacity-30 uppercase tracking-widest">{timeframes.find(t => t.id === timeframe).label} {t('Change') || 'Değişim'}</span>
                                            </div>
                                        </div>

                                        {/* Top Sub-Assets Pill Wrapper */}
                                        <div className="flex flex-wrap gap-3 mb-6">
                                            {topSubAssets.map(sub => (
                                                <div 
                                                    key={sub.name}
                                                    onClick={() => goToChart(sub.symbol || sub.name, sub.name)}
                                                    className="px-4 py-2 bg-secondary/40 hover:bg-secondary/60 rounded-2xl text-[11px] font-black uppercase tracking-tight border border-border cursor-pointer transition-all flex items-center space-x-3 active:scale-95 shadow-inner"
                                                >
                                                    <span className="opacity-70">{sub.name}</span>
                                                    <span className={`font-black ${sub.change > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        {sub.change > 0 ? '↑' : '↓'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {hasMore && (
                                                <button 
                                                    onClick={() => setExpandedAsset(expandedAsset === asset.id ? null : asset.id)}
                                                    className="w-12 h-12 rounded-2xl bg-primary/10 hover:bg-primary/30 flex items-center justify-center text-primary transition-all border border-primary/20 shadow-lg"
                                                >
                                                    {expandedAsset === asset.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => navigate(`/flow/${asset.id}`)}
                                                className="flex-1 py-4 bg-secondary/50 hover:bg-secondary rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-border transition-all flex items-center justify-center space-x-3 group/btn"
                                            >
                                                <span>Detayları İncele</span>
                                                <div className="w-5 h-5 rounded-lg bg-primary/10 flex items-center justify-center group-hover/btn:bg-primary group-hover/btn:text-primary-foreground transition-all">
                                                    <ArrowRight size={12} />
                                                </div>
                                            </button>
                                        </div>

                                        {/* Background Decor */}
                                        <div className={`absolute top-[-20%] right-[-10%] w-48 h-48 blur-[100px] rounded-full opacity-10 ${asset.color === 'orange' ? 'bg-amber-500' : asset.color === 'cyan' ? 'bg-primary' : asset.color === 'green' ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                                    </div>

                                    {/* Drill-down Sub-assets */}
                                    <AnimatePresence>
                                        {expandedAsset === asset.id && asset.subAssets && (
                                            <motion.div 
                                                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                                                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="grid gap-4 bg-card/60 p-8 rounded-[3.5rem] border border-border backdrop-blur-2xl shadow-2xl">
                                                    {asset.subAssets.map(sub => (
                                                        <div 
                                                            key={sub.name} 
                                                            onClick={() => goToChart(sub.symbol || sub.name, sub.name)}
                                                            className="flex items-center justify-between p-5 rounded-4xl hover:bg-secondary transition-all cursor-pointer group border border-transparent hover:border-border/50 shadow-sm"
                                                        >
                                                            <div className="flex items-center space-x-5">
                                                                <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center border border-border group-hover:border-primary/40 transition-all opacity-40 group-hover:opacity-100 shadow-inner">
                                                                    <BarChart2 size={16} />
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-black uppercase tracking-tight italic">{sub.name}</span>
                                                                    {sub.value && (
                                                                        <span className="text-[10px] font-bold text-muted-foreground opacity-50 uppercase tracking-widest leading-none mt-1">
                                                                            ${sub.value.toFixed(2)}{asset.unit}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <span className={`text-xl font-black italic shadow-text ${sub.change > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                {sub.change > 0 ? '+' : ''}{sub.change.toFixed(2)}%
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {index < data.assets.length - 1 && (
                                    <div className="flex flex-col items-center justify-center pt-20">
                                        <FlowArrow 
                                            direction={data.assets[index+1].change - asset.change} 
                                            amount={asset.flowAmount}
                                            percentage={Math.abs(data.assets[index+1].change - asset.change)}
                                            color={data.assets[index+1].change > asset.change ? 'emerald' : 'rose'} 
                                        />
                                        <span className="text-[11px] font-black italic mt-10 opacity-30 uppercase tracking-[0.3em] font-mono">Likidite Rotasyonu</span>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Interpretation Guide Modal */}
            <AnimatePresence>
                {showGuide && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-background/80 backdrop-blur-xl"
                        onClick={() => setShowGuide(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-card border border-border max-w-2xl w-full p-12 rounded-[4rem] shadow-3xl relative overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[100px] rounded-full" />
                            
                            <button 
                                onClick={() => setShowGuide(false)}
                                className="absolute top-8 right-8 w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                            >
                                <X size={24} />
                            </button>

                            <h3 className="text-4xl font-black italic uppercase tracking-tighter mb-10 flex items-center space-x-6">
                                <HelpCircle className="text-primary" size={40} />
                                <span>Analiz Rehberi</span>
                            </h3>

                            <div className="space-y-10">
                                <div className="space-y-4">
                                    <h4 className="text-xl font-black italic uppercase tracking-tight text-primary">Okların Yönü Ne Anlama Geliyor?</h4>
                                    <p className="text-muted-foreground leading-relaxed text-lg">
                                        Oklar, piyasadaki **likidite rotasyonunu** temsil eder. Eğer bir ok sağa veya sola doğru hareket ediyorsa, para o yöndeki varlık sınıfına (Emtia, Kripto, Borsa vb.) doğru kayıyor demektir. Para her zaman performansın ve ilginin arttığı yöne doğru akar.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-xl font-black italic uppercase tracking-tight text-primary">Renklerin Dili</h4>
                                    <div className="grid gap-6">
                                        <div className="flex items-start space-x-5 p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/10">
                                            <div className="w-4 h-4 rounded-full bg-emerald-500 mt-2 shadow-[0_0_15px_#10b981]" />
                                            <div className="flex-1">
                                                <span className="font-black text-emerald-500 uppercase tracking-widest text-sm">Zümrüt Yeşil (Giriş):</span>
                                                <p className="text-muted-foreground text-base mt-1 italic">Varlığa güçlü bir nakit girişi olduğunu ve performansın yükseldiğini ifade eder.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start space-x-5 p-6 bg-rose-500/5 rounded-3xl border border-rose-500/10">
                                            <div className="w-4 h-4 rounded-full bg-rose-500 mt-2 shadow-[0_0_15px_#f43f5e]" />
                                            <div className="flex-1">
                                                <span className="font-black text-rose-500 uppercase tracking-widest text-sm">Gül Kurusu (Çıkış/Rotasyon):</span>
                                                <p className="text-muted-foreground text-base mt-1 italic">Varlıktan kâr satışı yapıldığını veya paranın başka bir sınıfa rotasyon yaptığını ifade eder.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-xl font-black italic uppercase tracking-tight text-primary">Neden Doğrusal?</h4>
                                    <p className="text-muted-foreground leading-relaxed text-lg">
                                        Bu şema, küresel piyasalardaki ana likidite zincirini gösterir. Emtiadan Kriptoya, Kriptodan Borsalara olan akış, paranın risk iştahına göre nasıl el değiştirdiğini basitleştirilmiş bir rotasyon dizisiyle anlatır.
                                    </p>
                                </div>
                            </div>

                            <button 
                                onClick={() => setShowGuide(false)}
                                className="w-full mt-12 py-6 bg-primary text-primary-foreground font-black uppercase tracking-[0.2em] rounded-4xl hover:shadow-[0_0_30px_rgba(0,242,254,0.4)] transition-all active:scale-[0.98]"
                            >
                                Anladım, Analize Devam Et
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Analysis Section */}
            <div className="glass-card p-12 relative overflow-hidden border-border/40">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[150px] rounded-full pointer-events-none" />
                
                <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-12 flex items-center space-x-6">
                    <Zap className="text-primary" size={40} fill="currentColor" />
                    <span>Piyasa Akış Analizi <span className="text-muted-foreground opacity-20 ml-4">[{timeframe}]</span></span>
                </h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="relative">
                        <div className="absolute -left-6 top-0 bottom-0 w-1 bg-primary/20 rounded-full" />
                        <div className="space-y-6">
                            <p className="text-foreground/80 font-medium text-xl leading-relaxed italic pr-4">
                                "Şu anki makroekonomik görünümde, likidite {data?.indicators?.dxy?.change > 0 ? 'Dolar endeksinde güçlenme' : 'zayıflama'} gösteriyor. 
                                Bu durum {data?.indicators?.vix?.price > 20 ? 'yüksek volatilite' : 'stabilite'} ile birleştiğinde 
                                piyasalarda {data?.indicators?.dxy?.change > 0 ? 'riskten kaçış' : 'riske giriş'} iştahını tetikleyebilir."
                            </p>
                            
                            {/* AI Recommendation Bubble */}
                            <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 }}
                                className="bg-primary/10 border border-primary/20 p-8 rounded-[2.5rem] relative overflow-hidden group"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:rotate-12 transition-transform">
                                    <Zap size={60} fill="currentColor" />
                                </div>
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="flex space-x-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">AI Yatırım Stratejisi</span>
                                </div>
                                <h4 className="text-2xl font-black italic tracking-tighter mb-2 uppercase">
                                    {data?.indicators?.dxy?.change > 0 && data?.indicators?.vix?.price > 20 ? 'Güvenli Liman Odaklı' :
                                     data?.indicators?.dxy?.change < 0 && data?.indicators?.vix?.price < 20 ? 'Agresif Risk Alımı' :
                                     data?.indicators?.dxy?.change > 0 ? 'Defansif ve Nakit' : 'Seçici Büyüme'}
                                </h4>
                                <p className="text-muted-foreground leading-relaxed font-medium">
                                    {data?.indicators?.dxy?.change > 0 && data?.indicators?.vix?.price > 20 
                                        ? "Doların güçlendiği ve korkunun arttığı bu evrede, sermayeyi korumak için Altın ve kısa vadeli Tahviller önceliklendirilmelidir. Kripto ve teknoloji hisselerinde nakit oranını artırmak rasyonel bir adım olabilir."
                                        : data?.indicators?.dxy?.change < 0 && data?.indicators?.vix?.price < 20
                                        ? "Zayıf Dolar ve düşük volatilite ortamı, riskli varlıklar için 'ideal' penceredir. Bitcoin ve Nasdaq gibi büyüme odaklı varlıklarda pozisyon artırmak, likidite genişlemesinden maksimum fayda sağlayabilir."
                                        : data?.indicators?.dxy?.change > 103.5 
                                        ? "DXY'nin kritik eşik üzerinde olması gelişmekte olan piyasalar için baskı yaratıyor. Sabit getirili varlıklar ve Dolar bazlı likit fonlar bu evrede en stabil getiriyi sunacaktır."
                                        : "Piyasada yön arayışı hakim. Sepet bazlı dağılım yaparak hem majör hisse senetlerinde kalmak hem de ufak bir miktar dijital varlık bulundurmak dengeli bir strateji olacaktır."}
                                </p>
                            </motion.div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6 self-start">
                        <div className="p-8 rounded-3xl bg-secondary/30 border border-border shadow-inner group">
                             <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Risk İştahı</p>
                             <div className="flex items-center space-x-3">
                                 <div className={`w-3 h-3 rounded-full ${data?.indicators?.vix?.price < 20 ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-amber-500 shadow-[0_0_10px_#f59e0b]'}`} />
                                 <p className={`text-2xl font-black uppercase italic tracking-tighter ${data?.indicators?.vix?.price < 20 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                    {data?.indicators?.vix?.price < 20 ? 'YÜKSEK' : 'NORMAL'}
                                 </p>
                             </div>
                        </div>
                        <div className="p-8 rounded-3xl bg-secondary/30 border border-border shadow-inner group">
                             <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Varlık Rotasyonu</p>
                             <div className="flex items-center space-x-3">
                                 <Globe2 className="text-primary w-5 h-5 animate-pulse" />
                                 <p className="text-2xl font-black uppercase italic tracking-tighter text-primary">AKTİF</p>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};


export default MoneyFlow;
