const express = require('express');
const router = express.Router();
const { authCheck } = require('../middleware/auth');
const { BinanceBotConfig, ExecutedTrade, User, BotLog } = require('../models');
const binanceService = require('../services/binanceService');
const botScannerService = require('../services/botScannerService');

// Get Bot Config
router.get('/config', authCheck, async (req, res) => {
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
router.post('/config', authCheck, async (req, res) => {
    try {
        const { 
            apiKey, apiSecret, 
            futuresApiKey, futuresApiSecret,
            isSpotActive, isFuturesActive,
            budgetMode, budgetAmount, 
            maxPositions, maxPerAsset, 
            isTestnet, scanInterval
        } = req.body;

        let config = await BinanceBotConfig.findOne({ where: { userId: req.user.id } });
        if (!config) {
            config = await BinanceBotConfig.create({ userId: req.user.id });
        }

        // Spot Keys
        if (apiKey !== undefined) config.apiKey = apiKey;
        if (apiSecret !== undefined) config.apiSecret = apiSecret;
        
        // Futures Keys
        if (futuresApiKey !== undefined) config.futuresApiKey = futuresApiKey;
        if (futuresApiSecret !== undefined) config.futuresApiSecret = futuresApiSecret;

        // Status Toggles
        if (isSpotActive !== undefined && config.isSpotActive !== isSpotActive) {
            config.isSpotActive = isSpotActive;
            await botScannerService.log(req.user.id, `Spot Bot ${isSpotActive ? 'Açıldı' : 'Kapatıldı'}.`, isSpotActive ? 'success' : 'error');
        }
        
        if (isFuturesActive !== undefined && config.isFuturesActive !== isFuturesActive) {
            config.isFuturesActive = isFuturesActive;
            await botScannerService.log(req.user.id, `Futures Bot ${isFuturesActive ? 'Açıldı' : 'Kapatıldı'}.`, isFuturesActive ? 'success' : 'error');
        }

        // Other settings
        if (budgetMode !== undefined) config.budgetMode = budgetMode;
        if (budgetAmount !== undefined) config.budgetAmount = budgetAmount;
        if (maxPositions !== undefined) config.maxPositions = maxPositions;
        if (maxPerAsset !== undefined) config.maxPerAsset = maxPerAsset;
        if (isTestnet !== undefined) config.isTestnet = isTestnet;
        if (scanInterval !== undefined) config.scanInterval = parseInt(scanInterval) || 300;

        await config.save();
        res.json({ message: 'Bot configuration updated successfully', config });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Test API Connection
router.post('/test-connection', authCheck, async (req, res) => {
    try {
        const { marketType } = req.body; // 'SPOT' or 'FUTURES'
        const result = await binanceService.testConnection(req.user.id, marketType || 'SPOT');
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get Trades (History and Open)
router.get('/trades', authCheck, async (req, res) => {
    try {
        const trades = await ExecutedTrade.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']],
            limit: 50
        });
        
        // Compute simple stats
        const config = await BinanceBotConfig.findOne({ where: { userId: req.user.id } });
        const isBotActive = config ? (config.isSpotActive || config.isFuturesActive) : false;

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
router.post('/trade/:tradeId/close', authCheck, async (req, res) => {
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

// Get Bot Logs
router.get('/logs', authCheck, async (req, res) => {
    try {
        const logs = await BotLog.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']],
            limit: 50
        });
        
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
