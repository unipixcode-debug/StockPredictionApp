const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

/**
 * Global Piyasa Göstergelerini Çeker
 * VIX: Korku Endeksi
 * Gold: GC=F
 * DXY: DX-Y.NYB
 * BTC: BTC-USD
 */
class MarketDataService {
    async getGlobalIndicators() {
        try {
            const symbols = {
                vix: '^VIX',
                gold: 'GC=F',
                silver: 'SI=F',
                oil: 'CL=F', // Crude Oil
                bonds: '^TNX', // 10 Year Treasury Yield
                dxy: 'DX=F',
                btc: 'BTC-USD',
                eth: 'ETH-USD',
                sp500: '^GSPC',
                nasdaq: '^IXIC',
                bist100: 'XU100.IS',
                sse: '000001.SS', // Shanghai Composite
                stoxx: '^STOXX50E' // Euro Stoxx 50
            };

            const results = {};

            for (const [key, symbol] of Object.entries(symbols)) {
                try {
                    const quote = await yahooFinance.quote(symbol);
                    results[key] = {
                        price: quote.regularMarketPrice,
                        change: quote.regularMarketChangePercent,
                        high: quote.regularMarketDayHigh,
                        low: quote.regularMarketDayLow
                    };
                } catch (e) {
                    console.error(`Error fetching ${symbol}:`, e.message);
                    results[key] = null;
                }
            }

            return results;
        } catch (error) {
            console.error('Global indicator fetch error:', error);
            return null;
        }
    }

    /**
     * Basit Korelasyon Analizi:
     * - VIX yüksekse (>20-25) riskli varlıklar (Hisse, Kripto) için negatiftir.
     * - Altın yükseliyorsa genellikle piyasada belirsizlik vardır.
     * - DXY yükseliyorsa riskli varlıklar üzerinde baskı oluşur.
     */
    calculateMarketPressure(data) {
        if (!data) return 50; // Neutral if no data

        let pressureScore = 50; // 0 (Bullish/Secure) - 100 (Bearish/Danger)

        // VIX Logic
        if (data.vix) {
            if (data.vix.price > 25) pressureScore += 15;
            else if (data.vix.price < 15) pressureScore -= 10;
        }

        // DXY Logic (Dolar güçlenirse borsa zorlanır)
        if (data.dxy && data.dxy.change > 0.5) pressureScore += 10;
        else if (data.dxy && data.dxy.change < -0.5) pressureScore -= 10;

        // Gold Logic (Altın güvenli liman, borsadan kaçış göstergesi olabilir)
        if (data.gold && data.gold.change > 1.0) pressureScore += 5;

        return Math.min(Math.max(pressureScore, 0), 100);
    }
}

module.exports = new MarketDataService();
