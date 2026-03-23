import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Info, TrendingUp, TrendingDown, RefreshCw, Bot, X, Zap } from 'lucide-react';
import api from './api';
import { useLanguage } from './LanguageContext';
import ReactMarkdown from 'react-markdown';

const AIScanner = () => {
    const { language } = useLanguage();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [analysis, setAnalysis] = useState('');
    const [analyzing, setAnalyzing] = useState(false);

    useEffect(() => {
        fetchScanner();
        const interval = setInterval(fetchScanner, 60000); // Auto refresh every minute
        return () => clearInterval(interval);
    }, []);

    const fetchScanner = async () => {
        setLoading(true);
        try {
            const res = await api.get('/scanner/top?limit=40');
            setData(res);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleRowClick = async (asset) => {
        setSelectedAsset(asset);
        setAnalysis('');
        setAnalyzing(true);
        try {
            const res = await api.post('/scanner/analyze', {
                symbol: asset.symbol,
                rsi: asset.rsi,
                macd: asset.macd,
                price: asset.price
            });
            setAnalysis(res.analysis);
        } catch (e) {
            setAnalysis("Analiz sırasında hata oluştu.");
        } finally {
            setAnalyzing(false);
        }
    };

    const filteredData = data.filter(item => 
        item.symbol.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-20">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter uppercase italic text-foreground flex items-center">
                        <Zap className="mr-3 text-primary" fill="currentColor" />
                        {language === 'TR' ? 'Borsa Tarayıcı' : 'Market Scanner'}
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium">
                        {language === 'TR' 
                            ? 'Binance üzerinden en yüksek hacimli paritelerin RSI ve MACD analizleri.' 
                            : 'RSI and MACD analysis of high-volume pairs from Binance.'}
                    </p>
                </div>

                <div className="flex items-center space-x-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <input 
                            type="text" 
                            placeholder={language === 'TR' ? "Sembol ara..." : "Search symbol..."}
                            className="w-full bg-secondary/30 border border-border/50 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={fetchScanner} 
                        disabled={loading}
                        className="bg-secondary/50 p-2.5 rounded-xl border border-border/50 hover:bg-secondary transition-colors"
                    >
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </header>

            {/* Main Scanner Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-secondary/50 border-b border-border/50">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Sembol</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic text-right">Fiyat</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic text-right">Değişim %</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic text-center">RSI (14)</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic text-right">Hacim (M$)</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic text-center">Teknik Sinyal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {loading && data.length === 0 ? (
                                Array(10).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="6" className="px-6 py-4"><div className="h-4 bg-secondary/50 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : filteredData.map((item) => (
                                <tr 
                                    key={item.symbol} 
                                    onClick={() => handleRowClick(item)}
                                    className="hover:bg-primary/5 cursor-pointer transition-colors group"
                                >
                                    <td className="px-6 py-4">
                                        <span className="font-black text-sm text-foreground group-hover:text-primary transition-colors">{item.symbol}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-mono font-bold text-sm tracking-tighter">${item.price > 1 ? item.price.toLocaleString() : item.price.toFixed(6)}</span>
                                    </td>
                                    <td className={`px-6 py-4 text-right font-bold text-xs ${item.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="inline-flex items-center justify-center px-3 py-1 bg-secondary/30 rounded-full border border-border/50">
                                            <span className={`font-black text-xs ${item.rsi < 30 ? 'text-emerald-500' : item.rsi > 70 ? 'text-rose-500' : 'text-amber-500'}`}>
                                                {item.rsi.toFixed(1)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-mono text-xs font-bold text-muted-foreground">${item.volume.toFixed(1)}M</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border ${
                                            item.tag === 'buy' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' :
                                            item.tag === 'sell' ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' :
                                            'bg-secondary border-border text-muted-foreground'
                                        }`}>
                                            {item.signal}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* AI Analysis Modal */}
            <AnimatePresence>
                {selectedAsset && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedAsset(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-panel w-full max-w-2xl rounded-3xl border border-border/50 shadow-2xl overflow-hidden relative"
                        >
                            <div className="p-6 border-b border-border/50 flex justify-between items-center bg-secondary/20">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary border border-primary/30">
                                        <Bot size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xl tracking-tighter uppercase italic">{selectedAsset.symbol}</h3>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">AI Bot Analizi & Sinyal</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedAsset(null)}
                                    className="p-2 hover:bg-secondary rounded-xl transition-colors"
                                >
                                    <X size={20} className="text-muted-foreground" />
                                </button>
                            </div>

                            <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                {analyzing ? (
                                    <div className="py-20 flex flex-col items-center justify-center space-y-4">
                                        <div className="w-16 h-1 bg-secondary rounded-full overflow-hidden relative">
                                            <motion.div 
                                                animate={{ x: [-64, 64] }}
                                                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                                className="absolute inset-0 bg-primary"
                                            />
                                        </div>
                                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Analiz Ediliyor...</p>
                                    </div>
                                ) : (
                                    <div className="prose prose-invert max-w-none">
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                            <div className="bg-secondary/30 p-4 rounded-2xl border border-border/50">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">RSI</p>
                                                <p className="font-black text-base italic">{selectedAsset.rsi.toFixed(1)}</p>
                                            </div>
                                            <div className="bg-secondary/30 p-4 rounded-2xl border border-border/50">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">MACD Hist</p>
                                                <p className="font-black text-base italic">{selectedAsset.macd.hist.toFixed(4)}</p>
                                            </div>
                                            <div className="bg-secondary/30 p-4 rounded-2xl border border-border/50">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Fiyat</p>
                                                <p className="font-black text-base italic tracking-tighter">${selectedAsset.price}</p>
                                            </div>
                                            <div className="bg-secondary/30 p-4 rounded-2xl border border-border/50">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">24s Değişim</p>
                                                <p className={`font-black text-base italic ${selectedAsset.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{selectedAsset.change.toFixed(2)}%</p>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 mb-4">
                                            <ReactMarkdown className="markdown-content">
                                                {analysis}
                                            </ReactMarkdown>
                                        </div>
                                        
                                        <div className="flex items-center justify-center p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                                            <Info size={12} className="text-rose-500/60 mr-2" />
                                            <p className="text-[9px] font-black uppercase tracking-widest text-rose-500/60">Bu bir yatırım tavsiyesi değildir. AI tarafından üretilmiştir.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default AIScanner;
