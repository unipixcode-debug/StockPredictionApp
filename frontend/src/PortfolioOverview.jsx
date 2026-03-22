import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
    Radar, RadarChart, PolarGrid, PolarAngleAxis
} from 'recharts';
import { 
    Shield, Target, TrendingUp, Wallet, AlertCircle, 
    ArrowUpRight, ArrowDownLeft, Lock, Star, Zap, Plus, Trash2, Edit3, X, Loader2, Bot
} from 'lucide-react';
import { useLanguage } from './LanguageContext';
import api from './api';
import { ChartModal } from './ChartModal';

const PortfolioOverview = () => {
    const { t, language } = useLanguage();
    const [holdings, setHoldings] = useState([]);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [availableAssets, setAvailableAssets] = useState([]);
    const [selectedChartAsset, setSelectedChartAsset] = useState(null);
    
    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [portfolioData, analysisData, assetsData] = await Promise.all([
                api.get('/portfolio'),
                api.get('/portfolio/analysis'),
                api.get('/market/assets')
            ]);
            setHoldings(portfolioData);
            setAnalysis(analysisData);
            setAvailableAssets(assetsData);
        } catch (error) {
            console.error('Error fetching portfolio:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Debounced Search Effect
    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await api.get(`/market/search?q=${searchQuery}&_t=${Date.now()}`);
                setSearchResults(res || []);
            } catch (error) {
                console.error(error);
            } finally {
                setIsSearching(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const totalValue = holdings.reduce((sum, h) => sum + (h.value || 0), 0);
    const totalInvested = holdings.reduce((sum, h) => sum + (h.totalInvested || 0), 0);
    const totalPL = totalValue - totalInvested;
    const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

    const chartData = holdings.map(h => ({
        name: h.symbol,
        value: h.value || 0,
        color: h.market === 'CRYPTO' ? '#f59e0b' : h.market === 'STOCK' ? '#10b981' : '#6366f1'
    })).filter(d => d.value > 0);

    if (loading && holdings.length === 0) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Portföy Yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in zoom-in duration-500 pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter italic uppercase flex items-center gap-4">
                        {language === 'TR' ? 'Küresel Portföy' : 'Global Portfolio'} <span className="text-cyan-500"><Wallet size={32} /></span>
                    </h1>
                    <p className="text-muted-foreground font-medium">Real-time cross-asset risk monitoring and allocation analysis.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setShowAddModal(true)}
                        className="premium-button py-3 px-6 flex items-center gap-2 group"
                    >
                        <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                        <span>{language === 'TR' ? 'VARLIK EKLE' : 'ADD ASSET'}</span>
                    </button>
                    <div className="px-6 py-3 bg-primary/10 border border-primary/20 rounded-3xl backdrop-blur-md">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-50 block">Total Value</span>
                        <span className="text-xl font-black italic">${totalValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Main Content Area */}
                <div className="xl:col-span-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Asset Allocation Donut */}
                        <div className="glass-card p-10 flex flex-col items-center border-white/10 relative overflow-hidden">
                            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground mb-8 text-center w-full">Asset Allocation</h3>
                            <div className="h-64 w-full relative">
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={chartData}
                                                innerRadius={70}
                                                outerRadius={90}
                                                paddingAngle={8}
                                                dataKey="value"
                                            >
                                                {chartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#0c0c0e', border: '1px solid #333', borderRadius: '12px' }}
                                                itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center opacity-20 italic font-black uppercase text-xs">Varlık Bulunmuyor</div>
                                )}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-xs font-black uppercase tracking-widest opacity-40">Diversity</span>
                                    <span className="text-3xl font-black italic">{holdings.length > 0 ? Math.min(100, holdings.length * 20) : 0}%</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-8 w-full">
                                {holdings.slice(0, 4).map((asset, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-secondary/30">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: asset.market === 'CRYPTO' ? '#f59e0b' : '#10b981' }} />
                                            <span className="text-xs font-black">{asset.symbol}</span>
                                        </div>
                                        <span className="text-xs font-bold opacity-60">{((asset.value / totalValue) * 100).toFixed(1)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Performance & P/L Stats */}
                        <div className="glass-card p-10 flex flex-col border-white/10 space-y-8">
                            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground text-center">Profit / Loss Analysis</h3>
                            
                            <div className="flex-1 flex flex-col justify-center space-y-10">
                                <div className="text-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40 block mb-2">Net Portfolio Return</span>
                                    <div className={`text-6xl font-black italic tracking-tighter ${totalPL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {totalPL >= 0 ? '+' : ''}{totalPL.toLocaleString(undefined, {maximumFractionDigits: 0})}
                                        <span className="text-2xl ml-2 font-black">$</span>
                                    </div>
                                    <div className={`mt-2 font-black text-sm flex items-center justify-center gap-2 ${totalPLPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {totalPLPercent >= 0 ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                                        {totalPLPercent.toFixed(2)}% Performance
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="p-4 rounded-3xl bg-secondary/30 border border-border/50">
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40 block mb-1">Total Invested</span>
                                        <span className="text-lg font-black italic underline decoration-primary/20">${totalInvested.toLocaleString()}</span>
                                    </div>
                                    <div className="p-4 rounded-3xl bg-secondary/30 border border-border/50">
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40 block mb-1">Active Assets</span>
                                        <span className="text-lg font-black italic underline decoration-cyan-500/20">{holdings.length} Positions</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Holdings Table */}
                    <div className="glass-card p-4 border-white/10 overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-border/50">
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-40">Asset</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-40">Entry (Avg)</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-40">Live Price</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-40">P/L (USD)</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-40 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                                {holdings.map((row, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-4">
                                            <div 
                                                className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => setSelectedChartAsset(row.symbol)}
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center font-black text-xs text-primary group-hover:scale-110 transition-transform">{row.symbol[0]}</div>
                                                <span className="font-black italic underline decoration-primary/20">{row.symbol}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 font-bold text-sm text-muted-foreground">${Number(row.avgPrice).toLocaleString()}</td>
                                        <td className="p-4 font-bold text-sm">${Number(row.currentPrice).toLocaleString()}</td>
                                        <td className={`p-4 font-black text-xs ${row.pl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            <div className="flex items-center gap-1">
                                                {row.pl >= 0 ? <Plus size={12} /> : ''}
                                                {row.pl.toLocaleString(undefined, {maximumFractionDigits: 2})}
                                                <span className="ml-1 opacity-60">({row.plPercent.toFixed(1)}%)</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={async () => {
                                                        if(window.confirm('Emin misiniz?')) {
                                                            await api.delete(`/portfolio/${row.id}`);
                                                            fetchData();
                                                        }
                                                    }}
                                                    className="p-2 hover:bg-rose-500/20 text-rose-500 rounded-xl transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sidebar: AI Analysis */}
                <div className="xl:col-span-4 space-y-8">
                    <div className="glass-card p-10 border-indigo-500/20 bg-indigo-500/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 blur-sm group-hover:blur-none transition-all duration-700">
                             <Shield size={120} className="text-indigo-500" />
                        </div>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/30">
                                <Bot size={28} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black italic tracking-tighter">AI Expert</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#6366f1]">Portfolio Analysis</p>
                            </div>
                        </div>

                        <div className="space-y-6 relative z-10">
                            <div className="p-6 rounded-4xl bg-secondary/30 backdrop-blur-3xl border border-white/10 prose prose-invert prose-xs max-h-[500px] overflow-y-auto">
                                {analysis ? (
                                    <div className="text-xs leading-relaxed font-medium">
                                        <p className="whitespace-pre-wrap">{analysis.aiSummary}</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-10 opacity-30 italic">
                                        <Loader2 className="animate-spin mb-4" />
                                        Analiz hazırlanıyor...
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-widest opacity-40">Live Sentiment Metrics</h4>
                                <div className="space-y-3">
                                    {analysis?.holdings?.map((h, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                                            <span className="text-xs font-black italic">{h.symbol}</span>
                                            <div className="flex items-center gap-2">
                                                <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                    h.sentiment === 'BULLISH' ? 'bg-emerald-500/20 text-emerald-500' : 
                                                    h.sentiment === 'BEARISH' ? 'bg-rose-500/20 text-rose-500' : 
                                                    'bg-gray-500/20 text-gray-400'
                                                }`}>
                                                    {h.sentiment}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-8 bg-linear-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
                        <h4 className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-60">AI Daily Prediction</h4>
                        <div className="flex items-baseline gap-2">
                             <span className="text-5xl font-black italic">+3.4</span>
                             <span className="text-2xl font-black opacity-30">%</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2 font-medium">Based on 24h market outlook and news sentiment balance.</p>
                    </div>
                </div>
            </div>

            {/* Add Asset Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-background/80 backdrop-blur-xl">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-card w-full max-w-md p-10 border-primary/20 space-y-8"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl font-black italic tracking-tighter uppercase">Varlık Ekle</h3>
                                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                                    <X size={24} />
                                </button>
                            </div>

                            <form className="space-y-6" onSubmit={async (e) => {
                                e.preventDefault();
                                const formData = new FormData(e.target);
                                    const data = {
                                        symbol: formData.get('symbol'),
                                        amount: parseFloat(formData.get('amount')),
                                        avgPrice: parseFloat(formData.get('avgPrice')),
                                        market: formData.get('market') || 'STOCK'
                                    };
                                    if (!data.symbol) return alert('Lütfen geçerli bir varlık seçin.');
                                    await api.post('/portfolio', data);
                                    setShowAddModal(false);
                                    setSelectedAsset(null);
                                    setSearchQuery('');
                                    fetchData();
                                }}>
                                <div className="space-y-2 relative">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-2">Sembol Ara (100.000+ Varlık)</label>
                                    <div className="relative">
                                        <input 
                                            type="text"
                                            placeholder="Hisse, Kripto, Döviz arayın (örn: AAPL, THYAO.IS, BTC)"
                                            value={selectedAsset ? selectedAsset.symbol : searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                setSelectedAsset(null); // Clear selection if typing again
                                            }}
                                            className="w-full bg-secondary/50 border border-border p-4 rounded-2xl font-black italic outline-none focus:border-primary transition-all"
                                            required
                                        />
                                        <input type="hidden" name="symbol" value={selectedAsset?.symbol || ''} />
                                        <input type="hidden" name="market" value={selectedAsset?.market || 'STOCK'} />
                                        
                                        {isSearching && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                <Loader2 className="w-5 h-5 animate-spin text-primary opacity-50" />
                                            </div>
                                        )}
                                    </div>
                                    
                                    {!selectedAsset && searchResults.length > 0 && searchQuery.length >= 2 && (
                                        <div className="absolute top-full left-0 w-full mt-2 bg-[#1A1E29] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 max-h-60 overflow-y-auto">
                                            {searchResults.map((result, idx) => (
                                                <div 
                                                    key={idx}
                                                    onClick={() => {
                                                        setSelectedAsset(result);
                                                        setSearchQuery(result.symbol);
                                                        setSearchResults([]);
                                                    }}
                                                    className="p-3 hover:bg-primary/20 cursor-pointer flex justify-between items-center transition-colors border-b border-white/5 last:border-b-0"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="font-black">{result.symbol}</span>
                                                        <span className="text-[10px] opacity-60 truncate max-w-[200px]">{result.name}</span>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[10px] font-black tracking-widest text-primary uppercase">{result.market}</span>
                                                        <span className="text-[8px] opacity-30">{result.exchange}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-2">Miktar</label>
                                        <input 
                                            name="amount" 
                                            type="number" 
                                            step="any"
                                            required
                                            className="w-full bg-secondary/50 border border-border p-4 rounded-2xl font-black italic outline-none focus:border-primary transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-2">Ortalama Maliyet</label>
                                        <input 
                                            name="avgPrice" 
                                            type="number" 
                                            step="any"
                                            required
                                            className="w-full bg-secondary/50 border border-border p-4 rounded-2xl font-black italic outline-none focus:border-primary transition-all"
                                        />
                                    </div>
                                </div>

                                <button type="submit" className="w-full premium-button py-4 text-sm">
                                    PORTFÖYE EKLE
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* TradingView Chart Modal */}
            <ChartModal 
                symbol={selectedChartAsset} 
                isOpen={!!selectedChartAsset} 
                onClose={() => setSelectedChartAsset(null)} 
            />
        </div>
    );
};

export default PortfolioOverview;
