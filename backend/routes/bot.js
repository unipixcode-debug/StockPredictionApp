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
            isTestnet, scanInterval,
            defaultLeverage
        } = req.body;

        let config = await BinanceBotConfig.findOne({ where: { userId: req.user.id } });
        const user = await User.findByPk(req.user.id);

        if ((isSpotActive || isFuturesActive) && (!config || (!config.isSpotActive && !config.isFuturesActive))) {
            // Activating for the first time or from fully off
            if (!user || user.credits < 2000) {
                return res.status(400).json({ error: 'Botu aktif etmek için en az 2000 kredi bakiyeniz olmalıdır.' });
            }
        }
        if (!config) {
            config = await BinanceBotConfig.create({ userId: req.user.id });
        }

        // Helper to check if value is just stars or empty
        const isMasked = (val) => !val || /^\*+$/.test(val.trim());

        // Spot Keys
        if (apiKey !== undefined && !isMasked(apiKey)) config.apiKey = apiKey.trim();
        if (apiSecret !== undefined && !isMasked(apiSecret)) config.apiSecret = apiSecret.trim();
        
        // Futures Keys
        if (futuresApiKey !== undefined && !isMasked(futuresApiKey)) config.futuresApiKey = futuresApiKey.trim();
        if (futuresApiSecret !== undefined && !isMasked(futuresApiSecret)) config.futuresApiSecret = futuresApiSecret.trim();

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
        if (defaultLeverage !== undefined) config.defaultLeverage = parseInt(defaultLeverage) || 1;

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

// Get Trades (History and Open) with real-time P&L for open positions
router.get('/trades', authCheck, async (req, res) => {
    try {
        const trades = await ExecutedTrade.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']],
            limit: 50
        });
        
        const config = await BinanceBotConfig.findOne({ where: { userId: req.user.id } });
        const isBotActive = config ? (config.isSpotActive || config.isFuturesActive) : false;

        // ── Real-time P&L for OPEN positions ─────────────────────────────────
        const openTrades = trades.filter(t => t.status === 'OPEN' && t.entryPrice);
        if (openTrades.length > 0) {
            try {
                const publicExchange = new (require('ccxt')).binance({ enableRateLimit: true });
                // Fetch unique symbols (batch approach)
                const uniqueSymbols = [...new Set(openTrades.map(t => t.symbol))];
                const priceMap = {};
                for (const sym of uniqueSymbols) {
                    try {
                        const ticker = await publicExchange.fetchTicker(sym);
                        priceMap[sym] = ticker.last;
                    } catch { /* symbol not fetchable, skip */ }
                }
                // Attach unrealizedPnl to each open trade
                for (const trade of openTrades) {
                    const currentPrice = priceMap[trade.symbol];
                    if (currentPrice && trade.entryPrice) {
                        const isLong = trade.side === 'BUY';
                        const priceDiff = currentPrice - parseFloat(trade.entryPrice);
                        trade.dataValues.unrealizedPnl = (isLong ? priceDiff : -priceDiff) * parseFloat(trade.amount || 0);
                        trade.dataValues.currentPrice  = currentPrice;
                    }
                }
            } catch (priceErr) {
                console.warn('[Trades] Real-time P&L fetch failed:', priceErr.message);
            }
        }

        const allTrades = trades.map(t => ({ ...t.dataValues }));
        const totalPnl  = allTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const winCount  = allTrades.filter(t => t.pnl > 0).length;
        const lossCount = allTrades.filter(t => t.pnl < 0).length;
        
        res.json({ isBotActive, trades: allTrades, stats: { totalPnl, winCount, lossCount } });
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

// Get Trade Chart Data
router.get('/trades/:tradeId/chart', authCheck, async (req, res) => {
    try {
        const trade = await ExecutedTrade.findOne({ 
            where: { id: req.params.tradeId, userId: req.user.id }
        });
        if (!trade) return res.status(404).json({ error: 'Trade not found.' });

        const isTestnet = true; // Bot mostly runs on testnet for now
        // Symbol cleanup (e.g. BTC/USDT:USDT -> BTCUSDT)
        const apiSymbol = trade.symbol.split(':')[0].replace('/', '');
        
        const ohlcv = await binanceService.rawFuturesPublicOHLCV(apiSymbol, '1m', 300, isTestnet);
        const formatted = ohlcv.map(item => ({
            time: item[0],
            open: item[1],
            high: item[2],
            low: item[3],
            close: item[4],
            volume: item[5]
        }));

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Local Sync (Health Check)
router.post('/sync', authCheck, async (req, res) => {
    try {
        const result = await binanceService.syncTradesWithExchange(req.user.id);
        if (result.success) {
            await botScannerService.log(req.user.id, 
                `🔄 Senkronizasyon Tamamlandı: ${result.closed} kapandı, ${result.updated} güncellendi, ${result.added} yeni eklendi.`, 
                'info');
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
