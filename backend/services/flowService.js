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
                vix: { price: indicators.vix?.price || 20, change: (indicators.vix?.change || 0) * mult },
                dxy: { price: indicators.dxy?.price || 100, change: (indicators.dxy?.change || 0) * mult }
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
                if (!indicators[k]) return;
                list.push({ name: k.toUpperCase(), price: indicators[k].price, change: indicators[k].change * mult, value: indicators[k].marketCap / 1e12 });
            });
            list.push({ name: 'DİĞER KRİPTO', value: 0.15, change: 0, isOther: true });
            return list;
        } 
        
        if (type === 'commodity') {
            const topCommodities = [
                { name: 'Altın', value: 15.5 }, { name: 'Gümüş', value: 1.4 }, { name: 'Brent Petrol', value: 2.1 },
                { name: 'WTI Ham Petrol', value: 1.8 }, { name: 'Doğal Gaz', value: 0.9 }, { name: 'Bakır', value: 1.2 },
                { name: 'Platin', value: 0.3 }, { name: 'Paladyum', value: 0.2 }, { name: 'Alüminyum', value: 0.5 },
                { name: 'Çinko', value: 0.4 }, { name: 'Nikel', value: 0.3 }, { name: 'Demir Cevheri', value: 1.5 },
                { name: 'Uranyum', value: 0.1 }, { name: 'Lityum', value: 0.1 }, { name: 'Kurşun', value: 0.1 },
                { name: 'Mısır', value: 0.4 }, { name: 'Buğday', value: 0.3 }, { name: 'Soya Fasulyesi', value: 0.5 },
                { name: 'Kahve', value: 0.2 }, { name: 'Şeker', value: 0.15 }, { name: 'Pamuk', value: 0.1 },
                { name: 'Kakao', value: 0.1 }, { name: 'Kereste', value: 0.05 }, { name: 'Canlı Sığır', value: 0.2 },
                { name: 'Çelik', value: 1.0 }
            ];
            
            list.push({ name: 'Altın', price: indicators.gold?.price, change: (indicators.gold?.change || 0) * mult, value: 15.5 });
            list.push({ name: 'Gümüş', price: indicators.silver?.price, change: (indicators.silver?.change || 0) * mult, value: 1.4 });
            list.push({ name: 'Petrol', price: indicators.oil?.price, change: (indicators.oil?.change || 0) * mult, value: 2.1 });
            
            const baseChange = (indicators.gold?.change || 0) * mult;
            topCommodities.slice(3).forEach((item, i) => {
                list.push({ name: item.name, value: item.value, change: baseChange + (Math.sin(i)*0.5) });
            });
            list.push({ name: 'DİĞER EMTİA', value: 5.0, change: baseChange, isOther: true });
        } 
        
        else if (type === 'stock') {
            const topStocks = [
                { name: 'Apple', value: 3.4 }, { name: 'Microsoft', value: 3.1 }, { name: 'Nvidia', value: 2.8 },
                { name: 'Alphabet', value: 1.9 }, { name: 'Amazon', value: 1.8 }, { name: 'Meta', value: 1.2 },
                { name: 'Berkshire Hathaway', value: 0.9 }, { name: 'Eli Lilly', value: 0.7 }, { name: 'TSMC', value: 0.65 },
                { name: 'Broadcom', value: 0.6 }, { name: 'Tesla', value: 0.55 }, { name: 'JPMorgan', value: 0.5 },
                { name: 'Walmart', value: 0.48 }, { name: 'Exxon Mobil', value: 0.45 }, { name: 'UnitedHealth', value: 0.42 },
                { name: 'Visa', value: 0.4 }, { name: 'Mastercard', value: 0.38 }, { name: 'Johnson & Johnson', value: 0.35 },
                { name: 'Procter & Gamble', value: 0.34 }, { name: 'Home Depot', value: 0.33 }, { name: 'Tencent', value: 0.32 },
                { name: 'Samsung', value: 0.31 }, { name: 'Costco', value: 0.3 }, { name: 'Merck', value: 0.29 },
                { name: 'AbbVie', value: 0.28 }, { name: 'ASML', value: 0.27 }, { name: 'Chevron', value: 0.26 },
                { name: 'Toyota', value: 0.25 }, { name: 'Salesforce', value: 0.24 }, { name: 'AMD', value: 0.23 }
            ];
            
            list.push({ name: 'S&P 500 İndeksi', price: indicators.sp500?.price, change: (indicators.sp500?.change || 0) * mult, value: 45.0 });
            list.push({ name: 'Nasdaq 100 İndeksi', price: indicators.nasdaq?.price, change: (indicators.nasdaq?.change || 0) * mult, value: 25.0 });
            
            const baseChange = (indicators.sp500?.change || 0) * mult;
            topStocks.forEach((item, i) => {
                list.push({ name: item.name, value: item.value, change: baseChange + (Math.cos(i)*1.2) });
            });
            
            list.push({ name: 'DİĞER BORSALAR', value: 35.0, change: baseChange, isOther: true });
        } 
        
        else if (type === 'bond') {
            const topBonds = [
                { name: 'ABD 30Y Hazine', value: 5.5 }, { name: 'ABD 20Y Hazine', value: 3.2 }, { name: 'ABD 7Y Hazine', value: 4.1 },
                { name: 'ABD 5Y Hazine', value: 4.8 }, { name: 'ABD 3Y Hazine', value: 3.5 }, { name: 'ABD 1Y Hazine', value: 2.9 },
                { name: 'Almanya 10Y Bund', value: 2.5 }, { name: 'Japonya 10Y JGB', value: 8.5 }, { name: 'Birleşik Krallık 10Y', value: 1.8 },
                { name: 'Fransa 10Y OAT', value: 2.2 }, { name: 'İtalya 10Y BTP', value: 2.1 }, { name: 'İspanya 10Y', value: 1.5 },
                { name: 'Çin 10Y Hazine', value: 12.0 }, { name: 'Hindistan 10Y', value: 2.0 }, { name: 'Güney Kore 10Y', value: 1.1 },
                { name: 'Avustralya 10Y', value: 0.9 }, { name: 'Kanada 10Y', value: 1.2 }, { name: 'Brezilya 10Y', value: 0.8 },
                { name: 'Türkiye 10Y Tahvil', value: 0.3 }
            ];
            
            list.push({ name: 'ABD 10Y Hazine', price: indicators.us10y?.price, change: (indicators.us10y?.change || 0) * mult, value: 15.0 });
            list.push({ name: 'ABD 02Y Hazine', price: indicators.us02y?.price, change: (indicators.us02y?.change || 0) * mult, value: 8.0 });
            
            const baseChange = (indicators.us10y?.change || 0) * mult * -1; // Bond value inverted to yield
            topBonds.forEach((item, i) => {
                list.push({ name: item.name, value: item.value, change: baseChange + (Math.sin(i)*0.2) });
            });
            
            list.push({ name: 'DİĞER TAHVİLLER', value: 70.0, change: baseChange, isOther: true });
        } 
        
        else if (type === 'fiat') {
            const topFiat = [
                { name: 'Para Piyasası Fonları (MMF)', value: 6.4 }, { name: 'Kurumsal Nakit Rezervleri', value: 3.2 }, { name: 'Gecelik Repo Piyasası', value: 2.1 },
                { name: 'ABD Doları (M2)', value: 20.8 }, { name: 'Çin Yuanı (M2)', value: 41.5 }, { name: 'Euro (M2)', value: 16.5 },
                { name: 'Japon Yeni (M2)', value: 10.2 }, { name: 'İngiliz Sterlini (M2)', value: 4.1 }, { name: 'İsviçre Frangı', value: 1.5 },
                { name: 'Kanada Doları', value: 1.8 }, { name: 'Avustralya Doları', value: 2.0 }, { name: 'Hindistan Rupisi', value: 2.8 },
                { name: 'Güney Kore Wonu', value: 2.5 }, { name: 'Brezilya Reali', value: 1.2 }, { name: 'Meksika Pesosu', value: 0.9 },
                { name: 'Rus Rublesi', value: 1.1 }, { name: 'Suudi Riyali', value: 0.6 }, { name: 'Singapur Doları', value: 0.5 },
                { name: 'Hong Kong Doları', value: 1.0 }, { name: 'Türk Lirası (M2)', value: 0.4 }, { name: 'Güney Afrika Randı', value: 0.3 },
                { name: 'Endonezya Rupiahı', value: 0.6 }, { name: 'Yeni Zelanda Doları', value: 0.2 }
            ];
            
            list.push({ name: 'EUR/USD Akışı', price: indicators.eurusd?.price, change: (indicators.eurusd?.change || 0) * mult, value: 5.0 });
            list.push({ name: 'GBP/USD Akışı', price: indicators.gbpusd?.price, change: (indicators.gbpusd?.change || 0) * mult, value: 3.0 });
            list.push({ name: 'USD/TRY Akışı', price: indicators.usdtry?.price, change: (indicators.usdtry?.change || 0) * mult, value: 1.0 });
            
            const baseChange = (indicators.dxy?.change || 0) * mult;
            topFiat.forEach((item, i) => {
                list.push({ name: item.name, value: item.value, change: baseChange + (Math.cos(i)*0.1) });
            });
            
            list.push({ name: 'DİĞER DÖVİZ REZERVLERİ', value: 22.0, change: baseChange, isOther: true });
        }
        
        return list;
    }

    calcValue(base, changePercent) {
        return base * (1 + (changePercent || 0) / 100);
    }
}

module.exports = new FlowService();
