import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Settings, TrendingUp, TrendingDown, RefreshCw, Bot, AlertTriangle, ShieldCheck, Zap, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine, ReferenceDot, CartesianGrid } from 'recharts';
import api from './api';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';

export default function BotDashboard() {
    const { user } = useAuth();
    const { language } = useLanguage();
    
    const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'settings'
    const [config, setConfig] = useState(null);
    const [trades, setTrades] = useState([]);
    const [stats, setStats] = useState({ totalPnl: 0, winCount: 0, lossCount: 0 });
    const [isBotActive, setIsBotActive] = useState(false);
    const [loading, setLoading] = useState(true);

    const [testResult, setTestResult] = useState(null);
    const [isTesting, setIsTesting] = useState(false);
    const [closingTradeId, setClosingTradeId] = useState(null);
    const [expandedTradeId, setExpandedTradeId] = useState(null);
    
    // Terminal Logs State
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        fetchData();
        
        // Gerçek API'den (BotLog veritabanından) 15 saniyede bir logları çek
        const logInterval = setInterval(() => {
            fetchLogs();
        }, 15000);

        return () => clearInterval(logInterval);
    }, []);

    const fetchLogs = async () => {
        try {
            const result = await api.get('/bot/logs');
            // Gelen veriyi (createdAt, message, type) formatlayarak state'e at
            const formatted = result.map(l => ({
                time: new Date(l.createdAt).toLocaleTimeString(),
                text: l.message,
                type: l.type
            }));
            setLogs(formatted);
        } catch (error) {
            console.error('Bot logs hatası:', error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [configRes, tradeRes, logsRes] = await Promise.all([
                api.get('/bot/config'),
                api.get('/bot/trades'),
                api.get('/bot/logs')
            ]);
            setConfig(configRes);
            setTrades(tradeRes.trades || []);
            setStats(tradeRes.stats || { totalPnl: 0, winCount: 0, lossCount: 0 });
            setIsBotActive(tradeRes.isBotActive || false);
            
            const formattedLogs = logsRes.map(l => ({
                time: new Date(l.createdAt).toLocaleTimeString(),
                text: l.message,
                type: l.type
            }));
            setLogs(formattedLogs.length ? formattedLogs : [{ time: new Date().toLocaleTimeString(), text: 'Sistem başlatıldı, log bekleniyor...', type: 'info' }]);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveConfig = async (updatedConfig) => {
        try {
            const res = await api.post('/bot/config', updatedConfig);
            setConfig(res.config);
            setIsBotActive(res.config.isActive);
            fetchLogs(); // Logu güncelle
            alert(language === 'TR' ? 'Ayarlar kaydedildi' : 'Settings saved');
        } catch (error) {
            alert('Error: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleTestConnection = async (testData) => {
        setIsTesting(true);
        setTestResult(null);
        try {
            const res = await api.post('/bot/test-connection', testData || { marketType: 'SPOT' });
            setTestResult(res);
        } catch (error) {
            setTestResult({ success: false, error: error.message });
        } finally {
            setIsTesting(false);
        }
    };

    const handleClosePosition = async (tradeId) => {
        setClosingTradeId(tradeId);
        try {
            await api.post(`/bot/trade/${tradeId}/close`);
            await fetchData(); // Refresh all data after close
        } catch (error) {
            alert('Pozisyon kapatılamadı: ' + (error.response?.data?.error || error.message));
        } finally {
            setClosingTradeId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[60vh]">
                <Activity className="animate-spin text-primary w-12 h-12" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 shadow-[0_0_20px_rgba(0,242,254,0.2)]">
                        <Bot className="text-primary" size={28} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight italic uppercase">AI Trade Bot</h1>
                        <div className="flex items-center space-x-4 mt-1">
                            <div className="flex items-center space-x-1.5">
                                <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${config?.isSpotActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                <p className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">
                                    SPOT: {config?.isSpotActive ? 'AKTİF' : 'PASİF'}
                                </p>
                            </div>
                            <div className="flex items-center space-x-1.5">
                                <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${config?.isFuturesActive ? 'bg-cyan-500' : 'bg-rose-500'}`} />
                                <p className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">
                                    FUTURES: {config?.isFuturesActive ? 'AKTİF' : 'PASİF'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex space-x-4">
                    <button 
                        onClick={() => setActiveTab('dashboard')}
                        className={`px-6 py-2 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all ${activeTab === 'dashboard' ? 'bg-primary/20 text-primary border-primary/40' : 'bg-secondary/50 text-muted-foreground border-transparent hover:border-border'}`}
                    >
                        Panel
                    </button>
                    <button 
                        onClick={() => setActiveTab('settings')}
                        className={`px-6 py-2 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all ${activeTab === 'settings' ? 'bg-primary/20 text-primary border-primary/40' : 'bg-secondary/50 text-muted-foreground border-transparent hover:border-border'}`}
                    >
                        <Settings size={14} className="inline mr-2 -mt-0.5" /> Ayarlar
                    </button>
                    <button onClick={fetchData} className="w-10 h-10 flex flex-center rounded-2xl bg-secondary/50 border border-border hover:bg-secondary justify-center items-center">
                        <RefreshCw size={16} className="text-foreground" />
                    </button>
                </div>
            </header>

            <AnimatePresence mode="wait">
                {activeTab === 'dashboard' ? (
                    <motion.div 
                        key="dashboard"
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                    >
                        {/* Stats Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <StatCard 
                                title="Toplam P&L (Kâr/Zarar)"
                                value={`$${stats.totalPnl.toFixed(2)}`}
                                subtext={`${trades.length} İşlem tamamlandı`}
                                color={stats.totalPnl >= 0 ? 'emerald' : 'rose'}
                                icon={stats.totalPnl >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                            />
                            <StatCard 
                                title="Kazanma Oranı"
                                value={trades.length ? `%${Math.round((stats.winCount / trades.length) * 100)}` : '%0'}
                                subtext={`${stats.winCount} Kazanç / ${stats.lossCount} Kayıp`}
                                color="cyan"
                                icon={<Zap size={24} />}
                            />
                            <StatCard 
                                title="Aktif İşlemler"
                                value={trades.filter(t => t.status === 'OPEN').length}
                                subtext={`Maks: ${config?.maxPositions || 0}`}
                                color="amber"
                                icon={<Activity size={24} />}
                            />
                        </div>

                        {/* Terminal Window */}
                        <div className="glass-card p-4 border-border/50 bg-[#0a0a0a]/80 font-mono">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                </div>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Canlı Bot İşlem Terminali</span>
                            </div>
                            <div className="h-48 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-black/40 border border-white/5">
                                {logs.map((log, i) => (
                                    <div key={i} className="text-xs">
                                        <span className="text-muted-foreground opacity-50">[{log.time}]</span>{' '}
                                        <span className={
                                            log.type === 'success' ? 'text-emerald-400' :
                                            log.type === 'error' ? 'text-rose-400' :
                                            log.type === 'warning' ? 'text-amber-400' : 'text-cyan-400'
                                        }>
                                            {log.type === 'success' ? '✓ ' : log.type === 'warning' ? '⚠ ' : log.type === 'error' ? '✖ ' : '> '}
                                            {log.text}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="glass-card p-6 border-border/50">
                            <h3 className="text-lg font-black uppercase italic mb-6">P&L Büyüme Grafiği</h3>
                            <div className="h-[300px] w-full">
                                {(() => {
                                    if (trades.length === 0) {
                                        return (
                                            <div className="h-full flex items-center justify-center border-2 border-dashed border-border rounded-3xl">
                                                <p className="text-xs font-black uppercase text-muted-foreground opacity-50 tracking-widest">Henüz işlem geçmişi yok</p>
                                            </div>
                                        );
                                    }

                                    // ── Kümülatif P&L Hesaplama ───────────────────────────────────────
                                    // Tarihe göre sırala (Eskiden Yeniye)
                                    const sortedTrades = [...trades]
                                        .sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt))
                                        .slice(-50); // Son 50 işlem

                                    let cumulative = 0;
                                    const chartData = sortedTrades.map((t, i) => {
                                        const tradePnl = t.status === 'CLOSED' ? (t.pnl || 0) : (t.unrealizedPnl || 0);
                                        cumulative += tradePnl;
                                        
                                        return {
                                            name: `İşlem ${i+1}`,
                                            fullPnl: cumulative,
                                            realized: t.status === 'CLOSED' ? cumulative : null,
                                            unrealized: t.status === 'OPEN' ? cumulative : null,
                                            isClosed: t.status === 'CLOSED'
                                        };
                                    });

                                    // "Bridges" realized to unrealized for a continuous line
                                    for (let i = 0; i < chartData.length - 1; i++) {
                                        if (chartData[i].isClosed && !chartData[i+1].isClosed) {
                                            chartData[i+1].realized = chartData[i+1].fullPnl; // Connect the gap
                                        }
                                    }

                                    return (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData}>
                                                <defs>
                                                    <linearGradient id="realizedColor" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                    </linearGradient>
                                                    <linearGradient id="unrealizedColor" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                                                <RechartsTooltip 
                                                    contentStyle={{ backgroundColor: 'rgba(5,5,5,0.8)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '1rem' }}
                                                    itemStyle={{ color: '#00f2fe', fontWeight: '900' }}
                                                    formatter={(value) => [`$${value.toFixed(2)}`, 'Kümülatif P&L']}
                                                />
                                                <Area 
                                                    type="monotone" 
                                                    dataKey="realized" 
                                                    stroke="#10b981" 
                                                    fillOpacity={1} 
                                                    fill="url(#realizedColor)" 
                                                    strokeWidth={3}
                                                    connectNulls={false}
                                                />
                                                <Area 
                                                    type="monotone" 
                                                    dataKey="unrealized" 
                                                    stroke="#f59e0b" 
                                                    fillOpacity={1} 
                                                    fill="url(#unrealizedColor)" 
                                                    strokeWidth={3}
                                                    connectNulls={true}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Open Positions */}
                        {(() => {
                            const openTrades = trades.filter(t => t.status === 'OPEN');
                            if (openTrades.length === 0) return null;
                            return (
                                <div className="glass-card p-6 border-amber-500/20 bg-amber-500/5">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-black uppercase italic flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"/>
                                            Açık Pozisyonlar
                                            <span className="text-xs font-black bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                                                {openTrades.length}
                                            </span>
                                        </h3>
                                        <button onClick={fetchData} className="text-muted-foreground hover:text-amber-400 transition-colors">
                                            <RefreshCw size={14} />
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {openTrades.map(trade => {
                                            const isLong = trade.side === 'BUY';
                                            const pnl = trade.unrealizedPnl ?? trade.pnl ?? 0;
                                            const isClosing = closingTradeId === trade.id;
                                            const isExpanded = expandedTradeId === trade.id;

                                            return (
                                                <div key={trade.id} className="space-y-2">
                                                    <div 
                                                        onClick={() => setExpandedTradeId(isExpanded ? null : trade.id)}
                                                        className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-2xl border transition-all cursor-pointer group ${
                                                            isLong ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40' : 'bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border text-sm font-black ${
                                                                isLong ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                                            }`}>
                                                                {isLong ? '↑' : '↓'}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-black text-base">{trade.symbol}</span>
                                                                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                                                                        isLong ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                                                    }`}>{isLong ? 'LONG' : 'SHORT'}</span>
                                                                    {trade.type === 'FUTURES' && trade.leverage && (
                                                                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400">{trade.leverage}x</span>
                                                                    )}
                                                                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{trade.type}</span>
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-1.5 pt-1.5 border-t border-white/5">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Giriş:</span>
                                                                        <span className="text-xs text-foreground font-black">${parseFloat(trade.entryPrice || 0).toFixed(4)}</span>
                                                                    </div>
                                                                    
                                                                    {trade.stopLossPrice && (
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="text-[10px] text-rose-400/70 uppercase font-bold">Stop:</span>
                                                                            <span className="text-xs text-rose-400 font-black">${parseFloat(trade.stopLossPrice).toFixed(4)}</span>
                                                                        </div>
                                                                    )}
                                                                    
                                                                    {trade.targetPrice && (
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="text-[10px] text-emerald-400/70 uppercase font-bold">Hedef:</span>
                                                                            <span className="text-xs text-emerald-400 font-black">${parseFloat(trade.targetPrice).toFixed(4)}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4 ml-auto">
                                                            <div className="text-right">
                                                                <p className={`text-lg font-black ${
                                                                    pnl > 0 ? 'text-emerald-400' : pnl < 0 ? 'text-rose-400' : 'text-muted-foreground'
                                                                }`}>
                                                                    {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}$
                                                                </p>
                                                                <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Anlık P&L</p>
                                                            </div>
                                                            <div className="flex flex-col gap-2">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleClosePosition(trade.id);
                                                                    }}
                                                                    disabled={isClosing}
                                                                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 min-w-20"
                                                                >
                                                                    {isClosing ? <RefreshCw size={12} className="animate-spin"/> : <X size={12}/>}
                                                                    {isClosing ? '...' : 'Kapat'}
                                                                </button>
                                                                <button className="text-[9px] font-black uppercase text-muted-foreground/50 hover:text-primary transition-colors">
                                                                    {isExpanded ? 'Grafiği Gizle' : 'Grafiği Gör'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <AnimatePresence>
                                                        {isExpanded && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                className="overflow-hidden bg-black/20 rounded-2xl border border-white/5"
                                                            >
                                                                <TradeLiveChart trade={trade} />
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Recent Trades (Closed only) */}
                        <div className="glass-card p-6">
                             <h3 className="text-lg font-black uppercase italic mb-6">Son İşlemler</h3>
                             {trades.filter(t => t.status !== 'OPEN').length > 0 ? (
                                 <div className="divide-y divide-border/30">
                                     {trades.filter(t => t.status !== 'OPEN').map(trade => (

                                         <div key={trade.id} className="py-4 flex flex-col md:flex-row justify-between md:items-center gap-4 group">
                                             <div className="flex items-center space-x-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${trade.side === 'BUY' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-rose-500/10 border-rose-500/30 text-rose-500'}`}>
                                                    {trade.side === 'BUY' ? <TrendingUp /> : <TrendingDown />}
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-lg">{trade.symbol}</h4>
                                                    <div className="flex gap-2">
                                                        {trade.type === 'FUTURES' && trade.leverage && (
                                                            <span className="text-[10px] uppercase font-bold tracking-widest bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">{trade.leverage}x</span>
                                                        )}
                                                        <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{trade.type}</span>
                                                    </div>
                                                </div>
                                             </div>
                                             <div className="flex flex-col md:items-end text-sm font-medium">
                                                 <span className="text-muted-foreground">Giriş: <span className="text-foreground">${trade.entryPrice}</span></span>
                                                 {trade.exitPrice && <span>Çıkış: <span className="text-foreground">${trade.exitPrice}</span></span>}
                                             </div>
                                             <div className="flex flex-col md:items-end w-32">
                                                 <span className={`text-lg font-black ${trade.pnl > 0 ? 'text-emerald-500' : trade.pnl < 0 ? 'text-rose-500' : 'text-muted-foreground'}`}>
                                                     {trade.pnl > 0 ? '+' : ''}{trade.pnl.toFixed(2)}$
                                                 </span>
                                                 <span className={`text-[10px] font-black tracking-widest px-2 py-0.5 mt-1 rounded ${trade.status === 'OPEN' ? 'bg-amber-500/20 text-amber-500' : 'bg-primary/10 text-primary'}`}>
                                                     {trade.status}
                                                 </span>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             ) : (
                                <p className="text-sm font-medium text-muted-foreground text-center py-10">Kapatılmış işlem kaydı bulunamadı.</p>
                             )}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                        key="settings"
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    >
                        <BotSettingsForm 
                            config={config} 
                            onSave={handleSaveConfig} 
                            onTest={handleTestConnection}
                            isTesting={isTesting}
                            testResult={testResult}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function StatCard({ title, value, subtext, color, icon }) {
    const colors = {
        emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500',
        rose: 'bg-rose-500/10 border-rose-500/30 text-rose-500',
        cyan: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-500',
        amber: 'bg-amber-500/10 border-amber-500/30 text-amber-500',
    };
    return (
        <div className="glass-card p-6 flex flex-col justify-between items-start space-y-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${colors[color]}`}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 mb-1">{title}</p>
                <div className="text-4xl font-black tracking-tighter">{value}</div>
                <p className="text-xs font-bold text-muted-foreground mt-2">{subtext}</p>
            </div>
        </div>
    );
}

function BotSettingsForm({ config, onSave, onTest, isTesting, testResult }) {
    const [formData, setFormData] = useState({
        apiKey: '',
        apiSecret: '',
        futuresApiKey: '',
        futuresApiSecret: '',
        isSpotActive: false,
        isFuturesActive: false,
        isTestnet: true,
        budgetMode: 'PERCENTAGE',
        budgetAmount: 10,
        maxPositions: 3,
        maxPerAsset: 50,
        scanInterval: 300,
        defaultLeverage: 1
    });

    const [testMarket, setTestMarket] = useState('SPOT');

    // Populate initial
    useEffect(() => {
        if (config) {
            setFormData({
                apiKey: config.apiKey || '',
                apiSecret: config.apiSecret || '',
                futuresApiKey: config.futuresApiKey || '',
                futuresApiSecret: config.futuresApiSecret || '',
                isSpotActive: config.isSpotActive,
                isFuturesActive: config.isFuturesActive,
                isTestnet: config.isTestnet,
                budgetMode: config.budgetMode || 'PERCENTAGE',
                budgetAmount: config.budgetAmount || 10,
                maxPositions: config.maxPositions || 3,
                maxPerAsset: config.maxPerAsset || 50,
                scanInterval: config.scanInterval || 300,
                defaultLeverage: config.defaultLeverage || 1
            });
        }
    }, [config]);

    const [showKeys, setShowKeys] = useState({});
    const toggleKey = (key) => setShowKeys(p => ({...p, [key]: !p[key]}));

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                <form onSubmit={handleSubmit} className="glass-card p-8 space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />

                    <div className="space-y-6">
                        <div className="p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/20">
                            <h3 className="text-sm font-black uppercase tracking-widest text-emerald-500 mb-4 flex items-center gap-2">
                                <Zap size={14} /> Spot API Anahtarları
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest pl-2">Spot API Key</label>
                                    <div className="relative">
                                        <input 
                                            type={showKeys.apiKey ? "text" : "password"} name="apiKey" value={formData.apiKey} onChange={handleChange}
                                            placeholder="Binance Spot API Key"
                                            className="w-full bg-black/40 border border-white/5 p-4 pr-12 rounded-2xl focus:border-emerald-500/50 text-foreground transition-all"
                                        />
                                        <button type="button" onClick={() => toggleKey('apiKey')} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-emerald-500 transition-colors">
                                            {showKeys.apiKey ? <RefreshCw size={16} /> : <ShieldCheck size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest pl-2">Spot Secret Key</label>
                                    <div className="relative">
                                        <input 
                                            type={showKeys.apiSecret ? "text" : "password"} name="apiSecret" value={formData.apiSecret} onChange={handleChange}
                                            placeholder="Binance Spot Secret Key"
                                            className="w-full bg-black/40 border border-white/5 p-4 pr-12 rounded-2xl focus:border-emerald-500/50 text-foreground transition-all"
                                        />
                                         <button type="button" onClick={() => toggleKey('apiSecret')} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-emerald-500 transition-colors">
                                            {showKeys.apiSecret ? <RefreshCw size={16} /> : <ShieldCheck size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-cyan-500/5 rounded-3xl border border-cyan-500/20">
                            <h3 className="text-sm font-black uppercase tracking-widest text-cyan-500 mb-4 flex items-center gap-2">
                                <Bot size={14} /> Vadeli (Futures) API Anahtarları
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest pl-2">Futures API Key</label>
                                    <div className="relative">
                                        <input 
                                            type={showKeys.fKey ? "text" : "password"} name="futuresApiKey" value={formData.futuresApiKey} onChange={handleChange}
                                            placeholder="Binance Futures API Key"
                                            className="w-full bg-black/40 border border-white/5 p-4 pr-12 rounded-2xl focus:border-cyan-500/50 text-foreground transition-all"
                                        />
                                        <button type="button" onClick={() => toggleKey('fKey')} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-cyan-500 transition-colors">
                                            {showKeys.fKey ? <RefreshCw size={16} /> : <ShieldCheck size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest pl-2">Futures Secret Key</label>
                                    <div className="relative">
                                        <input 
                                            type={showKeys.fSecret ? "text" : "password"} name="futuresApiSecret" value={formData.futuresApiSecret} onChange={handleChange}
                                            placeholder="Binance Futures Secret Key"
                                            className="w-full bg-black/40 border border-white/5 p-4 pr-12 rounded-2xl focus:border-cyan-500/50 text-foreground transition-all"
                                        />
                                        <button type="button" onClick={() => toggleKey('fSecret')} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-cyan-500 transition-colors">
                                            {showKeys.fSecret ? <RefreshCw size={16} /> : <ShieldCheck size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <p className="mt-4 text-[9px] font-black uppercase text-cyan-500/60 tracking-[0.2em] leading-relaxed">
                                * Not: Vadeli test (Mock) işlemleri için Binance Mock Trading anahtarlarını kullanın ve yukarıdaki Testnet şalterini AÇIN.
                            </p>
                        </div>
                    </div>

                    <div className="border-t border-border pt-8 mt-8">
                        <h2 className="text-2xl font-black italic uppercase tracking-tight mb-6">Risk Parametreleri</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                             <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex justify-between items-center">
                                 <div>
                                     <p className="font-black text-[10px] uppercase text-emerald-500">Spot Bot</p>
                                     <p className="text-[8px] text-muted-foreground uppercase tracking-widest">Spot piyasada al-sat</p>
                                 </div>
                                 <label className="relative inline-flex items-center cursor-pointer">
                                     <input type="checkbox" name="isSpotActive" checked={formData.isSpotActive} onChange={handleChange} className="sr-only peer" />
                                     <div className="w-9 h-5 bg-secondary border border-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                 </label>
                             </div>
                             <div className="p-4 bg-cyan-500/5 rounded-2xl border border-cyan-500/10 flex justify-between items-center">
                                 <div>
                                     <p className="font-black text-[10px] uppercase text-cyan-500">Futures Bot</p>
                                     <p className="text-[8px] text-muted-foreground uppercase tracking-widest">Vadeli piyasada al-sat</p>
                                 </div>
                                 <label className="relative inline-flex items-center cursor-pointer">
                                     <input type="checkbox" name="isFuturesActive" checked={formData.isFuturesActive} onChange={handleChange} className="sr-only peer" />
                                     <div className="w-9 h-5 bg-secondary border border-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                                 </label>
                             </div>
                             <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 flex justify-between items-center">
                                 <div>
                                     <p className="font-black text-[10px] uppercase text-amber-500">Testnet</p>
                                     <p className="text-[8px] text-muted-foreground uppercase tracking-widest">Sanal bakiye kullanımı</p>
                                 </div>
                                 <label className="relative inline-flex items-center cursor-pointer">
                                     <input type="checkbox" name="isTestnet" checked={formData.isTestnet} onChange={handleChange} className="sr-only peer" />
                                     <div className="w-9 h-5 bg-secondary border border-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                                 </label>
                             </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="space-y-4">
                                <label className="text-xs font-black uppercase text-muted-foreground tracking-widest pl-2">Bütçe Türü</label>
                                <div className="flex bg-secondary/50 p-1 rounded-xl">
                                    <button 
                                        type="button"
                                        onClick={() => setFormData(p => ({...p, budgetMode: 'PERCENTAGE'}))}
                                        className={`flex-1 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${formData.budgetMode === 'PERCENTAGE' ? 'bg-primary text-black shadow-lg' : 'text-muted-foreground hover:bg-secondary'}`}
                                    >Serbest %</button>
                                    <button 
                                        type="button"
                                        onClick={() => setFormData(p => ({...p, budgetMode: 'FIXED'}))}
                                        className={`flex-1 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${formData.budgetMode === 'FIXED' ? 'bg-primary text-black shadow-lg' : 'text-muted-foreground hover:bg-secondary'}`}
                                    >Sabit USDT</button>
                                </div>
                             </div>

                             <div className="space-y-2">
                                <label className="text-xs font-black uppercase text-muted-foreground tracking-widest pl-2">
                                    {formData.budgetMode === 'PERCENTAGE' ? 'Serbest Bakiyenin % Kaçı?' : 'İşlem Başına Kaç USDT?'}
                                </label>
                                <input 
                                    type="number" name="budgetAmount" value={formData.budgetAmount} onChange={handleChange}
                                    className="w-full bg-secondary/50 border border-border p-4 rounded-2xl focus:border-primary/50 text-foreground"
                                />
                             </div>

                             <div className="space-y-2">
                                <label className="text-xs font-black uppercase text-muted-foreground tracking-widest pl-2">Aynı Anda Maksimum İşlem</label>
                                <input 
                                    type="number" name="maxPositions" value={formData.maxPositions} onChange={handleChange}
                                    className="w-full bg-secondary/30 border border-border p-4 rounded-2xl focus:border-primary/50 text-foreground"
                                />
                             </div>

                             <div className="space-y-2">
                                <label className="text-xs font-black uppercase text-cyan-500 tracking-widest pl-2">Maksimum Kaldıraç (Futures İçin)</label>
                                <div className="flex items-center gap-4 bg-cyan-500/5 border border-cyan-500/20 p-4 rounded-2xl">
                                    <input 
                                        type="range" name="defaultLeverage" min="1" max="50" step="1" 
                                        value={formData.defaultLeverage} onChange={handleChange}
                                        className="flex-1 h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                    />
                                    <span className="w-12 text-center text-cyan-400 font-black text-lg">{formData.defaultLeverage}x</span>
                                </div>
                             </div>

                             <div className="space-y-2">
                                <label className="text-xs font-black uppercase text-amber-500 tracking-widest pl-2">Tarama Aralığı (Saniye)</label>
                                <input 
                                    type="number" name="scanInterval" value={formData.scanInterval} onChange={handleChange}
                                    placeholder="Örn: 300 (5 dk)"
                                    className="w-full bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl focus:border-amber-500 text-foreground font-black"
                                />
                             </div>
                        </div>
                    </div>

                    <div className="pt-6 flex justify-end">
                         <button type="submit" className="premium-button font-black uppercase tracking-widest text-sm px-10">
                              Ayarları Kaydet
                         </button>
                    </div>
                </form>
            </div>

            <div className="space-y-6">
                <div className="glass-card p-6 border-blue-500/20 bg-blue-500/5">
                    <div className="flex items-center space-x-3 mb-4">
                        <ShieldCheck className="text-blue-500" />
                        <h3 className="text-lg font-black italic uppercase">Bağlantı Testi</h3>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground mb-4">API Key'lerinizin doğruluğunu test edin.</p>
                    
                    <div className="flex bg-black/40 p-1 rounded-xl mb-4 border border-white/5">
                        <button 
                            type="button"
                            onClick={() => setTestMarket('SPOT')}
                            className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${testMarket === 'SPOT' ? 'bg-emerald-500 text-black' : 'text-muted-foreground'}`}
                        >Spot</button>
                        <button 
                            type="button"
                            onClick={() => setTestMarket('FUTURES')}
                            className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${testMarket === 'FUTURES' ? 'bg-cyan-500 text-black' : 'text-muted-foreground'}`}
                        >Futures</button>
                    </div>

                    <button 
                         type="button"
                         onClick={() => onTest({ marketType: testMarket })}
                         disabled={isTesting}
                         className={`w-full py-3 ${testMarket === 'SPOT' ? 'bg-emerald-500' : 'bg-cyan-500'} text-black font-black uppercase tracking-widest rounded-2xl shadow-lg transition-all flex justify-center items-center`}
                    >
                         {isTesting ? <RefreshCw className="animate-spin" /> : `${testMarket} Test Et`}
                    </button>

                    {testResult && (
                        <div className={`mt-6 p-4 rounded-xl text-sm font-medium border ${testResult.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-rose-500/10 border-rose-500/30 text-rose-500'}`}>
                            {testResult.success ? (
                                <div className="space-y-2">
                                    <p className="font-black uppercase tracking-widest border-b border-emerald-500/20 pb-2">Bağlantı Başarılı</p>
                                    <p>Ortam: {testResult.testnet ? 'TESTNET' : 'MAINNET'}</p>
                                    <p>Serbest Bakiye: <span className="font-black">{testResult.freeUSDT.toFixed(2)} USDT</span></p>
                                    <p>Toplam Bakiye: <span className="font-black">{testResult.totalUSDT.toFixed(2)} USDT</span></p>
                                </div>
                            ) : (
                                <p>Hata: {testResult.error}</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="glass-card p-6 border-rose-500/20 bg-rose-500/5 items-start">
                    <div className="w-10 h-10 bg-rose-500/20 flex flex-center items-center justify-center rounded-xl mb-4 text-rose-500">
                        <AlertTriangle size={20} />
                    </div>
                    <h3 className="font-black text-rose-500 uppercase tracking-widest text-sm mb-2">Güvenlik Uyarısı</h3>
                    <p className="text-xs text-rose-500/80 font-medium leading-relaxed">
                        Lütfen Binance API oluştururken sadece "Spot & Margin" ve "Futures" okuma/yazma erişimleri verin. 
                        Kesinlikle "Enable Withdrawals" (Çekme İzni) kutucuğunu İŞARETLEMEYİN. PredictPro bakiye çekimine ihtiyaç duymaz.
                    </p>
                </div>
            </div>
        </div>
    );
}

// ── Live Chart Component ─────────────────────────────────────────────────────────────
function TradeLiveChart({ trade }) {
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchChart();
        const interval = setInterval(fetchChart, 15000); // 15sn refresh
        return () => clearInterval(interval);
    }, [trade.id]);

    const fetchChart = async () => {
        try {
            const res = await api.get(`/bot/trades/${trade.id}/chart`);
            setChartData(res);
        } catch (e) {
            console.error('[Chart] Error:', e.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading && chartData.length === 0) {
        return (
            <div className="h-48 flex items-center justify-center">
                <RefreshCw size={24} className="text-primary animate-spin" />
            </div>
        );
    }

    // ── Dynamic Y Domain Calculation ──────────────────────────────────────────────────
    const prices = chartData.map(d => d.close);
    const levels = [
        parseFloat(trade.entryPrice || 0),
        parseFloat(trade.targetPrice || 0),
        parseFloat(trade.stopLossPrice || 0)
    ].filter(l => l > 0);

    const allValues = [...prices, ...levels];
    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);
    const margin = (maxVal - minVal) * 0.15; // %15 margin
    const yDomain = [minVal - margin, maxVal + margin];
    
    const lastPoint = chartData[chartData.length - 1];

    return (
        <div className="p-4 pt-2">
            <div className="h-[480px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 20, right: 100, left: 0, bottom: 30 }}>
                        <defs>
                            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#00f2fe" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis 
                            dataKey="time" 
                            hide={false}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#666', fontSize: 9, fontWeight: 'bold' }}
                            minTickGap={30}
                            tickFormatter={(val) => {
                                const date = new Date(val);
                                return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                            }}
                            dy={10}
                        />
                        <YAxis domain={yDomain} hide />
                        
                        <RechartsTooltip 
                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px', fontSize: '10px' }}
                            itemStyle={{ color: '#00f2fe' }}
                            labelFormatter={(val) => new Date(val).toLocaleTimeString()}
                        />
                        
                        <Area 
                            type="monotone" 
                            dataKey="close" 
                            stroke="#00f2fe" 
                            strokeWidth={2} 
                            fillOpacity={1} 
                            fill="url(#priceGradient)" 
                            animationDuration={1000}
                            isAnimationActive={false}
                        />

                        {/* Trade Levels with Right Labels */}
                        {trade.entryPrice && parseFloat(trade.entryPrice) > 0 && (
                            <ReferenceLine 
                                y={parseFloat(trade.entryPrice)} 
                                stroke="#3b82f6" 
                                strokeWidth={1}
                                strokeDasharray="3 3"
                                label={{ 
                                    position: 'right', 
                                    value: `Giriş: $${parseFloat(trade.entryPrice).toFixed(4)}`, 
                                    fill: '#3b82f6', 
                                    fontSize: 9, 
                                    fontWeight: '900',
                                    className: 'italic'
                                }} 
                            />
                        )}
                        {trade.targetPrice && parseFloat(trade.targetPrice) > 0 && (
                            <ReferenceLine 
                                y={parseFloat(trade.targetPrice)} 
                                stroke="#10b981" 
                                strokeDasharray="5 5" 
                                label={{ 
                                    position: 'right', 
                                    value: `Hedef: $${parseFloat(trade.targetPrice).toFixed(4)}`, 
                                    fill: '#10b981', 
                                    fontSize: 9, 
                                    fontWeight: '900' 
                                }} 
                            />
                        )}
                        {trade.stopLossPrice && parseFloat(trade.stopLossPrice) > 0 && (
                            <ReferenceLine 
                                y={parseFloat(trade.stopLossPrice)} 
                                stroke="#ef4444" 
                                strokeDasharray="5 5" 
                                label={{ 
                                    position: 'right', 
                                    value: `Stop: $${parseFloat(trade.stopLossPrice).toFixed(4)}`, 
                                    fill: '#ef4444', 
                                    fontSize: 9, 
                                    fontWeight: '900' 
                                }} 
                            />
                        )}

                        {/* Blinking Pulse Dot for Current Price */}
                        {lastPoint && (
                            <ReferenceLine
                                y={lastPoint.close}
                                stroke="#3b82f6"
                                strokeWidth={1}
                                strokeDasharray="3 3"
                                opacity={0.5}
                                label={{
                                    position: 'right',
                                    value: `$${lastPoint.close.toFixed(4)}`,
                                    fill: '#3b82f6',
                                    fontSize: 14,
                                    fontWeight: '900',
                                    className: 'neon-price-label-animated',
                                    dx: 10
                                }}
                            />
                        )}
                        {lastPoint && (
                            <ReferenceDot 
                                x={lastPoint.time} 
                                y={lastPoint.close} 
                                r={3} 
                                fill="#3b82f6" 
                                stroke="none"
                                className="status-dot-small"
                            />
                        )}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            <div className="flex justify-between items-center mt-2 px-2">
                <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest italic flex items-center gap-1">
                    <RefreshCw size={8} className="animate-spin text-primary"/> Canlı 1D Veri (Binance)
                </span>
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[8px] font-black uppercase text-primary tracking-widest italic">
                        {trade.symbol} • {lastPoint ? `$${lastPoint.close.toFixed(4)}` : '...'}
                    </span>
                </div>
            </div>
        </div>
    );
}
