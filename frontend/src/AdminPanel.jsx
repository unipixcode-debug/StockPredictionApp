import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, Database, Globe, RefreshCw, Trash2, Plus, 
  ArrowRight, ShieldCheck, CheckCircle2, Rss, 
  Code, Server, Palette, 
  Coins, XCircle, History, User
} from 'lucide-react';
import api from './api';
import { useLanguage } from './LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const AdminPanel = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { user, toggleSubscription } = useAuth();
  
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSource, setNewSource] = useState({ name: '', type: 'NEWS_RSS', url: '' });
  
  const [systemCosts, setSystemCosts] = useState([]);
  const [primaryColor, setPrimaryColor] = useState('210 100% 50%');
  
  // Personal Credit History State
  const [personalHistory, setPersonalHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // User Management State
  const [usersList, setUsersList] = useState([]);
  const [showUsers, setShowUsers] = useState(false);

  useEffect(() => {
    fetchSources();
    fetchPricing();
    fetchTheme();
    fetchPersonalHistory();
  }, [user]);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/sources');
      setSources(data);
    } catch (e) {
      console.error('Error fetching sources:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTheme = async () => {
    try {
      const settings = await api.get('/admin/settings');
      const primary = settings.find(s => s.key === 'primary_color');
      if (primary) setPrimaryColor(primary.value);
    } catch (e) {
      console.error('Error fetching theme:', e);
    }
  };

  const fetchPricing = async () => {
    try {
      const settings = await api.get('/admin/settings');
      const costKeys = ['monthly_newsletter_cost', 'monthly_money_flow_cost', 'monthly_auto_prediction_cost'];
      setSystemCosts(settings.filter(s => costKeys.includes(s.key)));
    } catch (e) {
      console.error('Error fetching pricing:', e);
    }
  };

  const fetchPersonalHistory = async () => {
    // Mocking personal history from user object deduction dates since we don't have a CreditLog table
    setLoadingHistory(true);
    try {
        const fullUser = await api.get('/auth/current_user');
        const history = [];
        if (fullUser.lastNewsletterDeduction) history.push({ date: fullUser.lastNewsletterDeduction, action: 'Haber Bülteni Aboneliği', amount: -5 });
        if (fullUser.lastMoneyFlowDeduction) history.push({ date: fullUser.lastMoneyFlowDeduction, action: 'Para Akışı AI Aboneliği', amount: -5 });
        if (fullUser.lastAutoPredictionDeduction) history.push({ date: fullUser.lastAutoPredictionDeduction, action: 'Otomatik Tahmin Aboneliği', amount: -5 });
        
        // Add a mock welcome bonus
        history.push({ date: fullUser.createdAt, action: 'Hoşgeldin Bonusu', amount: 50 });
        
        history.sort((a,b) => new Date(b.date) - new Date(a.date));
        setPersonalHistory(history);
    } catch (e) {
      console.error('Error fetching history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleToggleSubscription = async (featureKey) => {
    const isCurrentlySubscribed = 
        (featureKey === 'newsletter' && user.newsletterSubscribed) ||
        (featureKey === 'autoPrediction' && user.autoPredictionSubscribed) ||
        (featureKey === 'moneyFlow' && user.moneyFlowSubscribed);

    let cost = 5;
    if (featureKey === 'newsletter') cost = systemCosts.find(c => c.key === 'monthly_newsletter_cost')?.value || 5;
    if (featureKey === 'autoPrediction') cost = systemCosts.find(c => c.key === 'monthly_auto_prediction_cost')?.value || 5;
    if (featureKey === 'moneyFlow') cost = systemCosts.find(c => c.key === 'monthly_money_flow_cost')?.value || 5;

    if (!isCurrentlySubscribed) {
        if (!window.confirm(`Emin misiniz? Hesabınızdan aylık ${cost} kredi düşülecektir.`)) {
            return;
        }
    }

    try {
        await toggleSubscription(featureKey, isCurrentlySubscribed ? 'unsubscribe' : 'subscribe');
        fetchPersonalHistory(); // Refresh history table
    } catch (e) {
        alert('İşlem başarısız. Krediniz yetersiz olabilir.');
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

  const toggleSourceActive = async (id) => {
    const source = sources.find(s => s.id === id);
    if (!source) return;
    
    // Optimistic UI update
    setSources(sources.map(s => s.id === id ? { ...s, active: !s.active, isActive: !s.isActive } : s));
    
    try {
        await api.put(`/admin/sources/${id}/active`, { active: !source.isActive && !source.active });
        fetchSources(); // Refresh actual state from server
    } catch (e) {
        console.error('Error toggling source:', e);
        // Revert on error
        setSources(sources.map(s => s.id === id ? { ...s, active: source.active, isActive: source.isActive } : s));
    }
  };
  const updatePrimaryColor = async (hslValue) => {
    setPrimaryColor(hslValue);
    document.documentElement.style.setProperty('--primary', hslValue);
    try {
      await api.post('/admin/settings', { key: 'primary_color', value: hslValue });
    } catch (e) {
      console.error('Error saving color:', e);
    }
  };

  const hslStringToHex = (hsl) => {
    if (!hsl) return '#00F2FE';
    const matches = hsl.match(/\d+/g);
    if (!matches || matches.length < 3) return '#00F2FE';
    const [h, s, l] = matches.map(Number);
    const a = s * Math.min(l, 100 - l) / 10000;
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l / 100 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  const hexToHSL = (hex) => {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) h = s = 0;
    else {
      let d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
        default: break;
      }
      h /= 6;
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const handleColorChange = (e) => {
    const hex = e.target.value;
    updatePrimaryColor(hexToHSL(hex));
  };

  const presetColors = [
    // Neons & Brights
    { label: 'Neon Cyan', hex: '#00F2FE' },
    { label: 'Cyber Pink', hex: '#FF00FF' },
    { label: 'Electric Blue', hex: '#0066FF' },
    { label: 'Laser Green', hex: '#39FF14' },
    { label: 'Vivid Amber', hex: '#F59E0B' },
    { label: 'Hot Crimson', hex: '#E11D48' },
    
    // Pastels
    { label: 'Pastel Mint', hex: '#A7F3D0' },
    { label: 'Lavender', hex: '#C4B5FD' },
    { label: 'Peach', hex: '#FDBA74' },
    { label: 'Ice Blue', hex: '#BAE6FD' },
    { label: 'Soft Rose', hex: '#FECDD3' },
    
    // Rich & Deep
    { label: 'Royal Purple', hex: '#7C3AED' },
    { label: 'Midnight Blue', hex: '#1E3A8A' },
    { label: 'Emerald Deep', hex: '#064E3B' },
    { label: 'Ruby Red', hex: '#881337' },
    { label: 'Gold Leaf', hex: '#B45309' },
    
    // Dark & Stealth
    { label: 'Onyx Black', hex: '#09090B' },
    { label: 'Charcoal', hex: '#18181B' },
    { label: 'Slate Gray', hex: '#334155' },
    { label: 'Deep Zinc', hex: '#27272A' },
    { label: 'Dark Navy', hex: '#0F172A' },
    
    // Earth & Nature
    { label: 'Forest Green', hex: '#15803D' },
    { label: 'Terracotta', hex: '#C2410C' },
    { label: 'Ocean Blue', hex: '#0369A1' },
    { label: 'Sand', hex: '#D6D3D1' },
    { label: 'Olive', hex: '#4D7C0F' },
    
    // Vibrant Accents
    { label: 'Fuchsia', hex: '#D946EF' },
    { label: 'Lime Splash', hex: '#A3E635' },
    { label: 'Sky Blue', hex: '#38BDF8' },
    { label: 'Warm Orange', hex: '#F97316' }
  ];
  return (
    <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12 pb-20"
    >
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">Ayarlar</h1>
          <p className="text-muted-foreground font-medium mt-1">Hizmet yönetimi ve sistem tercihleri</p>
        </div>
        <div className="flex items-center gap-3">
            {user?.role === 'developer' && (
                <Link to="/developer" className="px-5 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center space-x-3 hover:bg-amber-500/20 transition-all">
                    <Database className="text-amber-400" size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Geliştirici Paneli</span>
                </Link>
            )}
            <div className="px-5 py-2.5 bg-primary/10 border border-primary/20 rounded-2xl flex items-center space-x-3 shadow-[0_0_20px_rgba(0,242,254,0.1)]">
                <ShieldCheck className="text-primary" size={20} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Sistem Yönetimi</span>
            </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="flex items-center space-x-1 p-1 bg-secondary/20 rounded-[1.5rem] w-fit border border-border/40">
        <button className="px-8 py-3 rounded-[1.2rem] text-xs font-black uppercase tracking-widest bg-primary text-primary-foreground shadow-lg">
           Genel Ayarlar
        </button>
        {user?.role === 'developer' && (
            <button 
                onClick={() => navigate('/developer')}
                className="px-8 py-3 rounded-[1.2rem] text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all"
            >
               Geliştirici (Core)
            </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-1">
          <div className="glass-card p-10 sticky top-8 border-border/50">
            <div className="flex items-center space-x-4 mb-10">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                    <Plus className="text-primary" size={24} />
                </div>
                <h3 className="text-xl font-black uppercase italic tracking-tighter">{t('NewSource')}</h3>
            </div>
            
            {user?.role === 'admin' || user?.role === 'developer' ? (
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
            ) : (
                <p className="text-xs text-muted-foreground">Sadece yetkili hesaplar yeni kaynak ekleyebilir.</p>
            )}
          </div>

          <div className="glass-card p-10 mt-8 border-border/50">
            <div className="flex items-center space-x-4 mb-8">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                    <User className="text-primary" size={24} />
                </div>
                <h3 className="text-xl font-black uppercase italic tracking-tighter">Kullanıcı Yönetimi</h3>
            </div>
            
            <div className="space-y-4">
                <button 
                    onClick={async () => {
                        try {
                            const users = await api.get('/admin/users');
                            setUsersList(users);
                            setShowUsers(true);
                        } catch (e) {
                            alert('Kullanıcılar yüklenemedi');
                        }
                    }}
                    className="w-full py-4 bg-secondary/30 border border-dashed border-border rounded-2xl font-black uppercase tracking-widest text-[10px] hover:border-primary/40 transition-all"
                >
                    Kullanıcı Listesini Yükle / Yönet
                </button>
                
                {showUsers && (
                    <div className="space-y-4 pt-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {usersList.map(u => (
                            <div key={u.id} className="p-4 rounded-2xl bg-secondary/10 border border-border/40 flex justify-between items-center group">
                                <div className="min-w-0">
                                    <p className="text-sm font-black truncate">{u.name || (u.email.split('@')[0])}</p>
                                    <p className="text-[10px] opacity-40 uppercase font-bold">{u.email}</p>
                                    <div className="flex items-center space-x-2 mt-2">
                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                            u.role === 'developer' ? 'border-primary/40 bg-primary/10 text-primary' : 
                                            u.role === 'admin' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 
                                            'border-border/40 text-muted-foreground'
                                        }`}>
                                            {u.role}
                                        </span>
                                        <span className="text-[8px] font-black uppercase text-muted-foreground opacity-40">{u.credits} CR</span>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <select 
                                        value={u.role}
                                        onChange={async (e) => {
                                            const newRole = e.target.value;
                                            try {
                                                await api.put(`/admin/users/${u.id}/role`, { role: newRole });
                                                setUsersList(usersList.map(item => item.id === u.id ? { ...item, role: newRole } : item));
                                            } catch (err) {
                                                alert('Yetki yetersiz veya bağlantı hatası');
                                            }
                                        }}
                                        className="bg-background/50 border border-border rounded-lg text-[8px] font-black uppercase p-1.5 outline-none focus:border-primary/50"
                                    >
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                        <option value="developer">Developer</option>
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
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
                        if (e.target.closest('button')) return;
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
                    {(user?.role === 'admin' || user?.role === 'developer') && (
                        <button 
                            onClick={() => toggleSourceActive(source.id)}
                            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all ${
                                source.active || source.isActive 
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                            }`}
                        >
                            {source.active || source.isActive ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                            <span className="text-[10px] font-black tracking-widest uppercase">
                                {source.active || source.isActive ? t('Active') : t('Passive')}
                            </span>
                        </button>
                    )}
                    {(user?.role === 'admin' || user?.role === 'developer') && !source.isDefault && (
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

      <div className="premium-card p-6 mt-8 border border-border">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 rounded-2xl bg-primary/10"><Zap className="text-primary" size={20} /></div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight">Kişisel Abonelikler</h3>
            <p className="text-xs text-muted-foreground">Otomatik AI hizmetlerini yönetin</p>
          </div>
        </div>
        <div className="space-y-4">
          {[
            { key: 'newsletter', label: 'Haber Akışı (News)', desc: 'Gerçek zamanlı gelişmiş piyasa haberleri.', isEnabled: user?.newsletterSubscribed },
            { key: 'autoPrediction', label: 'Otomatik Tahmin', desc: 'Arka planda periyodik tahmin üretim sağlar.', isEnabled: user?.autoPredictionSubscribed },
            { key: 'moneyFlow', label: 'Money Flow AI Analizi', desc: 'Anlık para akışı grafiklerinin AI analizleri açılır.', isEnabled: user?.moneyFlowSubscribed },
          ].map(feat => (
            <div key={feat.key} className="flex items-center justify-between p-4 rounded-2xl bg-secondary/20 border border-border">
              <div>
                <p className="text-sm font-bold">{feat.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{feat.desc}</p>
              </div>
              <button
                onClick={() => handleToggleSubscription(feat.key)}
                className={`relative w-12 h-6 rounded-full transition-all ${
                  feat.isEnabled ? 'bg-primary' : 'bg-secondary'
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${
                  feat.isEnabled ? 'left-7' : 'left-1'
                }`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="premium-card p-6 mt-8 border border-border">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10"><History className="text-emerald-400" size={20} /></div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight">Kredi Harcama Geçmişi</h3>
              <p className="text-xs text-muted-foreground">Hesabınızdaki son işlemler</p>
            </div>
          </div>
          <button onClick={fetchPersonalHistory} className="text-xs font-bold text-primary"><RefreshCw size={14} /></button>
        </div>
        
        {loadingHistory ? (
            <div className="text-center py-8 text-sm">Yükleniyor...</div>
        ) : personalHistory.length === 0 ? (
            <div className="text-center py-8 text-sm opacity-50 font-bold">Herhangi bir işlem bulunamadı.</div>
        ) : (
          <div className="space-y-3">
            {personalHistory.map((item, index) => (
              <div key={index} className="p-3 rounded-xl bg-secondary/10 border border-border/50 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <Coins size={12} className={item.amount > 0 ? "text-emerald-400" : "text-rose-400"} />
                  <div>
                    <span className="text-sm font-bold">{item.action}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-black ${item.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.amount > 0 ? '+' : ''}{item.amount}
                  </p>
                  <div className="text-[9px] opacity-40 uppercase">
                    {new Date(item.date).toLocaleString('tr-TR')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


    </motion.div>
  );
};

export default AdminPanel;
