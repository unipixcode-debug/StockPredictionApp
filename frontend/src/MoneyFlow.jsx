import React, { useState, useEffect, useMemo } from 'react';
console.log("Hotfix for MoneyFlow crash v1");
import { motion, AnimatePresence } from 'framer-motion';
import api from './api';
import { 
  ArrowRight, TrendingUp, TrendingDown, Info, 
  ChevronRight, ChevronDown, RefreshCw, BarChart2, 
  Zap, Wallet, Landmark, BarChart3, Globe2, Coins, HelpCircle, X, Shield, Activity, Gem
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend 
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from './LanguageContext';
import { useAuth } from './AuthContext';

// --- Components ---

const FlowLine = ({ from, to, value, change }) => {
    const isPositive = change >= 0;
    const color = isPositive ? '#10b981' : '#f43f5e';
    
    // Inbound: from bubble to center (Red)
    // Outbound: from center to bubble (Green)
    const start = isPositive ? to : from; 
    const end = isPositive ? from : to;

    return (
        <svg style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, pointerEvents: 'none', zIndex: 0 }}>
            {/* Base line */}
            <line 
                x1={`${from.x}%`} y1={`${from.y}%`} 
                x2={`${to.x}%`} y2={`${to.y}%`} 
                stroke={color} 
                strokeWidth="1" 
                strokeOpacity="0.3"
                strokeDasharray="4 4"
            />
            {/* Animated Flow Particle */}
            <motion.circle
                r="3"
                fill={color}
                initial={{ opacity: 0 }}
                animate={{ 
                    cx: [`${start.x}%`, `${end.x}%`], 
                    cy: [`${start.y}%`, `${end.y}%`],
                    opacity: [0, 1, 1, 0]
                }}
                transition={{ 
                    duration: 3, 
                    repeat: Infinity, 
                    ease: "linear",
                    delay: Math.random() * 2
                }}
                style={{ filter: `blur(1px) drop-shadow(0 0 5px ${color})` }}
            />
        </svg>
    );
};

