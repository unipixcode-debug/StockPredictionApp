const axios = require('axios');
const cheerio = require('cheerio');
const YF = require('yahoo-finance2').default;
const yahooFinance = new YF({ suppressNotices: ['ripHistorical', 'yahooSurvey'] });
const binance = require('binance-api-node').default;
const binanceClient = binance();
const scraperService = require('./scraperService');

const TRUNCGIL_ASSETS = [
    { symbol: 'TRUNC:gram-altin', shortname: 'Gram Altın', longname: 'Gram Altın (Serbest Piyasa)', typeDisp: 'Gold', exchange: 'KAPALİÇARŞI' },
    { symbol: 'TRUNC:ceyrek-altin', shortname: 'Çeyrek Altın', longname: 'Çeyrek Altın (Yeni)', typeDisp: 'Gold', exchange: 'KAPALİÇARŞI' },
    { symbol: 'TRUNC:yarim-altin', shortname: 'Yarım Altın', longname: 'Yarım Altın (Yeni)', typeDisp: 'Gold', exchange: 'KAPALİÇARŞI' },
    { symbol: 'TRUNC:tam-altin', shortname: 'Tam Altın', longname: 'Tam Altın (Yeni)', typeDisp: 'Gold', exchange: 'KAPALİÇARŞI' },
    { symbol: 'TRUNC:cumhuriyet-altini', shortname: 'Cumhuriyet Altını', longname: 'Cumhuriyet Altını', typeDisp: 'Gold', exchange: 'KAPALİÇARŞI' },
    { symbol: 'TRUNC:ata-altin', shortname: 'Ata Altın', longname: 'Ata Lira', typeDisp: 'Gold', exchange: 'KAPALİÇARŞI' },
    { symbol: 'TRUNC:gumus', shortname: 'Gümüş', longname: 'Gümüş (Gram)', typeDisp: 'Silver', exchange: 'KAPALİÇARŞI' },
    { symbol: 'TRUNC:USD', shortname: 'Dolar', longname: 'Amerikan Doları (Serbest Piyasa)', typeDisp: 'Currency', exchange: 'KAPALİÇARŞI' },
    { symbol: 'TRUNC:EUR', shortname: 'Euro', longname: 'Euro (Serbest Piyasa)', typeDisp: 'Currency', exchange: 'KAPALİÇARŞI' },
    { symbol: 'TRUNC:GBP', shortname: 'İngiliz Sterlini', longname: 'İngiliz Sterlini', typeDisp: 'Currency', exchange: 'KAPALİÇARŞI' }
];

const NASDAQ_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'NFLX', 'PYPL', 'ADBE', 'AVGO', 'COST', 'PEP', 'CSCO', 'CMCSA'];
const BIST_SYMBOLS = ['THYAO.IS', 'EREGL.IS', 'ASELS.IS', 'AKBNK.IS', 'ISCTR.IS', 'GARAN.IS', 'KCHOL.IS', 'SAHOL.IS', 'TUPRS.IS', 'BIMAS.IS', 'SISE.IS', 'YKBNK.IS', 'PGSUS.IS', 'ENKAI.IS', 'FROTO.IS'];

class MarketDataService {
    constructor() {
        this.lastIndicators = {}; // Persistent cache for resilience
        this.isUpdating = false;
        
        // Initial values for key indicators to avoid 0s on first load if fetch fails
        this.lastIndicators = {
            vix: { price: 15.0, change: 0, label: 'Orta' },
            dxy: { price: 103.5, change: 0, label: 'Orta' },
            gold: { price: 2350, change: 0 },
            btc: { price: 65000, change: 0, marketCap: 1.2e12 }
        };
    }

