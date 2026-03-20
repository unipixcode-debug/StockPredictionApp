const yahooFinance = require('yahoo-finance2').default;

class MarketDataService {
    /**
     * Fetches Global Market Indicators
     * VIX: Fear Index (^VIX)
     * Gold: Gold Futures (GC=F)
     * DXY: US Dollar Index (DX-Y.NYB)
     * BTC: Bitcoin (BTC-USD)
     */
    async getGlobalIndicators() {
        try {
            console.log('📊 Fetching global indicators from Yahoo Finance...');
            const symbols = {
                vix: '^VIX',
                gold: 'GC=F',
                dxy: 'DX-Y.NYB',
                btc: 'BTC-USD',
                sp500: '^GSPC',
                nasdaq: '^IXIC'
            };

            const quotes = await Promise.all(
                Object.entries(symbols).map(async ([key, symbol]) => {
                    try {
                        const quote = await yahooFinance.quote(symbol);
                        return [key, {
                            price: quote.regularMarketPrice,
                            change: quote.regularMarketChangePercent,
                            marketCap: quote.marketCap
                        }];
                    } catch (err) {
                        console.error(`Failed to fetch ${symbol}:`, err.message);
                        return [key, null];
                    }
                })
            );

            return Object.fromEntries(quotes);
        } catch (error) {
            console.error('Error in getGlobalIndicators:', error.message);
            return null;
        }
    }

    calculateMarketPressure(data) {
        if (!data) return 50; // Neutral fallback

        let pressureScore = 50; // Base: Neutral

        // VIX: High VIX (>20-25) means high fear (Bearish)
        if (data.vix) {
            if (data.vix.price > 25) pressureScore += 15;
            else if (data.vix.price > 20) pressureScore += 8;
            else if (data.vix.price < 15) pressureScore -= 10;
        }

        // DXY: High DXY often inverse to risk assets like BTC/Stocks
        if (data.dxy && data.dxy.change > 0.5) {
            pressureScore += 10;
        } else if (data.dxy && data.dxy.change < -0.5) {
            pressureScore -= 10;
        }

        // Gold: Safety asset
        if (data.gold && data.gold.change > 1.0) {
            pressureScore += 5;
        }

        // Clamp 0 (Very Bullish/Secure) - 100 (Very Bearish/Fearful)
        return Math.min(Math.max(pressureScore, 0), 100);
    }
}

module.exports = new MarketDataService();
