const newsService = require('./newsService');
const marketDataService = require('./marketDataService');
const aiService = require('./aiService');

class CacheService {
    constructor() {
        this.cache = {
            stats: null,
            news: null,
            newsEN: null,
            lastUpdate: null,
            isUpdating: false
        };
        this.updateInterval = 5 * 60 * 1000; // 5 minutes (reduced from 1 min to preserve AI quota)
    }

    async startBackgroundUpdates() {
        console.log('🚀 Background Cache Updates Started');
        // Initial update
        await this.updateCache();
        
        // Schedule next updates
        setInterval(() => {
            this.updateCache();
        }, this.updateInterval);
    }

    async updateCache() {
        if (this.cache.isUpdating) {
            console.log('⏳ Cache update already in progress, skipping...');
            return;
        }

        this.cache.isUpdating = true;
        console.log('🔄 Updating Global Cache (Stats & News)...');

        try {
            // 1. Fetch Market Stats
            const indicators = await marketDataService.getGlobalIndicators();
            if (indicators) {
                const vix = indicators.vix;
                const dxy = indicators.dxy;
                const btc = indicators.btc;
                const pressure = marketDataService.calculateMarketPressure(indicators);

                // Labels & Trends
                const stats = {
                    btcCorrelation: { 
                        label: btc?.change > 2 ? 'Güçlü' : btc?.change < -2 ? 'Zayıf' : 'Orta', 
                        trend: `${btc?.change >= 0 ? '+' : ''}${btc?.change?.toFixed(2) ?? '0'}%`,
                        price: btc?.price 
                    },
                    vix: { 
                        label: vix?.price < 15 ? 'Düşük' : vix?.price > 25 ? 'Yüksek' : 'Orta', 
                        trend: `${vix?.change >= 0 ? '+' : ''}${vix?.change?.toFixed(2) ?? '0'}%`, 
                        price: vix?.price 
                    },
                    dxy: { 
                        label: dxy?.change > 0.5 ? 'Güçlü' : dxy?.change < -0.5 ? 'Zayıf' : 'Orta', 
                        trend: `${dxy?.change >= 0 ? '+' : ''}${dxy?.change?.toFixed(2) ?? '0'}%`, 
                        price: dxy?.price 
                    },
                    sentiment: { 
                        label: pressure < 40 ? 'Pozitif' : pressure > 60 ? 'Negatif' : 'Nötr', 
                        trend: pressure < 40 ? 'Boğa' : pressure > 60 ? 'Ayı' : 'Yatay', 
                        pressureScore: pressure 
                    },
                    raw: { vix, dxy, btc, sp500: indicators.sp500, gold: indicators.gold, nasdaq: indicators.nasdaq }
                };
                this.cache.stats = stats;
            }

            // 2. Fetch & Summarize News (TR primary). EN is fetched on-demand per request.
            console.log('🔄 Fetching News (TR)...');
            const newsTR = await newsService.fetchLatestNews('', 'TR');
            this.cache.news = newsTR;

            this.cache.lastUpdate = new Date();
            console.log(`✅ Cache Updated Successfully at ${this.cache.lastUpdate.toLocaleTimeString()}`);
        } catch (error) {
            console.error('❌ Cache Update Error:', error.message);
        } finally {
            this.cache.isUpdating = false;
        }
    }

    getStats() {
        return this.cache.stats;
    }

    getNews(lang = 'TR') {
        return lang === 'EN' ? this.cache.newsEN : this.cache.news;
    }
}

module.exports = new CacheService();
