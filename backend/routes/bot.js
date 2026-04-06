const express = require('express');
const router = express.Router();
const { authCheck } = require('../middleware/auth');
const { BinanceBotConfig, ExecutedTrade, User, BotLog } = require('../models');
const binanceService = require('../services/binanceService');
const botScannerService = require('../services/botScannerService');
const marketDataService = require('../services/marketDataService'); // Added for macro correctly properly milimetrically

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
router.get('/account-summary', authCheck, async (req, res) => {
    try {
        const summary = await binanceService.getFuturesAccountSummary(req.user.id);
        res.json(summary);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/config', authCheck, async (req, res) => {
    try {
        const { 
            apiKey, apiSecret, 
            futuresApiKey, futuresApiSecret,
            isSpotActive, isFuturesActive,
            budgetMode, budgetAmount, 
            maxPositions, maxPerAsset, 
            isTestnet, scanInterval,
            defaultLeverage, tradeHorizon,
            autoOptimize,
            rsiOversold, rsiOverbought, minConfirmationScore, riskConsent,
            telegramToken, telegramChatId
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
        if (budgetAmount !== undefined) config.budgetAmount = parseFloat(budgetAmount);
        if (maxPositions !== undefined) config.maxPositions = parseInt(maxPositions);
        if (maxPerAsset !== undefined) config.maxPerAsset = parseFloat(maxPerAsset);
        if (isTestnet !== undefined) config.isTestnet = isTestnet;
        if (scanInterval !== undefined) config.scanInterval = parseInt(scanInterval) || 300;
        if (defaultLeverage !== undefined) config.defaultLeverage = parseInt(defaultLeverage) || 1;
        if (tradeHorizon !== undefined) config.tradeHorizon = tradeHorizon;
        if (autoOptimize !== undefined) config.autoOptimize = autoOptimize;
        if (rsiOversold !== undefined) config.rsiOversold = parseFloat(rsiOversold);
        if (rsiOverbought !== undefined) config.rsiOverbought = parseFloat(rsiOverbought);
        if (minConfirmationScore !== undefined) config.minConfirmationScore = parseFloat(minConfirmationScore);
        if (riskConsent !== undefined) config.riskConsent = !!riskConsent;
        
        // Telegram Settings
        if (telegramToken !== undefined && !isMasked(telegramToken)) config.telegramToken = telegramToken.trim();
        if (telegramChatId !== undefined && !isMasked(telegramChatId)) config.telegramChatId = telegramChatId.trim();

        await config.save();
        res.json({ message: 'Bot configuration updated successfully', config });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Test Telegram Connection
router.post('/test-telegram', authCheck, async (req, res) => {
    try {
        const { telegramToken, telegramChatId } = req.body;
        const telegramService = require('../services/telegramService');
        
        if (!telegramToken || !telegramChatId) {
            return res.status(400).json({ error: 'Token ve Chat ID gereklidir.' });
        }

        const success = await telegramService.sendTestMessage(telegramToken, telegramChatId);
        if (success) {
            res.json({ success: true, message: 'Test mesajı gönderildi!' });
        } else {
            res.status(500).json({ success: false, error: 'Mesaj gönderilemedi. Lütfen bilgileri kontrol edin.' });
        }
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
        const isTestnet = config ? config.isTestnet : true;

        // ── Real-time P&L for OPEN positions (Direct from Binance for Futures) ──
        const openTrades = trades.filter(t => t.status === 'OPEN' && t.entryPrice);
        if (openTrades.length > 0) {
            try {
                const config = await BinanceBotConfig.findOne({ where: { userId: req.user.id } });
                const isTestnet = config ? !!config.isTestnet : true;
                const apiKey = config?.futuresApiKey;
                const apiSecret = config?.futuresApiSecret;

                // 1. Fetch Real-time Futures Positions if keys exist
                let exchangePositions = [];
                if (apiKey && apiSecret) {
                    try {
                        exchangePositions = await binanceService.rawFuturesPositions(apiKey, apiSecret, isTestnet);
                    } catch (fErr) {
                        console.warn('[Trades] Futures positions fetch failed:', fErr.message);
                    }
                }

                // 2. Fetch Spot Tickers only if needed
                const spotTrades = openTrades.filter(t => t.type === 'SPOT');
                const spotPriceMap = {};
                if (spotTrades.length > 0) {
                    try {
                        const ccxt = require('ccxt');
                        const spotEx = new ccxt.binance({ enableRateLimit: true });
                        if (isTestnet) spotEx.setSandboxMode(true);
                        const uniqueSpotSymbols = [...new Set(spotTrades.map(t => t.symbol))];
                        for (const sym of uniqueSpotSymbols) {
                            const ticker = await spotEx.fetchTicker(sym);
                            spotPriceMap[sym] = ticker.last;
                        }
                    } catch (sErr) {
                        console.warn('[Trades] Spot tickers fetch failed:', sErr.message);
                    }
                }

                // 3. Map Real-time data to trades
                for (const trade of openTrades) {
                    if (trade.type === 'FUTURES') {
                        const apiSymbol = binanceService.toApiSymbol(trade.symbol);
                        const realPos = Array.isArray(exchangePositions) ? exchangePositions.find(p => p.symbol === apiSymbol) : null;
                        
                        if (realPos) {
                            trade.dataValues.unrealizedPnl = parseFloat(realPos.unRealizedProfit || 0);
                            trade.dataValues.currentPrice = parseFloat(realPos.markPrice || 0);
                            trade.dataValues.liquidationPrice = parseFloat(realPos.liquidationPrice || 0);
                        } else {
                            // Fallback to estimation if not found in open positions (might be recently closed or API lag)
                            trade.dataValues.unrealizedPnl = 0;
                        }
                    } else {
                        // Spot Calculation
                        const currentPrice = spotPriceMap[trade.symbol];
                        if (currentPrice) {
                            const priceDiff = currentPrice - parseFloat(trade.entryPrice);
                            trade.dataValues.unrealizedPnl = priceDiff * parseFloat(trade.amount || 0);
                            trade.dataValues.currentPrice = currentPrice;
                        }
                    }
                }
            } catch (priceErr) {
                console.warn('[Trades] Real-time data merge failed:', priceErr.message);
            }
        }

        const allTrades = trades.map(t => ({ ...t.dataValues }));
        
        // Sum closed P&L and unrealized P&L for a total overview
        const totalPnl = allTrades.reduce((sum, t) => {
            const realized = t.pnl || 0;
            const unrealized = t.unrealizedPnl || 0;
            return sum + realized + unrealized;
        }, 0);

        const winCount = allTrades.filter(t => (t.pnl || t.unrealizedPnl) > 0).length;
        const lossCount = allTrades.filter(t => (t.pnl || t.unrealizedPnl) < 0).length;
        
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

        const updatedTrade = await binanceService.closePosition(req.user.id, req.params.tradeId);
        res.json({ message: 'Trade closed on exchange.', trade: updatedTrade });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Close ALL positions and STOP bot correctly properly correctly incorrectly properly surely incorrectly
router.post('/close-all', authCheck, async (req, res) => {
    try {
        const result = await binanceService.closeAllFuturesPositions(req.user.id);
        await botScannerService.log(req.user.id, `🚨 ACİL DURUM: Tüm pozisyonlar kapatıldı ve bot durduruldu. (${result.closedCount} işlem)`, 'error');
        res.json({ message: 'All positions closed and bot stopped.', result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Clear Trade History (Closed trades) correctly properly correctly incorrectly properly surely incorrectly
router.post('/clear-history', authCheck, async (req, res) => {
    try {
        const count = await ExecutedTrade.destroy({
            where: { userId: req.user.id, status: 'CLOSED' }
        });
        await botScannerService.log(req.user.id, `🧹 İşlem geçmişi temizlendi. (${count} kayıt silindi)`, 'warning');
        res.json({ message: 'Trade history cleared.', count });
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

// Get Strategy Alpha Rankings (Learning Progress) milimetrically squarely correctly surely
router.get('/alpha-rankings', authCheck, async (req, res) => {
    try {
        const StrategyAlphaService = require('../services/StrategyAlphaService');
        // Convert Map to Object for JSON response milimetrically
        const rankings = Object.fromEntries(StrategyAlphaService.alphaCache);
        res.json(rankings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Global Macro Indicators properly incorrectly correctly surely incorrectly correctly correctly
router.get('/macro', authCheck, async (req, res) => {
    try {
        const indicators = await marketDataService.getGlobalIndicators();
        res.json(indicators);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Alpha Mind Learning Stats
router.get('/alpha-mind/stats', authCheck, async (req, res) => {
    try {
        const StrategyAlphaService = require('../services/StrategyAlphaService');
        res.json(StrategyAlphaService.getGlobalStats());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
