import React, { useState, useEffect } from 'react';
import { X, Activity, BarChart2 } from 'lucide-react';
import { TradingChart } from './TradingChart';

export const ChartModal = ({ symbol, isOpen, onClose }) => {
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [timeframe, setTimeframe] = useState('1D'); // '1h', '4h', '1D', '1W', '1M'
    const [chartType, setChartType] = useState('candlestick');

    useEffect(() => {
        if (!isOpen || !symbol) return;
        
        const fetchData = async () => {
            setLoading(true);
            try {
                // Determine limit based on timeframe
                let limit = 365;
                if (timeframe === '1h' || timeframe === '4h') limit = 500;
                
                const res = await fetch(`/api/market/history?symbol=${symbol}&timeframe=${timeframe}&limit=${limit}`);
                const data = await res.json();
                
                // Ensure data is sorted by time ascending (lightweight-charts requirement)
                if (Array.isArray(data)) {
                    data.sort((a, b) => a.time - b.time);
                    setChartData(data);
                }
            } catch (error) {
                console.error('Failed to fetch chart data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [symbol, timeframe, isOpen]);

    if (!isOpen) return null;

    const timeframes = ['1h', '4h', '1D', '1W', '1M'];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#1A1E29] rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-800">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <div className="flex items-center space-x-3">
                        <div className="bg-blue-500/10 p-2 rounded-lg">
                            <Activity className="w-5 h-5 text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold font-['Space_Grotesk'] text-white">
                            {symbol} <span className="text-sm font-normal text-gray-400 ml-2">Geçmiş Fiyat</span>
                        </h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between p-4 bg-[#1e2330]">
                    <div className="flex space-x-2">
                        {timeframes.map(tf => (
                            <button
                                key={tf}
                                onClick={() => setTimeframe(tf)}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                                    timeframe === tf 
                                        ? 'bg-blue-500 text-white' 
                                        : 'bg-[#2A303C] text-gray-400 hover:text-white hover:bg-[#343a4a]'
                                }`}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                    
                    <div className="flex space-x-2 mt-2 sm:mt-0">
                        <button
                            onClick={() => setChartType('candlestick')}
                            className={`p-1.5 rounded-md transition-all ${
                                chartType === 'candlestick' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:bg-white/5'
                            }`}
                            title="Mum Grafiği"
                        >
                            <BarChart2 className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setChartType('line')}
                            className={`p-1.5 rounded-md transition-all ${
                                chartType === 'line' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:bg-white/5'
                            }`}
                            title="Çizgi Grafiği"
                        >
                            <Activity className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Chart Area */}
                <div className="p-4 bg-[#141820] relative min-h-[400px]">
                    {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                        </div>
                    ) : chartData.length > 0 ? (
                        <TradingChart 
                            data={chartData} 
                            type={chartType} 
                            height={400} 
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                            Grafik verisi bulunamadı.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
