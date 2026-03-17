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

router.post('/analyze', authCheck, creditCheck, async (req, res) => {
    const { symbol, market } = req.body;
    if (!symbol) {
        return res.status(400).json({ error: 'Symbol is required' });
    }

    const resolvedMarket = market || 'US';
    const finalSymbol = symbol.toUpperCase().trim();

    try {
        // Rely entirely on Engine (which now handles AI fallback internally)
        const prediction = await predictionEngine.generatePrediction(finalSymbol, resolvedMarket, req.user?.id);
        
        // Deduct credits ONLY after successful DB persistence
        await deductCredits(req);

        res.json(prediction);

    } catch (error) {
        console.error("Analyze Route Error:", error);
        
        const isDeveloper = req.user?.role === 'developer' || req.user?.role === 'admin';
        const errMsg = isDeveloper 
            ? `Analiz Hatası: ${error.message}` 
            : 'Analiz sırasında bir hata oluştu. Krediniz düşülmedi.';
            
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
