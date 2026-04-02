const { BinanceBotConfig, BotLog, ExecutedTrade } = require('../models');
const binanceService = require('./binanceService');
const ccxt = require('ccxt');

// ─── Config ──────────────────────────────────────────────────────────────────
const TOP_COINS_TO_SCAN  = 50;   // Top N volatile coins from Binance
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
async function getTechnicalSignal(ccxtSymbol, isTestnet = true) {
    try {
        const apiSymbol = ccxtSymbol.split('/')[0] + 'USDT';
        // Use direct HTTPS raw OHLCV fetch
        const ohlcv = await binanceService.rawFuturesPublicOHLCV(apiSymbol, '1h', 30, isTestnet);
        if (!ohlcv || ohlcv.length < RSI_PERIOD + 2) return { direction: 'HOLD', score: 50 };

        const closes = ohlcv.map(c => c[4]);
        const rsi = computeRSI(closes);
        const currentPrice = closes[closes.length - 1];
        const prevPrice    = closes[closes.length - 2];
        const momentum     = ((currentPrice - prevPrice) / prevPrice) * 100;

        // RSI artifact protection
        if (rsi === 100 || rsi === 0) return { direction: 'HOLD', score: 50 };

        const trend = ((currentPrice - closes[0]) / closes[0]) * 100;
        let direction = 'HOLD';
        let score     = 50;

        if (rsi < RSI_OVERSOLD) {
            const strength = RSI_OVERSOLD - rsi;
            score     = 55 + Math.min(strength * 1.5, 45); // Boosted score for bot confidence
            direction = 'BUY';
        } else if (rsi > RSI_OVERBOUGHT) {
            const strength = rsi - RSI_OVERBOUGHT;
            score     = 55 + Math.min(strength * 1.5, 45);
            direction = 'SELL';
        }

        return { direction, score: Math.round(score), rsi: Math.round(rsi * 10) / 10, momentum, trend, currentPrice };
    } catch (e) {
        console.error(`[BotScanner] Technical Signal Error for ${ccxtSymbol}:`, e.message);
        return { direction: 'HOLD', score: 50 };
    }
}

