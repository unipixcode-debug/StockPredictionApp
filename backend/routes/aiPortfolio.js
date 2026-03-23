const express = require('express');
const router = express.Router();
const { AIPortfolio } = require('../models');
const aiService = require('../services/aiService');
const marketDataService = require('../services/marketDataService');
const newsService = require('../services/newsService');

// POST /api/ai-portfolio
router.post('/', async (req, res) => {
    try {
        const indicators = await marketDataService.getGlobalIndicators();
        const pressure = marketDataService.calculateMarketPressure(indicators);
        const sentimentSummary = await newsService.getSentimentAggregation(3);
        
        const btcPrice = indicators?.btc?.price || 65000;
        const spyPrice = indicators?.sp500?.price || 5000;
        const goldPrice = indicators?.gold?.price || 2300;
        
        const prompt = `Act as an elite quantitative analyst. Create a 100-unit portfolio based on the CURRENT macroeconomic data and news sentiment.
        Macro Data:
        VIX: ${indicators?.vix?.price} 
        DXY: ${indicators?.dxy?.price} 
        BTC: ${btcPrice} 
        Market Pressure Score: ${pressure} (0=Bullish, 100=Bearish)
        
        Recent Sentiment Top Assets: ${JSON.stringify(sentimentSummary.slice(0, 5))}
        
        Allocate EXACTLY 100 units across 4-8 assets (Crypto, Stocks, Metals, Cash). Use INDIVIDUAL, directly investable and distinct symbol tickers. DO NOT allocate any units to indices or abstract macro indicators like SP500, DXY, or VIX. If you want exposure to these indicators, you MUST choose real individual constituent stocks (like AAPL, MSFT, TSLA, NVDA) instead. You can use commodities like GOLD, OIL, and forex like USD. But strictly ZERO allocations directly to SP500, DXY, or VIX.
        For entry prices, approximate if you dont know, or use: BTC=${btcPrice}, SP500=${spyPrice}, GOLD=${goldPrice}.
        Provide a rationale. Keep it stable and deeply analyzed. Do not respond with anything outside the JSON.
        Format requirement:
        \`\`\`json
        {
            "name": "Dengeli Yapay Zeka Makro Portföyü",
            "rationale": "Mevcut VIX ve DXY baz alınarak risk iştahına göre tasarlandı...",
            "assets": [
                {"symbol": "BTC", "allocation": 30, "entryPrice": ${btcPrice}},
                {"symbol": "SP500", "allocation": 40, "entryPrice": ${spyPrice}},
                {"symbol": "GOLD", "allocation": 30, "entryPrice": ${goldPrice}}
            ]
        }
        \`\`\`
        `;

        const aiResponse = await aiService.generateContent(prompt, "gemini-flash-latest");
        let parsed;
        try {
            let cleanJson = aiResponse.trim();
            if (cleanJson.startsWith('\`\`\`')) {
                cleanJson = cleanJson.replace(/^```(json)?/, '').replace(/```$/, '').trim();
            }
            parsed = JSON.parse(cleanJson);
            
            let totalAlloc = 0;
            parsed.assets.forEach(a => totalAlloc += parseFloat(a.allocation));
            if(Math.abs(totalAlloc - 100) > 1) {
                // Normalization if AI messes up the exact 100 logic
                parsed.assets.forEach(a => {
                   a.allocation = (a.allocation / totalAlloc) * 100; 
                });
            }
            
            // Calculate entry qty
            parsed.assets = parsed.assets.map(a => ({
                ...a,
                quantity: parseFloat(a.allocation) / parseFloat(a.entryPrice || 1)
            }));
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: "Yapay zeka portföy formatını hatalı oluşturdu." });
        }

        // Soft-deactivate previous
        await AIPortfolio.update({ isActive: false }, { where: { isActive: true } });

        const newPortfolio = await AIPortfolio.create({
            name: parsed.name,
            rationale: parsed.rationale,
            initialValue: 100,
            assets: parsed.assets,
            isActive: true
        });

        res.json(newPortfolio);
    } catch (error) {
        console.error('AI Port Gen Error:', error);
        res.status(500).json({ error: 'Portföy oluşturulamadı.' });
    }
});

// GET /api/ai-portfolio
router.get('/', async (req, res) => {
    try {
        const ports = await AIPortfolio.findAll({ order: [['createdAt', 'DESC']] });
        res.json(ports);
    } catch (error) {
        res.status(500).json({ error: 'Listeleme hatası' });
    }
});

// DELETE /api/ai-portfolio/:id
router.delete('/:id', async (req, res) => {
    try {
        await AIPortfolio.destroy({ where: { id: req.params.id } });
        
        // Make the last one active if any
        const lastPort = await AIPortfolio.findOne({ order: [['createdAt', 'DESC']] });
        if (lastPort) {
            await lastPort.update({ isActive: true });
        }
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Silinemedi' });
    }
});

// GET /api/ai-portfolio/:id/history
router.get('/:id/history', async (req, res) => {
    try {
        const port = await AIPortfolio.findByPk(req.params.id);
        if (!port) return res.status(404).json({error: 'Not found'});

        const assets = typeof port.assets === 'string' ? JSON.parse(port.assets) : port.assets;
        
        // Generate a 30-day timeline array
        const past30Days = [];
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            past30Days.push(d.toISOString().split('T')[0]);
        }

        const historyData = {};
        for (const date of past30Days) {
            historyData[date] = { date, totalValue: 0 };
            assets.forEach(a => historyData[date][a.symbol] = 0);
        }

        // Fetch backtest data for each asset
        for (const asset of assets) {
            let symbolData = [];
            try {
                // Assume marketDataService gets Yahoo finance series format [{date, close}, ...]
                const series = await marketDataService.getHistoricalData(asset.symbol, '1D', 30);
                if (Array.isArray(series.data)) {
                    symbolData = series.data;
                } else if (Array.isArray(series)) {
                    symbolData = series;
                }
            } catch (e) {
                console.warn("Could not fetch history for", asset.symbol);
            }
            
            // Map fetched data to dates. For missing days (weekends), forward-fill.
            let lastPrice = asset.entryPrice || 1; 
            if (symbolData.length > 0) lastPrice = symbolData[0].close || symbolData[0].price || symbolData[0].value || lastPrice;
            
            const priceMap = {};
            symbolData.forEach(d => {
                const dateKey = new Date(d.time || d.date || d.timestamp).toISOString().split('T')[0];
                priceMap[dateKey] = d.close || d.value || d.price || lastPrice;
            });

            for (let i = 0; i < past30Days.length; i++) {
                const date = past30Days[i];
                if (priceMap[date]) {
                    lastPrice = priceMap[date];
                }
                const currentAssetValue = (asset.quantity || (asset.allocation / asset.entryPrice)) * lastPrice;
                historyData[date][asset.symbol] = currentAssetValue;
            }
        }

        // Sum up total values constraint
        for (const date of past30Days) {
            let sum = 0;
            assets.forEach(a => {
                sum += historyData[date][a.symbol];
            });
            // If sum is wildly incorrect, fallback logic to 100 points scaling
            historyData[date].totalValue = sum || 100;
        }

        res.json({
            portfolio: port,
            history: Object.values(historyData)
        });
        
    } catch (error) {
        console.error('History API error:', error);
        res.status(500).json({ error: 'History error: ' + error.message });
    }
});

module.exports = router;
