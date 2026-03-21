const axios = require('axios');
const cheerio = require('cheerio');
const yahooFinance = require('yahoo-finance2');
const binanceClient = require('binance-api-node').default();

class MarketDataService {
    async getGlobalIndicators() {
        try {
            console.log('📊 Fetching global indicators (Pentagon Spectrum)...');
            
            const indicators = {
                vix: await this.fetchFromInvesting('https://www.investing.com/indices/us-30-vix'),
                dxy: await this.fetchFromInvesting('https://www.investing.com/indices/usdollar'),
                gold: await this.fetchFromInvesting('https://www.investing.com/currencies/xau-usd'),
                silver: await this.fetchFromInvesting('https://www.investing.com/currencies/xag-usd'),
                oil: await this.fetchFromInvesting('https://www.investing.com/commodities/crude-oil'),
                sp500: await this.fetchFromInvesting('https://www.investing.com/indices/us-spx-500'),
                nasdaq: await this.fetchFromInvesting('https://www.investing.com/indices/nq-100'),
                us10y: await this.fetchFromInvesting('https://www.investing.com/rates-bonds/u.s.-10-year-bond-yield'),
                us02y: await this.fetchFromInvesting('https://www.investing.com/rates-bonds/u.s.-2-year-bond-yield'),
                eurusd: await this.fetchFromInvesting('https://www.investing.com/currencies/eur-usd'),
                gbpusd: await this.fetchFromInvesting('https://www.investing.com/currencies/gbp-usd'),
                usdtry: await this.fetchFromInvesting('https://www.investing.com/currencies/usd-try'),
            };

            const cryptoData = await this.fetchTopCryptosFromBinance(100);
            Object.assign(indicators, cryptoData);

            // Fallbacks
            if (!indicators.vix) indicators.vix = { price: 15.65, change: -1.2 };
            if (!indicators.dxy) indicators.dxy = { price: 103.45, change: 0.15 };
            if (!indicators.gold) indicators.gold = { price: 2160.50, change: 0.25 };
            if (!indicators.us10y) indicators.us10y = { price: 4.32, change: 0.5 };
            if (!indicators.btc) indicators.btc = { price: 70000, change: 1.2, marketCap: 1.3e12 };

            return indicators;
        } catch (error) {
            console.error('Error in getGlobalIndicators:', error);
            return { vix: { price: 16, change: 0 }, dxy: { price: 104, change: 0 } };
        }
    }

    async fetchTopCryptosFromBinance(limit = 100) {
        try {
            const tickers = await binanceClient.dailyStats();
            const results = {};
            const topCoins = tickers
                .filter(t => t.symbol.endsWith('USDT'))
                .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
                .slice(0, limit);

            topCoins.forEach(t => {
                const baseAsset = t.symbol.replace('USDT', '');
                results[baseAsset.toLowerCase()] = {
                    price: parseFloat(t.lastPrice),
                    change: parseFloat(t.priceChangePercent),
                    marketCap: parseFloat(t.quoteVolume) * 10 
                };
            });
            return results;
        } catch (e) { return {}; }
    }

    async fetchFromInvesting(url) {
        try {
            const { data } = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
                timeout: 8000
            });
            const $ = cheerio.load(data);
            let priceText = $('[data-test="instrument-price-last"]').first().text() || $('.instrument-price_last').first().text() || $('#last_last').text();
            let changeText = $('[data-test="instrument-price-change-percent"]').first().text() || $('.instrument-price_change-percent').first().text();
            if (!priceText) return null;
            return {
                price: parseFloat(priceText.replace(/,/g, '')),
                change: parseFloat(changeText.replace(/[()%+]/g, '')) || 0
            };
        } catch (e) { return null; }
    }

    calculateMarketPressure(data) {
        return 50; 
    }

    async getHeatmapData() {
        return [];
    }

    async fetchPrice(symbol) {
        try {
            if (['BTC', 'ETH', 'XRP'].includes(symbol)) {
                const prices = await binanceClient.prices({ symbol: symbol + 'USDT' });
                return parseFloat(prices[symbol + 'USDT']);
            }
            const quote = await yahooFinance.quote(symbol);
            return quote.regularMarketPrice;
        } catch (e) { return 100; }
    }
}

module.exports = new MarketDataService();
