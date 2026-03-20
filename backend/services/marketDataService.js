const yahooFinance = require('yahoo-finance2').default;
const axios = require('axios');
const cheerio = require('cheerio');
const Binance = require('binance-api-node').default;

yahooFinance.setGlobalConfig({ validation: { logErrors: false } });
const binanceClient = Binance();

class MarketDataService {
    /**
     * Fetches Global Market Indicators using multi-source strategy
     */
    async getGlobalIndicators() {
        try {
            console.log('📊 Fetching global indicators (Multi-Source)...');
            
            const results = {};

            // 1. Fetch BTC from Binance (Priority)
            results.btc = await this.fetchBTCFromBinance();

            // 2. Fetch others from Investing.com (Priority for VIX, DXY, GOLD)
            results.vix = await this.fetchFromInvesting('https://www.investing.com/indices/us-30-vix');
            results.dxy = await this.fetchFromInvesting('https://www.investing.com/indices/usdollar');
            results.gold = await this.fetchFromInvesting('https://www.investing.com/currencies/xau-usd');
            results.sp500 = await this.fetchFromInvesting('https://www.investing.com/indices/us-spx-500');
            results.nasdaq = await this.fetchFromInvesting('https://www.investing.com/indices/nq-100');

            // 3. Fallback to Yahoo Finance if any are still null
            const fallbacks = {
                vix: '^VIX',
                gold: 'GC=F',
                dxy: 'DX-Y.NYB',
                btc: 'BTC-USD',
                sp500: '^GSPC',
                nasdaq: '^IXIC'
            };

            for (const [key, symbol] of Object.entries(fallbacks)) {
                if (!results[key]) {
                    console.log(`⚠️ Fallback for ${key} using Yahoo Finance...`);
                    try {
                        const quote = await yahooFinance.quote(symbol);
                        results[key] = {
                            price: quote.regularMarketPrice,
                            change: quote.regularMarketChangePercent,
                            marketCap: quote.marketCap
                        };
                    } catch (e) {
                        console.error(`Yahoo Fallback failed for ${key}:`, e.message);
                    }
                }
            }

            return results;
        } catch (error) {
            console.error('Error in getGlobalIndicators:', error.message);
            return null;
        }
    }

    async fetchBTCFromBinance() {
        try {
            const ticker = await binanceClient.dailyStats({ symbol: 'BTCUSDT' });
            return {
                price: parseFloat(ticker.lastPrice),
                change: parseFloat(ticker.priceChangePercent),
                marketCap: null // Binance doesn't provide MC in simple ticker
            };
        } catch (e) {
            console.error('Binance BTC fetch failed:', e.message);
            return null;
        }
    }

    async fetchFromInvesting(url) {
        try {
            const { data } = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                timeout: 5000
            });
            const $ = cheerio.load(data);
            
            // Core selectors for price and change
            const priceText = $('[data-test="instrument-price-last"]').first().text().replace(/,/g, '');
            const changeText = $('[data-test="instrument-price-change-percent"]').first().text().replace(/[()%+]/g, '');

            if (priceText) {
                return {
                    price: parseFloat(priceText),
                    change: parseFloat(changeText) || 0,
                    marketCap: null
                };
            }
            return null;
        } catch (e) {
            console.warn(`Investing.com fetch failed for ${url}:`, e.message);
            return null;
        }
    }

    calculateMarketPressure(data) {
        if (!data) return 50; 

        let pressureScore = 50; 

        if (data.vix && data.vix.price) {
            if (data.vix.price > 25) pressureScore += 15;
            else if (data.vix.price > 20) pressureScore += 8;
            else if (data.vix.price < 15) pressureScore -= 10;
        }

        if (data.dxy && data.dxy.change) {
            if (data.dxy.change > 0.5) pressureScore += 10;
            else if (data.dxy.change < -0.5) pressureScore -= 10;
        }

        if (data.gold && data.gold.change) {
            if (data.gold.change > 1.0) pressureScore += 5;
        }

        return Math.min(Math.max(pressureScore, 0), 100);
    }

    /**
     * Generates data for Top Stocks Heatmap (S&P 500 representative)
     */
    async getHeatmapData() {
        try {
            const topStocks = {
                'NVDA': 'Tech', 'MSFT': 'Tech', 'AAPL': 'Tech', 'AMD': 'Tech',
                'JPM': 'Finance', 'GS': 'Finance', 'V': 'Finance',
                'XOM': 'Energy', 'CVX': 'Energy',
                'UNH': 'Healthcare', 'PFE': 'Healthcare', 'JNJ': 'Healthcare',
                'AMZN': 'Consumer', 'TSLA': 'Consumer', 'GOOGL': 'Tech'
            };

            const data = [];
            for (const [symbol, sector] of Object.entries(topStocks)) {
                try {
                    const quote = await yahooFinance.quote(symbol, { validate: false });
                    data.push({
                        symbol,
                        sector,
                        price: quote.regularMarketPrice,
                        change: quote.regularMarketChangePercent,
                        marketCap: quote.marketCap
                    });
                } catch (e) {
                    console.error(`Heatmap fetch failed for ${symbol}:`, e.message);
                    data.push({ symbol, sector, price: 0, change: 0, marketCap: 0 });
                }
                // Small sleep to avoid rate limits
                await new Promise(r => setTimeout(r, 100));
            }

            return data;
        } catch (error) {
            console.error('Heatmap fetch failed:', error.message);
            return [];
        }
    }
}

module.exports = new MarketDataService();
