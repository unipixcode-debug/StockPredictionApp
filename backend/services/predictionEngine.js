const marketDataService = require('./marketDataService');
const newsService = require('./newsService');
const Prediction = require('../models/Prediction');
const aiService = require('./aiService');
const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

class PredictionEngine {
    /**
     * Bütüncül Tahmin Analizi
     * @param {string} symbol - Örn: 'AAPL', 'BTC-USD', 'THYAO.IS'
     * @param {string} market - 'US', 'CRYPTO', 'BIST'
     */
    async generatePrediction(symbol, market) {
        try {
            console.log(`Analyzing ${symbol} in ${market} market...`);

            // 1. Varlık Verilerini Çek - Emtia düzeltmesi (XAU-USD veya XAUUSD bazen hatalı veri döner)
            let fetchSymbol = symbol;
            if (market === 'COMMODITY' && (symbol.includes('XAU') || symbol.includes('GOLD'))) fetchSymbol = 'GC=F';
            if (market === 'COMMODITY' && (symbol.includes('XAG') || symbol.includes('SILVER'))) fetchSymbol = 'SI=F';
            
            console.log(`Fetching quote for ${fetchSymbol}...`);
            const quote = await yahooFinance.quote(fetchSymbol);
            if (!quote) throw new Error('Symbol not found');

            // 2. Makro / Korelasyon Verileri
            const globalIndicators = await marketDataService.getGlobalIndicators();
            const pressureScore = marketDataService.calculateMarketPressure(globalIndicators); // 0-100 (Yüksek = Kötü)

            // 3. Haber Duyarlılığı
            const news = await newsService.fetchLatestNews(symbol);
            const sentimentScore = await newsService.analyzeSentiment(news); // 0-100 (Yüksek = İyi)

            // 4. Nihai Puanlama Mantığı
            const technicalFactor = quote.regularMarketChangePercent > 0 ? 70 : 30;
            const finalScore = (sentimentScore * 0.4) + ((100 - pressureScore) * 0.4) + (technicalFactor * 0.2);

            let direction = 'HOLD';
            if (finalScore > 65) direction = 'BUY';
            else if (finalScore < 35) direction = 'SELL';

            // 5. ML Chart & Level Calculation (Positions, Entry, Targets)
            const currentPrice = quote.regularMarketPrice;
            const volatility = Math.abs(quote.regularMarketChangePercent || 2) / 100;
            
            let entryPrice = currentPrice;
            let targetPrice = direction === 'BUY' ? currentPrice * (1 + (volatility * 5)) : currentPrice * (1 - (volatility * 5));
            let stopLoss = direction === 'BUY' ? currentPrice * (1 - (volatility * 2.5)) : currentPrice * (1 + (volatility * 2.5));

            if (direction === 'HOLD') {
                targetPrice = currentPrice * 1.02;
                stopLoss = currentPrice * 0.98;
            }

            // Generate Simulated ML Chart Data (Points for a line chart)
            const priceHistory = [];
            const points = 20;
            for (let i = 0; i < points; i++) {
                const isFuture = i > points * 0.7; // Last 30% is prediction
                let price;
                if (!isFuture) {
                    price = currentPrice * (1 + (Math.random() - 0.5) * 0.02);
                } else {
                    const progress = (i - points * 0.7) / (points * 0.3);
                    const trend = direction === 'BUY' ? 1 : (direction === 'SELL' ? -1 : 0);
                    price = currentPrice + (targetPrice - currentPrice) * progress + (Math.random() - 0.5) * 0.01 * currentPrice;
                }
                priceHistory.push({ time: i, price: price, isPrediction: isFuture });
            }

            // Generate Model Comparison scores (AI vs ML) for different timeframes
            const timeframes = ['1S', '2S', '4S', '1G', '1Hafta', '1Ay'];
            const sentimentMultiplier = (finalScore - 45) * 2; // Map ~50 to 0, 100 to +100, 0 to -100
            
            const modelComparison = timeframes.map((tf, index) => {
                const aiVol = (Math.random() - 0.5) * 40;
                const mlVol = (Math.random() - 0.5) * 20;
                
                let aiScore = sentimentMultiplier + aiVol;
                let mlScore = sentimentMultiplier + mlVol;

                // Ensure they don't exceed -100 to +100
                aiScore = Math.max(-100, Math.min(100, aiScore));
                mlScore = Math.max(-100, Math.min(100, mlScore));

                return { 
                    timeframe: tf, 
                    ai: Math.round(aiScore), 
                    ml: Math.round(mlScore) 
                };
            });

            // 6. AI Reasoning (Akıl Yürütme)
            let reasoning = "Analiz yapılıyor...";
            try {
                const prompt = `Provide a short, professional 2-3 sentence financial reasoning in Turkish for the following technical analysis:
                Symbol: ${symbol}
                Market: ${market}
                Price: ${quote.regularMarketPrice}
                AI Sentiment Score: ${sentimentScore}/100
                Global Market Pressure: ${pressureScore}/100
                Current Trend: ${direction}
                
                Explain why the recommendation is ${direction} based on indicators and news sentiment. Use professional tone.`;
                
                reasoning = await aiService.generateContent(prompt);
            } catch (aiErr) {
                console.warn("Reasoning generation failed:", aiErr.message);
                reasoning = `${symbol} için ${direction} sinyali. Haber puanı: ${sentimentScore}, Pazar baskısı: ${pressureScore}`;
            }

            // 7. Veritabanına Kaydet
            const prediction = await Prediction.create({
                symbol: symbol,
                market: market,
                direction: direction,
                score: Math.round(finalScore),
                confidence: 75,
                entryPrice: entryPrice,
                targetPrice: targetPrice,
                stopLoss: stopLoss,
                analysis_details: {
                    sentiment: sentimentScore,
                    marketPressure: pressureScore,
                    vix: globalIndicators?.vix?.price,
                    goldChange: globalIndicators?.gold?.change,
                    summary: reasoning,
                    chartData: priceHistory, // For line charts
                    modelComparison: modelComparison, // For AI vs ML bars
                    originalSummary: `${symbol} için ${direction} sinyali. Haber puanı: ${sentimentScore}, Pazar baskısı: ${pressureScore}`
                }
            });

            return prediction;
        } catch (error) {
            console.error('Prediction generation error:', error);
            throw error;
        }
    }
}

module.exports = new PredictionEngine();
