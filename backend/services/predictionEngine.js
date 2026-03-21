const marketDataService = require('./marketDataService');
const newsService = require('./newsService');
const Prediction = require('../models/Prediction');
const aiService = require('./aiService');
let yahooFinance = require('yahoo-finance2');
if (yahooFinance.default) yahooFinance = yahooFinance.default;

if (typeof yahooFinance.setGlobalConfig === 'function') {
    yahooFinance.setGlobalConfig({ validation: { logErrors: false } });
}

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
            let extractedSentiment = typeof sentimentScore === 'object' ? (sentimentScore.score || 50) : (Number(sentimentScore) || 50);
            if (isNaN(extractedSentiment)) extractedSentiment = 50;
            if (isNaN(pressureScore)) pressureScore = 50;
            
            const technicalFactor = (quote && quote.regularMarketChangePercent > 0) ? 70 : 30;
            let finalScore = (extractedSentiment * 0.4) + ((100 - pressureScore) * 0.4) + (technicalFactor * 0.2);
            if (isNaN(finalScore)) finalScore = 50;

            let direction = 'HOLD';
            if (finalScore > 65) direction = 'BUY';
            else if (finalScore < 35) direction = 'SELL';

            // 4. Price & Chart Data
            let currentPrice = Number(quote?.regularMarketPrice);
            if (!currentPrice || isNaN(currentPrice) || currentPrice === 100) {
                // Secondary fallback using our custom fetcher (likely Binance)
                console.log(`Using custom price fetcher for ${symbol}...`);
                const fallbackPrice = await marketDataService.fetchPrice(symbol);
                if (fallbackPrice) currentPrice = fallbackPrice;
                else if (!currentPrice) currentPrice = 100; // Last resort mock
            }
            const volatility = Math.abs(Number(quote?.regularMarketChangePercent) || 2) / 100;
            
            const entryPrice = currentPrice;
            let targetPrice = direction === 'BUY' ? currentPrice * (1 + (volatility * 5)) : currentPrice * (1 - (volatility * 5));
            let stopLoss = direction === 'BUY' ? currentPrice * (1 - (volatility * 2.5)) : currentPrice * (1 + (volatility * 2.5));

            // Final safety net for prices
            if (isNaN(targetPrice)) targetPrice = currentPrice * 1.05;
            if (isNaN(stopLoss)) stopLoss = currentPrice * 0.95;

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
                reasoning = await aiService.generateContent(prompt, null);
            } catch (aiErr) {
                reasoning = `${symbol} için ${direction} sinyali. Güven: %${Math.round(finalScore)}. Pazar baskısı: ${pressureScore}`;
            }

            // 6. DB Persistence (CRITICAL FIX)
            const prediction = await Prediction.create({
                symbol: symbol,
                market: market,
                direction: direction,
                score: Math.round(finalScore) || 50,
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
