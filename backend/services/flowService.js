const marketDataService = require('./marketDataService');

class FlowService {
    /**
     * Calculates the "Global Money Flow" metrics based on market movements.
     * @param {string} timeframe - '1S', '4S', '1G', '1H', '1A', '1Y', '5Y', '10Y'
     */
    async getGlobalFlow(timeframe = '1G') {
        const indicators = await marketDataService.getGlobalIndicators();
        if (!indicators) return null;

        // Multiplier logic: Scale values based on timeframe
        // If 1G is '1x', 1S is ~1/24, 1H is 7x, 10Y is ~3650x relative to 1G
        const tfMultipliers = {
            '1S': 0.05,
            '4S': 0.2,
            '1G': 1,
            '1H': 7,
            '1A': 30,
            '1Y': 365,
            '5Y': 1825,
            '10Y': 3650
        };

        const mult = tfMultipliers[timeframe] || 1;

        // Total Market Estimates (Approximate trillions/billions for visualization)
        const baseValues = {
            gold: 14.5,
            silver: 1.4,
            oil: 2.1,
            crypto: 2.6,
            stocks: 110.0,
            bonds: 130.0
        };

        const flowData = {
            assets: [
                {
                    id: 'commodities',
                    name: 'EMTİA',
                    value: this.calcValue(baseValues.gold + baseValues.silver + baseValues.oil + 1.5, (indicators.gold?.change || 0) * mult), // Added 1.5T for "Others"
                    change: (indicators.gold?.change || 0) * mult,
                    flowAmount: Math.abs((baseValues.gold + baseValues.silver + baseValues.oil + 1.5) * (indicators.gold?.change || 0) / 100) * 0.4 * mult,
                    color: 'orange',
                    unit: 'T$',
                    subAssets: [
                        { name: 'Altın', value: baseValues.gold, change: (indicators.gold?.change || 0) * mult, price: indicators.gold?.price },
                        { name: 'Gümüş', value: baseValues.silver, change: (indicators.silver?.change || 0) * mult, price: indicators.silver?.price },
                        { name: 'Petrol', value: baseValues.oil, change: (indicators.oil?.change || 0) * mult, price: indicators.oil?.price },
                        { name: 'Bakır', value: 0.8, change: (indicators.copper?.change || 0) * mult, price: indicators.copper?.price },
                        { name: 'Platin', value: 0.2, change: (indicators.platinum?.change || 0) * mult, price: indicators.platinum?.price },
                        { name: 'Doğalgaz', value: 0.3, change: (indicators.naturalGas?.change || 0) * mult, price: indicators.naturalGas?.price },
                        { name: 'Buğday', value: 0.1, change: (indicators.wheat?.change || 0) * mult, price: indicators.wheat?.price },
                        { name: 'Mısır', value: 0.08, change: (indicators.corn?.change || 0) * mult, price: indicators.corn?.price },
                        { name: 'Kahve', value: 0.02, change: (indicators.coffee?.change || 0) * mult, price: indicators.coffee?.price },
                        { name: 'Diğer', value: 0.0, change: (indicators.gold?.change || 0) * mult } // Placeholder for balance
                    ]
                },
                {
                    id: 'crypto',
                    name: 'KRİPTO',
                    value: this.calcValue(baseValues.crypto, (indicators.btc?.change || 0) * mult),
                    change: (indicators.btc?.change || 0) * mult,
                    flowAmount: Math.abs(baseValues.crypto * (indicators.btc?.change || 0) / 100) * 1.5 * mult,
                    color: 'cyan',
                    unit: 'T$',
                    subAssets: [
                        { name: 'Bitcoin', value: 1.3, change: (indicators.btc?.change || 0) * mult, price: indicators.btc?.price },
                        { name: 'Ethereum', value: 0.4, change: (indicators.eth?.change || 0) * mult, price: indicators.eth?.price },
                        { name: 'Diğer', value: 0.9, change: (indicators.btc?.change || 0) * 0.8 * mult }
                    ]
                },
                {
                    id: 'stocks',
                    name: 'BORSALAR',
                    value: this.calcValue(baseValues.stocks, (indicators.sp500?.change || 0) * mult),
                    change: (indicators.sp500?.change || 0) * mult,
                    flowAmount: Math.abs(baseValues.stocks * (indicators.sp500?.change || 0) / 100) * 0.2 * mult,
                    color: 'green',
                    unit: 'T$',
                    subAssets: [
                        { name: 'ABD (S&P500)', value: 45.0, change: (indicators.sp500?.change || 0) * mult, price: indicators.sp500?.price },
                        { name: 'Nasdaq', value: 20.0, change: (indicators.nasdaq?.change || 0) * mult, price: indicators.nasdaq?.price },
                        { name: 'Avrupa (STOXX)', value: 15.0, change: (indicators.stoxx?.change || 0) * mult, price: indicators.stoxx?.price },
                        { name: 'Çin (SSE)', value: 12.0, change: (indicators.sse?.change || 0) * mult, price: indicators.sse?.price },
                        { name: 'Türkiye (BIST)', value: 0.35, change: (indicators.bist100?.change || 0) * mult, price: indicators.bist100?.price }
                    ]
                },
                {
                    id: 'bonds',
                    name: 'TAHVİLLER',
                    value: this.calcValue(baseValues.bonds + 50, (indicators.bonds?.change || 0) * mult * -1), // Added 50T for global bonds
                    change: (indicators.bonds?.change || 0) * mult,
                    flowAmount: Math.abs((baseValues.bonds + 50) * (indicators.bonds?.change || 0) / 100) * 0.5 * mult,
                    color: 'indigo',
                    unit: 'T$',
                    subAssets: [
                        { name: 'ABD 10Y', value: baseValues.bonds, change: (indicators.bonds?.change || 0) * mult, price: indicators.bonds?.price },
                        { name: 'Japonya 10Y', value: 15.0, change: (indicators.japan10y?.change || 0) * mult, price: indicators.japan10y?.price },
                        { name: 'Almanya 10Y', value: 10.0, change: (indicators.germany10y?.change || 0) * mult, price: indicators.germany10y?.price },
                        { name: 'İngiltere 10Y', value: 8.0, change: (indicators.uk10y?.change || 0) * mult, price: indicators.uk10y?.price },
                        { name: 'Türkiye 10Y', value: 0.15, change: (indicators.turkey10y?.change || 0) * mult, price: indicators.turkey10y?.price }
                    ]
                }
            ],
            indicators: {
                vix: { 
                    price: indicators.vix?.price, 
                    change: indicators.vix?.change * mult 
                },
                dxy: { 
                    price: indicators.dxy?.price, 
                    change: indicators.dxy?.change * mult 
                }
            },
            timestamp: new Date()
        };

        return flowData;
    }

    calcValue(base, changePercent) {
        if (!changePercent) return base;
        return base * (1 + changePercent / 100);
    }
}

module.exports = new FlowService();
