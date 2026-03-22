import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, RefreshCw, Repeat, BarChart3, 
  Info, Zap, Maximize2, ExternalLink, Search, Play
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import api from './api';

const MarketChart = () => {
    const { symbol } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const name = queryParams.get('name') || symbol;

    const [currency, setCurrency] = useState('USD');
    const [searchSymbol, setSearchSymbol] = useState('');
    const [liveSearchResults, setLiveSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Debounced Live Search Effect
    useEffect(() => {
        if (searchSymbol.length < 2) {
            setLiveSearchResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await api.get(`/market/search?q=${searchSymbol}&_t=${Date.now()}`);
                setLiveSearchResults(res || []);
            } catch (error) {
                console.error(error);
            } finally {
                setIsSearching(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchSymbol]);
    // Map common names to TradingView symbols
    const getTVSymbol = (s, cur) => {
        const mapping = {
            'BTC': cur === 'USD' ? 'BINANCE:BTCUSDT' : 'BINANCE:BTCTRY',
            'ETH': cur === 'USD' ? 'BINANCE:ETHUSDT' : 'BINANCE:ETHTRY',
            'Altın': cur === 'USD' ? 'TVC:GOLD' : 'OANDA:XAUTRY',
            'Gümüş': cur === 'USD' ? 'TVC:SILVER' : 'OANDA:XAGTRY',
            'Petrol': 'TVC:USOIL',
            'Bakır': 'TVC:COPPER',
            'Platin': 'NYMEX:PL1!',
            'Palladyum': 'NYMEX:PA1!',
            'Doğalgaz': 'NYMEX:NG1!',
            'Buğday': 'CBOT:ZW1!',
            'Mısır': 'CBOT:ZC1!',
            'Kahve': 'ICEUS:KC1!',
            'S&P500': 'FOREXCOM:SPXUSD',
            'ABD (S&P500)': 'FOREXCOM:SPXUSD',
            'Nasdaq': 'CURRENCYCOM:NAS100',
            'Avrupa (STOXX)': 'INDEX:SX5E',
            'Çin (SSE)': 'SSE:000001',
            'BIST100': 'BIST:XU100',
            'XU100': 'BIST:XU100',
            'Türkiye (BIST)': 'BIST:XU100',
            'ABD 10Y': 'TVC:US10Y',
            'ABD 2Y': 'TVC:US02Y',
            'Almanya 10Y': 'TVC:DE10Y',
            'Japonya 10Y': 'TVC:JP10Y',
            'İngiltere 10Y': 'TVC:GB10Y',
            'Türkiye 10Y': 'TVC:TR10Y',
            'VIX': 'VIX',
            '^VIX': 'VIX',
            'Dolar Endeksi': 'DXY',
            'DXY': 'DXY',
            'DX=F': 'DXY',
            '^GSPC': 'FOREXCOM:SPXUSD',
            '^IXIC': 'CURRENCYCOM:NAS100',
            'GC=F': 'TVC:GOLD',
            'SI=F': 'TVC:SILVER',
            'CL=F': 'TVC:USOIL',
            'BTC-USD': cur === 'USD' ? 'BINANCE:BTCUSDT' : 'BINANCE:BTCTRY',
            'ETH-USD': cur === 'USD' ? 'BINANCE:ETHUSDT' : 'BINANCE:ETHTRY',
            'Bitcoin Dominans': 'CRYPTOCAP:BTC.D',
            'Altcoin Dominans': 'CRYPTOCAP:OTHERS.D',
            'XRP Dominans': 'CRYPTOCAP:XRP.D',
            'USDT Dominans': 'CRYPTOCAP:USDT.D',
            'Kripto Toplam': 'CRYPTOCAP:TOTAL',
            'Kripto Altcoin Toplam': 'CRYPTOCAP:TOTAL2',
            'Bitcoin': cur === 'USD' ? 'BINANCE:BTCUSDT' : 'BINANCE:BTCTRY',
            'Ethereum': cur === 'USD' ? 'BINANCE:ETHUSDT' : 'BINANCE:ETHTRY',
            'Solana': cur === 'USD' ? 'BINANCE:SOLUSDT' : 'BINANCE:SOLTRY',
            // Category Mappings
            'commodities': 'TVC:GOLD',
            'stocks': 'FOREXCOM:SPXUSD',
            'crypto': 'BINANCE:BTCUSDT',
            'bonds': 'TVC:US10Y'
        };

        if (s && s.endsWith && s.endsWith('.IS')) {
            return `BIST:${s.replace('.IS', '')}`;
        }
        if (s && s.endsWith && s.endsWith('USDT') && !s.includes(':')) {
            return `BINANCE:${s}`;
        }
        return mapping[s] || s;
    };

    const tvSymbol = getTVSymbol(symbol, currency);

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
                            Piyasa Sembolü: <span className="text-foreground">{tvSymbol.replace('BINANCE:', '').replace('TVC:', '')}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-4 w-full md:w-auto mt-4 md:mt-0">
                    {/* Live Search Bar for Quick Jump */}
                    <div className="relative flex-1 sm:w-64 group/search">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Piyasa Ara (örn: ROSEUSDT)"
                                value={searchSymbol}
                                onChange={(e) => setSearchSymbol(e.target.value)}
                                onFocus={() => setShowSuggestions(true)}
                                className="w-full bg-secondary/30 border border-border rounded-full py-2.5 pl-10 pr-4 text-sm font-bold placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors backdrop-blur-md uppercase placeholder:normal-case shadow-inner"
                            />
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/search:text-primary transition-colors" />
                        </div>

                        <AnimatePresence>
                            {showSuggestions && searchSymbol.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 5 }}
                                    className="absolute right-0 z-50 mt-2 w-64 md:w-80 bg-[#0c0c0e]/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
                                >
                                    {isSearching ? (
                                        <div className="px-5 py-3 text-xs text-muted-foreground font-medium italic animate-pulse flex items-center justify-center">
                                            <RefreshCw size={14} className="animate-spin mr-2" /> Taranıyor...
                                        </div>
                                    ) : liveSearchResults.length > 0 ? (
                                        liveSearchResults.slice(0, 5).map((s, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    setSearchSymbol('');
                                                    setShowSuggestions(false);
                                                    navigate(`/chart/${s.symbol}?name=${s.symbol}`);
                                                }}
                                                className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-black">
                                                        {s.symbol.substring(0, 1)}
                                                    </div>
                                                    <span className="text-sm font-bold text-foreground truncate max-w-[120px] text-left">{s.symbol}</span>
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50 shrink-0 ml-2">{s.market.substring(0,8)}</span>
                                            </button>
                                        ))
                                    ) : searchSymbol.length >= 2 && (
                                        <div className="px-5 py-3 text-xs text-muted-foreground font-medium italic">
                                            Sonuç bulunamadı: "{searchSymbol}"
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <button 
                        onClick={() => setCurrency(currency === 'USD' ? 'TRY' : 'USD')}
                        className="hidden md:flex items-center space-x-3 px-6 py-3 bg-secondary/80 border border-border text-foreground hover:border-primary/50 rounded-2xl transition-all shadow-xl group active:scale-95 shrink-0"
                    >
                        <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border group-hover:bg-primary/10 transition-all">
                             <Repeat size={16} className="text-primary" />
                        </div>
                        <span className="font-black italic uppercase tracking-tighter text-lg">{currency}</span>
                    </button>
                    <button className="hidden md:flex w-14 h-14 bg-secondary/50 border border-border rounded-2xl items-center justify-center text-muted-foreground hover:text-primary transition-all active:scale-90 shrink-0 cursor-pointer" onClick={() => window.open(window.location.href, '_blank', 'fullscreen=yes')}>
                        <Maximize2 size={24} />
                    </button>
                </div>
            </div>

            {/* Chart Container */}
            <div className="flex-1 glass-card relative group shadow-2xl overflow-hidden border-border/50">
                <iframe
                    title="TradingView Chart"
                    src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${tvSymbol}&interval=D&hidesidetoolbar=1&symboledit=1&saveimage=1&toolbarbg=f1f3f6&theme=dark&style=1&timezone=Etc%2FUTC&studies=[]&locale=tr`}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                />
                
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
