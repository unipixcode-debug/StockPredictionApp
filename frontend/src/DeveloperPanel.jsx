import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Palette, Lock, History, Terminal, CheckCircle2, RefreshCw, Zap, Cpu, Wifi, WifiOff, AlertTriangle, Bot
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

  const savePackageSetting = async (key, value) => {
    try {
      await api.post('/admin/packages', { key, value });
      setCostSaved(true);
      setTimeout(() => setCostSaved(false), 3000);
      fetchPackages();
    } catch (e) {
      console.error('Error saving package setting:', e);
    }
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
                <div className="p-5 rounded-[2rem] bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 relative">
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
              <div className="px-8 py-4 bg-secondary/20 border border-border shadow-2xl rounded-[1.5rem] flex flex-col items-center justify-center min-w-[140px] hover:border-cyan-500/50 transition-all">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[.2em] mb-1">Hesap Bakiyesi</span>
                <span className="text-3xl font-black text-cyan-400 tracking-tighter italic">
                  {aiStatus?.userCredits || 0}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={fetchAiStatus}
                  disabled={loadingAiStatus}
                  className="flex items-center justify-center gap-2 px-6 py-3 text-xs font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20 rounded-2xl hover:bg-primary/20 transition-all shadow-lg hover:shadow-primary/10"
                >
                  <RefreshCw size={14} className={loadingAiStatus ? 'animate-spin' : ''} />
                  {loadingAiStatus ? 'SYNCING...' : 'FORCE SYNC'}
                </button>
                <div className="px-3 py-1 flex items-center justify-center space-x-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground bg-white/5 rounded-full">
                   <div className={`w-1.5 h-1.5 rounded-full ${aiStatus?.healthy > 0 ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
                   <span>Last Pulse: {aiStatus ? new Date(aiStatus.checked).toLocaleTimeString('tr-TR') : 'Never'}</span>
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
                      {p.status === 'ok' ? 'ACTIVE' : 'OFFLINE'}
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
        <div className="glass-card p-6 border-border/50">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 rounded-2xl bg-cyan-500/10">
              <Star className="text-cyan-400" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight">Paket & Fiyatlandırma</h3>
              <p className="text-xs text-muted-foreground">Token Store paketlerini yönetin</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {loadingPackages ? (
              <div className="text-center py-4 text-xs opacity-50">Yükleniyor...</div>
            ) : (
              packageSettings.map(setting => (
                <div key={setting.key} className="flex justify-between items-center p-3 rounded-xl bg-secondary/10 border border-border/50">
                  <div className="flex-1">
                    <span className="text-[10px] font-black uppercase tracking-wider opacity-50 block mb-1">
                      {setting.description || setting.key}
                    </span>
                    <input
                      type="text"
                      value={setting.value}
                      onChange={(e) => setPackageSettings(prev => prev.map(s => s.key === setting.key ? {...s, value: e.target.value} : s))}
                      className="bg-transparent border-none text-sm font-bold focus:outline-none w-full"
                    />
                  </div>
                  <button 
                    onClick={() => savePackageSetting(setting.key, setting.value)}
                    className="text-[10px] font-black uppercase bg-cyan-500/20 text-cyan-400 px-3 py-1.5 rounded-lg hover:bg-cyan-500/30 transition-all"
                  >
                    Güncelle
                  </button>
                </div>
              ))
            )}
            {packageSettings.length === 0 && !loadingPackages && (
              <div className="text-center py-4 text-xs opacity-50">Henüz paket ayarı bulunamadı.</div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Activity Logs */}
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
