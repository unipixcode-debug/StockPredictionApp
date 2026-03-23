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
        const scannerResults = await marketDataService.getScannerData(15);
        
        const btcPrice = indicators?.btc?.price || 65000;
        
        const scannerText = scannerResults.map(s => `${s.symbol}: Fiyat=${s.price}, RSI=${s.rsi.toFixed(1)}, Sinyal=${s.signal}`).join('\n');

        const prompt = `Act as an elite quantitative analyst. Create a 100-unit portfolio based on the PROVIDED technical data and current news sentiment.
        
        TECHNICAL DATA (Use these symbols for your allocation):
        ${scannerText}

        Macro Context:
        VIX: ${indicators?.vix?.price} | DXY: ${indicators?.dxy?.price}
        Market Pressure Score: ${pressure} (0=Bullish, 100=Bearish)
        
        Recent News Sentiment (Summary): ${JSON.stringify(sentimentSummary.slice(0, 5))}
        
        Allocate EXACTLY 100 units across 4-7 assets. 
        RULES:
        1. ONLY choose from the symbols listed in the TECHNICAL DATA section above.
        2. DO NOT use indices like SP500, DXY, or VIX as assets.
        3. Prioritize assets with RSI below 40 for "Buy" opportunities or strong MACD trends.
        4. Focus on USDT pairs only.
        5. Provide a rationale explaining why you picked these specifically based on their RSI/MACD/Sentiment.
        
        Output format:
        \`\`\`json
        {
            "name": "Yapay Zeka Teknik Analiz Portföyü",
            "rationale": "Scanner verilerindeki RSI ve MACD uyumsuzluklarına göre...",
            "assets": [
                {"symbol": "BTCUSDT", "allocation": 30, "entryPrice": 65000},
                ...
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
        
        // Generate a 72-hour timeline array
        const pastHours = [];
        const now = new Date();
        now.setMinutes(0, 0, 0);
        for (let i = 71; i >= 0; i--) {
            const d = new Date(now);
            d.setHours(d.getHours() - i);
            pastHours.push(d.toISOString());
        }

        const historyData = {};
        for (const date of pastHours) {
            historyData[date] = { date, totalValue: 0 };
            assets.forEach(a => historyData[date][a.symbol] = 0);
        }

        // Fetch backtest data for each asset
        for (const asset of assets) {
            let symbolData = [];
            try {
                // Assume marketDataService gets Yahoo finance series format [{date, close}, ...]
                const series = await marketDataService.getHistoricalData(asset.symbol, '1h', 72);
                if (Array.isArray(series.data)) {
                    symbolData = series.data;
                } else if (Array.isArray(series)) {
                    symbolData = series;
                }
            } catch (e) {
                console.warn("Could not fetch history for", asset.symbol);
            }
            
            // Map fetched data to dates. For missing hours, forward-fill.
            let lastPrice = asset.entryPrice || 1; 
            if (symbolData.length > 0) lastPrice = symbolData[0].close || symbolData[0].price || symbolData[0].value || lastPrice;
            
            const priceMap = {};
            symbolData.forEach(d => {
                const ms = (d.time < 100000000000) ? (d.time * 1000) : d.time;
                const dObj = new Date(ms || d.date || d.timestamp);
                dObj.setMinutes(0, 0, 0); // truncate to hour
                const dateKey = dObj.toISOString();
                priceMap[dateKey] = d.close || d.value || d.price || lastPrice;
            });

            for (let i = 0; i < pastHours.length; i++) {
                const date = pastHours[i];
                if (priceMap[date]) {
                    lastPrice = priceMap[date];
                }
                const currentAssetValue = (asset.quantity || (asset.allocation / asset.entryPrice)) * lastPrice;
                historyData[date][asset.symbol] = currentAssetValue;
            }
        }

        // Sum up total values constraint
        for (const date of pastHours) {
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