    async getGlobalIndicators() {
        if (this.isUpdating) return this.lastIndicators;
        this.isUpdating = true;
        
        try {
            const topCaps = { btc: 1.45e12, eth: 0.4e12, bnb: 0.08e12, sol: 0.08e12, xrp: 0.04e12, ada: 0.02e12, avax: 0.015e12, dot: 0.01e12, doge: 0.02e12, link: 0.01e12, trx: 0.01e12, shib: 0.01e12 };
            const indicators = { ...this.lastIndicators }; // Start with last known values

            const yfSymbols = {
                vix: '^VIX',
                dxy: 'DX-Y.NYB',
                gold: 'GC=F',
                silver: 'SI=F',
                oil: 'CL=F',
                sp500: '^GSPC',
                nasdaq: '^IXIC',
                us10y: '^TNX',
                us02y: '^IRX',
                eurusd: 'EURUSD=X',
                gbpusd: 'GBPUSD=X',
                usdtry: 'USDTRY=X'
            };

            // 1. Fetch Crypto from Binance (High Reliability)
            try {
                const allStats = await binanceClient.dailyStats();
                const usdtPairs = allStats
                    .filter(t => t.symbol.endsWith('USDT'))
                    .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
                    .slice(0, 150);

                usdtPairs.forEach((t, index) => {
                    const key = t.symbol.replace('USDT', '').toLowerCase();
                    const estimatedCap = topCaps[key] || (0.01e12 / (1 + (index / 10)));
                    indicators[key] = {
                        price: parseFloat(t.lastPrice),
                        change: parseFloat(t.priceChangePercent),
                        marketCap: estimatedCap
                    };
                });
                // Ensure 'btc' is specifically mapped if it was named 'btcusdt' internally
                if (indicators['btc']) this.lastIndicators['btc'] = indicators['btc'];
            } catch (ce) { 
                console.error('⚠️ Binance fetch failed, using last known crypto data:', ce.message); 
            }

            // 2. Fetch Macro from Yahoo Finance (Tiered Fallback)
            const entries = Object.entries(yfSymbols);
            const yfResults = await Promise.allSettled(entries.map(([key, sym]) => yahooFinance.quote(sym)));

            for (let i = 0; i < entries.length; i++) {
                const key = entries[i][0];
                const res = yfResults[i];
                
                let success = false;
                if (res.status === 'fulfilled' && res.value) {
                    const price = parseFloat(res.value.regularMarketPrice || res.value.price);
                    const change = parseFloat(res.value.regularMarketChangePercent || res.value.priceChangePercent);
                    
                    if (!isNaN(price) && price > 0) {
                        indicators[key] = { price, change: isNaN(change) ? 0 : change };
                        success = true;
                    }
                }

                // Tier 2: Yahoo Scraper Fallback if API fails or returns invalid data
                if (!success || indicators[key]?.price <= 0) {
                    console.log(`🔍 MarketDataService: Attempting Scraper for ${key}...`);
                    const scraped = await this.scrapeYahooFinance(yfSymbols[key]);
                    if (scraped && scraped.price > 0) {
                        console.log(`✅ MarketDataService: Scraper success for ${key}: ${scraped.price}`);
                        indicators[key] = scraped;
                        success = true;
                    }
                }

                // Update persistent cache if success
                if (success) {
                    this.lastIndicators[key] = indicators[key];
                } else {
                    console.warn(`⚠️ MarketDataService: All sources failed for ${key}, using last good value.`);
                    indicators[key] = this.lastIndicators[key] || { price: 0, change: 0 };
                }
            }

            this.isUpdating = false;
            return indicators;
        } catch (e) { 
            console.error('Global indicators fetch error:', e.message);
            this.isUpdating = false;
            return this.lastIndicators; 
        }
    }

    async scrapeYahooFinance(symbol) {
        try {
            const url = `https://finance.yahoo.com/quote/${symbol}`;
            const { data } = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
                timeout: 5000
            });
            const $ = cheerio.load(data);
            
            // Multiple fallback selectors for Price
            const priceText = $('fin-streamer[data-field="regularMarketPrice"]').first().attr('value') || 
                             $('fin-streamer[data-test="qsp-price"]').first().text() ||
                             $('[data-test="instrument-price-last"]').first().text();
            
