import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Info, TrendingUp, TrendingDown, RefreshCw, Bot, X, Zap, Activity, Globe } from 'lucide-react';
import api from './api';
import { useLanguage } from './LanguageContext';
import ReactMarkdown from 'react-markdown';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, 
    Tooltip as RechartsTooltip, ReferenceLine, ResponsiveContainer 
} from 'recharts';

const AIScanner = () => {
    const { language } = useLanguage();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [analysis, setAnalysis] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [activeMarket, setActiveMarket] = useState('crypto');
    const [historyData, setHistoryData] = useState([]);
    const [levels, setLevels] = useState({ entry: null, tp: null, sl: null });

    const markets = [
        { id: 'crypto', label: 'KRİPTO', icon: <Activity size={14}/> },
        { id: 'nasdaq', label: 'NASDAQ', icon: <Zap size={14}/> },
        { id: 'bist', label: 'BIST 100', icon: <Globe size={14}/> }
    ];

    useEffect(() => {
        fetchScanner();
        const interval = setInterval(fetchScanner, 120000); // Auto refresh every 2 mins
        return () => clearInterval(interval);
    }, [activeMarket]);

    const fetchScanner = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/scanner/top?market=${activeMarket}&limit=40`);
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
        setHistoryData([]);
        setLevels({ entry: null, tp: null, sl: null });
        setAnalyzing(true);
        try {
            // Fetch Analysis and History in parallel
            const [analysisRes, historyRes] = await Promise.all([
                api.post('/scanner/analyze', {
                    symbol: asset.symbol,
                    rsi: asset.rsi,
                    macd: asset.macd,
                    price: asset.price,
                    market: activeMarket
                }),
                api.get(`/scanner/history?symbol=${asset.symbol}&market=${activeMarket}`)
            ]);
            
            setAnalysis(analysisRes.analysis);
            setHistoryData(historyRes);
            
            // Extract levels from analysis string
            const extractedLevels = { entry: null, tp: null, sl: null };
            analysisRes.analysis.split('\n').forEach(line => {
                const val = parseFloat(line.split(':')[1]?.trim());
                if (!isNaN(val)) {
                    if (line.includes('Giriş')) extractedLevels.entry = val;
                    if (line.includes('Hedef (TP)')) extractedLevels.tp = val;
                    if (line.includes('Stop (SL)')) extractedLevels.sl = val;
                }
            });
            setLevels(extractedLevels);

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
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter uppercase italic text-foreground flex items-center">
                        <Zap className="mr-3 text-primary" fill="currentColor" />
                        {language === 'TR' ? 'Global Tarayıcı' : 'Global Scanner'}
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium">
                        {language === 'TR' 
                            ? 'AI destekli teknik puanlama, haber duyarlılığı ve volatilite analizi.' 
                            : 'AI-powered technical scoring, sentiment, and volatility analysis.'}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {/* Market Selector Tabs */}
                    <div className="flex bg-secondary/30 p-1 rounded-2xl border border-border/50">
                        {markets.map(m => (
                            <button
                                key={m.id}
                                onClick={() => setActiveMarket(m.id)}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    activeMarket === m.id 
                                    ? 'bg-primary text-primary-foreground shadow-lg' 
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {m.icon}
                                <span>{m.label}</span>
                            </button>
                        ))}
                    </div>

                    <button 
                        onClick={fetchScanner} 
                        disabled={loading}
                        className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 px-4 py-2.5 rounded-2xl flex items-center space-x-2 transition-all group active:scale-95"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"} />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            {loading ? (language === 'TR' ? 'Taranıyor...' : 'Scanning...') : (language === 'TR' ? 'Taramayı Başlat' : 'Start Scan')}
                        </span>
                    </button>

                    <div className="relative flex-1 md:w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <input 
                            type="text" 
                            placeholder={language === 'TR' ? "Sembol..." : "Symbol..."}
                            className="w-full bg-secondary/30 border border-border/50 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            {/* Main Scanner Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-secondary/50 border-b border-border/50">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Sembol</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic text-right">Anlık Fiyat</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic text-right">Değişim %</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic text-center">RSI (14)</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic text-center">Volatilite</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-primary italic text-center">AI Puanı</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic text-center">Sinyal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {loading && data.length === 0 ? (
                                Array(10).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="7" className="px-6 py-4"><div className="h-4 bg-secondary/50 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : filteredData.map((item) => (
                                <tr 
                                    key={item.symbol} 
                                    onClick={() => handleRowClick(item)}
                                    className="hover:bg-primary/5 cursor-pointer transition-colors group"
                                >
                                    <td className="px-6 py-4">
                                        <span className="font-black text-sm text-foreground group-hover:text-primary transition-colors">{item.symbol.replace('.IS', '')}</span>
                                        <p className="text-[8px] text-muted-foreground font-bold tracking-widest uppercase">{activeMarket === 'crypto' ? 'Binance' : 'Yahoo Finance'}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-mono font-bold text-sm tracking-tighter">
                                            {activeMarket === 'bist' ? '₺' : '$'}{item.price > 1 ? item.price.toLocaleString(undefined, {minimumFractionDigits: 2}) : item.price.toFixed(6)}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 text-right font-bold text-xs ${item.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`font-mono text-xs font-bold ${item.rsi < 30 ? 'text-emerald-500' : item.rsi > 70 ? 'text-rose-500' : 'text-foreground'}`}>
                                            {item.rsi.toFixed(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`text-[10px] font-bold ${item.volatility > 4 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                                            %{item.volatility.toFixed(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full border-2 font-black text-xs ${
                                            item.aiScore > 70 ? 'border-emerald-500 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' :
                                            item.aiScore > 50 ? 'border-primary text-primary' :
                                            'border-muted-foreground/30 text-muted-foreground'
                                        }`}>
                                            {Math.round(item.aiScore)}
                                        </div>
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
                                        <h3 className="font-black text-xl tracking-tighter uppercase italic">{selectedAsset.symbol.replace('.IS', '')}</h3>
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
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                            <div className="bg-secondary/30 p-4 rounded-2xl border border-border/50">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">RSI</p>
                                                <p className="font-black text-base italic">{selectedAsset.rsi.toFixed(1)}</p>
                                            </div>
                                            <div className="bg-secondary/30 p-4 rounded-2xl border border-border/50">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">AI PUANI</p>
                                                <p className="font-black text-base italic text-primary">{Math.round(selectedAsset.aiScore)}/100</p>
                                            </div>
                                            <div className="bg-secondary/30 p-4 rounded-2xl border border-border/50">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Fiyat</p>
                                                <p className="font-black text-base italic tracking-tighter">${selectedAsset.price}</p>
                                            </div>
                                            <div className="bg-secondary/30 p-4 rounded-2xl border border-border/50">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Volatilite</p>
                                                <p className={`font-black text-base italic`}>%{selectedAsset.volatility.toFixed(2)}</p>
                                            </div>
                                        </div>

                                        {/* NEW: Price Chart with Split Colors (History: Cyan, Prediction: Yellow) */}
                                        {historyData.length > 0 && (
                                            <div className="h-48 w-full mb-6 bg-secondary/10 rounded-3xl border border-border/30 p-4">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={historyData}>
                                                        <defs>
                                                            <linearGradient id="scannerSplit" x1="0" y1="0" x2="1" y2="0">
                                                                <stop offset={((historyData.findLastIndex(d => !d.isPrediction) !== -1 ? historyData.findLastIndex(d => !d.isPrediction) : historyData.length - 6) / historyData.length * 100) + "%"} stopColor="#00f2fe" />
                                                                <stop offset={((historyData.findLastIndex(d => !d.isPrediction) !== -1 ? historyData.findLastIndex(d => !d.isPrediction) : historyData.length - 6) / historyData.length * 100) + "%"} stopColor="#facc15" />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                                        <XAxis dataKey="time" hide={false} height={0} tick={false} axisLine={false} />
                                                        <YAxis hide domain={['auto', 'auto']} />
                                                        <RechartsTooltip 
                                                            contentStyle={{ backgroundColor: '#0c0c0e', border: '1px solid #ffffff10', borderRadius: '16px', fontSize: '10px' }}
                                                            itemStyle={{ color: '#00f2fe' }}
                                                        />
                                                        
                                                        {/* Vertical Separator SQUARELY surely correctly */}
                                                        <ReferenceLine 
                                                            x={historyData.findLastIndex(d => !d.isPrediction) !== -1 ? historyData[historyData.findLastIndex(d => !d.isPrediction)].time : historyData[historyData.length - 6]?.time} 
                                                            stroke="#facc1550" 
                                                            strokeWidth={2} 
                                                            strokeDasharray="4 4"
                                                            label={{ value: 'PROJEKSİYON', position: 'top', fill: '#facc15', fontSize: 8, fontWeight: 'bold' }}
                                                        />

                                                        <Line 
                                                            type="monotone" 
                                                            dataKey="close" 
                                                            stroke="url(#scannerSplit)" 
                                                            strokeWidth={4} 
                                                            dot={false} 
                                                            animationDuration={1500}
                                                        />

                                                        {levels.entry && (
                                                            <ReferenceLine 
                                                                y={levels.entry} 
                                                                stroke="#3b82f6" 
                                                                strokeDasharray="3 3" 
                                                                label={{ position: 'right', value: `Giriş: ${levels.entry.toFixed(2)}`, fill: '#3b82f6', fontSize: 10, fontWeight: 'bold' }} 
                                                            />
                                                        )}
                                                        {levels.tp && (
                                                            <ReferenceLine 
                                                                y={levels.tp} 
                                                                stroke="#10b981" 
                                                                strokeDasharray="3 3" 
                                                                label={{ position: 'right', value: `Hedef: ${levels.tp.toFixed(2)}`, fill: '#10b981', fontSize: 10, fontWeight: 'bold' }} 
                                                            />
                                                        )}
                                                        {levels.sl && (
                                                            <ReferenceLine 
                                                                y={levels.sl} 
                                                                stroke="#ef4444" 
                                                                strokeDasharray="3 3" 
                                                                label={{ position: 'right', value: `Stop: ${levels.sl.toFixed(2)}`, fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} 
                                                            />
                                                        )}
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        )}
                                        
                                        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 mb-4 space-y-3">
                                            {analysis.split('\n').filter(line => line.trim()).map((line, i) => {
                                                const isDirection = line.includes('Yön :');
                                                const isHorizon = line.includes('Vade :');
                                                const isLong = line.toUpperCase().includes('LONG') || line.toUpperCase().includes('AL');
                                                const isShort = line.toUpperCase().includes('SHORT') || line.toUpperCase().includes('SAT');
                                                const isRationale = line.includes('Strateji Notu :');

                                                if (isRationale) {
                                                    return (
                                                        <div key={i} className="pt-2 border-t border-primary/10 mt-2">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-primary/60 block mb-1">Strateji Notu</span>
                                                            <p className="text-sm text-foreground/80 leading-relaxed italic">
                                                                {line.replace('Strateji Notu :', '').trim()}
                                                            </p>
                                                        </div>
                                                    );
                                                }

                                                let textColor = 'text-foreground/90';
                                                if (isDirection) {
                                                    if (isLong) textColor = 'text-emerald-500 font-bold';
                                                    else if (isShort) textColor = 'text-rose-500 font-bold';
                                                } else if (isHorizon) {
                                                    textColor = 'text-amber-500 font-bold';
                                                } else if (line.includes('Karar :')) {
                                                    if (isLong) textColor = 'text-emerald-500 font-bold';
                                                    else if (isShort) textColor = 'text-rose-500 font-bold';
                                                }

                                                return (
                                                    <div key={i} className="flex justify-between items-center text-xs border-b border-primary/5 pb-2 last:border-0">
                                                        <span className="font-black uppercase tracking-widest text-muted-foreground/60 text-[9px]">
                                                            {line.split(':')[0]}
                                                        </span>
                                                        <span className={`font-bold ${textColor}`}>
                                                            {line.split(':').slice(1).join(':').trim()}
                                                        </span>
                                                    </div>
                                                );
                                            })}
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
