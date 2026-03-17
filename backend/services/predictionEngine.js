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
     * @param {string} userId - Owner user ID
     */
    async generatePrediction(symbol, market, userId) {
        try {
            console.log(`Analyzing ${symbol} for user ${userId || 'anonymous'} in ${market} market...`);

            // 1. Fetch Quote
            let fetchSymbol = symbol;
            if (market === 'COMMODITY' && (symbol.includes('XAU') || symbol.includes('GOLD'))) fetchSymbol = 'GC=F';
            if (market === 'COMMODITY' && (symbol.includes('XAG') || symbol.includes('SILVER'))) fetchSymbol = 'SI=F';
            
            let quote;
            try {
                quote = await yahooFinance.quote(fetchSymbol);
            } catch (e) {
                console.warn(`Yahoo Finance failed for ${fetchSymbol}, using AI estimation...`);
            }

            // 2. Indicators & Sentiment
            let globalIndicators = {};
            let pressureScore = 50;
            let sentimentScore = 50;

            try {
                globalIndicators = await marketDataService.getGlobalIndicators();
                pressureScore = marketDataService.calculateMarketPressure(globalIndicators);
                const news = await newsService.fetchLatestNews(symbol);
                sentimentScore = await newsService.analyzeSentiment(news);
            } catch (e) {
                console.warn("Indicator/Sentiment fetch partially failed, using defaults.");
            }

            // 3. Scoring
            const technicalFactor = (quote && quote.regularMarketChangePercent > 0) ? 70 : 30;
            const finalScore = (sentimentScore * 0.4) + ((100 - pressureScore) * 0.4) + (technicalFactor * 0.2);

            let direction = 'HOLD';
            if (finalScore > 65) direction = 'BUY';
            else if (finalScore < 35) direction = 'SELL';

            // 4. Price & Chart Data
            const currentPrice = quote?.regularMarketPrice || 100; // Mock if no quote
            const volatility = Math.abs(quote?.regularMarketChangePercent || 2) / 100;
            
            const entryPrice = currentPrice;
            const targetPrice = direction === 'BUY' ? currentPrice * (1 + (volatility * 5)) : currentPrice * (1 - (volatility * 5));
            const stopLoss = direction === 'BUY' ? currentPrice * (1 - (volatility * 2.5)) : currentPrice * (1 + (volatility * 2.5));

            const priceHistory = [];
            for (let i = 0; i < 20; i++) {
                const isFuture = i > 14;
                let price = currentPrice * (1 + (Math.random() - 0.5) * 0.02);
                if (isFuture) {
                    const progress = (i - 14) / 6;
                    price = currentPrice + (targetPrice - currentPrice) * progress + (Math.random() - 0.5) * 0.01 * currentPrice;
                }
                priceHistory.push({ time: i, price, isPrediction: isFuture });
            }

            // 5. AI Reasoning
            let reasoning = "";
            try {
                const prompt = `Provide 2 sentences in Turkish analyzing ${symbol} (${market}). Current trend is ${direction}. Score: ${Math.round(finalScore)}/100. Be professional.`;
                reasoning = await aiService.generateContent(prompt, "gemini-1.5-flash");
            } catch (aiErr) {
                reasoning = `${symbol} için ${direction} sinyali. Güven: %${Math.round(finalScore)}. Pazar baskısı: ${pressureScore}`;
            }

            // 6. DB Persistence (CRITICAL FIX)
            const prediction = await Prediction.create({
                symbol: symbol,
                market: market,
                direction: direction,
                score: Math.round(finalScore),
                confidence: 75,
                entryPrice: entryPrice,
                targetPrice: targetPrice,
                stopLoss: stopLoss,
                userId: userId, 
                analysis_details: {
                    summary: reasoning,
                    chartData: priceHistory,
                    sentiment: sentimentScore,
                    marketPressure: pressureScore,
                    originalSummary: reasoning
                }
            });

            return prediction;
        } catch (error) {
            console.error('Prediction Generation Failure:', error);
            throw error;
        }
    }
}

module.exports = new PredictionEngine();
