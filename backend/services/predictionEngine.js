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

            // 1. Varlık Verilerini Çek
            const quote = await yahooFinance.quote(symbol);
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

            // 5. AI Reasoning (Akıl Yürütme)
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

            // 6. Veritabanına Kaydet
            const prediction = await Prediction.create({
                symbol: symbol,
                market: market,
                direction: direction,
                score: Math.round(finalScore),
                confidence: 75,
                targetPrice: quote.regularMarketPrice * (direction === 'BUY' ? 1.05 : 0.95),
                analysis_details: {
                    sentiment: sentimentScore,
                    marketPressure: pressureScore,
                    vix: globalIndicators?.vix?.price,
                    goldChange: globalIndicators?.gold?.change,
                    summary: reasoning, // Using the AI reasoning here
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
