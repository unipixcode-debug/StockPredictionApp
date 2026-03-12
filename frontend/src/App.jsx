import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { 
  Activity, BarChart3, User, Settings, Database, Moon, Sun, 
  LayoutDashboard, Receipt, LineChart, LogOut, Newspaper
} from 'lucide-react';

import Dashboard from './Dashboard';
import AdminPanel from './AdminPanel';
import MoneyFlow from './MoneyFlow';
import AssetDetails from './AssetDetails';
import MarketChart from './MarketChart';
import Analysis from './Analysis';
import News from './News';
import { AuthProvider, useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, loading, loginWithGoogle, theme, toggleTheme } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={loginWithGoogle} theme={theme} toggleTheme={toggleTheme} />;
  }

  return (
    <Router>
      <div className="flex min-h-screen bg-background text-foreground transition-colors duration-500 overflow-hidden">
        {/* Sidebar */}
        <aside className="fixed left-0 top-0 h-screen w-20 lg:w-72 border-r border-border flex flex-col p-6 space-y-10 z-50 bg-card/40 backdrop-blur-2xl">
          <div className="flex items-center space-x-4 px-2">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(0,242,254,0.2)]">
              <Activity className="text-primary-foreground" size={24} />
            </div>
            <div className="hidden lg:block">
              <h1 className="font-black text-xl tracking-tighter uppercase italic">PredictPro</h1>
              <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">{t('GlobalAnalysis')}</p>
            </div>
          </div>

          <nav className="flex-1 space-y-4">
            <SidebarLink to="/" icon={<LayoutDashboard size={22} />} label={t('Dashboard')} />
            <SidebarLink to="/news" icon={<Newspaper size={22} />} label={t('News')} />
            <SidebarLink to="/flow" icon={<Receipt size={22} />} label={t('MoneyFlow')} />
            <SidebarLink to="/admin" icon={<Database size={22} />} label={t('AdminPanel')} />
            <SidebarLink to="/analysis" icon={<LineChart size={22} />} label={t('Analysis')} />
          </nav>

          <div className="space-y-4 pt-6 border-t border-border">
             <div className="flex flex-col space-y-2 lg:flex-row lg:space-y-0 lg:space-x-2">
                 <button 
                    onClick={toggleTheme}
                    className="flex-1 flex items-center justify-center p-3 rounded-2xl bg-secondary/50 hover:bg-secondary transition-all group border border-border/50"
                 >
                    {theme === 'dark' ? <Sun size={18} className="text-primary" /> : <Moon size={18} className="text-primary" />}
                 </button>
                 <button 
                    onClick={() => toggleLanguage(language === 'TR' ? 'EN' : 'TR')}
                    className="flex-1 flex items-center justify-center p-3 rounded-2xl bg-secondary/50 hover:bg-secondary transition-all group border border-border/50 overflow-hidden relative"
                 >
                    <span className="font-black tracking-widest text-xs z-10 transition-colors group-hover:text-primary">
                        {language === 'TR' ? '🇹🇷 TR' : '🇬🇧 EN'}
                    </span>
                 </button>
             </div>
             
             <UserProfile />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-72 ml-20 overflow-y-auto relative min-h-screen">
          <div className="p-4 md:p-10 max-w-[1600px] mx-auto min-h-screen">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/flow" element={<MoneyFlow />} />
              <Route path="/flow/:assetId" element={<AssetDetails />} />
              <Route path="/chart/:symbol" element={<MarketChart />} />
              <Route path="/analysis" element={<Analysis />} />
              <Route path="/news" element={<News />} />
              <Route path="/settings" element={<Placeholder title="Ayarlar" />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

function UserProfile() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  return (
    <div className="flex items-center space-x-4 p-3 rounded-4xl bg-secondary/30 group relative cursor-pointer hover:bg-secondary/50 transition-all border border-border">
      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border border-primary/20 p-0.5">
        {user.picture ? (
          <img src={user.picture} alt={user.name} className="w-full h-full object-cover rounded-full" />
        ) : (
          <User size={20} className="text-primary" />
        )}
      </div>
      <div className="hidden lg:block flex-1 min-w-0">
        <p className="text-xs font-black truncate uppercase tracking-tight">{user.name}</p>
        <button 
          onClick={logout}
          className="flex items-center space-x-1 text-[9px] font-black text-primary/60 hover:text-primary transition-all uppercase tracking-widest mt-0.5"
        >
          <LogOut size={10} />
          <span>{t('Logout')}</span>
        </button>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin, theme, toggleTheme }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 transition-colors duration-500 relative overflow-hidden">
      {/* Decorative Blur */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[150px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[150px] rounded-full animate-pulse" />

      <div className="glass-card max-w-lg w-full p-12 text-center space-y-10 relative z-10 border-border/50 shadow-2xl">
        <div className="flex justify-center mb-4">
             <div className="w-24 h-24 bg-primary rounded-[2.5rem] flex items-center justify-center shadow-[0_0_40px_rgba(0,242,254,0.3)] rotate-12 transition-transform hover:rotate-0 duration-500">
               <Activity className="text-primary-foreground w-12 h-12" />
             </div>
        </div>
        
        <div className="space-y-3">
          <h1 className="text-6xl font-black tracking-tighter uppercase italic italic-shadow text-foreground">PredictPro</h1>
          <p className="text-muted-foreground font-medium text-lg leading-relaxed px-4">
            Gelişmiş piyasa analizi ve yapay zeka destekli tahmin platformu.
          </p>
        </div>
        
        <div className="space-y-4">
            <button 
              onClick={onLogin}
              className="w-full premium-button flex items-center justify-center space-x-4 shadow-2xl hover:-translate-y-1 transition-all"
            >
              <img src="https://www.google.com/favicon.ico" className="w-6 h-6" alt="Google" />
              <span className="text-lg">Google ile Giriş Yap</span>
            </button>
            
            <button 
                onClick={toggleTheme}
                className="mx-auto flex items-center space-x-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors underline decoration-primary/30 underline-offset-4"
            >
                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                <span>{theme === 'dark' ? 'Aydınlık Moda Geç' : 'Karanlık Moda Geç'}</span>
            </button>
        </div>
        
        <div className="pt-8 flex items-center justify-center space-x-4 opacity-30 grayscale filter">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] font-mono">SECURE AI INFRASTRUCTURE V4.0</p>
        </div>
      </div>
    </div>
  );
}

