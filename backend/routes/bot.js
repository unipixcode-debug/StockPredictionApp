const express = require('express');
const router = express.Router();
const authorize = require('../middleware/authorize');
const { BinanceBotConfig, ExecutedTrade, User } = require('../models');
const binanceService = require('../services/binanceService');

// Get Bot Config
router.get('/config', authorize(['user', 'admin', 'developer']), async (req, res) => {
    try {
        let config = await BinanceBotConfig.findOne({ where: { userId: req.user.id } });
        if (!config) {
            // Create default
            config = await BinanceBotConfig.create({ userId: req.user.id });
        }
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Bot Config
router.post('/config', authorize(['user', 'admin', 'developer']), async (req, res) => {
    try {
        const { 
            apiKey, apiSecret, isActive, budgetMode, budgetAmount, 
            maxPositions, maxPerAsset, enableSpot, enableFutures, 
            defaultLeverage, riskLevel, isTestnet 
        } = req.body;

        let config = await BinanceBotConfig.findOne({ where: { userId: req.user.id } });
        if (!config) {
            config = await BinanceBotConfig.create({ userId: req.user.id });
        }

        if (apiKey !== undefined) config.apiKey = apiKey;
        if (apiSecret !== undefined) config.apiSecret = apiSecret;
        if (isActive !== undefined) config.isActive = isActive;
        if (budgetMode !== undefined) config.budgetMode = budgetMode;
        if (budgetAmount !== undefined) config.budgetAmount = budgetAmount;
        if (maxPositions !== undefined) config.maxPositions = maxPositions;
        if (maxPerAsset !== undefined) config.maxPerAsset = maxPerAsset;
        if (enableSpot !== undefined) config.enableSpot = enableSpot;
        if (enableFutures !== undefined) config.enableFutures = enableFutures;
        if (defaultLeverage !== undefined) config.defaultLeverage = defaultLeverage;
        if (riskLevel !== undefined) config.riskLevel = riskLevel;
        if (isTestnet !== undefined) config.isTestnet = isTestnet;

        await config.save();
        res.json({ message: 'Bot configuration updated successfully', config });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Test API Connection
router.post('/test-connection', authorize(['user', 'admin', 'developer']), async (req, res) => {
    try {
        // We will test using current DB config
        const result = await binanceService.testConnection(req.user.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get Trades (History and Open)
router.get('/trades', authorize(['user', 'admin', 'developer']), async (req, res) => {
    try {
        const trades = await ExecutedTrade.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']],
            limit: 50
        });
        
        // Compute simple stats
        const config = await BinanceBotConfig.findOne({ where: { userId: req.user.id } });
        const isBotActive = config?.isActive || false;

        const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const winCount = trades.filter(t => t.pnl > 0).length;
        const lossCount = trades.filter(t => t.pnl < 0).length;
        
        res.json({
            isBotActive,
            trades,
            stats: { totalPnl, winCount, lossCount }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Optional: Manual Trade Close (for frontend testing)
router.post('/trade/:tradeId/close', authorize(['user', 'admin', 'developer']), async (req, res) => {
    try {
        const trade = await ExecutedTrade.findOne({ 
            where: { id: req.params.tradeId, userId: req.user.id, status: 'OPEN' }
        });
        if (!trade) return res.status(404).json({ error: 'Open trade not found.' });

        // Dummy close logic for testing UI (assuming it fetches current price to close)
        trade.status = 'CLOSED';
        trade.exitPrice = trade.entryPrice * (1 + (Math.random() * 0.1 - 0.05)); // +/- 5% random
        trade.pnl = (trade.exitPrice - trade.entryPrice) * trade.amount;
        trade.pnlPercentage = ((trade.exitPrice - trade.entryPrice) / trade.entryPrice) * 100;
        
        await trade.save();
        res.json({ message: 'Trade closed.', trade });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
