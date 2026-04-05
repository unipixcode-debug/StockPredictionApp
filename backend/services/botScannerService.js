const { BinanceBotConfig, BotLog, ExecutedTrade } = require('../models');
const binanceService = require('./binanceService');
const emailService = require('./emailService');
const newsService = require('./newsService');
const marketDataService = require('./marketDataService');
const StrategyAlphaService = require('./StrategyAlphaService'); // Alpha Mind Intelligence milimetrically SQARELY
const ccxt = require('ccxt');

// Start the Strategy Learning Loop (Runs every 6h)
StrategyAlphaService.startLearningLoop();

// ─── Config ──────────────────────────────────────────────────────────────────
const TOP_COINS_TO_SCAN  = 60;   // Top N volatile coins from Binance
const RSI_PERIOD         = 14;
const RSI_OVERSOLD       = 35;   // BUY below this
const RSI_OVERBOUGHT     = 65;   // SELL above this
const MIN_VOLUME_USDT    = 10_000_000; // 10M USDT/day — filters out coins not on Demo Trading
const STOP_LOSS_PCT      = 0.025;   // 2.5% stop-loss below/above entry

// ─── RSI Helper ──────────────────────────────────────────────────────────────
function computeRSI(closes, period = RSI_PERIOD) {
    if (closes.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff >= 0) gains += diff; else losses += Math.abs(diff);
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

// ─── Technical Signal ────────────────────────────────────────────────────────
/**
 * Computes RSI + momentum signal for a USDT pair using 100% Direct HTTPS.
 * Returns { direction:'BUY'|'SELL'|'HOLD', score:0-100, rsi, momentum, currentPrice }
 */
async function getTechnicalSignal(symbol, isTestnet = true, thresholds = { oversold: RSI_OVERSOLD, overbought: RSI_OVERBOUGHT }) {
    try {
        let closes = [];
        let currentPrice = 0;
        let prevPrice = 0;

        const isStock = symbol.includes('.IS') || marketDataService.NASDAQ_SYMBOLS?.includes(symbol.replace('.IS', ''));

        if (isStock) {
            // Yahoo Finance for Stocks
            const history = await marketDataService.getHistoricalData(symbol, '1h', 30);
            if (!history || history.length < RSI_PERIOD + 2) return { direction: 'HOLD', score: 50 };
            closes = history.map(c => c.close);
            currentPrice = closes[closes.length - 1];
            prevPrice = closes[closes.length - 2];
        } else {
            // Binance for Crypto
            const apiSymbol = symbol.split('/')[0].replace('USDT', '') + 'USDT';
            const ohlcv = await binanceService.rawFuturesPublicOHLCV(apiSymbol, '1h', 30, isTestnet);
            if (!ohlcv || ohlcv.length < RSI_PERIOD + 2) return { direction: 'HOLD', score: 50 };
            closes = ohlcv.map(c => c[4]);
            currentPrice = closes[closes.length - 1];
            prevPrice = closes[closes.length - 2];
        }

        const rsi = computeRSI(closes);
        const momentum = ((currentPrice - prevPrice) / prevPrice) * 100;
        const trend = ((currentPrice - closes[0]) / closes[0]) * 100;

        // RSI artifact protection
        if (rsi === 100 || rsi === 0) return { direction: 'HOLD', score: 50 };

        let direction = 'HOLD';
        let score = 50;

        if (rsi < thresholds.oversold) {
            const strength = thresholds.oversold - rsi;
            score = 55 + Math.min(strength * 1.5, 45); 
            direction = 'BUY';
        } else if (rsi > thresholds.overbought) {
            const strength = rsi - thresholds.overbought;
            score = 55 + Math.min(strength * 1.5, 45);
            direction = 'SELL';
        }

        return { direction, score: Math.round(score), rsi: Math.round(rsi * 10) / 10, momentum, trend, currentPrice };
    } catch (e) {
        console.error(`[BotScanner] Technical Signal Error for ${symbol}:`, e.message);
        return { direction: 'HOLD', score: 50 };
    }
}

// ─── Dynamic Scan List ───────────────────────────────────────────────────────
// ─── Dynamic Scan List ───────────────────────────────────────────────────────
async function getDynamicScanList(limit = TOP_COINS_TO_SCAN, isTestnet = true) {
    try {
        // 1. Binance Crypto Pool
        const tickers = await binanceService.rawFutures24hrTickers(isTestnet);
        if (!Array.isArray(tickers)) throw new Error('INVALID_TICKERS_RESPONSE');

        const cryptoPairs = tickers
            .filter(t => t.symbol.endsWith('USDT'))
            .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
            .slice(0, limit)
            .map(t => ({
                ccxtSymbol:    t.symbol.replace('USDT', '/USDT:USDT'),
                displaySymbol: t.symbol.replace('USDT', '/USDT'),
                engineSymbol:  t.symbol.replace('USDT', '/USDT'),
                change24h:     t.priceChangePercent,
                volume:        parseFloat(t.quoteVolume),
                currentPrice:  parseFloat(t.lastPrice),
                market:        'CRYPTO'
            }));

        // 2. Nasdaq Pool (Top Symbols correctly properly SQARELY)
        const nasdaqPairs = (marketDataService.NASDAQ_SYMBOLS || []).map(s => ({
            ccxtSymbol:    s,
            displaySymbol: s,
            engineSymbol:  s,
            change24h:     '0.00',
            volume:        1000000,
            currentPrice:  0,
            market:        'STOCK'
        }));

        // 3. BIST Pool (Top Symbols correctly properly SQARELY)
        const bistPairs = (marketDataService.BIST_SYMBOLS || []).map(s => ({
            ccxtSymbol:    s,
            displaySymbol: s.replace('.IS', ''),
            engineSymbol:  s,
            change24h:     '0.00',
            volume:        1000000,
            currentPrice:  0,
            market:        'STOCK'
        }));

        const combined = [...cryptoPairs, ...nasdaqPairs, ...bistPairs];
        console.log(`[BotScanner] ${combined.length} total symbols selected (Crypto=${cryptoPairs.length}, Stocks=${nasdaqPairs.length + bistPairs.length}).`);
        return combined;
    } catch (err) {
        console.warn('[BotScanner] Dynamic fetch error, falling back to whitelist:', err.message);
        const whitelist = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOGEUSDT', 'DOTUSDT', 'LINKUSDT'];
        return whitelist.map(sym => ({
            ccxtSymbol:    sym.replace('USDT', '/USDT:USDT'),
            displaySymbol: sym.replace('USDT', '/USDT'),
            engineSymbol:  sym.replace('USDT', '/USDT'),
            change24h:     '0.00',
            volume:        100000000,
            currentPrice:  0
        }));
    }
}

class BotScannerService {
    constructor() {
        this.globalInterval = 10000;
        this.activeScanners = new Set();
        // Use unauthenticated futures-type exchange for scanning to avoid CCXT's 
        // broken URL routing/authentication logic for Futures Testnet.
        this._futuresExchange = new ccxt.binance({
            apiKey: null,
            secret: null,
            enableRateLimit: true,
            options: { defaultType: 'future' }
        });
        // Standard sandbox mode for Spot scanner
        this._spotExchange = new ccxt.binance({
            options: { defaultType: 'spot' }
        });
        this._spotExchange.setSandboxMode(true);
    }

    async log(userId, message, type = 'info') {
        try {
            await BotLog.create({ userId, message, type });
            const count = await BotLog.count({ where: { userId } });
            if (count > 100) {
                const old = await BotLog.findAll({ where: { userId }, order: [['createdAt', 'ASC']], limit: count - 100 });
                for (const l of old) await l.destroy();
            }
        } catch (e) { console.error('BotLog Error:', e.message); }
    }

    startBackgroundTasks() {
        console.log('🤖 Bot Scanner (RSI+AI) + AI Sentinel started…');
        // Standard Scanning Loop
        setInterval(() => this.checkUserIntervals(), this.globalInterval);
        // AI Sentinel Loop: Monitors existing positions for News/Macro risks
        setInterval(() => this.runSentinelForAllUsers(), 60000); // Check every 60s
    }

    async runSentinelForAllUsers() {
        try {
            const activeConfigs = await BinanceBotConfig.findAll({
                where: { [require('sequelize').Op.or]: [{ isSpotActive: true }, { isFuturesActive: true }] }
            });
            for (const config of activeConfigs) {
                await this.processSentinelAlerts(config);
            }
        } catch (e) { console.error('[Sentinel] Global loop error:', e.message); }
    }

    async processSentinelAlerts(config) {
        const userId = config.userId;
        try {
            // 1. Fetch Open Trades for this user effectively properly SQUARELY
            const openTrades = await ExecutedTrade.findAll({ where: { userId, status: 'OPEN' } });
            if (openTrades.length === 0) return;

            // 2. Get Global Market Status (Macro Index)
            const macro = await marketDataService.getGlobalIndicators();
            const btcd = macro.btcd?.price || 50;

            // 3. Evaluate each position for News Impact
            for (const trade of openTrades) {
                const baseSymbol = trade.symbol.split('/')[0].replace('USDT', '');
                const sentimentData = await newsService.getSentimentAggregation(1); // Last 24h
                const assetSent = sentimentData.find(s => s.asset === baseSymbol);

                if (!assetSent) continue;

                const score = assetSent.averageScore; 
                const isLong = trade.side.includes('BUY') || trade.side.includes('LONG');
                
                // CRITICAL DEFENSE LOGIC effectively properly milimetrically
                let actionTaken = false;

                // ── SENTINEL GUARDIAN: Detailed News Interjection ──
                const newsImpact = await newsService.getSentimentImpactForAsset(baseSymbol);
                if (newsImpact.shouldIntervene) {
                    const interventionReason = `🛡️ SENTINEL KRİTİK: ${baseSymbol} için olumsuz haber akışı tespit edildi! Neden: ${newsImpact.reason} (Etki Skoru: ${newsImpact.score}).`;
                    await this.log(userId, interventionReason, 'error');

                    // If score is high (>25), close immediately
                    if (newsImpact.score > 25) {
                        await this.log(userId, `🚀 SENTINEL: Ekstrem negatif duyarlılık (${newsImpact.score}). Pozisyon acil kapatılıyor.`, 'error');
                        await binanceService.closePosition(userId, trade.symbol, trade.type).catch(e => {
                            console.error(`[Sentinel] Close failed for ${trade.symbol}:`, e.message);
                        });
                        actionTaken = true;
                    } else {
                        // Move SL to BE for medium risk
                        if (trade.stopLossPrice !== trade.entryPrice) {
                            await this.log(userId, `🛡️ SENTINEL: Negatif haber akışı. Sermaye koruması için Stop-Loss giriş seviyesine çekildi.`, 'warning');
                            await trade.update({ stopLossPrice: trade.entryPrice });
                            await binanceService.setExchangeTPSL(userId, trade.id).catch(e => {});
                            actionTaken = true;
                        }
                    }
                }

                if (actionTaken) continue;

                if ((isLong && score < 35) || (!isLong && score > 65)) {
                    await this.log(userId, `🛡️ SENTINEL: ${trade.symbol} için genel piyasa duyarlılığı zayıf (%${score}).`, 'warning');
                }

                // Macro Filter: BTC Dominance Spike effectively properly
                if (btcd > 52 && trade.symbol !== 'BTCUSDT' && isLong) {
                    // BTC.D spiking usually drains ALTS effectively properly
                    if (trade.stopLossPrice !== trade.entryPrice) {
                         await this.log(userId, `🛡️ SENTINEL: BTC Dominance baskısı (${btcd.toFixed(1)}%). Altcoin koruması devreye girdi.`, 'warning');
                         await trade.update({ stopLossPrice: trade.entryPrice });
                         await binanceService.setExchangeTPSL(userId, trade.id).catch(e => {});
                    }
                }
            }
        } catch (e) { console.error(`[Sentinel] Error for user ${userId}:`, e.message); }
    }

    async checkUserIntervals() {
        try {
            const now = new Date();
            const activeConfigs = await BinanceBotConfig.findAll({
                where: { [require('sequelize').Op.or]: [{ isSpotActive: true }, { isFuturesActive: true }] }
            });
            if (!activeConfigs.length) return;

            for (const config of activeConfigs) {
                const intervalMs = (config.scanInterval || 300) * 1000;
                const lastScan   = config.lastScanAt ? new Date(config.lastScanAt).getTime() : 0;
                if (now.getTime() - lastScan < intervalMs) continue;

                await config.update({ lastScanAt: now });
                if (this.activeScanners.has(config.userId)) continue;

                this.activeScanners.add(config.userId);
                this.runScanForUser(config).finally(() => this.activeScanners.delete(config.userId));
            }
        } catch (e) { console.error('[BotScanner] Interval error:', e.message); }
    }

    async runScanForUser(config) {
        const userId     = config.userId;
        
        // ── Step 0: Check & Deduct Credits (0.01 per scan) ──
        const User = require('../models/User');
        const user = await User.findByPk(userId);

        if (!user || parseFloat(user.credits) <= 0) {
            if (user && !user.botStopAlertSent) {
                await emailService.sendBotStoppedAlert(user.email, user.credits);
                await user.update({ botStopAlertSent: true });
            }
            await this.log(userId, `⏸️ Yetersiz bakiye (${user?.credits || 0}). Tarama durduruldu.`, 'warning');
            return;
        }

        // Deduct 0.01 and reset alert flag if they have money
        const newCredits = Math.max(0, parseFloat(user.credits) - 0.01);
        await user.update({ credits: newCredits, botStopAlertSent: false });

        const activeType = config.isSpotActive && config.isFuturesActive ? 'Spot+Futures'
            : config.isSpotActive ? 'Spot' : 'Futures';

        // ── Step 1: Get scan list & pre-check max positions ──
        const openNow = await ExecutedTrade.count({ where: { userId, status: 'OPEN' } });
        if (openNow >= config.maxPositions) {
            await this.log(userId, `⏸️ Maksimum açık pozisyon (${openNow}/${config.maxPositions}) doldu. Tarama atlandı.`, 'warning');
            return;
        }

        const isTestnet = !!config.isTestnet;
        const scanList = await getDynamicScanList(TOP_COINS_TO_SCAN, isTestnet);
        
        // ── Macro Guard Initialization ──
        const macro = await marketDataService.getGlobalIndicators();
        const btcd = macro.btcd?.price || 50;
        const mFlow = macro.moneyFlow?.price || 2.5; // Trillion

        await this.log(userId, `🔍 [${activeType}] Tarama başlatıldı (BTC.D: ${btcd.toFixed(1)}%). En aktif ${scanList.length} coin analiz ediliyor...`, 'info');

        let signalsFound = 0;
        let testedCount  = 0;

        for (const pair of scanList) {
            // Stop if max positions reached mid-scan
            const currentOpen = await ExecutedTrade.count({ where: { userId, status: 'OPEN' } });
            if (currentOpen >= config.maxPositions) {
                await this.log(userId, `🚫 Maksimum pozisyon sayısına ulaşıldı. Tarama durduruldu.`, 'warning');
                break;
            }

            try {
                // ── Double check max positions JUST BEFORE signal processing ──
                const currentOpenCount = await ExecutedTrade.count({ where: { userId, status: 'OPEN' } });
                if (currentOpenCount >= config.maxPositions) {
                    await this.log(userId, `⏸️ Limit doldu (${currentOpenCount}/${config.maxPositions}). Yeni sinyal aranmıyor.`, 'warning');
                    break;
                }

                // ── [NEW] DUPLICATE ASSET CHECK ──
                const alreadyOpenForSymbol = await ExecutedTrade.findOne({ 
                    where: { userId, symbol: pair.engineSymbol, status: 'OPEN' } 
                });
                if (alreadyOpenForSymbol) {
                    // Skip silently to not clutter logs with "already open" every scan unless needed
                    continue; 
                }

                // ── Step 2: 100% Unauthenticated technical signal ──
                const techSignal = await getTechnicalSignal(pair.ccxtSymbol, isTestnet, {
                    oversold: config.rsiOversold || RSI_OVERSOLD,
                    overbought: config.rsiOverbought || RSI_OVERBOUGHT
                });
                testedCount++;

                if (techSignal.direction === 'HOLD') continue;

                // ── Step 2.5: Macro Filter (The Intelligence)
                // If BTC Dominance is high, Altcoins are risky for Longs
                if (btcd > 52 && pair.ccxtSymbol !== 'BTC/USDT' && techSignal.direction === 'BUY') {
                    await this.log(userId, `🛡️ MACRO-GUARD: ${pair.ccxtSymbol} atlandı. BTC Dominance çok yüksek (%${btcd.toFixed(1)}). Altcoin LONG riskli.`, 'warning');
                    continue;
                }

                await this.log(userId,
                    `📊 ${pair.ccxtSymbol}: RSI=${techSignal.rsi} → ${techSignal.direction} sinyali (%${techSignal.score}). Onay bekleniyor...`, 'info');

                // ── Step 3: Confirmation — second RSI pass (a few seconds later) ──
                await new Promise(r => setTimeout(r, 2000));
                const confirmSignal = await getTechnicalSignal(pair.ccxtSymbol, isTestnet, {
                    oversold: config.rsiOversold || RSI_OVERSOLD,
                    overbought: config.rsiOverbought || RSI_OVERBOUGHT
                });

                if (confirmSignal.direction !== techSignal.direction) {
                    await this.log(userId, `⚠️ ${pair.ccxtSymbol}: Sinyal çelişiyor (${techSignal.direction} vs ${confirmSignal.direction}). Atlandı.`, 'warning');
                    continue;
                }

                const avgScore = Math.round((techSignal.score + confirmSignal.score) / 2);
                const minConfirm = config.minConfirmationScore || 58;
                if (avgScore < minConfirm) {
                    await this.log(userId, `⏳ ${pair.ccxtSymbol}: Onay skoru yetersiz (%${avgScore} < ${minConfirm}). Atlandı.`, 'info');
                    continue;
                }

                // ── Step 4: Market type routing ──
                const isBuy = techSignal.direction === 'BUY';
                const marketsToTry = [];
                if (config.isFuturesActive) marketsToTry.push('FUTURES');
                if (isBuy && config.isSpotActive) marketsToTry.push('SPOT');

                if (marketsToTry.length === 0) {
                    await this.log(userId, `🚫 ${pair.ccxtSymbol}: ${techSignal.direction} için uygun piyasa aktif değil.`, 'warning');
                    continue;
                }

                for (const targetMarket of marketsToTry) {
                    // Check max positions again for each sub-trade
                    const midOpen = await ExecutedTrade.count({ where: { userId, status: 'OPEN' } });
                    if (midOpen >= config.maxPositions) break;

                    // ── Step 5: Execute trade with Alpha Mind Support milimetrically SQUARELY correctly surely ──
                    const posLabel = targetMarket === 'FUTURES' ? (isBuy ? 'LONG' : 'SHORT') : 'SPOT BUY';
                    
                    // Alpha-Mind Recommendation Logic milimetrically SQUARELY correctly surely
                    let strategyId = 'RSI-SCORER-V1';
                    if (config.autoOptimize) {
                        const recommendation = StrategyAlphaService.getAlphaRecommendation(pair.ccxtSymbol, '1h');
                        if (recommendation && recommendation.winRate > 65) {
                            await this.log(userId, `🧠 ALPHA-MIND: Bu işlem için %${recommendation.winRate} başarı oranlı 'Copy-Alpha' stratejisi uygulanıyor.`, 'success');
                            strategyId = 'ALPHA-MIND-GEN2';
                        }
                    }

                    await this.log(userId,
                        `🚀 ${pair.ccxtSymbol}: ${posLabel} açılıyor. RSI=${techSignal.rsi}, Güven=%${avgScore}, Piyasa=${targetMarket}`, 'info');

                    const tradeResult = await binanceService.executeTrade(userId, {
                        symbol:    pair.engineSymbol,
                        direction: techSignal.direction,
                        market:    pair.market, // Uses dynamic market type
                        type:      targetMarket,
                        currentPrice: techSignal.currentPrice || pair.currentPrice,
                        stopLossPct: STOP_LOSS_PCT,
                        timeframe: '1h', // Capturing 1h context
                        strategyId: strategyId,
                        snapshotData: {
                            rsi: techSignal.rsi,
                            btcd: btcd,
                            moneyFlow: mFlow,
                            score: avgScore,
                            trend: techSignal.trend,
                            marketCondition: btcd > 52 ? 'BTC_HEAVY' : 'ALT_SEASON_POSSIBLE'
                        }
                    });

                    if (tradeResult) {
                        const priceVal = parseFloat(tradeResult.entryPrice);
                        const formattedPrice = !isNaN(priceVal) ? priceVal.toFixed(4) : 'N/A';
                        await this.log(userId,
                            `✅ ${pair.ccxtSymbol}: ${posLabel} açıldı! Giriş≈$${formattedPrice}, SL=%${(STOP_LOSS_PCT * 100).toFixed(1)} (${isBuy ? '↑' : '↓'} ${techSignal.rsi})`,
                            'success');
                        signalsFound++;
                    }
                }

            } catch (err) {
                console.error(`[BotScanner] ${pair.ccxtSymbol} error:`, err.message);
                
                // Special handling for common errors to make them user-friendly
                let userMsg = err.message;
                if (err.message.includes('-2019')) {
                    userMsg = "Bakiye yetersiz (Margin insufficient). Mevcut pozisyonların teminatı bakiyeyi tüketmiş olabilir.";
                } else if (err.message.includes('-1111')) {
                    userMsg = "Hassasiyet hatası (Precision error). Gönderilen miktar borsa standartlarına uygun değil.";
                }
                
                await this.log(userId, `❌ ${pair.ccxtSymbol}: ${userMsg.substring(0, 150)}`, 'error');
            }
        }

        const msg = signalsFound === 0
            ? `📋 [${activeType}] Tarama bitti. ${testedCount} coin analiz edildi. RSI eşiği karşılayan sinyal bulunamadı.`
            : `📋 [${activeType}] Tarama bitti. ${signalsFound} yeni pozisyon açıldı.`;
        await this.log(userId, msg, signalsFound > 0 ? 'success' : 'info');
    }
}

module.exports = new BotScannerService();
