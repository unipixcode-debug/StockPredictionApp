import React from 'react';
import { motion } from 'framer-motion';
import { 
    TrendingUp, TrendingDown, Lock, ChevronRight, 
    ArrowUpRight, ArrowDownLeft 
} from 'lucide-react';
import { 
    AreaChart, Area, ResponsiveContainer, YAxis 
} from 'recharts';

const TradeIdeaCard = ({ data }) => {
    const isBullish = data.sentiment === 'Bullish' || data.return > 0;
    const accentColor = isBullish ? '#10b981' : '#f43f5e';
    
    // Mock chart data for premium look
    const chartData = [
        { val: 40 }, { val: 45 }, { val: 42 }, { val: 48 }, { val: 46 }, 
        { val: 52 }, { val: 50 }, { val: 55 }, { val: 58 }, { val: 54 }, 
        { val: 60 }, { val: 62 }, { val: 65 }, { val: 68 }, { val: 70 }
    ].map((d, i) => ({ ...d, x: i }));

    return (
        <motion.div 
            whileHover={{ y: -5 }}
            className="glass-card p-6 bg-[#0f0f12] border-white/5 relative overflow-hidden flex flex-col gap-6"
        >
            {/* Top Banner: Unlock Today's Picks */}
            <div className="absolute top-0 left-0 right-0 h-10 bg-linear-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-b border-emerald-500/20 flex items-center px-4 gap-2">
                <Lock size={12} className="text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Unlock Today's Picks and Start Winning</span>
            </div>

            {/* Header: Bullish/Bearish Badge */}
            <div className="mt-8 flex justify-end">
                <span className={`text-[10px] font-black uppercase tracking-widest ${isBullish ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {data.sentiment || (isBullish ? 'Bullish' : 'Bearish')}
                </span>
            </div>

            {/* Price Stats Grid */}
            <div className="grid grid-cols-4 gap-4 px-1">
                <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-50">Entry</span>
                    <span className="text-xs font-black tracking-tight">${data.entry || '000.00'}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-50">Stop Loss</span>
                    <span className="text-xs font-black tracking-tight text-white/40">${data.stopLoss || '000.00'}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-50">Exit Price</span>
                    <span className="text-xs font-black tracking-tight text-white/40">${data.exitPrice || '00.00'}</span>
                </div>
                <div className="flex flex-col text-right">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-50">Return</span>
                    <span className={`text-xs font-black tracking-tight ${data.return >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {data.return >= 0 ? '+' : ''}{data.return}%
                    </span>
                </div>
            </div>

            {/* Chart Area with Glow Effect */}
            <div className="h-40 w-full relative group">
                {/* Glow Effect Layer */}
                <div className="absolute inset-0 z-0 flex items-center justify-center">
                    <div 
                        className="w-1/2 h-1/2 blur-2xl opacity-20 transition-all duration-700 group-hover:opacity-40"
                        style={{ backgroundColor: accentColor }}
                    />
                </div>

                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id={`grad-${data.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={accentColor} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={accentColor} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                        <Area 
                            type="monotone" 
                            dataKey="val" 
                            stroke={accentColor} 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill={`url(#grad-${data.id})`}
                            isAnimationActive={true}
                            dot={(props) => {
                                if (props.index === chartData.length - 5) {
                                    return (
                                        <dot cx={props.cx} cy={props.cy} r={4} fill={accentColor} stroke="#fff" strokeWidth={1} />
                                    );
                                }
                                return null;
                            }}
                        />
                    </AreaChart>
                </ResponsiveContainer>

                {/* Prediction Glow / Shadow specific to visual */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-end pr-8">
                     <div className="relative">
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: [0.8, 1.2, 1], opacity: [0, 0.5, 0.3] }}
                            transition={{ repeat: Infinity, duration: 2.5 }}
                            className="absolute inset-0 blur-[20px] rounded-full"
                            style={{ backgroundColor: accentColor }}
                        />
                        {isBullish ? 
                            <TrendingUp size={32} className="text-emerald-500 relative z-10 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" /> :
                            <TrendingDown size={32} className="text-rose-500 relative z-10 drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                        }
                     </div>
                </div>
            </div>

            {/* Footer: Date & Bottom Arrow */}
            <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-bold text-muted-foreground opacity-40 uppercase tracking-widest">
                    {data.timestamp || '2026/03/20 8:00AM(ET)'}
                </span>
                <div 
                    className={`flex items-center justify-center w-8 h-10 rounded-full transition-transform duration-700 ${isBullish ? '-rotate-45' : 'rotate-180'}`}
                >
                    {isBullish ? 
                        <ArrowUpRight size={24} className="text-emerald-500 animate-bounce" /> : 
                        <ArrowDownLeft size={24} className="text-rose-500 animate-bounce" />
                    }
                </div>
            </div>
        </motion.div>
    );
};

export default TradeIdeaCard;
