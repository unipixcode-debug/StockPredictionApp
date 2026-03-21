import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Globe, TrendingUp, TrendingDown, Activity, Zap, 
    Search, Filter, LayoutGrid, Clock, ShieldCheck, 
    Info, ExternalLink, ChevronRight, BarChart3
} from 'lucide-react';
import api from './api';
import { useLanguage } from './LanguageContext';

const Market360 = () => {
    const { t, language } = useLanguage();
    const [heatmapData, setHeatmapData] = useState([]);
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSector, setSelectedSector] = useState('All');

    useEffect(() => {
        fetchMarket360Data();
    }, []);

    const fetchMarket360Data = async () => {
        setLoading(true);
        try {
            const [heatmapRes, insightsRes] = await Promise.all([
                api.get('/market/heatmap'),
                api.get('/market/insights')
            ]);
            setHeatmapData(heatmapRes);
            setInsights(insightsRes || []);
        } catch (error) {
            console.error('Market 360 fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const sectors = ['All', ...new Set(heatmapData.map(d => d.sector))];

    const filteredData = selectedSector === 'All' 
        ? heatmapData 
        : heatmapData.filter(d => d.sector === selectedSector);

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-5xl font-black tracking-tighter italic uppercase flex items-center gap-4">
                        Market 360 <span className="text-primary animate-pulse"><Globe size={32} /></span>
                    </h1>
                    <p className="text-muted-foreground font-medium tracking-wide">
                        {language === 'TR' 
                            ? 'S&P 500 Sektörel Isı Haritası ve Global AI Analizleri' 
                            : 'S&P 500 Sectoral Heatmap and Global AI Insights'}
                    </p>
                </div>

                <div className="flex items-center gap-3 bg-secondary/30 p-2 rounded-3xl border border-border/50 backdrop-blur-xl">
                    <button className="p-3 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20">
                        <LayoutGrid size={20} />
                    </button>
                    <div className="px-4 py-2 border-l border-border/50">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Market Status</span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
                            <span className="text-xs font-black uppercase tracking-widest text-emerald-500">OPEN</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Heatmap Section */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="glass-card p-4 flex items-center justify-between border-primary/20 bg-primary/5">
                        <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
                            {sectors.map(s => (
                                <button
                                    key={s}
                                    onClick={() => setSelectedSector(s)}
                                    className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                        selectedSector === s 
                                            ? 'bg-primary text-black shadow-lg' 
                                            : 'hover:bg-white/5 text-muted-foreground'
                                    }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 h-[600px]">
                        {loading ? (
                            Array(15).fill(0).map((_, i) => (
                                <div key={i} className="glass-card animate-pulse bg-white/5 border-none" />
                            ))
                        ) : (
                            filteredData.map((stock, i) => (
                                <HeatmapCell key={i} stock={stock} />
                            ))
                        )}
                    </div>
                </div>

                {/* Sidebar: Smart Tracker */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="glass-card p-8 border-cyan-500/20 bg-cyan-500/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Zap size={80} className="text-cyan-500" />
                        </div>
                        
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-400">
                                <ShieldCheck size={22} />
                            </div>
                            <h3 className="text-xl font-black italic tracking-tighter">Smart Tracker</h3>
                        </div>

                        <div className="space-y-4">
                            {insights.length > 0 ? insights.slice(0, 5).map((insight, i) => (
                                <div key={i} className="p-4 rounded-2xl bg-secondary/20 border border-border/50 hover:border-cyan-500/30 transition-all cursor-pointer">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                                            insight.type === 'TRADE_IDEA' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-blue-500/20 text-blue-500'
                                        }`}>
                                            {insight.type}
                                        </span>
                                        <span className="text-[10px] font-bold text-muted-foreground opacity-50">
                                            {new Date(insight.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-sm font-bold leading-snug">{insight.title}</p>
                                    <div className="mt-3 flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase text-cyan-500">{insight.source} AI</span>
                                        <ChevronRight size={14} className="text-muted-foreground" />
                                    </div>
                                </div>
                            )) : (
                                <p className="text-xs text-muted-foreground italic text-center py-10 opacity-50">No recent alerts found.</p>
                            )}
                        </div>

                        <button className="w-full mt-6 py-3 rounded-2xl bg-secondary/50 border border-border/50 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-secondary transition-all">
                            View All Activity
                        </button>
                    </div>

                    {/* Overall Status Card */}
                    <div className="glass-card p-8 bg-linear-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
                         <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                                <BarChart3 size={22} />
                            </div>
                            <h3 className="text-xl font-black italic tracking-tighter">Market Pulse</h3>
                        </div>
                        <p className="text-muted-foreground text-xs leading-relaxed mb-6">
                            Current global sentiment is <span className="text-primary font-bold">STABLE</span> based on AI sentiment analysis of 124 news sources.
                        </p>
                        <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: '68%' }}
                                className="h-full bg-linear-to-r from-indigo-500 to-primary"
                            />
                        </div>
                        <div className="flex justify-between mt-2">
                            <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Fear</span>
                            <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Greed</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const HeatmapCell = ({ stock }) => {
    const change = stock.change || 0;
    const isUp = change >= 0;
    const absChange = Math.abs(change).toFixed(2);
    
    // Calculate intensity based on percentage (max 5% for full color)
    const intensity = Math.min(Math.abs(stock.change) / 3, 1); 
    const bgColor = isUp 
        ? `rgba(16, 185, 129, ${0.1 + intensity * 0.7})` 
        : `rgba(225, 29, 72, ${0.1 + intensity * 0.7})`;

    return (
        <motion.div 
            whileHover={{ scale: 1.05, zIndex: 10 }}
            className={`rounded-2xl border flex flex-col items-center justify-center text-center p-4 transition-all relative overflow-hidden group shadow-2xl`}
            style={{ 
                backgroundColor: bgColor,
                borderColor: isUp ? 'rgba(16, 185, 129, 0.3)' : 'rgba(225, 29, 72, 0.3)'
            }}
        >
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-40 transition-opacity">
                <Info size={12} className="text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter text-white drop-shadow-lg">{stock.symbol}</span>
            <span className="text-[10px] font-bold text-white/70 tracking-widest uppercase mb-2">{stock.sector}</span>
            <span className="text-sm font-black text-white px-2 py-0.5 rounded-lg bg-black/20 backdrop-blur-md">
                {isUp ? '+' : '-'}{absChange}%
            </span>
        </motion.div>
    );
};

export default Market360;
