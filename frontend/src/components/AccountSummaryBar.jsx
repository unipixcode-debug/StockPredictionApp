import React, { useState, useEffect } from 'react';
import api from '../api';
import { 
  TrendingUp, TrendingDown, Wallet, Activity, Zap, Layers, RefreshCw 
} from 'lucide-react';

const AccountSummaryBar = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = async () => {
    try {
      const response = await api.get('/bot/account-summary', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setData(response);
      setError(null);
    } catch (err) {
      console.error('Summary fetch failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 10000); // 10s auto-refresh milimetrically
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="w-full h-10 bg-card/10 backdrop-blur-md border-b border-white/5 flex items-center justify-center space-x-2">
        <RefreshCw size={12} className="animate-spin text-primary" />
        <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Binance Live Syncing...</span>
      </div>
    );
  }

  // Fallback to empty if error correctly properly
  if (error && !data) return null;

  const metrics = [
    { label: 'Equity', value: `$${parseFloat(data?.equity || 0).toFixed(4)}`, icon: <Zap size={14} />, color: 'text-primary' },
    { label: 'Total P&L', value: `${parseFloat(data?.totalPnl) > 0 ? '+' : ''}${parseFloat(data?.totalPnl || 0).toFixed(4)} USDT`, icon: <Activity size={14} />, color: parseFloat(data?.totalPnl) >= 0 ? 'text-emerald-500' : 'text-rose-500 font-black' },
    { label: 'Margin Ratio', value: `${parseFloat(data?.marginRatio || 0).toFixed(2)}%`, icon: <Layers size={14} />, color: parseFloat(data?.marginRatio) > 80 ? 'text-rose-500' : 'text-cyan-500' },
    { label: 'Unrealized', value: `${parseFloat(data?.unrealizedPnl) > 0 ? '+' : ''}${parseFloat(data?.unrealizedPnl || 0).toFixed(4)} USDT`, icon: parseFloat(data?.unrealizedPnl) >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />, color: parseFloat(data?.unrealizedPnl) >= 0 ? 'text-emerald-500/70' : 'text-rose-500/70' },
    { label: 'Pos Value', value: `${parseFloat(data?.positionValue || 0).toFixed(4)}`, icon: <Activity size={14} />, color: 'text-muted-foreground' },
    { label: 'Leverage', value: `${parseFloat(data?.actualLeverage || 0).toFixed(4)} X`, icon: <Zap size={14} />, color: 'text-yellow-500' },
  ];

  return (
    <div className="w-full overflow-hidden bg-card/30 backdrop-blur-2xl border-b border-border/40 sticky top-0 z-60 shadow-sm">
      <div className="flex items-center h-12 px-6 overflow-x-auto no-scrollbar scroll-smooth">
        <div className="flex items-center space-x-10 min-w-max mx-auto">
          {metrics.map((m, idx) => (
            <div key={idx} className="flex items-center space-x-3 group">
              <div className={`p-1.5 rounded-lg bg-secondary/20 ${m.color} group-hover:scale-110 transition-transform duration-300`}>
                {m.icon}
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-50 leading-none mb-1">
                  {m.label}
                </span>
                <span className={`text-[11px] font-mono font-black tracking-tight leading-none ${m.color}`}>
                  {m.value}
                </span>
              </div>
              {idx !== metrics.length - 1 && (
                <div className="h-4 w-px bg-border/20 ml-6" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AccountSummaryBar;
