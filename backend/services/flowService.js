const marketDataService = require('./marketDataService');

class FlowService {
    async getGlobalFlow(timeframe = '1G') {
        const indicators = await marketDataService.getGlobalIndicators();
        if (!indicators) return null;

        const tfMultipliers = { '1S': 0.05, '4S': 0.2, '1G': 1, '1H': 7, '1A': 30, '1Y': 365 };
        const mult = tfMultipliers[timeframe] || 1;

        // Realistic Baseline Market Sizes (in Trillions)
        const baseValues = { gold: 14.5, silver: 1.4, oil: 2.1, crypto: 2.6, stocks: 110.0, bonds: 135.0, fiat: 95.0 };

        const flowData = {
            assets: [
                {
                    id: 'commodities',
                    name: 'EMTİA',
                    value: this.calcValue(baseValues.gold + 4, (indicators.gold?.change || 0) * mult),
                    change: (indicators.gold?.change || 0) * mult,
                    flowAmount: Math.abs(18 * (indicators.gold?.change || 0) / 100) * mult,
                    color: 'orange',
                    unit: 'T$',
                    subAssets: this.generateTop100(indicators, 'commodity', mult)
                },
                {
                    id: 'crypto',
                    name: 'KRİPTO',
                    value: this.calcValue(baseValues.crypto, (indicators.btc?.change || 0) * mult),
                    change: (indicators.btc?.change || 0) * mult,
                    flowAmount: Math.abs(2.6 * (indicators.btc?.change || 0) / 100) * 1.5 * mult,
                    color: 'cyan',
                    unit: 'T$',
                    subAssets: this.generateTop100(indicators, 'crypto', mult)
                },
                {
                    id: 'stocks',
                    name: 'BORSALAR',
                    value: this.calcValue(baseValues.stocks, (indicators.sp500?.change || 0) * mult),
                    change: (indicators.sp500?.change || 0) * mult,
                    flowAmount: Math.abs(110 * (indicators.sp500?.change || 0) / 100) * mult,
                    color: 'green',
                    unit: 'T$',
                    subAssets: this.generateTop100(indicators, 'stock', mult)
                },
                {
                    id: 'bonds',
                    name: 'TAHVİLLER',
                    value: this.calcValue(baseValues.bonds, (indicators.us10y?.change || 0) * mult * -1),
                    change: (indicators.us10y?.change || 0) * mult * -1,
                    flowAmount: Math.abs(135 * (indicators.us10y?.change || 0) / 100) * mult,
                    color: 'indigo',
                    unit: 'T$',
                    subAssets: this.generateTop100(indicators, 'bond', mult)
                },
                {
                    id: 'fiat',
                    name: 'NAKİT / FX',
                    value: this.calcValue(baseValues.fiat, (indicators.dxy?.change || 0) * mult),
                    change: (indicators.dxy?.change || 0) * mult,
                    flowAmount: Math.abs(95 * (indicators.dxy?.change || 0) / 100) * mult,
                    color: 'rose',
                    unit: 'T$',
                    subAssets: this.generateTop100(indicators, 'fiat', mult)
                }
            ],
            indicators: {
                vix: { price: indicators.vix?.price, change: (indicators.vix?.change || 0) * mult },
                dxy: { price: indicators.dxy?.price, change: (indicators.dxy?.change || 0) * mult }
            },
            timestamp: new Date()
        };

        return flowData;
    }

    generateTop100(indicators, type, mult) {
        const list = [];
        if (type === 'crypto') {
            const keys = Object.keys(indicators).filter(k => !['vix','dxy','gold','silver','oil','sp500','nasdaq','us10y','us02y','eurusd','gbpusd','usdtry'].includes(k));
            keys.slice(0, 100).forEach(k => {
                list.push({ name: k.toUpperCase(), price: indicators[k].price, change: indicators[k].change * mult, value: indicators[k].marketCap / 1e12 });
            });
            list.push({ name: 'DİĞER KRİPTO', value: 0.15, change: 0, isOther: true });
        } else if (type === 'commodity') {
            list.push({ name: 'Altın', price: indicators.gold?.price, change: (indicators.gold?.change || 0) * mult, value: 14.5 });
            list.push({ name: 'Gümüş', price: indicators.silver?.price, change: (indicators.silver?.change || 0) * mult, value: 1.4 });
            list.push({ name: 'Petrol', price: indicators.oil?.price, change: (indicators.oil?.change || 0) * mult, value: 2.1 });
            // Mocking the rest of 100
            for(let i=0; i<97; i++) list.push({ name: `Emtia #${i+4}`, value: Math.random() * 0.05, change: (Math.random()*4-2) * mult });
            list.push({ name: 'DİĞER EMTİA', value: 0.5, change: 0, isOther: true });
        } else if (type === 'stock') {
            list.push({ name: 'S&P 500', price: indicators.sp500?.price, change: (indicators.sp500?.change || 0) * mult, value: 45.0 });
            list.push({ name: 'Nasdaq', price: indicators.nasdaq?.price, change: (indicators.nasdaq?.change || 0) * mult, value: 20.0 });
            for(let i=0; i<98; i++) list.push({ name: `Hisse #${i+3}`, value: Math.random() * 0.1, change: (Math.random()*4-2) * mult });
            list.push({ name: 'DİĞER BORSALAR', value: 40.0, change: 0, isOther: true });
        } else if (type === 'bond') {
            list.push({ name: 'ABD 10Y', price: indicators.us10y?.price, change: (indicators.us10y?.change || 0) * mult, value: 30.0 });
            list.push({ name: 'ABD 02Y', price: indicators.us02y?.price, change: (indicators.us02y?.change || 0) * mult, value: 25.0 });
            for(let i=0; i<98; i++) list.push({ name: `Tahvil #${i+3}`, value: Math.random() * 0.5, change: (Math.random()*2-1) * mult });
            list.push({ name: 'DİĞER TAHVİLLER', value: 80.0, change: 0, isOther: true });
        } else if (type === 'fiat') {
            list.push({ name: 'DXY Index', price: indicators.dxy?.price, change: (indicators.dxy?.change || 0) * mult, value: 50.0 });
            list.push({ name: 'EUR/USD', price: indicators.eurusd?.price, change: (indicators.eurusd?.change || 0) * mult, value: 20.0 });
            list.push({ name: 'GBP/USD', price: indicators.gbpusd?.price, change: (indicators.gbpusd?.change || 0) * mult, value: 10.0 });
            for(let i=0; i<97; i++) list.push({ name: `Döviz #${i+4}`, value: Math.random() * 0.1, change: (Math.random()*2-1) * mult });
            list.push({ name: 'DİĞER NAKİT', value: 15.0, change: 0, isOther: true });
        }
        return list;
    }

    calcValue(base, changePercent) {
        return base * (1 + (changePercent || 0) / 100);
    }
}

module.exports = new FlowService();
