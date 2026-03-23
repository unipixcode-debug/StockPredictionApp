import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, RefreshCw, Trash2, TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ai-portfolio');
      setPortfolios(res);
      if (res.length > 0) {
        const active = res[0]; // newest is active
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
      }
    } catch (e) {
      console.error(e);
    }
  };

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

  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#06b6d4', '#eab308'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card p-4 border border-border/50 text-xs shadow-2xl">
          <p className="font-black mb-3 text-primary uppercase tracking-widest border-b border-border/50 pb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between space-x-6 mb-1.5">
              <span style={{ color: entry.color }} className="font-bold">{entry.name}</span>
              <span className="font-mono font-bold text-foreground">{Number(entry.value).toFixed(2)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const latestValue = historyData.length > 0 ? historyData[historyData.length - 1].totalValue : (activePortfolio?.initialValue || 100);
  const profit = ((latestValue - 100) / 100) * 100;
  const isProfit = profit >= 0;

  return (
    <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
         <div>
             <div className="flex items-center space-x-3 mb-2">
                 <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary border border-primary/30">
                     <Bot size={24} />
                 </div>
                 <h1 className="text-4xl font-black tracking-tighter uppercase italic text-foreground">
                     {language === 'TR' ? 'AI Portföy' : 'AI Portfolio'}
                 </h1>
             </div>
             <p className="text-muted-foreground font-medium text-sm max-w-2xl">
                 {language === 'TR' ? 'Makroekonomik indikatörler ve duyarlılık analizine dayanarak oluşturulmuş yapay zeka referans (100 Birim) portföyü ve tarihsel performans simülasyonu.' : 'AI reference 100-unit portfolio and historical performance simulation based on macroeconomic indicators and sentiment analysis.'}
             </p>
         </div>

         <button onClick={handleGenerate} disabled={generating} className="premium-button flex items-center space-x-2 whitespace-nowrap shadow-[0_0_30px_rgba(0,242,254,0.3)] hover:scale-105 transition-transform">
             <RefreshCw size={18} className={generating ? "animate-spin" : ""} />
             <span className="uppercase tracking-widest text-xs font-black">
                 {generating ? (language === 'TR' ? 'Analiz Ediliyor...' : 'Analyzing...') : (language === 'TR' ? 'Yeni Portföy Oluştur' : 'Generate New')}
             </span>
         </button>
      </header>

      {/* Legal Disclaimer Banner */}
      <div className="bg-amber-500/10 border border-amber-500/20 p-5 md:p-6 rounded-2xl flex items-start space-x-5 shadow-2xl">
          <div className="text-amber-500 mt-1 shrink-0 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
              <svg fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
                 <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
          </div>
          <div>
              <h4 className="text-amber-500 font-black uppercase tracking-widest text-sm mb-2">
                  {language === 'TR' ? 'Yasal Uyarı (Disclaimer)' : 'Legal Disclaimer'}
              </h4>
              <p className="text-muted-foreground text-xs leading-relaxed text-amber-500/80">
                  {language === 'TR' 
                  ? 'YASAL UYARI: Bu sayfada sunulan AI Portföy dağılımları ve stratejik analizler hiçbir şekilde yatırım tavsiyesi, danışmanlık hizmeti veya finansal yönlendirme niteliği taşımamaktadır. Bu modül, yalnızca uygulamanın makroekonomik metriklerini, algoritmik veri işleme kapasitesini ve yapay zeka entegrasyonunu test etmek amacıyla deneysel olarak geliştirilmiş bir kontrol sistemidir. Alınacak her türlü yatırım kararı tamamen kullanıcının kendi sorumluluğunda olup, sistem hiçbir hukuki veya maddi mesuliyet kabul etmez.' 
                  : 'DISCLAIMER: The AI Portfolio allocations and strategic analyses presented on this page do not constitute investment advice, consulting services, or financial guidance in any way. This module is an experimental control system developed solely to test the application\'s macroeconomic metrics, algorithmic data processing capacity, and artificial intelligence integration. Any execution based on this data is entirely at the user\'s own risk, and the system accepts no legal or financial liability.'}
              </p>
          </div>
      </div>

      {loading ? (
          <div className="flex items-center justify-center py-32">
             <Activity className="animate-pulse text-primary/30" size={48} />
          </div>
      ) : !activePortfolio ? (
          <div className="glass-card p-20 text-center flex flex-col items-center border border-dashed border-border/50">
             <Bot size={64} className="text-muted-foreground/30 mb-6" />
             <h3 className="text-xl font-black uppercase mb-2">Aktif Portföy Bulunamadı</h3>
             <p className="text-muted-foreground mb-6 max-w-md mx-auto">Yapay zekanın piyasaları analiz edip size özel, dengeli bir hedef portföy stratejisi oluşturması için "Yeni Portföy Oluştur" butonuna tıklayın.</p>
             <button onClick={handleGenerate} disabled={generating} className="premium-button px-8">PORTFÖYÜ BAŞLAT</button>
          </div>
      ) : (
          <div className="space-y-8">
              {/* Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="glass-card p-6 flex flex-col justify-center space-y-1 relative">
                       <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 flex items-center justify-between">
                           <span>Portföy Değeri</span>
                       </p>
                       <div className="flex items-end space-x-2">
                           <h2 className="text-3xl font-black tracking-tighter font-mono">${latestValue.toFixed(2)}</h2>
                       </div>
                       <p className="text-xs font-bold text-muted-foreground opacity-70">BAŞLANGIÇ: $100.00</p>
                   </div>

                   <div className="glass-card p-6 flex flex-col justify-center space-y-1 relative">
                       <div className="flex justify-between items-start">
                           <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                               {language === 'TR' ? '72 Saatlik Getiri (Net)' : '72 Hour Return (Net)'}
                           </p>
                           <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${isProfit ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
                               {isProfit ? <TrendingUp className="text-emerald-500" size={14} /> : <TrendingDown className="text-rose-500" size={14} />}
                           </div>
                       </div>
                       <div className="flex items-baseline space-x-2">
                           <h2 className={`text-3xl font-black tracking-tighter font-mono ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                               {isProfit ? '+$' : '-$'}{Math.abs(latestValue - 100).toFixed(2)}
                           </h2>
                           <p className={`text-sm font-bold opacity-80 ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                               ({isProfit ? '+' : ''}{profit.toFixed(2)}%)
                           </p>
                       </div>
                   </div>

                   <div className="glass-card p-6 flex flex-col justify-center relative overflow-hidden group">
                       <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 flex items-center justify-between">
                           <span><Bot size={12} className="inline mr-1"/> {language === 'TR' ? 'Yapay Zeka Özeti ve Strateji' : 'AI Summary & Strategy'}</span>
                           <button onClick={() => handleDelete(activePortfolio.id)} className="text-rose-500/50 hover:text-rose-500 p-1 bg-rose-500/10 rounded-lg transition-colors" title="Portföyü Sil"><Trash2 size={12}/></button>
                       </p>
                       <p className="text-xs text-muted-foreground italic leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">
                           "{activePortfolio.rationale}"
                       </p>
                   </div>
              </div>

              {/* Main Total Value Chart */}
              <div className="glass-card p-6 md:p-8">
                  <h3 className="text-xl font-black uppercase italic tracking-tighter mb-8 flex items-center">
                     <Activity className="mr-3 text-primary" size={20}/>
                     {language === 'TR' ? 'Portföy Performansı (Toplam Değer)' : 'Portfolio Performance'}
                  </h3>
                  <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <defs>
                                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor={isProfit ? "#10b981" : "#00f2fe"} stopOpacity={0.3}/>
                                      <stop offset="95%" stopColor={isProfit ? "#10b981" : "#00f2fe"} stopOpacity={0}/>
                                  </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                              <XAxis 
                                  dataKey="date" 
                                  tickFormatter={(val) => {
                                      const d = new Date(val);
                                      return `${d.getDate()}/${d.getMonth()+1} ${d.getHours().toString().padStart(2,'0')}:00`;
                                  }}
                                  tick={{fontSize: 10, fill: '#888'}} 
                                  tickLine={false} 
                                  axisLine={false} 
                                  minTickGap={30} 
                              />
                              <YAxis tickFormatter={(val) => `$${val}`} tick={{fontSize: 10, fill: '#888', fontFamily: 'monospace'}} tickLine={false} axisLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
                              <Tooltip content={<CustomTooltip />} />
                              <Area type="monotone" dataKey="totalValue" name="Toplam Değer" stroke={isProfit ? "#10b981" : "#00f2fe"} strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                          </AreaChart>
                      </ResponsiveContainer>
                  </div>
              </div>

              {/* Asset Allocation & Detailed Breakdown Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Allocation List */}
                  <div className="lg:col-span-4 glass-card p-6 flex flex-col h-full">
                      <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-6">Varlık Dağılımı</h3>
                      <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                          {activePortfolio.assets.map((asset, i) => {
                              const color = colors[i % colors.length];
                              return (
                                  <div key={asset.symbol} className="bg-secondary/30 p-4 rounded-2xl flex items-center justify-between border border-border/50 hover:border-border transition-colors group">
                                      <div className="flex items-center space-x-3">
                                          <div className="w-4 h-4 rounded-full border-2 border-background shadow-lg" style={{ backgroundColor: color }} />
                                          <div>
                                              <p className="font-black text-sm text-foreground">{asset.symbol}</p>
                                          </div>
                                      </div>
                                      <div className="text-right">
                                          <p className="font-black font-mono text-base text-foreground" style={{ color: color }}>{Number(asset.allocation).toFixed(0)}%</p>
                                          <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">
                                              Miktar: {Number(asset.quantity || 0).toFixed(4)}
                                          </p>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>

                  {/* Multi-Line Chart for Individual Assets */}
                  <div className="lg:col-span-8 glass-card p-6 flex flex-col h-full">
                      <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-6">Alt Varlık Trendleri (Birim Katkısı)</h3>
                      <div className="h-[320px] w-full flex-1">
                          <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                  <XAxis 
                                      dataKey="date" 
                                      tickFormatter={(val) => {
                                          const d = new Date(val);
                                          return `${d.getDate()}/${d.getMonth()+1} ${d.getHours().toString().padStart(2,'0')}:00`;
                                      }}
                                      tick={{fontSize: 10, fill: '#888'}} 
                                      tickLine={false} 
                                      axisLine={false} 
                                      minTickGap={30} 
                                  />
                                  <YAxis tick={{fontSize: 10, fill: '#888', fontFamily: 'monospace'}} tickLine={false} axisLine={false} />
                                  <Tooltip content={<CustomTooltip />} />
                                  <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} iconType="circle" />
                                  
                                  {activePortfolio.assets.map((asset, i) => (
                                      <Line 
                                          key={asset.symbol}
                                          type="monotone" 
                                          dataKey={asset.symbol} 
                                          name={asset.symbol}
                                          stroke={colors[i % colors.length]} 
                                          strokeWidth={2}
                                          dot={false}
                                          activeDot={{ r: 6, strokeWidth: 0 }}
                                      />
                                  ))}
                              </LineChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </motion.div>
  );
};

export default AIPortfolio;
