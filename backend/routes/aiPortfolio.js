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
        
        // Fetch Top symbols from each market for AI to choose
        const cryptoScan = await marketDataService.getScannerData('crypto', 20);
        const nasdaqScan = await marketDataService.getScannerData('nasdaq', 10);
        const bistScan = await marketDataService.getScannerData('bist', 10);
        
        const allScannerResults = [...cryptoScan, ...nasdaqScan, ...bistScan];
        
        // Create a lookup map for real-time validation and entry prices
        const assetMap = {};
        allScannerResults.forEach(s => {
            assetMap[s.symbol] = s;
        });

        const scannerText = allScannerResults.map(s => `${s.symbol}: RSI=${s.rsi?.toFixed(1)}, Score=${Math.round(s.aiScore)}, Signal=${s.signal}`).join('\n');

        const prompt = `Act as an elite quantitative analyst. Create a 100-unit portfolio based on the PROVIDED technical data and current news sentiment.
        
        TECHNICAL DATA (ONLY CHOOSE FROM THESE SPECIFIC SYMBOLS):
        ${scannerText}

        Macro Context (FOR REFERENCE ONLY, DO NOT INVEST IN THESE):
        VIX: ${indicators?.vix?.price} | DXY: ${indicators?.dxy?.price}
        Market Pressure Score: ${pressure} (0=Bullish, 100=Bearish)
        
        Recent News Sentiment (Summary): ${JSON.stringify(sentimentSummary.slice(0, 5))}
        
        Allocate EXACTLY 100 units across 5-7 assets. 
        MANDATORY RULES:
        1. ONLY choose assets from the TECHNICAL DATA symbols list above.
        2. HYPER-IMPORTANT: NEVER use "SP500", "DXY", "VIX", "GOLD", "GOLD_GRAM", or "USD" as investment names in "assets".
        3. Prioritize assets with AI Score > 75.
        4. For each asset, you MUST specify a "targetPrice" and "stopLoss" relative to current price logic.
        
        Output format:
        \`\`\`json
        {
            "name": "Global AI Teknik Strateji Portföyü",
            "rationale": "Analiz raporu...",
            "assets": [
                {"symbol": "BTCUSDT", "allocation": 25, "targetPrice": 72000, "stopLoss": 64000},
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
            
            // 1. Filter out hallucinated assets (like SP500, GOLD if they sneaked in)
            parsed.assets = parsed.assets.filter(a => assetMap[a.symbol]);

            if (parsed.assets.length === 0) throw new Error("AI failed to select valid assets from the provided list.");

            let totalAlloc = 0;
            parsed.assets.forEach(a => totalAlloc += parseFloat(a.allocation));
            
            // 2. Normalize and Enrichment with REAL prices to prevent $447 inflation
            parsed.assets = parsed.assets.map(a => {
                const scannerInfo = assetMap[a.symbol];
                const allocation = (parseFloat(a.allocation) / totalAlloc) * 100;
                const entryPrice = scannerInfo.price;
                return {
                    ...a,
                    allocation,
                    entryPrice,
                    rsi: scannerInfo.rsi,
                    aiScore: scannerInfo.aiScore,
                    quantity: allocation / entryPrice
                };
            });
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

        for (const asset of assets) {
            let symbolData = [];
            try {
                const series = await marketDataService.getHistoricalData(asset.symbol, '1h', 72);
                if (Array.isArray(series.data)) {
                    symbolData = series.data;
                } else if (Array.isArray(series)) {
                    symbolData = series;
                }
            } catch (e) {
                console.warn("Could not fetch history for", asset.symbol);
            }
            
            let lastPrice = asset.entryPrice || 1; 
            if (symbolData.length > 0) lastPrice = symbolData[0].close || symbolData[0].price || symbolData[0].value || lastPrice;
            
            const priceMap = {};
            symbolData.forEach(d => {
                const ms = (d.time < 100000000000) ? (d.time * 1000) : d.time;
                const dObj = new Date(ms || d.date || d.timestamp);
                dObj.setMinutes(0, 0, 0); 
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
                historyData[date][asset.symbol + "_raw"] = lastPrice; // Add raw unit price
            }
        }

        for (const date of pastHours) {
            let sum = 0;
            assets.forEach(a => {
                sum += historyData[date][a.symbol];
            });
            historyData[date].totalValue = sum || 100;
        }

        if (Object.values(historyData).length > 0) {
            console.log(`[History Debug] First point for ${req.params.id}:`, Object.values(historyData)[0]);
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
