import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, RefreshCw, Trash2, TrendingUp, TrendingDown, DollarSign, Activity, Zap, ShieldCheck, PieChart, Target, AlertTriangle, ChevronRight, Filter } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import api from './api';
import { useLanguage } from './LanguageContext';

const AIPortfolio = () => {
  const { language } = useLanguage();
  const [portfolios, setPortfolios] = useState([]);
  const [activePortfolio, setActivePortfolio] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState(['TOTAL']);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ai-portfolio');
      setPortfolios(res);
      if (res.length > 0) {
        let active = res[0]; // newest is active
        try {
          if (typeof active.assets === 'string') {
            active.assets = JSON.parse(active.assets);
          }
        } catch (e) {
          console.error("Asset parse error:", e);
          active.assets = [];
        }
        setActivePortfolio(active);
        fetchHistory(active.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (id) => {
    try {
      const res = await api.get(`/ai-portfolio/${id}/history`);
      if (res.history) {
        setHistoryData(res.history);
        console.log("History Data Received:", res.history[0]); // Debug first point
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    console.log("Selected Assets Changed:", selectedAssets);
  }, [selectedAssets]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.post('/ai-portfolio');
      await fetchData();
    } catch (e) {
      alert("Hata oluştu, veriler eksik olabilir.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Bu referans portföyü silmek istediğinize emin misiniz?")) return;
    try {
      await api.delete(`/ai-portfolio/${id}`);
      setActivePortfolio(null);
      setHistoryData([]);
      fetchData();
    } catch (e) {
      alert("Hata oluştu.");
    }
  };

  const toggleAsset = (symbol) => {
    setSelectedAssets(prev => {
      // 1. If 'TOTAL' is clicked
      if (symbol === 'TOTAL') {
        if (prev.includes('TOTAL')) {
          if (prev.length === 1) return prev; // Keep at least one
          return prev.filter(s => s !== 'TOTAL');
        }
        return ['TOTAL']; // Switch to ONLY TOTAL view
      }

      // 2. If 'ALL' (not a symbol, just a helper logic might be added next)
      
      // 3. If a specific asset is clicked
      if (prev.includes(symbol)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter(s => s !== symbol);
      } else {
        // If only 'TOTAL' was selected, replace it with the specific asset for "Real Price Mode"
        if (prev.length === 1 && prev[0] === 'TOTAL') {
          return [symbol];
        }
        return [...prev, symbol];
      }
    });
  };

  const colors = ['#00f2fe', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#06b6d4', '#eab308'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card p-4 border border-border/50 text-xs shadow-2xl">
          <p className="font-black mb-3 text-primary uppercase tracking-widest border-b border-border/50 pb-2 italic text-[10px]">
            {new Date(label).toLocaleString()}
          </p>
          {payload.map((entry, index) => {
            const isRawPrice = entry.dataKey && entry.dataKey.endsWith('_raw');
            return (
              <div key={index} className="flex items-center justify-between space-x-6 mb-1.5">
                <span style={{ color: entry.color }} className="font-black italic uppercase tracking-tighter text-[9px]">
                    {isRawPrice ? entry.name.replace('_raw', '') : entry.name}
                </span>
                <span className="font-mono font-bold text-foreground text-[10px]">
                  {entry.name === 'Toplam Değer' ? '$' : ''}{Number(entry.value).toFixed(isRawPrice ? 2 : 2)}
                  {isRawPrice ? ' (Birim Fiyat)' : ''}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const latestValue = historyData.length > 0 ? historyData[historyData.length - 1].totalValue : (activePortfolio?.initialValue || 100);
  const profit = ((latestValue - 100) / 100) * 100;
  const isProfit = profit >= 0;

  return (
    <motion.div initial={{opacity: 0}} animate={{opacity: 1, x: 0.2}} className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Premium Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
         <div>
             <h1 className="text-4xl font-black tracking-tighter uppercase italic text-foreground flex items-center mb-1">
                 <Zap className="mr-3 text-primary" fill="currentColor" />
                 {language === 'TR' ? 'AI Portföy' : 'AI Portfolio'}
             </h1>
             <p className="text-muted-foreground font-medium text-sm max-w-2xl">
                 {language === 'TR' 
                  ? 'Küresel piyasa verileriyle optimize edilmiş, gerçek fiyat takipli referans portföy.' 
                  : 'Reference portfolio optimized with global market data and real-time tracking.'}
             </p>
         </div>

         <div className="flex gap-4 w-full md:w-auto">
            <button 
                onClick={handleGenerate} 
                disabled={generating} 
                className={`flex items-center space-x-3 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all border ${
                    generating 
                    ? 'bg-secondary/50 border-border text-muted-foreground' 
                    : 'bg-primary text-primary-foreground border-primary hover:scale-105 shadow-[0_0_30px_rgba(0,242,254,0.3)]'
                }`}
            >
                <RefreshCw size={18} className={generating ? "animate-spin" : ""} />
                <span>
                    {generating ? (language === 'TR' ? 'Strateji Üretiliyor...' : 'Generating...') : (language === 'TR' ? 'Yeni Portföy' : 'New Portfolio')}
                </span>
            </button>
         </div>
      </header>

      {/* Legal Disclaimer Banner */}
      <div className="bg-primary/5 border border-primary/20 p-6 rounded-3xl flex items-start space-x-6 relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <ShieldCheck size={120} />
          </div>
          <div className="bg-primary/20 p-3 rounded-2xl text-primary border border-primary/30">
              <ShieldCheck size={24} />
          </div>
          <div className="relative z-10">
              <h4 className="text-primary font-black uppercase tracking-widest text-sm mb-2 italic">
                  {language === 'TR' ? 'Yasal Uyarı (Disclaimer)' : 'Legal Disclaimer'}
              </h4>
              <p className="text-muted-foreground text-[10px] leading-relaxed font-medium">
                  {language === 'TR' 
                  ? 'YASAL UYARI: Bu sayfadaki AI Portföy verileri yatırım tavsiyesi değildir. Başlangıç tutarı $100 baz alınarak simüle edilir.' 
                  : 'DISCLAIMER: This AI Portfolio is for experimental/educational purposes based on a $100 hypothetical start.'}
              </p>
          </div>
      </div>

      {loading ? (
          <div className="flex flex-col items-center justify-center py-40 space-y-4">
             <div className="w-48 h-1 bg-secondary rounded-full overflow-hidden relative">
                <motion.div animate={{ x: [-200, 200] }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="absolute inset-0 bg-primary" />
             </div>
             <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Analizler Yükleniyor...</p>
          </div>
      ) : !activePortfolio ? (
          <div className="glass-card p-20 text-center flex flex-col items-center border border-dashed border-border/50 rounded-[40px]">
             <Bot size={64} className="text-muted-foreground/20 mb-6" />
             <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2">Strateji Mevcut Değil</h3>
             <p className="text-muted-foreground text-sm mb-8 max-w-sm">Global piyasaları tarayıp en yüksek puanlı varlıklarla portföy oluşturmak için ANALİZİ BAŞLAT butonuna basın.</p>
             <button onClick={handleGenerate} disabled={generating} className="bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-primary/20">
                ANALİZİ BAŞLAT
             </button>
          </div>
      ) : (
          <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, x: 0.2, opacity: 1 }} className="glass-card p-8 group hover:border-primary/50 transition-colors">
                       <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Mevcut Değer (Portfolio Value)</p>
                       <div className="flex items-baseline space-x-2">
                           <h2 className="text-4xl font-black tracking-tighter italic">${latestValue.toFixed(2)}</h2>
                           <span className="text-xs font-bold text-muted-foreground/60 uppercase">BASE: $100.00</span>
                       </div>
                   </motion.div>

                   <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, x: 0.2, opacity: 1 }} transition={{ delay: 0.1 }} className={`glass-card p-8 border-l-4 ${isProfit ? 'border-l-emerald-500 shadow-[inset_10px_0_20px_rgba(16,185,129,0.05)]' : 'border-l-rose-500 shadow-[inset_10px_0_20px_rgba(244,63,94,0.05)]'}`}>
                       <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Net PNL (%)</p>
                       <div className="flex items-baseline space-x-3">
                           <h2 className={`text-4xl font-black tracking-tighter italic ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                               {isProfit ? '+' : ''}{profit.toFixed(2)}%
                           </h2>
                           <span className={`text-xs font-bold ${isProfit ? 'text-emerald-500/60' : 'text-rose-500/60'}`}>
                               {isProfit ? 'Kâr' : 'Zarar'}
                           </span>
                       </div>
                   </motion.div>

                   <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, x: 0.2, opacity: 1 }} transition={{ delay: 0.2 }} className="glass-card p-8 relative overflow-hidden group">
                       <div className="flex justify-between items-start mb-3">
                           <p className="text-[10px] font-black uppercase tracking-widest text-primary italic flex items-center">
                               <RefreshCw size={10} className="mr-1"/> AI Analiz Özeti
                           </p>
                           <button onClick={() => handleDelete(activePortfolio.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-500 hover:text-rose-400 p-1.5 bg-rose-500/10 rounded-xl" title="Sil">
                               <Trash2 size={12}/>
                           </button>
                       </div>
                       <p className="text-[11px] text-muted-foreground leading-relaxed font-medium line-clamp-3 group-hover:line-clamp-none transition-all">
                           "{activePortfolio.rationale}"
                       </p>
                   </motion.div>
              </div>

              {/* Advanced Chart System */}
              <div className="glass-card p-8 rounded-[40px]">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                      <div>
                          <h3 className="text-2xl font-black uppercase italic tracking-tighter flex items-center">
                             <Activity className="mr-3 text-primary" size={24}/>
                             Performans Grafiği
                          </h3>
                          <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase mt-1">
                             {selectedAssets.length === 1 && selectedAssets[0] !== 'TOTAL' ? `${selectedAssets[0]} Varlığına Odaklanıldı` : 'Portföy Performans Analizi'}
                          </p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                         <button 
                            onClick={() => setSelectedAssets(['TOTAL', ...(activePortfolio?.assets || []).map(a => a.symbol)])}
                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${(selectedAssets.length === activePortfolio.assets.length + 1) ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary/50 border-border text-muted-foreground hover:bg-secondary'}`}
                         >
                             {language === 'TR' ? 'Hepsi' : 'All'}
                         </button>

                         <button 
                            onClick={() => toggleAsset('TOTAL')}
                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${selectedAssets.includes('TOTAL') ? 'border-primary text-primary bg-primary/10' : 'bg-secondary/20 border-border/30 text-muted-foreground hover:bg-secondary/40'}`}
                         >
                             {language === 'TR' ? 'Toplam' : 'Total'}
                         </button>

                         {(activePortfolio?.assets || []).map((asset, i) => (
                             <button 
                                key={asset.symbol}
                                onClick={() => toggleAsset(asset.symbol)}
                                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${selectedAssets.includes(asset.symbol) ? 'border-primary text-primary bg-primary/10' : 'bg-secondary/20 border-border/30 text-muted-foreground hover:bg-secondary/40'}`}
                             >
                                 {asset.symbol.split('USDT')[0]}
                             </button>
                         ))}
                      </div>
                  </div>

                  <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                              <XAxis 
                                  dataKey="date" 
                                  tickFormatter={(val) => {
                                      const d = new Date(val);
                                      return `${d.getDate()}/${d.getMonth()+1} ${d.getHours()}:00`;
                                  }}
                                  tick={{fontSize: 9, fill: '#666', fontWeight: 'bold'}} 
                                  tickLine={false} 
                                  axisLine={false} 
                                  minTickGap={25} 
                              />
                              <YAxis 
                                tickFormatter={(val) => `$${val}`} 
                                tick={{fontSize: 9, fill: '#666', fontFamily: 'monospace', fontWeight: 'bold'}} 
                                tickLine={false} 
                                axisLine={false} 
                                domain={['auto', 'auto']} 
                              />
                              <Tooltip content={<CustomTooltip />} cursor={{stroke: '#ffffff10', strokeWidth: 1}} />
                              
                               {/* Total Value Line */}
                               {selectedAssets.includes('TOTAL') && (
                                <Line 
                                    type="monotone" 
                                    dataKey="totalValue" 
                                    name={language === 'TR' ? 'Toplam Değer' : 'Total Value'}
                                    stroke="#00f2fe" 
                                    strokeWidth={4} 
                                    dot={false}
                                    strokeOpacity={selectedAssets.length > 1 ? 0.7 : 1}
                                    animationDuration={2000}
                                />
                               )}
 
                               {(activePortfolio?.assets || []).map((asset, i) => {
                                   const isSingleSelected = selectedAssets.length === 1 && selectedAssets[0] === asset.symbol;
                                   const dataKey = isSingleSelected ? `${asset.symbol}_raw` : asset.symbol;
                                   
                                   return selectedAssets.includes(asset.symbol) && (
                                     <Line 
                                         key={asset.symbol}
                                         type="monotone" 
                                         dataKey={dataKey} 
                                         name={isSingleSelected ? `${asset.symbol} (Fiyat)` : asset.symbol}
                                         stroke={colors[i % colors.length]} 
                                         strokeWidth={selectedAssets.length === 1 ? 4 : 2}
                                         strokeOpacity={selectedAssets.length === 1 ? 1 : 0.8}
                                         dot={false}
                                         animationDuration={1500}
                                     />
                                   );
                                })}
                              
                              <Legend wrapperStyle={{ fontSize: '9px', fontWeight: '900', paddingTop: '30px', textTransform: 'uppercase', fontStyle: 'italic' }} iconType="circle" />
                          </LineChart>
                      </ResponsiveContainer>
                  </div>
              </div>

              {/* Detailed Asset Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {activePortfolio.assets.map((asset, i) => {
                      const color = colors[i % colors.length];
                      return (
                          <motion.div 
                              initial={{ scale: 0.95, opacity: 0 }} 
                              whileInView={{ scale: 1, opacity: 1 }}
                              transition={{ delay: i * 0.05 }}
                              key={asset.symbol} 
                              onClick={() => toggleAsset(asset.symbol)}
                              className={`p-6 rounded-3xl border transition-all cursor-pointer group relative overflow-hidden ${selectedAssets.includes(asset.symbol) ? 'bg-primary/10 border-primary shadow-[0_0_40px_rgba(0,242,254,0.1)]' : 'bg-secondary/20 border-border/30 hover:border-border'}`}
                          >
                              {/* AI Score Badge */}
                              <div className="absolute top-4 right-4 flex flex-col items-end">
                                  <div className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">AI Score</div>
                                  <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-black text-xs ${
                                      (asset.aiScore || 0) > 70 ? 'border-emerald-500 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 
                                      'border-primary/30 text-primary'
                                  }`}>
                                      {Math.round(asset.aiScore || 0) || '-'}
                                  </div>
                              </div>

                              <div className="flex items-center space-x-4 mb-6">
                                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-[10px] text-white shadow-xl" style={{ backgroundColor: color }}>
                                      {asset.symbol.substring(0,3)}
                                  </div>
                                  <div>
                                      <p className="font-black text-lg uppercase italic tracking-tighter">{asset.symbol}</p>
                                      <div className="flex items-center space-x-2">
                                          <span className="text-[10px] font-black text-primary italic">%{Number(asset.allocation).toFixed(0)} Pay</span>
                                      </div>
                                  </div>
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                  <div className="bg-secondary/40 p-3 rounded-2xl border border-border/50">
                                      <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">Giriş</p>
                                      <p className="font-mono text-[10px] font-black italic tracking-tighter">
                                          {asset.entryPrice > 1 ? asset.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) : asset.entryPrice.toFixed(4)}
                                      </p>
                                  </div>
                                  <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20">
                                      <p className="text-[8px] font-black uppercase tracking-widest text-emerald-500 mb-1 flex items-center">Hedef</p>
                                      <p className="font-mono text-[10px] font-black text-emerald-500 italic tracking-tighter">
                                          {asset.targetPrice > 1 ? asset.targetPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) : asset.targetPrice?.toFixed(4) || '-'}
                                      </p>
                                  </div>
                                  <div className="bg-rose-500/10 p-3 rounded-2xl border border-rose-500/20">
                                      <p className="text-[8px] font-black uppercase tracking-widest text-rose-500 mb-1 flex items-center">Stop</p>
                                      <p className="font-mono text-[10px] font-black text-rose-500 italic tracking-tighter">
                                          {asset.stopLoss > 1 ? asset.stopLoss.toLocaleString(undefined, { maximumFractionDigits: 2 }) : asset.stopLoss?.toFixed(4) || '-'}
                                      </p>
                                  </div>
                                  
                              </div>
                              <div className="mt-4 flex items-center justify-between text-[8px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                                  <span>Miktar: {Number(asset.quantity || 0).toFixed(6)}</span>
                                   <ChevronRight size={12} className={`transition-transform ${selectedAssets.includes(asset.symbol) ? 'rotate-90' : ''}`} />
                              </div>
                          </motion.div>
                      );
                  })}
              </div>
          </div>
      )}
    </motion.div>
  );
};

export default AIPortfolio;
