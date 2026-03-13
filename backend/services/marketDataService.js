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
                bonds: '^TNX', // US 10 Year Treasury Yield
                dxy: 'DX=F',
                btc: 'BTC-USD',
                eth: 'ETH-USD',
                sp500: '^GSPC',
                nasdaq: '^IXIC',
                bist100: 'XU100.IS',
                sse: '000001.SS', // Shanghai Composite
                stoxx: '^STOXX50E', // Euro Stoxx 50
                // Expanded Commodities
                copper: 'HG=F',
                platinum: 'PL=F',
                palladium: 'PA=F',
                naturalGas: 'NG=F',
                wheat: 'ZW=F',
                corn: 'ZC=F',
                coffee: 'KC=F',
                // Expanded Bonds
                japan10y: '^JGB10',
                uk10y: '^GILT', // This might need verification, but it's common
                germany10y: '^GDBR10',
                turkey10y: 'TR10Y.IS',
                // Dominance & Indices (Note: Some might return null depending on YF availability)
                btcDominance: 'BTC-USD', // We'll use this for MCAP calculation
                ethDominance: 'ETH-USD'
            };

            // Top 100 Crypto Symbols
            const top100Crypto = [
                'BTC-USD', 'ETH-USD', 'USDT-USD', 'BNB-USD', 'SOL-USD', 'XRP-USD', 'USDC-USD', 'STETH-USD', 'ADA-USD', 'DOGE-USD',
                'SHIB-USD', 'AVAX-USD', 'DOT-USD', 'WBTC-USD', 'LINK-USD', 'TRX-USD', 'MATIC-USD', 'BCH-USD', 'NEAR-USD', 'UNI-USD',
                'LTC-USD', 'ICP-USD', 'DAI-USD', 'LEO-USD', 'APT-USD', 'STX-USD', 'FIL-USD', 'ETC-USD', 'KAS-USD', 'XLM-USD',
                'OKB-USD', 'ATOM-USD', 'RENDER-USD', 'WHBAR-USD', 'HBAR-USD', 'CRO-USD', 'IMX-USD', 'ARB-USD', 'OP-USD', 'PEPE-USD',
                'VET-USD', 'WIF-USD', 'GRT-USD', 'RNDR-USD', 'MKR-USD', 'LDO-USD', 'SUI-USD', 'TIA-USD', 'THETA-USD', 'EGLD-USD',
                'FTM-USD', 'SEI-USD', 'INJ-USD', 'FLOKI-USD', 'BEAM-USD', 'AAVE-USD', 'GALA-USD', 'SAND-USD', 'ALGO-USD', 'QNT-USD',
                'FLOW-USD', 'AXS-USD', 'BONK-USD', 'JUP-USD', 'FET-USD', 'CHZ-USD', 'MINA-USD', 'MANA-USD', 'ORDI-USD', 'BSV-USD',
                'RUNE-USD', 'EOS-USD', 'DYDX-USD', 'KCS-USD', 'PYTH-USD', 'KAVA-USD', 'Ethena-USD', 'GNO-USD', 'STRK-USD', 'PENDLE-USD',
                'GMT-USD', 'RON-USD', 'CKB-USD', 'NFT-USD', 'AKRO-USD', 'ANKR-USD', 'WOO-USD', 'W-USD', 'CORE-USD', 'JASMY-USD',
                'ZIL-USD', 'LUNA-USD', 'XEC-USD', 'FTX-USD', 'TWT-USD', 'SXP-USD', 'RVN-USD', 'QTUM-USD', 'GLM-USD', 'BTT-USD'
            ];

            const results = {};
            const allSymbols = { ...symbols };
            top100Crypto.forEach(s => { if (!allSymbols[s]) allSymbols[s] = s; });

            // Fetch in chunks to avoid URL length issues or rate limits
            const symbolList = Object.values(allSymbols);
            const chunkSize = 20;
            for (let i = 0; i < symbolList.length; i += chunkSize) {
                const chunk = symbolList.slice(i, i + chunkSize);
                try {
                    const quotes = await yahooFinance.quote(chunk);
                    // Use for...of to handle the array/single return of YF quote
                    const quoteArray = Array.isArray(quotes) ? quotes : [quotes];
                    quoteArray.forEach(quote => {
                        results[quote.symbol] = {
                            price: quote.regularMarketPrice,
                            change: quote.regularMarketChangePercent,
                            high: quote.regularMarketDayHigh,
                            low: quote.regularMarketDayLow,
                            marketCap: quote.marketCap // Added for dominance calc
                        };
                    });
                } catch (e) {
                    console.error(`Error fetching crypto chunk:`, e.message);
                }
            }

            // Map standard keys back to results for easier access
            for (const [key, sym] of Object.entries(symbols)) {
                if (results[sym]) results[key] = results[sym];
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
