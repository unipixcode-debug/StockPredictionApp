import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Palette, Lock, History, Terminal, CheckCircle2, RefreshCw, Zap, Cpu, Wifi, WifiOff, AlertTriangle, Bot, Star, Plus, Trash2, Coins
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from './api';
import { useLanguage } from './LanguageContext';
import { useAuth } from './AuthContext';

const DeveloperPanel = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [systemCosts, setSystemCosts] = useState([]);
  const [adminLogs, setAdminLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingAdminLogs, setLoadingAdminLogs] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [savingCost, setSavingCost] = useState(false);
  const [costSaved, setCostSaved] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [aiStatus, setAiStatus] = useState(null);
  const [loadingAiStatus, setLoadingAiStatus] = useState(false);
  const [aiStatusError, setAiStatusError] = useState(null);
  const [packageSettings, setPackageSettings] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(false);

  useEffect(() => {
    fetchSystemCosts();
    fetchAdminLogs();
    fetchUsers();
    fetchAiStatus();
    fetchPackages();
  }, []);

  const fetchSystemCosts = async () => {
    try {
      const settings = await api.get('/admin/settings');
      const costKeys = ['welcome_bonus', 'cost_per_prediction', 'monthly_newsletter_cost', 'monthly_money_flow_cost', 'monthly_auto_prediction_cost'];
      setSystemCosts(settings.filter(s => costKeys.includes(s.key)));
    } catch (e) {
      console.error('Error fetching system costs:', e);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await api.get('/admin/users');
      setUsers(data);
    } catch (e) {
      console.error('Error fetching users:', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchAdminLogs = async () => {
    setLoadingAdminLogs(true);
    try {
      const data = await api.get('/admin/logs');
      setAdminLogs(data);
    } catch (e) {
      console.error('Error fetching admin logs:', e);
    } finally {
      setLoadingAdminLogs(false);
    }
  };

  const fetchAiStatus = async () => {
    setLoadingAiStatus(true);
    setAiStatusError(null);
    try {
      const data = await api.get('/admin/ai-status');
      setAiStatus(data);
    } catch (e) {
      console.error('Error fetching AI status:', e);
      setAiStatusError(e.response?.data?.error || e.message);
    } finally {
      setLoadingAiStatus(false);
    }
  };

  const triggerAiSync = async () => {
    setLoadingAiStatus(true);
    try {
      await api.post('/admin/ai-sync');
      // Wait a bit then refresh status to see progress
      setTimeout(fetchAiStatus, 2000);
      setTimeout(fetchAiStatus, 5000);
    } catch (e) {
      console.error('Error triggering AI sync:', e);
    } finally {
      // Don't set loading false immediately to show sync is starting
    }
  };

  const fetchPackages = async () => {
    setLoadingPackages(true);
    try {
      const data = await api.get('/admin/packages');
      setPackageSettings(data);
    } catch (e) {
      console.error('Error fetching packages:', e);
    } finally {
      setLoadingPackages(false);
    }
  };

  const saveAllPackages = async () => {
    setSavingCost(true);
    try {
      await api.post('/admin/packages', packageSettings);
      setCostSaved(true);
      setTimeout(() => setCostSaved(false), 3000);
      fetchPackages();
    } catch (e) {
      console.error('Error saving packages:', e);
    } finally {
      setSavingCost(false);
    }
  };

  const addPackage = () => {
    const newId = `pkg_${Date.now()}`;
    const nextOrder = packageSettings.length > 0 ? Math.max(...packageSettings.map(p => p.orderIndex || 0)) + 1 : 1;
    setPackageSettings([...packageSettings, { 
      id: newId, 
      name: 'Yeni Paket', 
      tokens: 100, 
      price: '₺99.99', 
      popular: false,
      icon: 'Sparkles',
      features: ['Yeni Özellik 1', 'Yeni Özellik 2'],
      orderIndex: nextOrder
    }]);
  };

  const removePackage = (id) => {
    setPackageSettings(packageSettings.filter(p => p.id !== id));
  };

  const updatePackage = (id, field, value) => {
    setPackageSettings(prev => prev.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const saveSystemCost = async (key, value) => {
    setSavingCost(true);
    try {
      await api.post('/admin/settings', { key, value: String(value) });
      setCostSaved(true);
      setTimeout(() => setCostSaved(false), 3000);
      fetchSystemCosts();
    } catch (e) {
      console.error('Error saving system cost:', e);
    } finally {
      setSavingCost(false);
    }
  };

  return (
    <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12 pb-20"
    >
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic text-amber-500">Geliştirici Paneli</h1>
          <p className="text-muted-foreground font-medium mt-1">Sistem çekirdek ayarları ve logları</p>
        </div>
        <Link 
            to="/ai-management"
            className="px-5 py-2.5 bg-primary/10 border border-primary/20 rounded-2xl flex items-center space-x-3 shadow-[0_0_20px_rgba(0,242,254,0.1)] hover:bg-primary/20 transition-all cursor-pointer"
        >
            <Bot className="text-primary" size={20} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary italic">AI Sağlayıcılarını Yönet</span>
        </Link>
      </header>

      {/* Tab Navigation */}
      <div className="flex items-center space-x-1 p-1 bg-secondary/20 rounded-[1.5rem] w-fit border border-border/40">
        <button 
            onClick={() => navigate('/admin')}
            className="px-8 py-3 rounded-[1.2rem] text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all"
        >
           Genel Ayarlar
        </button>
        <button className="px-8 py-3 rounded-[1.2rem] text-xs font-black uppercase tracking-widest bg-amber-500 text-black shadow-lg shadow-amber-500/20">
           Geliştirici (Core)
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">

        {/* AI Provider Status - Avant-Garde Command Center */}
        <div className="glass-card p-8 border-border/50 xl:col-span-2 relative overflow-hidden group">
          {/* Background Ambient Glow */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-primary/10 transition-all duration-700" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10 relative z-10">
            <Link to="/ai-management" className="flex items-center space-x-6 group/link cursor-pointer">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-0 group-hover/link:scale-150 transition-transform duration-500" />
                <div className="p-6 lg:p-8 rounded-4xl bg-gradient-to-br from-card to-secondary/30 border border-border/50 shadow-2xl backdrop-blur-xl group hover:border-primary/30 transition-all duration-500">
                  <Bot className="text-primary animate-pulse" size={28} />
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-black uppercase italic tracking-tighter group-hover/link:text-primary transition-all leading-none">AI Command Center</h3>
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.3em] mt-2 font-black opacity-60">System Core & Neural Pulse</p>
              </div>
            </Link>

            <div className="flex flex-wrap items-center gap-4">
              {/* Credits Mirror - Bespoke Hero Section */}
              <div className="bg-secondary/20 p-4 lg:p-6 rounded-3xl border border-border shadow-sm flex flex-col h-full hover:border-border/80 transition-all duration-300 justify-center min-w-[140px]">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[.2em] mb-1">Hesap Bakiyesi</span>
                <span className="text-3xl font-black text-cyan-400 tracking-tighter italic">
                  {aiStatus?.userCredits || 0}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={triggerAiSync}
                  disabled={loadingAiStatus}
                  className="flex items-center justify-center gap-2 px-6 py-3 text-xs font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20 rounded-2xl hover:bg-primary/20 transition-all shadow-lg hover:shadow-primary/10"
                >
                  <RefreshCw size={14} className={loadingAiStatus ? 'animate-spin' : ''} />
                  {loadingAiStatus ? 'SYNCING...' : 'FORCE SYNC'}
                </button>
                <div className="px-3 py-1 flex items-center justify-center space-x-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground bg-white/5 rounded-full">
                   <div className={`w-1.5 h-1.5 rounded-full ${aiStatus?.healthy > 0 ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
                   <span>Son Nabız: {aiStatus ? new Date(aiStatus.checked).toLocaleTimeString('tr-TR') : 'Hiçbir zaman'}</span>
                </div>
              </div>
            </div>
          </div>

          {aiStatus ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 relative z-10">
              {aiStatus.providers.map((p, idx) => (
                <motion.div 
                  key={p.name} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`p-5 rounded-3xl border transition-all duration-500 overflow-hidden relative ${
                    p.status === 'ok' ? 'bg-emerald-500/[0.03] border-emerald-500/20 hover:border-emerald-500/50' :
                    p.status === 'quota_exceeded' ? 'bg-amber-500/[0.03] border-amber-500/20 hover:border-amber-500/50' :
                    'bg-rose-500/[0.03] border-rose-500/20 hover:border-rose-500/50'
                  }`}
                >
                  {/* Quota Badge if exists */}
                  {p.quota && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[8px] font-black text-cyan-400">
                      {p.quota}
                    </div>
                  )}
                  {/* Staggered Content for Avant-Garde Feel */}
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-2 rounded-xl scale-90 ${p.status === 'ok' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                       {p.status === 'ok' ? <Wifi size={16} /> : <WifiOff size={16} />}
                    </div>
                    <span className="text-[9px] font-black opacity-20 uppercase font-mono tracking-tighter">NODE_{idx + 1}</span>
                  </div>

                  <h4 className="text-xs font-black uppercase tracking-tight mb-1 truncate" title={p.name}>{p.name}</h4>
                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                      p.status === 'ok' ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {p.status === 'ok' ? 'AKTİF' : 'OFFLINE'}
                    </span>
                    {p.status === 'ok' && (
                      <span className="text-[9px] opacity-40 font-mono">({p.ms}ms)</span>
                    )}
                  </div>

                  {p.error && p.status !== 'ok' && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                       <p className="text-[9px] text-rose-400/50 leading-tight line-clamp-2 uppercase italic font-medium" title={p.error}>
                          {p.error}
                       </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-20 border-2 border-dashed border-border/30 rounded-3xl">
              {loadingAiStatus ? (
                <div className="flex flex-col items-center gap-4">
                  <RefreshCw className="animate-spin text-primary/30" size={40} />
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30">Pinging Neural Network...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <AlertTriangle className="opacity-20" size={40} />
                  <p className="text-xs font-black uppercase tracking-widest opacity-40">System Idle. Initiate Sync.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* System Costs (Kredi & Harcama Ayarları) */}
        <div className="glass-card p-6 border-border/50">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 rounded-2xl bg-primary/10">
              <Zap className="text-primary" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight">Kredi & Harcama Ayarları</h3>
              <p className="text-xs text-muted-foreground">Sistem geneli maliyet değerleri</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {systemCosts.map(cost => (
              <div key={cost.key} className="flex justify-between items-center p-3 rounded-xl bg-secondary/10 border border-border/50">
                <div className="flex-1">
                  <span className="text-xs font-bold capitalize">{cost.key.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={cost.value}
                    onChange={(e) => setSystemCosts(prev => prev.map(c => c.key === cost.key ? {...c, value: e.target.value} : c))}
                    className="w-16 bg-secondary/30 border border-border rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:border-primary/50"
                  />
                  <button 
                    onClick={() => saveSystemCost(cost.key, cost.value)}
                    disabled={savingCost}
                    className="text-[10px] font-black uppercase bg-primary/20 text-primary px-2 py-1 rounded hover:bg-primary/30 transition-all"
                  >
                    Kaydet
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Token Paket Yönetimi (Fiyatlandırma) */}
        <div className="glass-card p-6 border-border/50 xl:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="p-4 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 shadow-lg shadow-cyan-500/5">
                <Star className="text-cyan-400" size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter italic">Paket & Fiyatlandırma</h3>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60">Token Store paketlerini yönetin</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
               <div className="flex items-center space-x-4 p-4 rounded-3xl bg-secondary/10 border border-white/5">
                 <Plus size={14} />
                 <span>Yeni Ekle</span>
               </div>
               <button 
                onClick={saveAllPackages}
                disabled={savingCost}
                className="flex items-center space-x-2 px-6 py-2.5 bg-cyan-500 text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
               >
                 {savingCost ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                 <span>Tümünü Kaydet</span>
               </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loadingPackages ? (
              <div className="col-span-full text-center py-20">
                <RefreshCw size={32} className="animate-spin text-primary/30 mx-auto mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30">Paketler Yükleniyor...</p>
              </div>
            ) : packageSettings.length === 0 ? (
              <div className="col-span-full text-center py-20 border-2 border-dashed border-border rounded-4xl">
                <p className="text-sm font-bold opacity-30 uppercase italic">Henüz paket ayarı bulunamadı.</p>
              </div>
            ) : (
              [...packageSettings].sort((a, b) => Number(a.orderIndex || 0) - Number(b.orderIndex || 0)).map((pkg, idx) => (
                <div key={pkg.id || idx} className="p-6 rounded-4xl bg-secondary/10 border border-border/50 relative group transition-all hover:border-cyan-500/30">
                  <button 
                    onClick={() => removePackage(pkg.id)}
                    className="absolute top-4 right-4 p-2 rounded-xl bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
                  >
                    <Trash2 size={14} />
                  </button>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest block mb-2 opacity-50">Paket Adı</label>
                        <input
                          type="text"
                          value={pkg.name}
                          onChange={(e) => updatePackage(pkg.id, 'name', e.target.value)}
                          className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest block mb-2 opacity-50">Simge (Lucide)</label>
                        <select
                          value={pkg.icon || 'Sparkles'}
                          onChange={(e) => updatePackage(pkg.id, 'icon', e.target.value)}
                          className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:border-cyan-500/50 appearance-none"
                        >
                          <option value="Zap">Zap (Enerji)</option>
                          <option value="Star">Star (Yıldız)</option>
                          <option value="Crown">Crown (Taç)</option>
                          <option value="Sparkles">Sparkles (Parıltı)</option>
                          <option value="Flame">Flame (Alev)</option>
                          <option value="Rocket">Rocket (Roket)</option>
                          <option value="Gem">Gem (Mücevher)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest block mb-2 opacity-50">Token Miktarı</label>
                        <input
                          type="number"
                          value={pkg.tokens}
                          onChange={(e) => updatePackage(pkg.id, 'tokens', parseInt(e.target.value) || 0)}
                          className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest block mb-2 opacity-50">Fiyat</label>
                        <input
                          type="text"
                          value={pkg.price}
                          onChange={(e) => updatePackage(pkg.id, 'price', e.target.value)}
                          className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest block mb-2 opacity-50">Sıra No</label>
                        <input
                          type="number"
                          value={pkg.orderIndex || 0}
                          onChange={(e) => updatePackage(pkg.id, 'orderIndex', parseInt(e.target.value) || 0)}
                          className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest block mb-2 opacity-50">Özellikler (Virgülle ayırın)</label>
                      <textarea
                        value={Array.isArray(pkg.features) ? pkg.features.join(',') : (pkg.features || '')}
                        onChange={(e) => updatePackage(pkg.id, 'features', e.target.value.split(','))}
                        className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-2 text-[10px] font-bold focus:outline-none focus:border-cyan-500/50 min-h-[80px]"
                        placeholder="Örn: 100 Analiz, Hızlı Destek..."
                      />
                    </div>

                    <div className="flex items-center space-x-3 pt-2">
                       <button 
                        onClick={() => updatePackage(pkg.id, 'popular', !pkg.popular)}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                          pkg.popular ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-secondary text-muted-foreground border border-border'
                        }`}
                       >
                         <Star size={10} fill={pkg.popular ? 'currentColor' : 'none'} />
                         <span>{pkg.popular ? 'En Popüler' : 'Normal'}</span>
                       </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Admin Activity Logs (Sistem Günlüğü) */}
      <div className="premium-card p-6 mt-8 border border-border">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-amber-500/10"><History className="text-amber-400" size={20} /></div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight">Sistem Günlüğü</h3>
              <p className="text-xs text-muted-foreground">Son 50 admin hareketi</p>
            </div>
          </div>
          <button onClick={fetchAdminLogs} className="text-xs font-bold text-primary"><RefreshCw size={14} /></button>
        </div>
        
        {loadingAdminLogs ? (
          <div className="text-center py-8">Yükleniyor...</div>
        ) : adminLogs.length === 0 ? (
          <div className="text-center py-8 text-sm opacity-50 font-bold">Herhangi bir kayıt bulunamadı.</div>
        ) : (
          <div className="space-y-3">
            {adminLogs.map(log => (
              <div key={log.id} className="p-3 rounded-xl bg-secondary/10 border border-border/50 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <Terminal size={12} className="text-primary" />
                  <div>
                    <span className="text-xs font-black uppercase">{log.adminName}</span>
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold">{log.action}</span>
                  </div>
                </div>
                <div className="text-[9px] opacity-40 uppercase">
                  {new Date(log.createdAt).toLocaleString('tr-TR')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Users / Credit Distribution (Kredi Kullanım Dökümü) */}
      <div className="glass-card p-6 mt-8 border-border/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-cyan-500/10"><Zap className="text-cyan-400" size={20} /></div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight">Kredi Kullanım Dökümü</h3>
              <p className="text-xs text-muted-foreground">Sistemdeki tüm kullanıcıların bakiyeleri</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <input 
              type="text" 
              placeholder="Ara..." 
              value={userSearchTerm}
              onChange={(e) => setUserSearchTerm(e.target.value)}
              className="bg-secondary/30 border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-cyan-500/50"
            />
            <button onClick={fetchUsers} className="text-xs font-bold text-cyan-400 p-2"><RefreshCw size={14} /></button>
          </div>
        </div>

        {loadingUsers ? (
            <div className="text-center py-8">Yükleniyor...</div>
        ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {users.filter(u => u.name?.toLowerCase().includes(userSearchTerm.toLowerCase()) || u.email?.toLowerCase().includes(userSearchTerm.toLowerCase())).map(u => (
                <div key={u.id} className="p-3 rounded-xl bg-secondary/10 border border-border/50 flex justify-between items-center hover:bg-secondary/20 transition-all">
                  <div>
                    <span className="text-sm font-bold">{u.name}</span>
                    <span className="ml-2 text-xs opacity-50">{u.email}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-cyan-400">{u.credits} <span className="text-[10px] uppercase">Kredi</span></p>
                    <p className="text-[9px] opacity-40 uppercase">Kayıt: {new Date(u.createdAt).toLocaleDateString('tr-TR')}</p>
                  </div>
                </div>
              ))}
              {users.length === 0 && <div className="text-center py-4 text-xs opacity-50">Kullanıcı bulunamadı.</div>}
            </div>
        )}
      </div>

    </motion.div>
  );
};

export default DeveloperPanel;
