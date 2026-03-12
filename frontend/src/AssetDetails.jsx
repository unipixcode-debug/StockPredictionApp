import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from './api';

import { 
  ArrowLeft, BarChart2, TrendingUp, TrendingDown, 
  Zap, PieChart, Target, Info, RefreshCw, BarChart3,
  Landmark, Coins, Wallet, ChevronRight
} from 'lucide-react';

const AssetDetails = () => {
    const { assetId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState('1G');

    const assetIcons = {
        'commodities': <Landmark />,
        'crypto': <Coins />,
        'stocks': <BarChart3 />,
        'bonds': <Wallet />
    };

    const fetchAssetData = async () => {
        setLoading(true);
        // In a real app, you'd fetch specific asset data. 
        // For now, we reuse the flow API and filter or use mock.
        try {
            const result = await api.get(`/market/flow?timeframe=${timeframe}`);
            const asset = result.assets.find(a => a.id === assetId);
            setData(asset);
            setLoading(false);
        } catch (error) {
            console.error('Asset detail fetch error:', error);
            // Fallback mock data matching MoneyFlow's mock logic
            const mult = timeframe === '1G' ? 1 : timeframe === '1H' ? 2.5 : 6;
            const mockAssets = {
                'commodities': {
                    id: 'commodities', name: 'EMTİA', value: 18.0, change: -0.15 * mult, color: 'orange', unit: 'T$',
                    subAssets: [
                        { name: 'Altın', value: 14.5, change: 0.2 * mult },
                        { name: 'Petrol', value: 2.1, change: 8.4 * mult }, // Significantly high for contribution demo
                        { name: 'Gümüş', value: 1.4, change: -1.1 * mult },
                        { name: 'Bakır', value: 0.8, change: -5.5 * mult }
                    ]
                },
                'crypto': {
                    id: 'crypto', name: 'KRİPTO', value: 2.6, change: 1.2 * mult, color: 'cyan', unit: 'T$',
                    subAssets: [
                        { name: 'Bitcoin', value: 1.3, change: 1.5 * mult },
                        { name: 'Ethereum', value: 0.4, change: 0.8 * mult },
                        { name: 'Solana', value: 0.15, change: 2.4 * mult }
                    ]
                },
                'stocks': {
                    id: 'stocks', name: 'BORSALAR', value: 110.0, change: 0.8 * mult, color: 'green', unit: 'T$',
                    subAssets: [
                        { name: 'S&P500', value: 45.0, change: 0.8 * mult },
                        { name: 'Nasdaq', value: 20.0, change: 1.2 * mult },
                        { name: 'BIST100', value: 0.35, change: -0.3 * mult }
                    ]
                }
            };
            setData(mockAssets[assetId] || mockAssets['commodities']);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssetData();
    }, [assetId, timeframe]);

    if (loading || !data) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <RefreshCw size={48} className="animate-spin text-primary opacity-20" />
            </div>
        );
    }

    // Calculate Contributions
    // Formula: (SubValue * SubChange) / TotalValue
    // This shows how many percentage points each sub-asset contributes to the total category move
    const subAssetsWithContribution = data.subAssets.map(sub => {
        const contribution = (sub.value * sub.change) / data.value;
        return { ...sub, contribution };
    });

    return (
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-10 pb-20"
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                    <button 
                        onClick={() => navigate('/flow')}
                        className="w-14 h-14 rounded-2xl bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-primary transition-all hover:bg-secondary shadow-inner"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <div className="flex items-center space-x-3 mb-1">
                            <span className={`w-2 h-2 rounded-full ${data.change > 0 ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Varlık Detay Analizi</span>
                        </div>
                        <h1 className="text-5xl font-black tracking-tighter uppercase italic flex items-center space-x-4">
                            <span className={`p-4 rounded-3xl bg-${data.color}-500/10 text-${data.color}-500 scale-75 lg:scale-100`}>
                                {assetIcons[data.id]}
                            </span>
                            <span>{data.name} Kırılımı</span>
                        </h1>
                    </div>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="glass-card p-10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <PieChart size={80} />
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Toplam Pazar Payı</p>
                    <div className="flex items-baseline space-x-3">
                        <span className="text-6xl font-black italic tracking-tighter">${data.value.toFixed(1)}</span>
                        <span className="text-2xl font-black italic opacity-20">{data.unit}</span>
                    </div>
                </div>

                <div className="glass-card p-10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        {data.change > 0 ? <TrendingUp size={80} /> : <TrendingDown size={80} />}
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Kategori Performansı</p>
                    <div className="flex items-baseline space-x-3">
                        <span className={`text-6xl font-black italic tracking-tighter ${data.change > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {data.change > 0 ? '+' : ''}{data.change.toFixed(2)}%
                        </span>
                    </div>
                </div>

                <div className="glass-card p-10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <Zap size={80} />
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">En Büyük Bileşen</p>
                    <div className="flex items-baseline space-x-3">
                        <span className="text-4xl font-black italic tracking-tighter truncate uppercase pr-10">
                            {data.subAssets.sort((a,b) => b.value - a.value)[0].name}
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Breakdown Table */}
            <div className="glass-card overflow-hidden">
                <div className="p-10 border-b border-border flex items-center justify-between bg-white/5">
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter flex items-center space-x-4">
                        <Target size={24} className="text-primary" />
                        <span>Bileşen Bazlı Katkı Analizi</span>
                    </h2>
                    <div className="flex items-center space-x-3 px-4 py-2 bg-background/50 rounded-xl border border-border">
                        <Info size={14} className="text-muted-foreground" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Katkı performansa olan ağırlıklı etkidir</span>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border bg-muted/20">
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Varlık İsmi</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">Piyasa Değeri</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">Bireysel Değişim</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">Kategoriye Katkı</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right mr-4">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {subAssetsWithContribution.map((sub, idx) => (
                                <motion.tr 
                                    key={sub.name}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="hover:bg-secondary/30 transition-colors group"
                                >
                                    <td className="px-10 py-8">
                                        <div className="flex items-center space-x-5">
                                            <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center border border-border group-hover:border-primary/40 transition-all font-black italic shadow-inner">
                                                {sub.name[0]}
                                            </div>
                                            <span className="text-xl font-black italic uppercase tracking-tighter">{sub.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8 text-center">
                                        <span className="text-2xl font-black italic tracking-tighter opacity-70">
                                            {sub.value < 0.1 
                                                ? `$${(sub.value * 1000).toFixed(0)}M` 
                                                : `$${sub.value.toFixed(1)}${data.unit}`}
                                        </span>
                                    </td>
                                    <td className="px-10 py-8 text-center">
                                        <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl font-black text-sm italic ${sub.change > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                            {sub.change > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                            <span>{sub.change > 0 ? '+' : ''}{sub.change.toFixed(2)}%</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8 text-center">
                                        <div className="flex flex-col items-center space-y-2">
                                            <span className={`text-xl font-black italic ${sub.contribution > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {sub.contribution > 0 ? '+' : ''}{sub.contribution.toFixed(3)} Puan
                                            </span>
                                            <div className="w-32 h-1.5 bg-background rounded-full overflow-hidden border border-border">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(Math.abs(sub.contribution) * 200, 100)}%` }}
                                                    className={`h-full ${sub.contribution > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8 text-right pr-4">
                                        <button 
                                            onClick={() => navigate(`/chart/${sub.name}`)}
                                            className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary transition-all active:scale-95 shadow-lg group/nav"
                                        >
                                            <BarChart2 size={20} className="group-hover/nav:scale-110 transition-transform" />
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Analysis Box */}
            <div className="p-10 rounded-[3rem] bg-primary/5 border border-primary/10 relative overflow-hidden">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
                    <div className="space-y-4 max-w-2xl">
                        <h4 className="text-2xl font-black uppercase italic tracking-tighter flex items-center space-x-4">
                            <Zap size={28} className="text-primary" fill="currentColor" />
                            <span>Özet Analiz Bulgusu</span>
                        </h4>
                        <p className="text-muted-foreground text-lg leading-relaxed italic">
                            "{data.name} kategorisi totalde {data.change > 0 ? 'pozitif' : 'negatif'} bir seyir izlerken, 
                            {subAssetsWithContribution.sort((a,b) => b.contribution - a.contribution)[0].name} varlığı kafi oranda {subAssetsWithContribution.sort((a,b) => b.contribution - a.contribution)[0].contribution > 0 ? 'itici güç' : 'bariyer'} oluşturuyor. 
                            Portföy dengesi için katkı puanı düşük olan varlıklar riskli bölgededir."
                        </p>
                    </div>
                    <button className="premium-button px-10 py-6 min-w-[250px]">
                        AI TAHMİNİ AL
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default AssetDetails;
