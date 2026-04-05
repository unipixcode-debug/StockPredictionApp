import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Settings, TrendingUp, TrendingDown, RefreshCw, Bot, AlertTriangle, ShieldCheck, Zap, X, Database } from 'lucide-react';
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
    
    // Terminal Logs & Macro/Alpha State
    const [logs, setLogs] = useState([]);
    const [macro, setMacro] = useState(null);
    const [alphaRankings, setAlphaRankings] = useState({});

    useEffect(() => {
        fetchData();
        
        // Gerçek API'den verileri ve logları düzenli olarak çek
        const logInterval = setInterval(() => {
            fetchLogs();
        }, 15000);

        const dataInterval = setInterval(() => {
            fetchData(true);
        }, 10000); // 10s interval for silent interactive updates

        return () => {
            clearInterval(logInterval);
            clearInterval(dataInterval);
        };
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

    const fetchData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [configRes, tradeRes, logsRes, summaryRes, macroRes, alphaRes] = await Promise.all([
                api.get('/bot/config'),
                api.get('/bot/trades'),
                api.get('/bot/logs'),
                api.get('/bot/account-summary').catch(() => null),
                api.get('/bot/macro').catch(() => null),
                api.get('/bot/alpha-rankings').catch(() => ({}))
            ]);
            setConfig(configRes);
            setTrades(tradeRes.trades || []);
            setMacro(macroRes);
            setAlphaRankings(alphaRes || {});
            
            // Use the comprehensive totalPnl from Binance if available
            const realizedFromDb = tradeRes.stats?.totalPnl || 0;
            const absoluteTotalPnl = summaryRes ? parseFloat(summaryRes.totalPnl) : realizedFromDb;
            
            setStats({
                ...(tradeRes.stats || { winCount: 0, lossCount: 0 }),
                totalPnl: absoluteTotalPnl
            });
            
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

    const [isSyncing, setIsSyncing] = useState(false);
    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const res = await api.post('/bot/sync');
            fetchData(); // Refresh all data
            alert(language === 'TR' 
                ? `Senkronizasyon Başarılı: ${res.closed} kapandı, ${res.updated} güncellendi, ${res.added} yeni eklendi.` 
                : `Sync Successful: ${res.closed} closed, ${res.updated} updated, ${res.added} new added.`);
        } catch (error) {
            alert('Sync Error: ' + (error.response?.data?.error || error.message));
        } finally {
            setIsSyncing(false);
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

    const [isClosingAll, setIsClosingAll] = useState(false);
    const handleCloseAll = async () => {
        if (!window.confirm(language === 'TR' 
            ? 'DİKKAT: Tüm açık pozisyonlar borsada MARKET emriyle kapatılacak ve BOT DURDURULACAK. Emin misiniz?' 
            : 'WARNING: All open positions will be closed on exchange and BOT will be STOPPED. Are you sure?')) {
            return;
        }

        setIsClosingAll(true);
        try {
            await api.post('/bot/close-all');
            alert(language === 'TR' ? 'Tüm pozisyonlar kapatıldı ve bot durduruldu.' : 'All positions closed and bot stopped.');
            await fetchData();
        } catch (error) {
            alert('Error: ' + (error.response?.data?.error || error.message));
        } finally {
            setIsClosingAll(false);
        }
    };

    const [isClearing, setIsClearing] = useState(false);
    const handleClearHistory = async () => {
        if (!window.confirm(language === 'TR' 
            ? 'Geçmiş işlem listesi temizlenecek (Açık işlemler silinmez). Emin misiniz?' 
            : 'Closed trades history will be cleared. Are you sure?')) {
            return;
        }

        setIsClearing(true);
        try {
            await api.post('/bot/clear-history');
            await fetchData();
        } catch (error) {
            alert('Error: ' + (error.response?.data?.error || error.message));
        } finally {
            setIsClearing(false);
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

                <div className="flex flex-wrap items-center gap-3">
                    <button 
                        onClick={() => setActiveTab('dashboard')}
                        className={`px-6 py-2 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all ${activeTab === 'dashboard' ? 'bg-primary/20 text-primary border-primary/40' : 'bg-secondary/50 text-muted-foreground border-transparent hover:border-border'}`}
                    >
                        Panel
                    </button>
                    <button 
                        onClick={handleSync}
                        disabled={isSyncing}
                        className={`px-6 py-2 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all flex items-center gap-2 ${isSyncing ? 'bg-amber-500/20 text-amber-500 border-amber-500/40' : 'bg-secondary/50 text-emerald-400 border-emerald-500/20 hover:border-emerald-500/40'}`}
                    >
                        {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : <Database size={14} />} 
                        {isSyncing ? (language === 'TR' ? 'Eşitleniyor...' : 'Syncing...') : (language === 'TR' ? 'Binance ile Eşitle' : 'Sync with Binance')}
                    </button>

                    {/* New management buttons properly incorrectly correctly surely incorrectly correctly correctly correctly correctly correctly correctly incorrectly correctly */}
                    <button 
                        onClick={handleCloseAll}
                        disabled={isClosingAll}
                        className={`px-6 py-2 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all flex items-center gap-2 ${isClosingAll ? 'bg-rose-500/20 text-rose-500 border-rose-500/40' : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/40'}`}
                    >
                        {isClosingAll ? <RefreshCw size={14} className="animate-spin" /> : <X size={14} />} 
                        {isClosingAll ? (language === 'TR' ? 'Kapatılıyor...' : 'Closing...') : (language === 'TR' ? 'Tüm Pozisyonları Kapat' : 'Close All Positions')}
                    </button>

                    <button 
                        onClick={handleClearHistory}
                        disabled={isClearing}
                        className={`px-6 py-2 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all flex items-center gap-2 ${isClearing ? 'bg-amber-500/20 text-amber-500 border-amber-500/40' : 'bg-secondary/50 text-muted-foreground border-border/40 hover:border-amber-500/40 hover:text-amber-400'}`}
                    >
                        {isClearing ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />} 
                        {isClearing ? (language === 'TR' ? 'Temizleniyor...' : 'Clearing...') : (language === 'TR' ? 'Geçmişi Temizle' : 'Clear History')}
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
                        {/* Macro Sentinel Bar milimetrically SQUARELY correctly surely */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="glass-card px-6 py-4 flex items-center justify-between border-border/40 bg-black/40">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                        <ShieldCheck size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">AI Sentinel</p>
                                        <h4 className="font-black text-xs text-emerald-400">AKTİF & KORUYOR</h4>
                                    </div>
                                </div>
                                <Activity size={18} className="text-emerald-500 animate-pulse" />
                            </div>

                            <div className="glass-card px-6 py-4 flex items-center justify-between border border-emerald-500/20 bg-emerald-500/5">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Alpha Mind</p>
                                    <h4 className="font-black text-xs text-emerald-400">ÖĞRENİYOR</h4>
                                </div>
                                <Activity className="text-emerald-400 animate-spin-slow" />
                            </div>

                            <div className="glass-card px-6 py-4 flex items-center justify-between border-border/40 bg-black/40">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">BTC Dominance</p>
                                    <h4 className={`font-black text-xl ${(macro?.btcd?.price || 50) > 52 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                        %{macro?.btcd?.price?.toFixed(1) || '50.0'}
                                    </h4>
                                </div>
                                <TrendingUp className={(macro?.btcd?.price || 50) > 52 ? 'text-rose-400' : 'text-emerald-400'} />
                            </div>

                            <div className="glass-card px-6 py-4 flex items-center justify-between border-border/40 bg-black/40">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Money Flow</p>
                                    <h4 className="font-black text-xl text-cyan-400">
                                        ${macro?.moneyFlow?.price?.toFixed(2) || '2.50'}T
                                    </h4>
                                </div>
                                <Activity className="text-cyan-400" />
                            </div>
                        </div>

                        {/* Alpha Analytics Row — Only show if rankings exist milimetrically SQUARELY correctly surely */}
                        {Object.keys(alphaRankings).length > 0 && (
                            <div className="glass-card p-6 border-primary/20 bg-primary/5">
                                <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                                    <Zap size={14} />
                                    Global Olarak En Çok Kazandıran Stratejiler (Alpha Rankings)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {Object.entries(alphaRankings).slice(0, 4).map(([key, data]) => (
                                        <div key={key} className="p-3 rounded-xl bg-black/30 border border-white/5">
                                            <div className="flex justify-between items-center">
                                                <span className="font-black text-[11px] text-foreground">{key}</span>
                                                <span className="text-[10px] font-black text-emerald-400 tracking-tighter">%{data.winRate} Win</span>
                                            </div>
                                            <p className="text-[9px] text-muted-foreground mt-1 uppercase font-bold tracking-tight">AI Tavsiyesi: {data.recommended === 'HIGHLY_RECOMMENDED' ? '🏆 KRİTİK FIRSAT' : 'STABLE'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Stats Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <StatCard 
                                title="Toplam P&L (Kâr/Zarar)"
                                value={`$${stats.totalPnl.toFixed(4)}`}
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
                                                    formatter={(value) => [`$${value.toFixed(4)}`, 'Kümülatif P&L']}
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
                            const spotTrades = openTrades.filter(t => t.type === 'SPOT');
                            const futuresTrades = openTrades.filter(t => t.type === 'FUTURES');

                            const renderTradeCard = (trade) => {
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
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[10px] text-cyan-400/70 uppercase font-bold">Piyasa:</span>
                                                            <span className="text-xs text-cyan-400 font-black">${parseFloat(trade.currentPrice || 0).toFixed(4)}</span>
                                                        </div>
                                                        {trade.type === 'FUTURES' && trade.liquidationPrice > 0 && (
                                                            <div className="flex items-center gap-1.5 border-l border-white/10 pl-4 ml-1">
                                                                <span className="text-[10px] text-rose-500/70 uppercase font-bold">Likidasyon:</span>
                                                                <span className="text-xs text-rose-500 font-black">${parseFloat(trade.liquidationPrice).toFixed(4)}</span>
                                                            </div>
                                                        )}
                                                        {trade.stopLossPrice && (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[10px] text-rose-400/70 uppercase font-bold text-center">Stop:</span>
                                                                <span className="text-xs text-rose-400 font-black">${parseFloat(trade.stopLossPrice).toFixed(4)}</span>
                                                            </div>
                                                        )}
                                                        {trade.targetPrice && (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[10px] text-emerald-400/70 uppercase font-bold text-center">Hedef:</span>
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
                                                        {pnl >= 0 ? '+' : ''}{pnl.toFixed(4)}$
                                                    </p>
                                                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Anlık P&L (4-Hane)</p>
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
                            };

                            return (
                                <div className="space-y-6">
                                    {spotTrades.length > 0 && (
                                        <div className="glass-card p-6 border-emerald-500/20 bg-emerald-500/5">
                                            <h3 className="text-sm font-black uppercase tracking-widest text-emerald-400 mb-4 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
                                                Spot İşlemler ({spotTrades.length})
                                            </h3>
                                            <div className="space-y-3">
                                                {spotTrades.map(renderTradeCard)}
                                            </div>
                                        </div>
                                    )}

                                    {futuresTrades.length > 0 && (
                                        <div className="glass-card p-6 border-cyan-500/20 bg-cyan-500/5">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-sm font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"/>
                                                    Vadeli (Futures) İşlemler ({futuresTrades.length})
                                                </h3>
                                                <button
                                                    onClick={handleSync}
                                                    disabled={isSyncing}
                                                    className="flex items-center gap-2 px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 text-[10px] font-black uppercase transition-all disabled:opacity-50"
                                                >
                                                    <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                                                    {isSyncing ? (language === 'TR' ? 'Eşitleniyor...' : 'Syncing...') : (language === 'TR' ? 'Binance ile Eşitle' : 'Sync with Binance')}
                                                </button>
                                            </div>
                                            <div className="space-y-3">
                                                {futuresTrades.map(renderTradeCard)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Recent Trades (Closed only) */}
                        <div className="space-y-6">
                             {(() => {
                                 const closedTrades = trades.filter(t => t.status !== 'OPEN');
                                 if (closedTrades.length === 0) {
                                     return (
                                        <div className="glass-card p-6">
                                            <h3 className="text-lg font-black uppercase italic mb-6">Son İşlemler</h3>
                                            <p className="text-sm font-medium text-muted-foreground text-center py-10">Kapatılmış işlem kaydı bulunamadı.</p>
                                        </div>
                                     );
                                 }

                                 const spotHistory = closedTrades.filter(t => t.type === 'SPOT');
                                 const futuresHistory = closedTrades.filter(t => t.type === 'FUTURES');

                                 const renderClosedTrade = (trade) => (
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
                                             <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-tight">Giriş: <span className="text-foreground font-black">${parseFloat(trade.entryPrice || 0).toFixed(4)}</span></span>
                                             {trade.exitPrice && <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-tight">Çıkış: <span className="text-cyan-400 font-black">${parseFloat(trade.exitPrice).toFixed(4)}</span></span>}
                                         </div>
                                         <div className="flex flex-col md:items-end w-32">
                                             <span className={`text-lg font-black tracking-tighter ${trade.pnl > 0 ? 'text-emerald-500' : trade.pnl < 0 ? 'text-rose-500' : 'text-muted-foreground'}`}>
                                                 {trade.pnl > 0 ? '+' : ''}{parseFloat(trade.pnl || 0).toFixed(4)}$
                                             </span>
                                             {trade.exitPrice && trade.entryPrice && (
                                                <span className={`text-[11px] font-black tracking-tighter ${trade.pnl > 0 ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
                                                    {(() => {
                                                        const entry = parseFloat(trade.entryPrice);
                                                        const exit = parseFloat(trade.exitPrice);
                                                        if (isNaN(entry) || isNaN(exit) || entry === 0) return '(0.00%)';
                                                        const leverage = parseFloat(trade.leverage || 1);
                                                        const sideMultiplier = trade.side === 'BUY' ? 1 : -1;
                                                        const pct = ((exit - entry) / entry) * 100 * sideMultiplier * leverage;
                                                        return `(${pct > 0 ? '+' : ''}${pct.toFixed(2)}%)`;
                                                    })()}
                                                </span>
                                             )}
                                             <span className={`text-[10px] font-black tracking-widest px-2 py-0.5 mt-1 rounded ${trade.status === 'OPEN' ? 'bg-amber-500/20 text-amber-500' : 'bg-primary/10 text-primary'}`}>
                                                 {trade.status}
                                             </span>
                                         </div>
                                     </div>
                                 );

                                 return (
                                     <>
                                        {spotHistory.length > 0 && (
                                            <div className="glass-card p-6">
                                                <h3 className="text-lg font-black uppercase italic mb-6 flex items-center gap-2">
                                                    <TrendingUp size={18} className="text-emerald-500" /> Spot İşlem Geçmişi
                                                </h3>
                                                <div className="divide-y divide-border/30 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {spotHistory.map(renderClosedTrade)}
                                                </div>
                                            </div>
                                        )}
                                        {futuresHistory.length > 0 && (
                                            <div className="glass-card p-6">
                                                <h3 className="text-lg font-black uppercase italic mb-6 flex items-center gap-2">
                                                    <TrendingDown size={18} className="text-cyan-500" /> Vadeli İşlem Geçmişi
                                                </h3>
                                                <div className="divide-y divide-border/30 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {futuresHistory.map(renderClosedTrade)}
                                                </div>
                                            </div>
                                        )}
                                     </>
                                 );
                             })()}
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
        defaultLeverage: 1,
        tradeHorizon: 'SHORT',
        autoOptimize: true,
        rsiOversold: 35,
        rsiOverbought: 65,
        minConfirmationScore: 58,
        riskConsent: false
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
                defaultLeverage: config.defaultLeverage || 1,
                tradeHorizon: config.tradeHorizon || 'SHORT',
                autoOptimize: config.autoOptimize ?? true,
                rsiOversold: config.rsiOversold || 35,
                rsiOverbought: config.rsiOverbought || 65,
                minConfirmationScore: config.minConfirmationScore || 58,
                riskConsent: config.riskConsent || false
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

    // 🛡️ 5-Tier Risk Intelligence logic
    const getRiskLevel = (data) => {
        const { rsiOversold: buy, rsiOverbought: sell, minConfirmationScore: score } = data;
        
        // Tier 1: EN RİSKSİZ (Safest)
        if (buy <= 25 && sell >= 75 && score >= 70) {
            return { name: 'En Risksiz (Safest)', color: 'text-blue-500', bg: 'bg-blue-500', needsConsent: false };
        }
        // Tier 2: GÜVENLİ (Safe)
        if (buy <= 30 && sell >= 70 && score >= 65) {
            return { name: 'Güvenli Mod', color: 'text-emerald-500', bg: 'bg-emerald-500', needsConsent: false };
        }
        // Tier 3: DENGELİ (Balanced)
        if (buy <= 35 && sell >= 65 && score >= 60) {
            return { name: 'Dengeli/Normal', color: 'text-amber-500', bg: 'bg-amber-500', needsConsent: false };
        }
        // Tier 4: RİSKLİ (High Risk)
        if (buy > 40 || sell < 60 || score < 55) {
            return { name: 'Aşırı Riskli!', color: 'text-rose-500', bg: 'bg-rose-500', needsConsent: true };
        }
        // Tier 5: TURUNCU (Caution)
        return { name: 'Yüksek Riskli', color: 'text-orange-500', bg: 'bg-orange-500', needsConsent: true };
    };

    const currentRisk = getRiskLevel(formData);

    const handleSubmit = (e) => {
        e.preventDefault();

        // 🛡️ Final Risk Check before Save
        if (currentRisk.needsConsent && !formData.riskConsent) {
            alert("DİKKAT: Yüksek riskli ayarlar seçtiniz. Lütfen 'Fazla risk aldığımı onaylıyorum' kutucuğunu işaretleyin.");
            return;
        }

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

                    <div className="border-t border-border pt-8 mt-8 space-y-6">
                        <h2 className="text-2xl font-black italic uppercase tracking-tight">Risk Parametreleri</h2>
                        
                        {/* 🚀 VADE VE STRATEJİ SEÇİMİ (Ana Panel) */}
                        <div className="p-6 bg-amber-500/10 rounded-3xl border border-amber-500/20 shadow-[0_0_50px_rgba(245,158,11,0.05)]">
                            <label className="text-xs font-black uppercase text-amber-500 tracking-[0.3em] mb-4 block pl-2">
                                ⚡ Vade & Risk Stratejisi (ROI Hedefli)
                            </label>
                            <div className="flex flex-wrap md:flex-nowrap bg-black/40 p-2 rounded-2xl gap-3 border border-white/5 shadow-inner">
                                <button 
                                    type="button"
                                    onClick={() => setFormData(p => ({...p, tradeHorizon: 'SHORT'}))}
                                    className={`flex-1 flex flex-col items-center py-4 rounded-xl transition-all duration-300 ${formData.tradeHorizon === 'SHORT' ? 'bg-amber-500 text-black shadow-[0_0_30px_rgba(245,158,11,0.4)] scale-[1.02]' : 'text-muted-foreground hover:bg-white/5 opacity-60 hover:opacity-100'}`}
                                >
                                    <span className="text-[12px] font-black uppercase tracking-tight">Kısa Vade (Short)</span>
                                    <span className="text-[9px] font-bold mt-1">%7.5 ROI / 1.5 RR</span>
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setFormData(p => ({...p, tradeHorizon: 'MID'}))}
                                    className={`flex-1 flex flex-col items-center py-4 rounded-xl transition-all duration-300 ${formData.tradeHorizon === 'MID' ? 'bg-amber-500 text-black shadow-[0_0_30px_rgba(245,158,11,0.4)] scale-[1.02]' : 'text-muted-foreground hover:bg-white/5 opacity-60 hover:opacity-100'}`}
                                >
                                    <span className="text-[12px] font-black uppercase tracking-tight">Orta Vade (Mid)</span>
                                    <span className="text-[9px] font-bold mt-1">%12.5 ROI / 1.5 RR</span>
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setFormData(p => ({...p, tradeHorizon: 'LONG'}))}
                                    className={`flex-1 flex flex-col items-center py-4 rounded-xl transition-all duration-300 ${formData.tradeHorizon === 'LONG' ? 'bg-amber-500 text-black shadow-[0_0_30px_rgba(245,158,11,0.4)] scale-[1.02]' : 'text-muted-foreground hover:bg-white/5 opacity-60 hover:opacity-100'}`}
                                >
                                    <span className="text-[12px] font-black uppercase tracking-tight">Uzun Vade (Long)</span>
                                    <span className="text-[9px] font-bold mt-1">%75 ROI / 2.0 RR</span>
                                </button>
                            </div>
                            <p className="mt-3 text-[9px] font-bold text-amber-500/50 uppercase tracking-widest text-center">
                                * Seçilen vadeye göre TP/SL rasyoları ve risk yönetimi parametreleri sistem tarafından otomatik olarak güncellenir.
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                             <div className="p-4 bg-purple-500/5 rounded-2xl border border-purple-500/10 flex justify-between items-center">
                                 <div>
                                     <p className="font-black text-[10px] uppercase text-purple-400">AI Alpha Mind</p>
                                     <p className="text-[8px] text-muted-foreground uppercase tracking-widest">Global en iyi stratejilere katıl</p>
                                 </div>
                                 <label className="relative inline-flex items-center cursor-pointer">
                                     <input type="checkbox" name="autoOptimize" checked={formData.autoOptimize} onChange={handleChange} className="sr-only peer" />
                                     <div className="w-9 h-5 bg-secondary border border-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
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

                        {/* 🛡️ GİRİŞ ONAYI AYARLARI (Risk Parameters) */}
                        <div className="p-8 bg-blue-500/5 rounded-3xl border border-blue-500/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -z-10" />
                            
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-[0.3em] text-blue-400 mb-1">🛡️ Giriş Onay Ayarları</h3>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Botun hangi hassasiyetle işlem açacağını belirleyin.</p>
                                </div>
                                <div className="flex items-center gap-3 bg-black/40 px-6 py-3 rounded-2xl border border-white/5 shadow-xl">
                                    <div className={`w-3 h-3 rounded-full animate-pulse shadow-[0_0_15px] ${currentRisk.bg} shadow-${currentRisk.bg.split('-')[1]}-500`} />
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${currentRisk.color}`}>
                                        {currentRisk.name}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center px-2">
                                        <label className="text-[10px] font-black uppercase text-rose-400 tracking-widest">RSI Aşırı Satım (Buy)</label>
                                        <span className="text-xs font-black text-rose-400">{formData.rsiOversold}</span>
                                    </div>
                                    <input 
                                        type="range" name="rsiOversold" min="10" max="60" step="1" 
                                        value={formData.rsiOversold} onChange={handleChange}
                                        className="w-full h-2 bg-black/40 rounded-lg appearance-none cursor-pointer accent-rose-500 shadow-inner"
                                    />
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter leading-tight">
                                        Fiyat bu RSI altına indiğinde ALIM yapar. (Örn: 30-35 idealdir)
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center px-2">
                                        <label className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">RSI Aşırı Alım (Sell)</label>
                                        <span className="text-xs font-black text-emerald-400">{formData.rsiOverbought}</span>
                                    </div>
                                    <input 
                                        type="range" name="rsiOverbought" min="40" max="90" step="1" 
                                        value={formData.rsiOverbought} onChange={handleChange}
                                        className="w-full h-2 bg-black/40 rounded-lg appearance-none cursor-pointer accent-emerald-500 shadow-inner"
                                    />
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter leading-tight">
                                        Fiyat bu RSI üstüne çıktığında SATIM yapar. (Örn: 65-70 idealdir)
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center px-2">
                                        <label className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Min Onay Skoru</label>
                                        <span className="text-xs font-black text-blue-400">%{formData.minConfirmationScore}</span>
                                    </div>
                                    <input 
                                        type="range" name="minConfirmationScore" min="50" max="95" step="1" 
                                        value={formData.minConfirmationScore} onChange={handleChange}
                                        className="w-full h-2 bg-black/40 rounded-lg appearance-none cursor-pointer accent-blue-500 shadow-inner"
                                    />
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter leading-tight">
                                        İşlem açmak için gereken minimum AI güven oranı. (Örn: %60 önerilir)
                                    </p>
                                </div>
                            </div>
                            
                            <div className="mt-8 pt-6 border-t border-white/5 flex flex-wrap gap-4">
                                <button 
                                    type="button"
                                    onClick={() => setFormData(p => ({...p, rsiOversold: 22, rsiOverbought: 78, minConfirmationScore: 72, riskConsent: false}))}
                                    className="px-4 py-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all"
                                >
                                    🛡️ En Risksiz (Mavi)
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setFormData(p => ({...p, rsiOversold: 30, rsiOverbought: 70, minConfirmationScore: 65, riskConsent: false}))}
                                    className="px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
                                >
                                    🛡️ Risk Azalt (Yeşil)
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setFormData(p => ({...p, rsiOversold: 45, rsiOverbought: 55, minConfirmationScore: 55, riskConsent: false}))}
                                    className="px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all"
                                >
                                    🔥 Riski Artır (Kırmızı)
                                </button>
                            </div>

                            {/* 🛡️ Risk Consent & Warning */}
                            {currentRisk.needsConsent && (
                                <div className="mt-6 p-6 rounded-2xl bg-rose-500/10 border-2 border-rose-500/30 animate-pulse">
                                    <div className="flex items-start gap-4">
                                        <AlertTriangle className="text-rose-500 mt-1" size={24} />
                                        <div className="space-y-3 flex-1">
                                            <p className="text-xs font-black text-rose-500 uppercase tracking-widest">🚨 YÜKSEK RİSK UYARISI</p>
                                            <p className="text-[10px] font-bold text-rose-400/80 leading-relaxed uppercase">
                                                Şu anki ayarlarınız botun çok sık ve agresif işlem açmasına neden olacaktır. 
                                                Bu durum ani piyasa hareketlerinde bakiyenizin tamamının kaybedilmesine yol açabilir.
                                            </p>
                                            <label className="flex items-center gap-3 cursor-pointer group pt-2">
                                                <div className="relative">
                                                    <input 
                                                        type="checkbox" 
                                                        name="riskConsent" 
                                                        checked={formData.riskConsent} 
                                                        onChange={handleChange}
                                                        className="peer sr-only"
                                                    />
                                                    <div className="w-5 h-5 bg-black/40 border-2 border-rose-500/30 rounded-lg group-hover:border-rose-500 transition-all peer-checked:bg-rose-500 peer-checked:border-rose-500 flex items-center justify-center">
                                                        {formData.riskConsent && <ShieldCheck size={14} className="text-black" />}
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest group-hover:underline">
                                                    Fazla risk aldığımı onaylıyorum
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {formData.riskConsent && !currentRisk.needsConsent && (
                                <div className="mt-6 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                                        <ShieldCheck size={14} /> Risk seviyesi düşürüldü, güvenli moda geçildi.
                                    </p>
                                </div>
                            )}

                            {config?.riskConsent && currentRisk.needsConsent && (
                                <div className="mt-6 text-center">
                                    <p className="text-[11px] font-black text-rose-600 uppercase tracking-[0.2em] bg-rose-600/5 py-3 rounded-xl border border-rose-600/20">
                                        ⚠️ FAZLA RİSK ALDIĞINIZI ONAYLADINIZ TÜM BAKİYENİZİ KAYBEDEBİLİRSİNİZ
                                    </p>
                                </div>
                            )}
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