            // Multiple fallback selectors for Change Percent
            const changePctText = $('fin-streamer[data-field="regularMarketChangePercent"]').first().attr('value') || 
                                 $('fin-streamer[data-test="qsp-price-change-percent"]').first().text();

            // Multiple fallback selectors for Absolute Change (if Percent is missing)
            const changeAbsText = $('fin-streamer[data-field="regularMarketChange"]').first().attr('value') || 
                                 $('fin-streamer[data-test="qsp-price-change"]').first().text();
            
            if (!priceText) return null;
            
            const price = parseFloat(priceText.toString().replace(/,/g, ''));
            let change = parseFloat(changePctText?.toString().replace(/[()%+]/g, ''));

            // Safety calculation: if percent is missing or invalid, try to calculate from absolute change
            if (isNaN(change) || change === 0) {
                const absChange = parseFloat(changeAbsText?.toString().replace(/[()%+]/g, ''));
                if (!isNaN(absChange) && absChange !== 0 && price > 0) {
                    change = (absChange / (price - absChange)) * 100;
                }
            }
            
            return {
                price: price,
                change: isNaN(change) ? 0 : change
            };
        } catch (e) {
            console.error(`[Scraper Error] ${symbol}:`, e.message);
            return null;
        }
    }

    async fetchFromInvesting(url) {
        try {
            const { data } = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
                timeout: 8000
            });
            const $ = cheerio.load(data);
            
            // Priority selectors based on latest research
            let priceText = $('[data-test="instrument-price-last"]').first().text() || 
                           $('.instrument-price_last').first().text() || 
                           $('#last_last').text();
                           
            let changeText = $('[data-test="instrument-price-change-percent"]').first().text() || 
                             $('.instrument-price_change-percent').first().text() || 
                             $('#quotes_summary_secondary .arial_20').last().text();
            
            if (!priceText) return null;
            
            const price = parseFloat(priceText.replace(/,/g, ''));
            const change = parseFloat(changeText.replace(/[()%+]/g, '')) || 0;
            
            return { price, change };
        } catch (e) { return null; }
    }

    async fetchPrice(symbol) {
        try {
            const upperSymbol = (symbol || '').toUpperCase();
            if (!upperSymbol) return 0;
            
            const isCrypto = upperSymbol.endsWith('USDT') || ['BTC', 'ETH', 'XRP', 'SOL', 'AVAX', 'BNB', 'DOGE', 'ADA', 'TRX', 'DOT'].includes(upperSymbol);
            if (isCrypto) {
                const bSymbol = upperSymbol.endsWith('USDT') ? upperSymbol : upperSymbol + 'USDT';
                try {
                    const ticker = await binanceClient.dailyStats({ symbol: bSymbol });
                    if (ticker && ticker.lastPrice) return parseFloat(ticker.lastPrice);
                } catch (e) {}
            }

            try {
                const quote = await yahooFinance.quote(upperSymbol);
                if (quote && quote.regularMarketPrice) return quote.regularMarketPrice;
            } catch (e) {}

            return 0;
        } catch (error) {
            return 0;
        }
    }

    async fetchStockPrice(symbol) { return this.fetchPrice(symbol); }

    calculateMarketPressure(indicators) { return 50; }

    async getHistoricalData(symbol, timeframe = '1D', limit = 100) {
        try {
            const upperSymbol = symbol.toUpperCase();
            const intervalMap = { '1h': '1h', '4h': '4h', '1D': '1d', '1W': '1w', '1M': '1m' };
            const interval = intervalMap[timeframe] || '1d';
            const isCrypto = upperSymbol.endsWith('USDT') || ['BTC', 'ETH', 'XRP', 'SOL', 'AVAX', 'BNB', 'DOGE', 'ADA', 'TRX', 'DOT'].includes(upperSymbol);
            
            if (isCrypto) {
                const bSymbol = upperSymbol.endsWith('USDT') ? upperSymbol : upperSymbol + 'USDT';
                const candles = await binanceClient.candles({ symbol: bSymbol, interval, limit: parseInt(limit) || 50 });
                return candles.map(c => ({
                    time: Math.floor(c.openTime / 1000),
                    open: parseFloat(c.open),
                    high: parseFloat(c.high),
                    low: parseFloat(c.low),
                    close: parseFloat(c.close)
                }));
            } else {
                const period1Date = new Date();
                period1Date.setMonth(period1Date.getMonth() - 2); 
                const result = await yahooFinance.chart(upperSymbol, {
                    period1: Math.floor(period1Date.getTime() / 1000),
                    interval: interval === '1d' ? '1d' : interval
                });
                return (result.quotes || []).map(c => ({
                    time: Math.floor(c.date.getTime() / 1000),
                    open: c.open,
                    high: c.high,
                    low: c.low,
                    close: c.close
                })).filter(c => c.close != null);
            }
        } catch (error) {
            console.error(`[History Error] ${symbol}:`, error.message);
            return [];
        }
    }

    calculateRSI(prices, period = 14) {
        if (prices.length <= period) return 50;
        let gains = 0, losses = 0;
        for (let i = 1; i <= period; i++) {
            const diff = prices[prices.length - i] - prices[prices.length - i - 1];
            if (diff >= 0) gains += diff; else losses -= diff;
        }
        if (losses === 0) return 100;
        const rs = gains / losses;
        return 100 - (100 / (1 + rs));
    }

    calculateMACD(prices) {
        return { hist: 1 }; // Simplified for now
    }

    calculateEMA(prices, period) {
        return prices[prices.length - 1]; // Simplified
    }

    async searchAssets(query) {
        try {
            const q = query.toUpperCase();
            const results = [];

            // 1. Kapalıçarşı (Local)
            TRUNCGIL_ASSETS.forEach(a => {
                if (a.symbol.includes(q) || a.shortname.toUpperCase().includes(q)) {
                    results.push({
                        symbol: a.symbol,
                        name: a.shortname,
                        type: a.typeDisp,
                        exchange: a.exchange,
                        source: 'TRUNCGIL'
                    });
                }
            });

            // 2. Binance USDT Pairs
            try {
                const tickers = await binanceClient.dailyStats();
                tickers.filter(t => t.symbol.endsWith('USDT') && t.symbol.includes(q)).slice(0, 10).forEach(t => {
                    results.push({
                        symbol: t.symbol,
                        name: t.symbol.replace('USDT', ''),
                        type: 'Crypto',
                        exchange: 'BINANCE',
                        source: 'BINANCE'
                    });
                });
            } catch (e) {}

            // 3. Yahoo Finance
            try {
                const yfResults = await yahooFinance.search(query);
                yfResults.quotes.slice(0, 10).forEach(q => {
                    results.push({
                        symbol: q.symbol,
                        name: q.shortname || q.longname || q.symbol,
                        type: q.quoteType || q.typeDisp,
                        exchange: q.exchDisp || q.exchange,
                        source: 'YAHOO'
                    });
                });
            } catch (e) {}

            return results;
        } catch (error) {
            return [];
        }
    }

    async getHeatmapData() {
        try {
            const indicators = await this.getGlobalIndicators();
            const sectors = [
                { id: 'tech', name: 'Teknoloji (US)', symbols: ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META'] },
                { id: 'auto', name: 'Otomobil', symbols: ['TSLA', 'F', 'GM', 'TM', 'FROTO.IS', 'TOASO.IS'] },
                { id: 'crypto', name: 'Kripto Para', symbols: ['BTC', 'ETH', 'SOL', 'XRP', 'AVAX'] },
                { id: 'bist', name: 'BIST 30 (TR)', symbols: ['THYAO.IS', 'EREGL.IS', 'SAHOL.IS', 'KCHOL.IS', 'ASELS.IS'] }
            ];

            const heatmap = [];
            for (const sector of sectors) {
                const children = [];
                for (const symbol of sector.symbols) {
                    try {
                        const isCrypto = symbol.length <= 5 && !symbol.includes('.');
                        let price = 0, change = 0;
                        if (isCrypto) {
                           const t = await binanceClient.dailyStats({ symbol: symbol + 'USDT' });
                           price = parseFloat(t.lastPrice);
                           change = parseFloat(t.priceChangePercent);
                        } else {
                           const q = await yahooFinance.quote(symbol);
                           price = q.regularMarketPrice;
                           change = q.regularMarketChangePercent;
                        }
                        children.push({ name: symbol, value: Math.abs(change), price, change });
                    } catch (e) {}
                }
                heatmap.push({ name: sector.name, children });
            }
            return heatmap;
        } catch (e) { return []; }
    }

    async getScannerData(market = 'crypto', limit = 40) {
        console.log(`[Scanner] Requesting market: ${market}`);
        try {
            let sentimentData = [];
            try {
                const newsService = require('./newsService'); 
                sentimentData = await newsService.getSentimentAggregation(2);
            } catch (se) { console.error("[Scanner] Sentiment failed, continuing without it."); }

            let symbols = [];
            if (market === 'crypto') {
                const tickers = await binanceClient.dailyStats();
                symbols = tickers
                    .filter(t => t.symbol.endsWith('USDT'))
                    .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
                    .slice(0, limit || 40) 
                    .map(t => ({ symbol: t.symbol, price: parseFloat(t.lastPrice), change: parseFloat(t.priceChangePercent) }));
            } else {
                const list = (market === 'nasdaq') ? NASDAQ_SYMBOLS : BIST_SYMBOLS;
                symbols = list.map(s => ({ symbol: s }));
            }

            console.log(`[Scanner] Total symbols to process: ${symbols.length}`);
            const results = [];
            for (const symObj of symbols) {
                try {
                const symbol = symObj.symbol;
                const timeframe = (market === 'crypto') ? '1h' : '1D';
                const candles = await this.getHistoricalData(symbol, timeframe, 50);
                
                if (!candles || candles.length < 5) {
                    console.log(`[Scanner] Skipping ${symbol} - not enough data (${candles?.length || 0})`);
                    continue;
                }

                const prices = candles.map(c => c.close);
                const rsi = this.calculateRSI(prices);
                
                let currentPrice = symObj.price;
                let currentChange = symObj.change || 0;

                if (!currentPrice) {
                    const quote = await yahooFinance.quote(symbol);
                    currentPrice = quote.regularMarketPrice;
                    currentChange = quote.regularMarketChangePercent;
                }

                let aiScore = 50;
                if (rsi < 30) aiScore += 20; else if (rsi > 70) aiScore -= 10;
                
                const cleanSym = symbol.replace('.IS', '').replace('USDT', '');
                const assetSent = sentimentData.find(s => s.asset === cleanSym);
                if (assetSent) aiScore += (assetSent.averageScore - 50) / 2;

                aiScore = Math.min(100, Math.max(0, aiScore));
                results.push({
                    symbol, price: currentPrice, change: currentChange, rsi, aiScore,
                    signal: aiScore > 65 ? "AL" : "NÖTR",
                    tag: aiScore > 65 ? "buy" : "neutral",
                    volatility: 2
                });
                } catch (e) { console.error(`[Scanner Error] ${symObj.symbol}:`, e.message); }
            }
            console.log(`[Scanner] Found ${results.length} valid results.`);
            return results.sort((a, b) => b.aiScore - a.aiScore);
        } catch (error) {
            console.error('[Scanner Global Error]:', error);
            return [];
        }
    }
}

module.exports = new MarketDataService();