// ─── Dynamic Scan List ───────────────────────────────────────────────────────
async function getDynamicScanList(limit = TOP_COINS_TO_SCAN, isTestnet = true) {
    const whitelist = [
        'BTC/USDT:USDT', 'ETH/USDT:USDT', 'SOL/USDT:USDT', 'BNB/USDT:USDT', 'XRP/USDT:USDT',
        'ADA/USDT:USDT', 'AVAX/USDT:USDT', 'DOGE/USDT:USDT', 'DOT/USDT:USDT', 'LINK/USDT:USDT',
        'POL/USDT:USDT', 'LTC/USDT:USDT', 'SHIB/USDT:USDT', 'NEAR/USDT:USDT', 'OP/USDT:USDT',
        'ARB/USDT:USDT', 'SUI/USDT:USDT', 'TIA/USDT:USDT', 'INJ/USDT:USDT', 'APT/USDT:USDT',
        'ORDI/USDT:USDT', 'PEPE/USDT:USDT', 'WIF/USDT:USDT', 'BONK/USDT:USDT', 'SEI/USDT:USDT',
        'FET/USDT:USDT'
    ];

    try {
        // Use direct HTTPS raw price fetch
        const priceMap = await binanceService.rawFuturesPublicTickers(isTestnet);
        
        const pairs = whitelist
            .map(w => {
                const apiSym = w.split('/')[0] + 'USDT';
                const currentPrice = priceMap[apiSym];
                if (!currentPrice) return null;
                return {
                    ccxtSymbol:    w,
                    displaySymbol: w.replace(':USDT', ''),
                    engineSymbol:  w.split('/')[0] + '-USD',
                    change24h:     '0.00', // price/ticker doesn't have change, but we prioritized price for executeTrade
                    volume:        100_000_000, // Placeholder volume for whitelisted assets
                    currentPrice:  currentPrice
                };
            })
            .filter(p => p !== null)
            .slice(0, limit);

        console.log(`[BotScanner] ${pairs.length} whitelisted futures pairs selected for analysis (isTestnet=${isTestnet}).`);
        return pairs;
    } catch (err) {
        console.warn('[BotScanner] Whitelist fetchTickers warning:', err.message);
        // Minimum fallback
        // Whitelist Fallback (Top 20 most liquid USDS-M Perpetual/Testnet pairs)
        return [
            { ccxtSymbol: 'BTC/USDT:USDT', displaySymbol: 'BTC/USDT', engineSymbol: 'BTC-USD' },
            { ccxtSymbol: 'ETH/USDT:USDT', displaySymbol: 'ETH/USDT', engineSymbol: 'ETH-USD' },
            { ccxtSymbol: 'SOL/USDT:USDT', displaySymbol: 'SOL/USDT', engineSymbol: 'SOL-USD' },
            { ccxtSymbol: 'BNB/USDT:USDT', displaySymbol: 'BNB/USDT', engineSymbol: 'BNB-USD' },
            { ccxtSymbol: 'XRP/USDT:USDT', displaySymbol: 'XRP/USDT', engineSymbol: 'XRP-USD' },
            { ccxtSymbol: 'DOGE/USDT:USDT', displaySymbol: 'DOGE/USDT', engineSymbol: 'DOGE-USD' },
            { ccxtSymbol: 'ADA/USDT:USDT', displaySymbol: 'ADA/USDT', engineSymbol: 'ADA-USD' },
            { ccxtSymbol: 'AVAX/USDT:USDT', displaySymbol: 'AVAX/USDT', engineSymbol: 'AVAX-USD' },
            { ccxtSymbol: 'DOT/USDT:USDT', displaySymbol: 'DOT/USDT', engineSymbol: 'DOT-USD' },
            { ccxtSymbol: 'LINK/USDT:USDT', displaySymbol: 'LINK/USDT', engineSymbol: 'LINK-USD' },
            { ccxtSymbol: 'POL/USDT:USDT', displaySymbol: 'POL/USDT', engineSymbol: 'POL-USD' },
            { ccxtSymbol: 'LTC/USDT:USDT', displaySymbol: 'LTC/USDT', engineSymbol: 'LTC-USD' },
            { ccxtSymbol: 'SHIB/USDT:USDT', displaySymbol: 'SHIB/USDT', engineSymbol: 'SHIB-USD' },
            { ccxtSymbol: 'NEAR/USDT:USDT', displaySymbol: 'NEAR/USDT', engineSymbol: 'NEAR-USD' },
            { ccxtSymbol: 'TRX/USDT:USDT', displaySymbol: 'TRX/USDT', engineSymbol: 'TRX-USD' },
            { ccxtSymbol: 'PEPE/USDT:USDT', displaySymbol: 'PEPE/USDT', engineSymbol: 'PEPE-USD' },
            { ccxtSymbol: 'WIF/USDT:USDT', displaySymbol: 'WIF/USDT', engineSymbol: 'WIF-USD' },
            { ccxtSymbol: 'SUI/USDT:USDT', displaySymbol: 'SUI/USDT', engineSymbol: 'SUI-USD' },
            { ccxtSymbol: 'APT/USDT:USDT', displaySymbol: 'APT/USDT', engineSymbol: 'APT-USD' },
            { ccxtSymbol: 'FET/USDT:USDT', displaySymbol: 'FET/USDT', engineSymbol: 'FET-USD' }
        ];
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
        console.log('🤖 Bot Scanner (RSI+AI) started…');
        setInterval(() => this.checkUserIntervals(), this.globalInterval);
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
        await this.log(userId, `🔍 [${activeType}] Piyasa taramasıladı (Testnet:${isTestnet}). En aktif ${scanList.length} coin analiz ediliyor...`, 'info');

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
                // ── Step 2: 100% Unauthenticated technical signal ──
                const techSignal = await getTechnicalSignal(pair.ccxtSymbol, isTestnet);
                testedCount++;

                if (techSignal.direction === 'HOLD') continue;

                await this.log(userId,
                    `📊 ${pair.ccxtSymbol}: RSI=${techSignal.rsi} → ${techSignal.direction} sinyali (%${techSignal.score}). Onay bekleniyor...`, 'info');

                // ── Step 3: Confirmation — second RSI pass (a few seconds later) ──
                await new Promise(r => setTimeout(r, 2000));
                const confirmSignal = await getTechnicalSignal(pair.ccxtSymbol, isTestnet);

                if (confirmSignal.direction !== techSignal.direction) {
                    await this.log(userId, `⚠️ ${pair.ccxtSymbol}: Sinyal çelişiyor (${techSignal.direction} vs ${confirmSignal.direction}). Atlandı.`, 'warning');
                    continue;
                }

                const avgScore = Math.round((techSignal.score + confirmSignal.score) / 2);
                if (avgScore < 58) {
                    await this.log(userId, `⏳ ${pair.ccxtSymbol}: Onay skoru yetersiz (%${avgScore} < 58). Atlandı.`, 'info');
                    continue;
                }

                // ── Step 4: Market type routing ──
                const isBuy = techSignal.direction === 'BUY';
                let targetMarket = null;
                if (isBuy  && config.isFuturesActive) targetMarket = 'FUTURES';
                else if (isBuy && config.isSpotActive) targetMarket = 'SPOT';
                else if (!isBuy && config.isFuturesActive) targetMarket = 'FUTURES'; // SHORT

                if (!targetMarket) {
                    await this.log(userId, `🚫 ${pair.ccxtSymbol}: ${techSignal.direction} için uygun piyasa aktif değil.`, 'warning');
                    continue;
                }

                // ── Step 5: Execute trade with stop-loss ──
                const posLabel = isBuy ? 'LONG' : 'SHORT';
                await this.log(userId,
                    `🚀 ${pair.ccxtSymbol}: ${posLabel} açılıyor. RSI=${techSignal.rsi}, Güven=%${avgScore}, Piyasa=${targetMarket}`, 'info');

                const tradeResult = await binanceService.executeTrade(userId, {
                    symbol:    pair.engineSymbol,
                    direction: techSignal.direction,
                    market:    'CRYPTO',
                    type:      targetMarket,
                    stopLossPct: STOP_LOSS_PCT // Pass SL% to executeTrade
                });

                if (tradeResult) {
                    await this.log(userId,
                        `✅ ${pair.ccxtSymbol}: ${posLabel} açıldı! Giriş≈$${tradeResult.entryPrice?.toFixed(4)}, SL=%${(STOP_LOSS_PCT * 100).toFixed(1)} (${isBuy ? '↑' : '↓'} ${techSignal.rsi})`,
                        'success');
                    signalsFound++;
                }

            } catch (err) {
                console.error(`[BotScanner] ${pair.ccxtSymbol} error:`, err.message);
                await this.log(userId, `❌ ${pair.ccxtSymbol}: ${err.message.substring(0, 120)}`, 'error');
            }
        }

        const msg = signalsFound === 0
            ? `📋 [${activeType}] Tarama bitti. ${testedCount} coin analiz edildi. RSI eşiği karşılayan sinyal bulunamadı.`
            : `📋 [${activeType}] Tarama bitti. ${signalsFound} yeni pozisyon açıldı.`;
        await this.log(userId, msg, signalsFound > 0 ? 'success' : 'info');
    }
}

module.exports = new BotScannerService();
