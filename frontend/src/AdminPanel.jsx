import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    Database, Plus, Trash2, Globe, Server, 
    Rss, Code, ShieldCheck, Zap, ArrowRight, RefreshCw, Palette, CheckCircle2, XCircle
} from 'lucide-react';
import api from './api';
import { useTheme } from './ThemeContext';
import { useLanguage } from './LanguageContext';

const AdminPanel = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSource, setNewSource] = useState({
    name: '',
    type: 'NEWS_RSS',
    url: '',
  });

  useEffect(() => {
    fetchSources();
  }, []);

  const { primaryColor, updatePrimaryColor, hexToHSL, hslStringToHex } = useTheme();

  const handleColorChange = (e) => {
    const hex = e.target.value;
    updatePrimaryColor(hexToHSL(hex));
  };

  const presetColors = [
    { label: 'Neon Mavi', hex: '#00f2fe' },
    { label: 'Zehir Yeşili', hex: '#00fa9a' },
    { label: 'Cyber Punk', hex: '#ff00ff' },
    { label: 'Altın Sarısı', hex: '#ffd700' },
    { label: 'Kan Kırmızı', hex: '#ff003c' },
    { label: 'Pastel Mor', hex: '#b19cd9' },
    { label: 'Pastel Pembe', hex: '#ffb6c1' },
    { label: 'Buz Mavisi', hex: '#add8e6' },
    { label: 'Mint Yeşili', hex: '#98fb98' },
    { label: 'Gümüş Gri', hex: '#c0c0c0' },
    { label: 'Koyu Çelik', hex: '#708090' },
    { label: 'Platin', hex: '#e5e4e2' }
  ];

  const fetchSources = async () => {
    try {
      const data = await api.get('/admin/sources');
      // Merge with hardcoded defaults to ensure user always sees "official" sources too
      const hardcodedDefaults = [
        { id: 'def1', name: 'CNBC', url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html', type: 'NEWS_RSS', isDefault: true },
        { id: 'def2', name: 'Investing.com', url: 'https://www.investing.com/rss/news_25.rss', type: 'NEWS_RSS', isDefault: true },
        { id: 'def3', name: 'Cointelegraph', url: 'https://cointelegraph.com/rss/tag/bitcoin', type: 'NEWS_RSS', isDefault: true },
        { id: 'def4', name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', type: 'NEWS_RSS', isDefault: true }
      ];

      const allSources = [...hardcodedDefaults, ...data.map(s => ({ ...s, active: true }))];
      // Deduplicate by URL
      const uniqueSources = Array.from(new Map(allSources.map(item => [item.url, item])).values());
      setSources(uniqueSources);
    } catch (e) {
      console.error('Error fetching sources:', e);
      setSources([
        { id: 'def1', name: 'CNBC', url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html', type: 'NEWS_RSS', active: true, isDefault: true },
        { id: 'def2', name: 'Investing.com', url: 'https://www.investing.com/rss/news_25.rss', type: 'NEWS_RSS', active: true, isDefault: true },
        { id: 1, name: 'Bloomberg RSS', url: 'https://bloomberg.com/feed', type: 'NEWS_RSS', active: true },
        { id: 2, name: 'Binance API', url: 'https://api.binance.com/v3', type: 'MARKET_API', active: true }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSource = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/sources', newSource);
      setNewSource({ name: '', type: 'NEWS_RSS', url: '' });
      fetchSources();
    } catch (e) {
      console.error('Error adding source:', e);
    }
  };

  const handleDeleteSource = async (id) => {
    try {
      await api.delete(`/admin/sources/${id}`);
      fetchSources();
    } catch (e) {
      console.error('Error deleting source:', e);
    }
  };

  const toggleSourceActive = (id) => {
    // Optimistic un-sync toggle for frontend demonstration
    setSources(sources.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  return (
    <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12 pb-20"
    >
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">{t('SystemManagement')}</h1>
          <p className="text-muted-foreground font-medium mt-1">{t('SystemManagementDesc')}</p>
        </div>
        <div className="px-5 py-2.5 bg-primary/10 border border-primary/20 rounded-2xl flex items-center space-x-3 shadow-[0_0_20px_rgba(0,242,254,0.1)]">
            <ShieldCheck className="text-primary" size={20} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{t('AdminModeActive')}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        {/* Add New Source Form */}
        <div className="xl:col-span-1">
          <div className="glass-card p-10 sticky top-8 border-border/50">
            <div className="flex items-center space-x-4 mb-10">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                    <Plus className="text-primary" size={24} />
                </div>
                <h3 className="text-xl font-black uppercase italic tracking-tighter">{t('NewSource')}</h3>
            </div>
            
            <form onSubmit={handleAddSource} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t('SourceDescription')}</label>
                <input
                  type="text"
                  required
                  value={newSource.name}
                  onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                  placeholder="Örn: Bloomberg News"
                  className="w-full bg-secondary/30 border border-border rounded-2xl px-5 py-4 focus:border-primary/50 transition-all outline-none font-bold text-sm placeholder:opacity-20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t('DataType')}</label>
                <div className="relative">
                    <select
                        value={newSource.type}
                        onChange={(e) => setNewSource({ ...newSource, type: e.target.value })}
                        className="w-full bg-secondary/30 border border-border rounded-2xl px-5 py-4 focus:border-primary/50 transition-all outline-none font-bold text-sm appearance-none cursor-pointer"
                    >
                        <option value="NEWS_RSS">RSS Haber Kaynağı</option>
                        <option value="MARKET_API">Market API Servisi</option>
                        <option value="SCRAPER">Akıllı Web Scraper</option>
                    </select>
                    <ArrowRight className="absolute right-5 top-1/2 -translate-y-1/2 rotate-90 text-muted-foreground pointer-events-none" size={16} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t('EndpointURL')}</label>
                <input
                  type="url"
                  required
                  value={newSource.url}
                  onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                  placeholder="https://api.example.com/v1"
                  className="w-full bg-secondary/30 border border-border rounded-2xl px-5 py-4 focus:border-primary/50 transition-all outline-none font-bold text-sm placeholder:opacity-20"
                />
              </div>
              <button
                type="submit"
                className="w-full premium-button group flex items-center justify-center space-x-3 mt-4"
              >
                <Zap size={18} fill="currentColor" className="group-hover:animate-pulse" />
                <span className="uppercase tracking-tighter text-base">{t('ConnectSource')}</span>
              </button>
            </form>
          </div>

          <div className="glass-card p-10 mt-8 border-border/50">
            <div className="flex items-center space-x-4 mb-8">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                    <Palette className="text-primary" size={24} />
                </div>
                <h3 className="text-xl font-black uppercase italic tracking-tighter">{t('AppearanceTheme')}</h3>
            </div>
            
            <div className="space-y-6">
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Ana Renk (Primary)</label>
                    <div className="flex items-center space-x-4">
                        <div className="relative w-14 h-14 rounded-2xl overflow-hidden border-2 border-border group">
                            <input 
                                type="color" 
                                value={hslStringToHex(primaryColor)} 
                                onChange={handleColorChange}
                                className="absolute -top-4 -left-4 w-24 h-24 cursor-pointer"
                            />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold">{hslStringToHex(primaryColor).toUpperCase()}</p>
                            <p className="text-xs text-muted-foreground mt-1">Sistemin tüm neon ışık efeklerini değiştirir</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Hazır Paletler</label>
                    <div className="flex flex-wrap gap-3">
                        {presetColors.map((preset) => (
                            <button
                                key={preset.hex}
                                onClick={() => updatePrimaryColor(hexToHSL(preset.hex))}
                                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border border-border/50 hover:border-border transition-all flex items-center space-x-2"
                            >
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.hex }} />
                                <span>{preset.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
          </div>
        </div>

        {/* Sources List */}
        <div className="xl:col-span-2 space-y-8">
          <div className="flex items-center justify-between mb-2 px-2">
            <div className="flex items-center space-x-3">
                <Database className="text-primary" size={20} />
                <h3 className="text-2xl font-black uppercase italic tracking-tighter">{t('ActiveInfrastructure')}</h3>
            </div>
            <div className="px-3 py-1 bg-secondary/50 border border-border rounded-full italic">
                <span className="text-[10px] font-black uppercase text-muted-foreground">{sources.length} {t('Records')}</span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
                <RefreshCw className="animate-spin text-primary/30" size={40} />
            </div>
          ) : sources.length === 0 ? (
            <div className="glass-card p-20 text-center flex flex-col items-center space-y-4 border-dashed border-border/50">
                <Globe className="text-muted-foreground/20 w-16 h-16" />
                <p className="text-muted-foreground font-black uppercase tracking-widest italic opacity-30 text-xs">{t('NoDynamicSources')}</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {sources.map((source, idx) => (
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    key={source.id} 
                    onClick={(e) => {
                        if (e.target.closest('button')) return; // Ignore button clicks
                        if (source.type === 'NEWS_RSS') {
                           navigate(`/news?source=${encodeURIComponent(source.name)}`);
                        }
                    }}
                    className={`glass-card p-8 flex flex-col sm:flex-row justify-between items-center group transition-all shadow-xl border-border/50 ${source.type === 'NEWS_RSS' ? 'cursor-pointer hover:border-primary/50 hover:shadow-primary/10' : 'hover:border-primary/20 hover:shadow-primary/5'}`}
                >
                  <div className="flex items-center space-x-6 w-full sm:w-auto">
                    <div className="w-14 h-14 bg-secondary/50 rounded-2xl flex items-center justify-center border border-border group-hover:border-primary/30 transition-all text-muted-foreground group-hover:text-primary shadow-inner">
                      {source.type === 'NEWS_RSS' ? <Rss size={24} /> : source.type === 'MARKET_API' ? <Code size={24} /> : <Server size={24} />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-black text-xl italic uppercase tracking-tighter leading-none">{source.name}</h4>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1.5 opacity-40 truncate max-w-[200px] md:max-w-md">{source.url}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 mt-6 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
                    
                    {/* Active/Passive Toggle Switch */}
                    <button 
                        onClick={() => toggleSourceActive(source.id)}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all ${
                            source.active 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        }`}
                    >
                        {source.active ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                        <span className="text-[10px] font-black tracking-widest uppercase">
                            {source.active ? t('Active') : t('Passive')}
                        </span>
                    </button>

                    <span className={`text-[9px] font-black px-4 py-1.5 rounded-full border tracking-[0.2em] uppercase italic hidden md:inline-block ${
                      source.type === 'NEWS_RSS' ? 'bg-blue-500/5 border-blue-500/20 text-blue-400' : 
                      source.type === 'MARKET_API' ? 'bg-amber-500/5 border-amber-500/20 text-amber-500' : 
                      'bg-purple-500/5 border-purple-500/20 text-purple-400'
                    }`}>
                      {source.type.replace('_', ' ')}
                    </span>
                    {!source.isDefault && (
                      <button 
                        onClick={() => handleDeleteSource(source.id)}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-rose-500/5 border border-rose-500/10 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/20 hover:border-rose-500/30 transition-all group/btn"
                      >
                        <Trash2 size={20} className="group-hover/btn:scale-110 transition-transform" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AdminPanel;
