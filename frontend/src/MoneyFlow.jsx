import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from './api';
import { 
  ArrowRight, TrendingUp, TrendingDown, Info, 
  ChevronRight, ChevronDown, RefreshCw, BarChart2, 
  Zap, Wallet, Landmark, BarChart3, Globe2, Coins, HelpCircle, X, Shield, Activity
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend 
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from './LanguageContext';
import { useAuth } from './AuthContext';

const FlowArrow = ({ fromPos, toPos, color }) => {
    return (
        <motion.div 
            style={{ 
                position: 'absolute',
                top: `${(fromPos.y + toPos.y) / 2}%`,
                left: `${(fromPos.x + toPos.x) / 2}%`,
                transform: `translate(-50%, -50%) rotate(${Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x) * 180 / Math.PI}deg)`,
                zIndex: 0
            }}
            className="flex items-center"
        >
            <motion.div 
                animate={{ x: [-30, 30], opacity: [0, 1, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className={`h-0.5 rounded-full ${color === 'emerald' ? 'bg-emerald-500/50 shadow-[0_0_10px_#10b981]' : 'bg-rose-500/50 shadow-[0_0_10px_#f43f5e]'}`}
                style={{ width: '80px' }}
            />
        </motion.div>
    );
};

const MoneyFlow = () => {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState('1G');
    const [expandedAsset, setExpandedAsset] = useState(null);
    const navigate = useNavigate();
    const { t, language } = useLanguage();

    const nodePositions = [
        { x: 50, y: 15 },  // Top (Commodities)
        { x: 88, y: 48 },  // Right (Crypto)
        { x: 72, y: 88 },  // Bottom Right (Stocks)
        { x: 28, y: 88 },  // Bottom Left (Bonds)
        { x: 12, y: 48 },  // Left (Fiat)
    ];

    const COLORS = ['#f59e0b', '#06b6d4', '#10b981', '#6366f1', '#f43f5e'];

    const fetchData = async () => {
        if (!(user?.moneyFlowSubscribed || user?.role === 'admin' || user?.role === 'developer')) {
            setLoading(false); return;
        }
        setLoading(true);
        try {
            const result = await api.get(`/market/flow?timeframe=${timeframe}`);
            setData(result);
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [timeframe, user?.moneyFlowSubscribed]);

    if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><RefreshCw className="animate-spin text-primary w-12 h-12" /></div>;

    const pieData = data?.assets?.map(a => ({ name: a.name, value: a.value })) || [];

    return (
        <div className="space-y-12 pb-20">
            <header className="flex justify-between items-center px-4">
                <div>
                    <h1 className="text-4xl font-black italic uppercase tracking-tighter">{t('MoneyFlowTitle') || 'Küresel Likidite PENTAGONU'}</h1>
                    <p className="text-muted-foreground text-sm font-medium">5 Ana Varlık Sınıfı Arasındaki Devir Hızı ve Rotasyon</p>
                </div>
                <div className="flex bg-secondary/30 p-1.5 rounded-2xl border border-border backdrop-blur-md">
                    {['1S', '1G', '1H', '1A'].map(tf => (
                        <button key={tf} onClick={() => setTimeframe(tf)} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${timeframe === tf ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}>{tf}</button>
                    ))}
                </div>
            </header>

            {/* Pentagon Visualization Container */}
            <div className="relative min-h-[850px] w-full flex items-center justify-center overflow-visible bg-dot-white/[0.03]">
                {/* Visual Pentagon Shape Overlay */}
                <svg className="absolute w-full h-full pointer-events-none opacity-10" viewBox="0 0 100 100">
                    <polygon points="50,15 88,48 72,88 28,88 12,48" fill="none" stroke="currentColor" strokeWidth="0.2" />
                </svg>

                {/* Dynamic Flow Arrows (Logic: Flows from Underperforming to Outperforming) */}
                {data?.assets?.map((asset, i) => {
                    const nextIndex = (i + 1) % data.assets.length;
                    const from = nodePositions[i];
                    const to = nodePositions[nextIndex];
                    const diff = data.assets[nextIndex].change - asset.change;
                    return <FlowArrow key={`arr-${i}`} fromPos={from} toPos={to} color={diff > 0 ? 'emerald' : 'rose'} />;
                })}

                {/* Pentagon Nodes (Asset Boxes) */}
                {data?.assets?.map((asset, i) => (
                    <motion.div 
                        key={asset.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        style={{ 
                            position: 'absolute',
                            top: `${nodePositions[i].y}%`,
                            left: `${nodePositions[i].x}%`,
                            transform: 'translate(-50%, -50%)',
                            zIndex: 10
                        }}
                        className={`w-72 glass-card p-7 border-2 transition-all hover:scale-105 hover:shadow-2xl cursor-default
                            ${asset.color === 'orange' ? 'border-orange-500/40 bg-orange-500/5' : 
                              asset.color === 'cyan' ? 'border-cyan-500/40 bg-cyan-500/5' : 
                              asset.color === 'green' ? 'border-green-500/40 bg-green-500/5' : 
                              asset.color === 'indigo' ? 'border-indigo-500/40 bg-indigo-500/5' : 'border-rose-500/40 bg-rose-500/5'}
                        `}
                    >
                        <div className="flex justify-between items-start mb-5">
                            <h3 className="font-black italic text-2xl uppercase tracking-tighter opacity-90">{asset.name}</h3>
                            <div className={`p-2.5 rounded-xl ${asset.change > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                {asset.change > 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                            </div>
                        </div>
                        <div className="mb-6 space-y-1">
                            <div className="text-4xl font-black italic tracking-tighter leading-none">{asset.value.toFixed(1)} <span className="text-sm opacity-30 font-bold ml-1">T$</span></div>
                            <div className={`text-xl font-black italic flex items-center space-x-2 ${asset.change > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                <span>{asset.change > 0 ? '+' : ''}{asset.change.toFixed(2)}%</span>
                                <span className="text-[10px] uppercase opacity-40 font-bold tracking-widest">{t('Change')}</span>
                            </div>
                        </div>
                        <button 
                            onClick={() => setExpandedAsset(asset.id)}
                            className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-[11px] font-black uppercase tracking-widest border border-white/10 transition-all flex items-center justify-center space-x-2 group"
                        >
                            <span>Detayları İncele</span>
                            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </motion.div>
                ))}

                {/* Center Core */}
                <div className="absolute w-48 h-48 flex flex-col items-center justify-center text-center pointer-events-none">
                    <div className="relative">
                        <Activity className="text-primary w-12 h-12 animate-pulse mb-3" />
                        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.3em] text-foreground leading-tight">GLOBAL<br/>ROTASYON</span>
                </div>
            </div>

            {/* Bottom Analysis & Pie Chart Section */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 px-4">
                <div className="glass-card p-10 flex flex-col justify-center">
                    <h2 className="text-3xl font-black italic uppercase mb-6 flex items-center space-x-4">
                        <BarChart2 className="text-primary" />
                        <span>Portföy Büyüklük Dağılımı</span>
                    </h2>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={140}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip 
                                    contentStyle={{ backgroundColor: '#121214', border: '1px solid #27272a', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: '900', letterSpacing: '0.1em' }}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-card p-10 flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Zap size={100} fill="currentColor" className="text-primary" />
                    </div>
                    <h2 className="text-3xl font-black italic uppercase mb-8 flex items-center space-x-4">
                        <Shield className="text-primary" />
                        <span>Makro Strateji Özeti</span>
                    </h2>
                    <div className="space-y-6 relative z-10">
                         <p className="text-xl font-medium italic leading-relaxed text-foreground/80">
                            "Mevcut dairesel akış incelendiğinde, likiditenin en güçlü olduğu sınıf 
                            <span className="text-primary font-black mx-2 italic uppercase">
                                {data?.assets?.sort((a,b) => b.change - a.change)[0].name}
                            </span> 
                            olarak öne çıkıyor. Pasta grafikteki pay dağılımı, Bonds ve Stocks arasındaki devasa büyüklük farkını teyit ederken, 
                            Crypto sınıfının 'yüksek devir hızı' ile sisteme enerji enjekte ettiği görülmektedir."
                         </p>
                         <div className="p-6 bg-primary/10 border border-primary/20 rounded-3xl">
                            <div className="flex items-center space-x-2 mb-2">
                                <Activity size={16} className="text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Operasyonel Odak</span>
                            </div>
                            <p className="text-sm font-bold text-muted-foreground italic">
                                Sermaye korunumu için Tahvil (Bonds) oranını pastadaki %'ye göre dengelemeli, Crypto'daki rotasyon hızını ise getiri motoru olarak kullanmalısınız.
                            </p>
                         </div>
                    </div>
                </div>
            </section>

            {/* Top 100 Modal */}
            <AnimatePresence>
                {expandedAsset && (
                    <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl px-4">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 30 }} 
                            animate={{ scale: 1, opacity: 1, y: 0 }} 
                            exit={{ scale: 0.9, opacity: 0, y: 30 }}
                            className="bg-[#0c0c0e] border border-white/10 w-full max-w-6xl max-h-[85vh] overflow-hidden rounded-[4rem] shadow-4xl relative"
                        >
                            <button 
                                onClick={() => setExpandedAsset(null)} 
                                className="absolute top-10 right-10 w-14 h-14 bg-secondary/50 hover:bg-secondary rounded-2xl flex items-center justify-center transition-all"
                            >
                                <X size={28}/>
                            </button>

                            <div className="p-12 md:p-16 h-full flex flex-col">
                                <div className="mb-12">
                                    <h2 className="text-5xl font-black italic uppercase tracking-tighter mb-4">
                                        {data.assets.find(a => a.id === expandedAsset).name}
                                    </h2>
                                    <div className="flex items-center space-x-6">
                                        <div className="px-6 py-2 bg-primary/10 border border-primary/20 rounded-full text-primary text-xs font-black uppercase tracking-widest">EN BÜYÜK 100 VARLIK</div>
                                        <div className="text-muted-foreground text-sm font-medium">Toplam değer içindeki pay ve 24 saatlik değişimler</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-y-auto pr-6 custom-scrollbar flex-1 pb-10">
                                    {data.assets.find(a => a.id === expandedAsset).subAssets.map((sub, idx) => (
                                        <motion.div 
                                            key={idx} 
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: (idx % 20) * 0.02 }}
                                            className={`p-5 rounded-3xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 transition-all flex justify-between items-center group cursor-default ${sub.isOther ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/20' : ''}`}
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black italic uppercase tracking-tight group-hover:text-primary transition-colors">{sub.name}</span>
                                                <span className="text-[10px] opacity-30 font-bold uppercase tracking-widest">{sub.value?.toFixed(2)} T$</span>
                                            </div>
                                            <div className={`px-3 py-1 rounded-xl text-xs font-black italic ${sub.change >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                {sub.change > 0 ? '+' : ''}{sub.change?.toFixed(2)}%
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MoneyFlow;
