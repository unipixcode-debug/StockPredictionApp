import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, RefreshCw, Repeat, BarChart3, 
  Info, Zap, Maximize2, ExternalLink
} from 'lucide-react';

const MarketChart = () => {
    const { symbol } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const name = queryParams.get('name') || symbol;
    
    const [currency, setCurrency] = useState('USD');
    const [loading, setLoading] = useState(true);

    // Map common names to TradingView symbols
    const getTVSymbol = (s, cur) => {
        const mapping = {
            'BTC': cur === 'USD' ? 'BINANCE:BTCUSDT' : 'BINANCE:BTCTRY',
            'ETH': cur === 'USD' ? 'BINANCE:ETHUSDT' : 'BINANCE:ETHTRY',
            'Altın': cur === 'USD' ? 'TVC:GOLD' : 'OANDA:XAUTRY',
            'Gümüş': cur === 'USD' ? 'TVC:SILVER' : 'OANDA:XAGTRY',
            'Petrol': 'TVC:USOIL',
            'S&P500': 'FOREXCOM:SPXUSD',
            'Nasdaq': 'CURRENCYCOM:NAS100',
            'BIST100': 'BIST:XU100',
            'ABD 10Y': 'TVC:US10Y',
            'Türkiye 10Y': 'TVC:TR10Y',
            'BTC Dominans': 'CRYPTOCAP:BTC.D',
            'Kripto Toplam': 'CRYPTOCAP:TOTAL',
            'Kripto Altcoin Toplam': 'CRYPTOCAP:TOTAL2'
        };

        if (s.endsWith('.IS')) {
            return `BIST:${s.replace('.IS', '')}`;
        }
        return mapping[s] || s;
    };

    const tvSymbol = getTVSymbol(symbol, currency);

    useEffect(() => {
        setLoading(true);
        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        script.onload = () => {
            if (window.TradingView) {
                new window.TradingView.widget({
                    "autosize": true,
                    "symbol": tvSymbol,
                    "interval": "D",
                    "timezone": "Etc/UTC",
                    "theme": "dark", // We can dynamic this if TV supports light theme well
                    "style": "1",
                    "locale": "tr",
                    "toolbar_bg": "#0f172a",
                    "enable_publishing": false,
                    "hide_top_toolbar": false,
                    "hide_legend": false,
                    "save_image": false,
                    "container_id": "tv_chart_container",
                    "onChartReady": () => setLoading(false)
                });
            }
        };
        document.head.appendChild(script);

        return () => {
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        };
    }, [tvSymbol]);

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col h-[calc(100vh-120px)] space-y-6"
        >
            {/* Chart Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center space-x-6">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="w-14 h-14 bg-secondary/50 border border-border rounded-2xl flex items-center justify-center text-muted-foreground hover:text-primary transition-all hover:bg-secondary active:scale-95"
                    >
                        <ChevronLeft size={28} />
                    </button>
                    <div>
                        <div className="flex items-center space-x-3">
                            <h1 className="text-3xl font-black uppercase italic tracking-tighter">{name} Analizi</h1>
                            <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
                                <span className="text-primary text-[10px] font-black uppercase tracking-widest leading-none">Canlı Veri</span>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground font-black uppercase tracking-[0.3em] mt-1 opacity-50">
                            Piyasa Sembolü: <span className="text-foreground">{tvSymbol}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    <button 
                        onClick={() => setCurrency(currency === 'USD' ? 'TRY' : 'USD')}
                        className="flex items-center space-x-3 px-6 py-3 bg-secondary/80 border border-border text-foreground hover:border-primary/50 rounded-2xl transition-all shadow-xl group active:scale-95"
                    >
                        <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border group-hover:bg-primary/10 transition-all">
                             <Repeat size={16} className="text-primary" />
                        </div>
                        <span className="font-black italic uppercase tracking-tighter text-lg">{currency}</span>
                    </button>
                    <button className="w-14 h-14 bg-secondary/50 border border-border rounded-2xl flex items-center justify-center text-muted-foreground hover:text-primary transition-all active:scale-90">
                        <Maximize2 size={24} />
                    </button>
                </div>
            </div>

            {/* Chart Container */}
            <div className="flex-1 glass-card relative group shadow-2xl overflow-hidden border-border/50">
                {loading && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md">
                        <div className="relative">
                            <RefreshCw className="animate-spin text-primary w-14 h-14" />
                            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                        </div>
                        <p className="mt-6 text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground animate-pulse">Grafik Yükleniyor...</p>
                    </div>
                )}
                
                <div id="tv_chart_container" className="absolute inset-0 w-full h-full" />
                
                {/* Decorative Borders */}
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-primary/20 to-transparent" />
                <div className="absolute bottom-4 right-4 flex items-center space-x-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <BarChart3 size={12} className="text-primary" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Powered by TradingView</span>
                </div>
            </div>

            {/* Quick Insights Footer */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-secondary/30 rounded-3xl border border-border flex items-center space-x-5">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Zap className="text-primary" size={24} fill="currentColor" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sinyal Gücü</p>
                        <p className="text-lg font-black uppercase italic tracking-tighter">Yüksek Beklenti</p>
                    </div>
                </div>
                <div className="p-6 bg-secondary/30 rounded-3xl border border-border flex items-center space-x-5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                        <Info className="text-amber-500" size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Korelasyon</p>
                        <p className="text-lg font-black uppercase italic tracking-tighter">DXY Negatif</p>
                    </div>
                </div>
                <div className="p-6 bg-secondary/30 rounded-3xl border border-border flex items-center space-x-5 opacity-50 group hover:opacity-100 transition-opacity cursor-not-allowed">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <ExternalLink className="text-emerald-500" size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hızlı Detay</p>
                        <p className="text-lg font-black uppercase italic tracking-tighter">Analiz Raporu</p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default MarketChart;