const MoneyFlow = () => {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState('1G');
    const [expandedAsset, setExpandedAsset] = useState(null);
    const { t, language } = useLanguage();

    const centerPos = { x: 50, y: 58 };
    const nodePositions = useMemo(() => [
        { x: 73, y: 32 },     // EMTİA
        { x: 45, y: 3 },      // KRİPTO
        { x: 22, y: 75 },     // HİSSE
        { x: 14, y: 30 },     // TAHVİL
        { x: 64, y: 75 },     // NAKİT
    ], []);

    const rayEndpoints = useMemo(() => {
        const vertices = [
            { x: 76.6, y: 44.3 }, // EMTİA
            { x: 53.0, y: 28.0 }, // KRİPTO
            { x: 33.6, y: 75.6 }, // HİSSE
            { x: 23.4, y: 44.3 }, // TAHVİL
            { x: 66.4, y: 75.6 }, // NAKİT
        ];
        return vertices.map(v => ({
            x: centerPos.x + (v.x - centerPos.x) * 1.25,
            y: centerPos.y + (v.y - centerPos.y) * 1.25
        }));
    }, [centerPos]);

    const computedLabelPositions = useMemo(() => {
        return rayEndpoints.map(ray => ({
            x: centerPos.x + (ray.x - centerPos.x) * 0.55,
            y: centerPos.y + (ray.y - centerPos.y) * 0.55
        }));
    }, [rayEndpoints, centerPos]);

    const getAssetIcon = (id) => {
        const props = { size: 24, className: "text-primary/70 mb-2 group-hover:text-primary transition-colors" };
        switch (id) {
            case 'crypto': return <Coins {...props} />;
            case 'commodities': return <Gem {...props} />;
            case 'stocks': return <TrendingUp {...props} />;
            case 'bonds': return <Landmark {...props} />;
            default: return <Wallet {...props} />;
        }
    };

    const COLORS = ['#f59e0b', '#06b6d4', '#10b981', '#6366f1', '#f43f5e'];

    const formatValue = (val) => {
        if (Math.abs(val) >= 1) return val.toFixed(1) + ' T$';
        if (Math.abs(val) >= 0.001) return (val * 1000).toFixed(0) + ' B$';
        return (val * 1000000).toFixed(0) + ' M$';
    };

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

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <RefreshCw className="animate-spin text-primary w-12 h-12" />
            <span className="text-xs font-black uppercase tracking-widest opacity-40 italic">Likidite Verileri Yükleniyor...</span>
        </div>
    );

    const pieData = data?.assets?.map(a => ({ name: a.name, value: a.value })) || [];

    return (
        <div className="space-y-12 pb-20 select-none">
            <header className="flex justify-between items-center px-4">
                <div>
                    <h1 className="text-4xl font-black italic uppercase tracking-tighter">{t('MoneyFlowTitle') || 'Küresel Likidite PENTAGONU'}</h1>
                    <p className="text-muted-foreground text-sm font-medium">Beşgen Üzerinde Likidite Akışı ve Varlık Rotasyonu</p>
                </div>
                <div className="flex bg-secondary/30 p-1.5 rounded-2xl border border-border backdrop-blur-md">
                    {['1S', '1G', '1H', '1A'].map(tf => (
                        <button key={tf} onClick={() => setTimeframe(tf)} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${timeframe === tf ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}>{tf}</button>
                    ))}
                </div>
            </header>

            {/* Pentagon Visualization Container */}
            <div className="relative min-h-[800px] w-full flex items-center justify-center overflow-visible bg-dot-white/[0.03]">
                {/* Visual Pentagon Frame */}
                <svg className="absolute w-full h-full pointer-events-none opacity-5" viewBox="0 0 100 100">
                    <polygon points="53,28 76.6,44.3 66.4,75.6 33.6,75.6 23.4,44.3" fill="none" stroke="currentColor" strokeWidth="0.1" />
                </svg>

                {/* Flow Lines to Center */}
                {data?.assets?.map((asset, i) => (
                    <FlowLine 
                        key={`flow-${i}`} 
                        from={rayEndpoints[i]} 
                        to={centerPos} 
                        value={asset.value} 
                        change={asset.change} 
                    />
                ))}

                {/* Center Core (Bubbling Source) */}
                <div className="absolute w-64 h-64 flex flex-col items-center justify-center text-center z-20" style={{ top: `${centerPos.y}%`, left: `${centerPos.x}%`, transform: 'translate(-50%, -50%)' }}>
                    <div className="relative group">
                        <motion.div 
                            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 4, repeat: Infinity }}
                            className="w-24 h-24 bg-primary/10 rounded-full border border-primary/30 flex items-center justify-center backdrop-blur-xl relative z-10"
                        >
                            <Activity className="text-primary w-10 h-10 animate-pulse" />
                        </motion.div>
                        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 opacity-50" />
                        <div className="absolute -inset-4 border border-primary/10 rounded-full animate-ping opacity-20" />
                    </div>
                    <div className="mt-6">
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground opacity-60">LİKİDİTE<br/>MERKEZİ</span>
                    </div>
                </div>

                {/* Asset Bubbles */}
                {data?.assets?.map((asset, i) => (
                    <React.Fragment key={asset.id}>
                        {/* Flow Label on Line (moved outside bubble div for absolute positioning) */}
                        <div 
                            className={`absolute font-black italic text-[10px] whitespace-nowrap transition-opacity z-35
                            ${asset.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
                            style={{
                                top: `${computedLabelPositions[i].y}%`,
                                left: `${computedLabelPositions[i].x}%`,
                                transform: 'translate(-50%, -50%)',
                            }}
                        >
                            {asset.change > 0 ? 'INFLOW' : 'OUTFLOW'} {formatValue(Math.abs(asset.value * (asset.change / 100)))}
                        </div>

                        <motion.div 
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1, type: 'spring' }}
                            style={{ 
                                position: 'absolute',
                                top: `${nodePositions[i].y}%`,
                                left: `${nodePositions[i].x}%`,
                                transform: 'translate(-50%, -50%)',
                                zIndex: 30
                            }}
                            className="group"
                        >

                        {/* Bubble Node */}
                        <div 
                            onClick={() => setExpandedAsset(asset.id)}
                            className={`
                                relative w-48 h-48 rounded-full flex flex-col items-center justify-center cursor-pointer 
                                transition-all duration-500 border-2 hover:scale-110
                                glass-card overflow-hidden
                                ${asset.change >= 0 ? 'border-emerald-500/30' : 'border-rose-500/30'}
                            `}
                        >
                            <div className={`absolute inset-0 opacity-10 ${asset.change >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            
                            {/* Inner Content */}
                            <div className="relative z-10 text-center flex flex-col items-center">
                                {getAssetIcon(asset.id)}
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">
                                    {asset.id === 'crypto' ? 'KRİPTO' : 
                                     asset.id === 'commodities' ? 'EMTİA' : 
                                     asset.id === 'stocks' ? 'HİSSE' : 
                                     asset.id === 'bonds' ? 'TAHVİL' : 'NAKİT'}
                                </span>
                                <div className="text-3xl font-black italic tracking-tighter mb-1">{formatValue(asset.value)}</div>
                                <div className={`flex items-center space-x-1 text-xs font-black italic ${asset.change > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {asset.change > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                    <span>{asset.change > 0 ? '+' : ''}{asset.change.toFixed(2)}%</span>
                                </div>
                            </div>

                            {/* Hover Details Button */}
                            <div className="absolute bottom-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ChevronDown size={16} className="text-white animate-bounce" />
                            </div>
                        </div>
                    </motion.div>
                </React.Fragment>
            ))}
            </div>

            {/* Analysis Section */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 px-4">
                <div className="glass-card p-10">
                    <h2 className="text-2xl font-black italic uppercase mb-8 flex items-center space-x-4">
                        <BarChart2 className="text-primary" />
                        <span>Büyüklük Dağılımı</span>
                    </h2>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%" cy="50%"
                                    innerRadius={70} outerRadius={110}
                                    paddingAngle={8}
                                    dataKey="value" stroke="none"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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

                <div className="glass-card p-10 flex flex-col justify-center relative overflow-hidden text-center lg:text-left">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Zap size={120} fill="currentColor" className="text-primary" />
                    </div>
                    <div className="relative z-10 space-y-6">
                        <h2 className="text-3xl font-black italic uppercase tracking-tighter text-primary">MAKRO STRATEJİ</h2>
                        <p className="text-xl font-medium italic leading-relaxed text-foreground/80">
                            "Mevcut dairesel akış incelendiğinde, likiditenin en güçlü olduğu sınıf 
                            <span className="text-emerald-500 font-black mx-2 italic uppercase">
                                {data?.assets?.length > 0 ? data.assets.slice().sort((a,b) => b.change - a.change)[0].name : '...'}
                            </span> 
                            olarak öne çıkıyor. Beşgen üzerindeki akış yönleri, sermayenin güvenli limanlardan getiri odaklı varlıklara kaydığını teyit ediyor."
                        </p>
                        <div className="inline-flex items-center space-x-3 px-6 py-3 bg-primary/10 border border-primary/20 rounded-2xl text-xs font-black uppercase tracking-widest text-primary italic">
                            <Activity size={16} />
                            <span>Sinyal: {data?.assets?.length > 0 ? (data.assets.slice().sort((a,b) => b.change - a.change)[0].name === 'Crypto' ? 'Agresif Risk-On' : 'Temkinli Bekleyiş') : 'Analiz Ediliyor...'}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Asset Details Modal */}
            <AnimatePresence>
                {expandedAsset && (
                    <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#0c0c0e] border border-white/10 w-full max-w-6xl max-h-[85vh] overflow-hidden rounded-[4rem] shadow-4xl relative"
                        >
                            <button onClick={() => setExpandedAsset(null)} className="absolute top-10 right-10 w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center transition-all z-50"><X size={24}/></button>

                            <div className="p-12 md:p-16 h-full flex flex-col">
                                <div className="mb-12">
                                    <h2 className="text-6xl font-black italic uppercase tracking-tighter mb-4 text-primary">
                                        {data.assets.find(a => a.id === expandedAsset).name}
                                    </h2>
                                    <p className="text-muted-foreground font-bold tracking-widest uppercase text-xs opacity-50">Sınıfın İçindeki En Büyük 100 Varlık ve Likidite Dağılımı</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-y-auto pr-6 custom-scrollbar flex-1 pb-10">
                                    {data.assets.find(a => a.id === expandedAsset).subAssets.map((sub, idx) => (
                                        <div key={idx} className={`p-6 rounded-3xl border border-white/5 bg-white/3 flex justify-between items-center group ${sub.isOther ? 'bg-primary/5 border-primary/20' : ''}`}>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black italic uppercase tracking-tight group-hover:text-primary transition-colors">{sub.name}</span>
                                                <span className="text-[10px] opacity-30 font-bold uppercase tracking-widest">{formatValue(sub.value)}</span>
                                            </div>
                                            <div className={`px-3 py-1 rounded-xl text-xs font-black italic ${sub.change >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                {sub.change > 0 ? '+' : ''}{sub.change?.toFixed(2)}%
                                            </div>
                                        </div>
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
