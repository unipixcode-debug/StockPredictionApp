import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
import { 
    Shield, Target, TrendingUp, Wallet, AlertCircle, 
    ArrowUpRight, ArrowDownLeft, Lock, Star, Zap 
} from 'lucide-react';
import { useLanguage } from './LanguageContext';

const PortfolioOverview = () => {
    const { t, language } = useLanguage();
    
    // Mock data for premium look
    const assetData = [
        { name: 'BTC', value: 45, color: '#f59e0b' },
        { name: 'ETH', value: 25, color: '#6366f1' },
        { name: 'NVDA', value: 20, color: '#10b981' },
        { name: 'XAU', value: 10, color: '#eab308' },
    ];

    const riskData = [
        { subject: 'Volatility', A: 120, fullMark: 150 },
        { subject: 'Liquidity', A: 98, fullMark: 150 },
        { subject: 'Exposure', A: 86, fullMark: 150 },
        { subject: 'Sentiment', A: 99, fullMark: 150 },
        { subject: 'Leverage', A: 85, fullMark: 150 },
        { subject: 'Hedge', A: 65, fullMark: 150 },
    ];

    return (
        <div className="space-y-8 animate-in fade-in zoom-in duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter italic uppercase flex items-center gap-4">
                        Global Portfolio <span className="text-cyan-500"><Wallet size={32} /></span>
                    </h1>
                    <p className="text-muted-foreground font-medium">Real-time cross-asset risk monitoring and allocation analysis.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="px-6 py-3 bg-primary/10 border border-primary/20 rounded-3xl backdrop-blur-md">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-50 block">Total Value</span>
                        <span className="text-xl font-black italic">$142,500.00</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Main Content Area */}
                <div className="xl:col-span-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Asset Allocation Donut */}
                        <div className="glass-card p-10 flex flex-col items-center border-white/10 relative overflow-hidden">
                            <div className="absolute top-0 left-0 p-4 opacity-10">
                                <Target size={40} />
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground mb-8 text-center w-full">Asset Allocation</h3>
                            <div className="h-64 w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={assetData}
                                            innerRadius={70}
                                            outerRadius={90}
                                            paddingAngle={8}
                                            dataKey="value"
                                        >
                                            {assetData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#0c0c0e', border: '1px solid #333', borderRadius: '12px' }}
                                            itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-xs font-black uppercase tracking-widest opacity-40">Diversity</span>
                                    <span className="text-3xl font-black italic">84%</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-8 w-full">
                                {assetData.map((asset, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-secondary/30">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: asset.color }} />
                                            <span className="text-xs font-black">{asset.name}</span>
                                        </div>
                                        <span className="text-xs font-bold opacity-60">{asset.value}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Risk Radar */}
                        <div className="glass-card p-10 flex flex-col items-center border-white/10">
                            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground mb-8 text-center w-full">Risk Profile</h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={riskData}>
                                        <PolarGrid stroke="#333" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#666', fontSize: 10, fontWeight: 'bold' }} />
                                        <Radar
                                            name="Risk"
                                            dataKey="A"
                                            stroke="#ef4444"
                                            fill="#ef4444"
                                            fillOpacity={0.4}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-8 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 w-full">
                                <div className="flex items-center gap-3 text-rose-500 mb-2">
                                    <AlertCircle size={18} />
                                    <span className="text-xs font-black uppercase tracking-widest">High Volatility Alert</span>
                                </div>
                                <p className="text-[10px] text-rose-500/80 leading-relaxed font-medium">
                                    Your exposure to BTC is currently above the 40% safety threshold defined by the Portfolio Guardian.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Holdings Table */}
                    <div className="glass-card p-4 border-white/10">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-border/50">
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-40">Asset</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-40">Market Price</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-40">24h Change</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-40 text-right">Holding Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                                {[
                                    { symbol: 'BTC', price: '$70,042.12', change: '+2.45%', value: '$64,124.00' },
                                    { symbol: 'ETH', price: '$3,842.50', change: '-1.22%', value: '$35,625.00' },
                                    { symbol: 'AAPL', price: '$189.43', change: '+0.15%', value: '$28,500.00' },
                                    { symbol: 'NVDA', price: '$822.79', change: '+5.62%', value: '$14,251.00' },
                                ].map((row, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center font-black text-xs text-primary group-hover:scale-110 transition-transform">{row.symbol[0]}</div>
                                                <span className="font-black italic underline decoration-primary/20">{row.symbol}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 font-bold text-sm">{row.price}</td>
                                        <td className={`p-4 font-black text-xs ${row.change.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            <div className="flex items-center gap-1">
                                                {row.change.startsWith('+') ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                                                {row.change}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right font-black italic text-sm">{row.value}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sidebar: Portfolio Guardian */}
                <div className="xl:col-span-4 space-y-8">
                    <div className="glass-card p-10 border-indigo-500/20 bg-indigo-500/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 blur-sm group-hover:blur-none transition-all duration-700">
                             <Shield size={120} className="text-indigo-500" />
                        </div>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/30">
                                <Lock size={28} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black italic tracking-tighter">Guardian</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#6366f1]">AI Safety Layer</p>
                            </div>
                        </div>

                        <div className="space-y-6 relative z-10">
                            <div className="p-5 rounded-3xl bg-secondary/30 backdrop-blur-xl border border-border/50">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                                        <Star size={16} fill="currentColor" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Efficiency Score</span>
                                </div>
                                <div className="flex items-end justify-between">
                                    <h4 className="text-4xl font-black italic tracking-tight text-white">92.4</h4>
                                    <span className="text-[10px] font-black text-emerald-500 uppercase">+4.2% THIS WEEK</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-widest opacity-40">Guardian Insights</h4>
                                <div className="space-y-3">
                                    <GuardianTip 
                                        icon={<Zap size={14} />} 
                                        text="Optimize exposure: Reducing NVDA by 5% could lower systemic risk by 12%." 
                                    />
                                    <GuardianTip 
                                        icon={<Lock size={14} />} 
                                        text="Hedge opportunity: Gold looks strong for a 2% hedge position today." 
                                    />
                                </div>
                            </div>

                            <button className="w-full premium-button py-4 text-sm group">
                                <span className="flex items-center justify-center gap-3">
                                    <TrendingUp size={18} />
                                    <span>ACTIVATE AUTO-HEDGE</span>
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="glass-card p-8 bg-linear-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
                        <h4 className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-60">Success Probability</h4>
                        <div className="flex items-baseline gap-2">
                             <span className="text-5xl font-black italic">88.5</span>
                             <span className="text-2xl font-black opacity-30">%</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2 font-medium">Based on current market trend and portfolio diversification score.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const GuardianTip = ({ icon, text }) => (
    <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/20 transition-all group">
        <div className="mt-1 text-indigo-400 group-hover:scale-110 transition-transform">{icon}</div>
        <p className="text-xs text-muted-foreground font-medium leading-relaxed italic">"{text}"</p>
    </div>
)

export default PortfolioOverview;
