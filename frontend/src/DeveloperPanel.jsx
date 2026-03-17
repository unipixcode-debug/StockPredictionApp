import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Palette, Lock, History, Terminal, CheckCircle2, RefreshCw, Zap, Cpu, Wifi, WifiOff, AlertTriangle, Bot
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from './api';
import { useLanguage } from './LanguageContext';

const DeveloperPanel = () => {
  const { t } = useLanguage();
  const [pricing, setPricing] = useState([]);
  const [systemCosts, setSystemCosts] = useState([]);
  const [adminLogs, setAdminLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingAdminLogs, setLoadingAdminLogs] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [savingPrice, setSavingPrice] = useState(false);
  const [priceSaved, setPriceSaved] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [aiStatus, setAiStatus] = useState(null);
  const [loadingAiStatus, setLoadingAiStatus] = useState(false);
  const [aiStatusError, setAiStatusError] = useState(null);

  useEffect(() => {
    fetchPricing();
    fetchSystemCosts();
    fetchAdminLogs();
    fetchUsers();
    fetchAiStatus();
  }, []);

  const fetchPricing = async () => {
    try {
      const settings = await api.get('/admin/settings');
      const pricingKeys = ['token_pack_1', 'token_pack_2', 'token_pack_3', 'token_pack_4'];
      setPricing(settings.filter(s => pricingKeys.includes(s.key)));
    } catch (e) {
      console.error('Error fetching pricing:', e);
    }
  };

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



  const savePricing = async (key, value) => {
    setSavingPrice(true);
    try {
      await api.post('/admin/settings', { key, value });
      setPriceSaved(true);
      setTimeout(() => setPriceSaved(false), 3000);
      fetchPricing();
    } catch (e) {
      console.error('Error saving pricing:', e);
    } finally {
      setSavingPrice(false);
    }
  };

  const saveSystemCost = async (key, value) => {
    setSavingPrice(true);
    try {
      await api.post('/admin/settings', { key, value: String(value) });
      setPriceSaved(true);
      setTimeout(() => setPriceSaved(false), 3000);
      fetchSystemCosts();
    } catch (e) {
      console.error('Error saving system cost:', e);
    } finally {
      setSavingPrice(false);
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">

        {/* AI Provider Status */}
        <div className="glass-card p-6 border-border/50 xl:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <Link to="/ai-management" className="flex items-center space-x-3 group cursor-pointer transition-all hover:opacity-80">
              <div className="p-3 rounded-2xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-all">
                <Cpu className="text-blue-400" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight group-hover:text-primary transition-all">AI Provider Durumu</h3>
                <p className="text-xs text-muted-foreground">Canlı API anahtarı sağlık kontrolü — yönetmek için tıkla</p>
              </div>
            </Link>
            <button
              onClick={fetchAiStatus}
              disabled={loadingAiStatus}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-all"
            >
              <RefreshCw size={14} className={loadingAiStatus ? 'animate-spin' : ''} />
              {loadingAiStatus ? 'Test Ediliyor...' : 'Yenile'}
            </button>
          </div>
          {aiStatus ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                  aiStatus.healthy === aiStatus.total ? 'bg-green-500/20 text-green-400' :
                  aiStatus.healthy === 0 ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {aiStatus.healthy}/{aiStatus.total} Provider Aktif
                </span>
                <span className="text-xs text-muted-foreground">{new Date(aiStatus.checked).toLocaleTimeString('tr-TR')} tarihinde kontrol edildi</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {aiStatus.providers.map(p => (
                  <div key={p.name} className={`p-4 rounded-xl border ${
                    p.status === 'ok' ? 'bg-green-500/5 border-green-500/20' :
                    p.status === 'quota_exceeded' ? 'bg-yellow-500/5 border-yellow-500/20' :
                    p.status === 'skipped' ? 'bg-gray-500/5 border-gray-500/20' :
                    'bg-red-500/5 border-red-500/20'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {p.status === 'ok' ? <Wifi size={14} className="text-green-400" /> :
                       p.status === 'quota_exceeded' ? <AlertTriangle size={14} className="text-yellow-400" /> :
                       <WifiOff size={14} className="text-red-400" />}
                      <span className="text-sm font-bold">{p.name}</span>
                    </div>
                    <div className={`text-xs font-semibold ${
                      p.status === 'ok' ? 'text-green-400' :
                      p.status === 'quota_exceeded' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {p.status === 'ok' ? `✓ OK (${p.ms}ms)` :
                       p.status === 'quota_exceeded' ? '⚠ Kota Aşıldı' :
                       '✗ Hata'}
                    </div>
                    {p.status === 'quota_exceeded' && (
                      <div className="text-[10px] text-yellow-400/60 mt-1">Rate limit — birazdan deneyin</div>
                    )}
                    {p.status === 'error' && p.error && (
                      <div className="text-[10px] text-red-400/60 mt-1 truncate" title={p.error}>{p.error.substring(0, 50)}</div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center text-muted-foreground py-8 text-sm">
              {loadingAiStatus ? "Provider'lar test ediliyor..." : (
                aiStatusError ? (
                  <div className="text-red-400 font-bold">
                    Hata: {aiStatusError}
                  </div>
                ) : "Durumu görmek için Yenile'ye tıklayın"
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
                    disabled={savingPrice}
                    className="text-[10px] font-black uppercase bg-primary/20 text-primary px-2 py-1 rounded hover:bg-primary/30 transition-all"
                  >
                    Kaydet
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Token Pricing Settings */}
        <div className="premium-card p-6 border-2 border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 rounded-2xl bg-amber-500/10">
              <Lock className="text-amber-400" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight">Geliştirici: Token Fiyatları</h3>
              <p className="text-xs text-muted-foreground">Bu bölüm yalnızca geliştirici rolü tarafından görülebilir.</p>
            </div>
            {priceSaved && (
              <span className="ml-auto text-xs text-emerald-400 font-black flex items-center space-x-1">
                <CheckCircle2 size={14} /> <span>Kaydedildi</span>
              </span>
            )}
          </div>
          <div className="space-y-4">
            {pricing.map((p) => (
              <div key={p.key} className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 p-4 rounded-2xl bg-secondary/10 border border-border">
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">
                    {p.description || (
                      p.key === 'token_pack_1' ? '100 Token Paketi' :
                      p.key === 'token_pack_2' ? '500 Token Paketi' :
                      p.key === 'token_pack_3' ? '1000 Token Paketi' :
                      p.key === 'token_pack_4' ? '5000 Token Paketi' : p.key
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono">{p.key}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-muted-foreground font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={p.value}
                    onChange={(e) => setPricing(prev => prev.map(x => x.key === p.key ? {...x, value: e.target.value} : x))}
                    className="w-24 bg-secondary/30 border border-border rounded-xl px-3 py-2 text-sm font-bold text-center focus:outline-none focus:border-amber-500/50"
                  />
                  <button
                    onClick={() => savePricing(p.key, p.value)}
                    disabled={savingPrice}
                    className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-black hover:bg-amber-500/20 transition-all whitespace-nowrap"
                  >
                    {savingPrice ? '...' : 'Kaydet'}
                  </button>
                </div>
              </div>
            ))}
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