function SidebarLink({ to, icon, label }) {
  return (
    <NavLink 
      to={to}
      className={({ isActive }) => `
        flex items-center space-x-4 p-4 rounded-3xl transition-all duration-500 group relative
        ${isActive 
          ? 'sidebar-link-active' 
          : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
        }
      `}
    >
      <div className="shrink-0 transition-transform duration-500 group-hover:scale-125 z-10">
        {icon}
      </div>
      <span className="hidden lg:block font-extrabold text-sm tracking-wide z-10">{label}</span>
      
      {/* Tooltip for collapsed sidebar */}
      <div className="lg:hidden absolute left-20 bg-card border border-border px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all pointer-events-none whitespace-nowrap z-50">
        {label}
      </div>
    </NavLink>
  );
}

function Placeholder({ title }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
      <div className="w-24 h-24 bg-secondary/50 rounded-[3rem] flex items-center justify-center border border-border shadow-inner">
         <Settings className="text-primary/20 animate-slow-spin w-12 h-12" />
      </div>
      <h2 className="text-4xl font-black uppercase tracking-tighter italic">{title}</h2>
      <p className="text-muted-foreground max-w-sm font-medium leading-relaxed">
        Bu bölüm şu an geliştirme aşamasındadır. Yakında burada detaylı özellikler göreceksiniz.
      </p>
    </div>
  );
}

export default App;
