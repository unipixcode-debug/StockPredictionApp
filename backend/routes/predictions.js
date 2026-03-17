const express = require('express');
const router = express.Router();
const predictionEngine = require('../services/predictionEngine');
const Prediction = require('../models/Prediction');
const User = require('../models/User');
const { isAdmin, authCheck } = require('../middleware/auth');
const GlobalSetting = require('../models/GlobalSetting');

// List predictions for the active user
router.get('/', authCheck, async (req, res) => {
    try {
        const predictions = await Prediction.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']]
        });
        res.json(predictions);
    } catch (error) {
        console.error('Fetch Predictions Error:', error);
        res.status(500).json({ error: 'Failed to fetch predictions' });
    }
});

// Credit check middleware — only validates balance, does NOT deduct
const creditCheck = async (req, res, next) => {
    if (!req.user) return next(); // Guest (dev bypass), allow

    const user = await User.findByPk(req.user.id);
    if (!user) return next();

    // Store user on request for use in route
    req.dbUser = user;

    // Developer / admin: unlimited — skip credit check entirely
    if (user.role === 'developer' || user.role === 'admin') {
        req.skipCreditDeduction = true;
        return next();
    }

    // Fetch cost from settings
    let analysisCost = 5;
    try {
        const costSetting = await GlobalSetting.findByPk('cost_per_prediction');
        if (costSetting) analysisCost = parseInt(costSetting.value);
    } catch (e) {
        console.warn('Could not fetch cost_per_prediction setting, using default 5');
    }
    req.analysisCost = analysisCost;

    // Check balance
    if (user.credits < analysisCost) {
        return res.status(403).json({
            error: 'Yetersiz Kredi',
            credits: user.credits,
            required: analysisCost,
            tier: user.tier
        });
    }

    next();
};

// Helper: deduct credits after success
const deductCredits = async (req) => {
    if (req.skipCreditDeduction) return; // developer/admin
    if (!req.dbUser) return;
    const cost = req.analysisCost || 5;
    await req.dbUser.update({ credits: req.dbUser.credits - cost });
    console.log(`💳 Deducted ${cost} credits from user ${req.dbUser.id}. Remaining: ${req.dbUser.credits - cost}`);
};

// Yeni tahmin tetikle
router.post('/analyze', authCheck, creditCheck, async (req, res) => {
    const { symbol, market } = req.body;
    if (!symbol) {
        return res.status(400).json({ error: 'Symbol is required' });
    }

    const resolvedMarket = market || 'US';
    const finalSymbol = symbol.toUpperCase();

    try {
        // 1. Try primary prediction engine
        try {
            const result = await predictionEngine.generatePrediction(finalSymbol, resolvedMarket, req.user?.id);
            await deductCredits(req); // Deduct ONLY on success
            return res.json(result);
        } catch (engineError) {
            console.warn("predictionEngine failed. Trying AI fallback...", engineError.message);
        }

        // 2. AI fallback
        try {
            const aiService = require('../services/aiService');
            const prompt = `You are a professional financial AI analyst. Analyze the current market situation for ${finalSymbol} in the ${resolvedMarket} market.
            Provide a detailed, confident analysis and a score.
            Format exactly as JSON: {"direction": "BUY" or "SELL" or "HOLD", "confidenceScore": 0-100 (integer), "analysisText": "your detailed reasoning"}`;
            
            const responseText = await aiService.generateContent(prompt, "gemini-1.5-flash");
            
            let parsed = { direction: "HOLD", score: 50, summary: "Bağımsız analiz tamamlandı." };
            try {
                const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
                const p = JSON.parse(cleaned);
                parsed = {
                    direction: p.direction || "HOLD",
                    score: p.confidenceScore || 50,
                    summary: p.analysisText || "Bağımsız analiz tamamlandı."
                };
            } catch (e) {
                console.error("Failed to parse fallback AI response", e);
            }

            const timeframes = ['1S', '2S', '4S', '1G', '1Hafta', '1Ay', '1Yıl'];
            const chartData = timeframes.map((tf, index) => ({
                timeframe: tf,
                ai: Math.round(Math.max(0, Math.min(100, parsed.score + (Math.floor(Math.random() * 20) - 10) * (index + 1) * 0.3))),
                ml: Math.round(Math.max(0, Math.min(100, parsed.score + (Math.floor(Math.random() * 30) - 15) * (index + 1) * 0.4)))
            }));

            const newObj = {
                id: Date.now(),
                symbol: finalSymbol,
                market: resolvedMarket,
                direction: parsed.direction,
                score: parsed.score,
                analysis_details: { summary: parsed.summary, chartData },
                createdAt: new Date().toISOString()
            };

            await deductCredits(req); // Deduct ONLY on success
            return res.json(newObj);

        } catch (fallbackError) {
            // Both engine AND fallback failed → DO NOT charge
            console.error("All AI providers failed. No credits charged.", fallbackError.message);
            
            const isDeveloper = req.user?.role === 'developer' || req.user?.role === 'admin';
            if (isDeveloper) {
                return res.status(503).json({ error: `AI Fallback Hatası: ${fallbackError.message}` });
            }
            return res.status(503).json({ error: 'Üzgünüm, şu an bağlantı kuramıyorum. Krediniz düşülmedi.' });
        }

    } catch (error) {
        console.error("Analyze Error", error);
        // Credits were NOT deducted yet at this point
        
        // Return detailed error for developers, generic for regular users
        const isDeveloper = req.user?.role === 'developer' || req.user?.role === 'admin';
        const errMsg = isDeveloper 
            ? `Analiz Hatası (Geliştirici Detayı): ${error.message || error.toString()}` 
            : 'Analiz sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.';
            
        res.status(500).json({ error: errMsg });
    }
});

router.delete('/:id', authCheck, async (req, res) => {
    try {
        const userId = req.user?.id;
        const deleted = await Prediction.destroy({ 
            where: { 
                id: req.params.id,
                userId: userId // Ensure user owns the prediction
            } 
        });
        
        // Memory store check (if applicable)
        if (memoryPredictions) {
            const memIndex = memoryPredictions.findIndex(p => p.id == req.params.id && p.userId == userId);
            if (memIndex !== -1) memoryPredictions.splice(memIndex, 1);
        }

        if (deleted) {
            res.json({ message: 'Prediction deleted successfully' });
        } else {
            res.status(404).json({ error: 'Prediction not found or not owned by you' });
        }
    } catch (error) {
        console.error("Delete Error", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
