const express = require('express');
const router = express.Router();
const marketDataService = require('../services/marketDataService');
const aiService = require('../services/aiService');
const newsService = require('../services/newsService');

// GET /api/scanner/top
router.get('/top', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 40;
        const market = req.query.market || 'crypto';
        const data = await marketDataService.getScannerData(market, limit);
        res.json(data);
    } catch (error) {
        console.error('Scanner API Error:', error);
        res.status(500).json({ error: 'Tarayıcı verisi alınamadı' });
    }
});

// POST /api/scanner/analyze
router.post('/analyze', async (req, res) => {
    try {
        const { symbol, rsi, macd, price } = req.body;
        const sentimentSummary = await newsService.getSentimentAggregation(3);
        
        const prompt = `Act as an AI Trading Bot. Analyze the following specific asset:
        Symbol: ${symbol}
        Current Price: ${price}
        RSI (14): ${rsi}
        MACD: ${JSON.stringify(macd)}
        Recent Market News Sentiment: ${JSON.stringify(sentimentSummary.slice(0, 3))}

        TASK: Provide a clear trading decision (AL, SAT, or BEKLE). 
        Calculate a specific Entry Point, Take Profit (TP), and Stop Loss (SL) based on technical levels.
        Provide a 2-sentence strategy rationale.

        Format requirement:
        | Decision | Entry | TP | SL | Rationale |
        | AL/SAT/BEKLE | ${price} | ... | ... | ... |
        `;

        const aiResponse = await aiService.generateContent(prompt, "gemini-flash-latest");
        res.json({ analysis: aiResponse });
    } catch (error) {
        console.error('Analysis API Error:', error);
        res.status(500).json({ error: 'Analiz yapılamadı' });
    }
});

module.exports = router;
