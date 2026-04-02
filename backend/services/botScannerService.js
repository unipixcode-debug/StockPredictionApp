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
 * Computes RSI + momentum signal for a USDT pair using CCXT.
 * Returns { direction:'BUY'|'SELL'|'HOLD', score:0-100, rsi, momentum, currentPrice }
 */
async function getTechnicalSignal(ccxtSymbol, exchange) {
    try {
        // 1h candles, last 30 to have enough for RSI
        const ohlcv = await exchange.fetchOHLCV(ccxtSymbol, '1h', undefined, 30);
        if (!ohlcv || ohlcv.length < RSI_PERIOD + 2) return { direction: 'HOLD', score: 50 };

        const closes = ohlcv.map(c => c[4]);
        const rsi = computeRSI(closes);
        const currentPrice = closes[closes.length - 1];
        const prevPrice    = closes[closes.length - 2];
        const momentum     = ((currentPrice - prevPrice) / prevPrice) * 100;

        // RSI of exactly 100 or 0 means zero losses or zero gains in the period
        // — artifact of illiquid coins, not a reliable signal
        if (rsi === 100 || rsi === 0) return { direction: 'HOLD', score: 50 };

        // 24h trend (first vs last of the 30 candles)
        const trend        = ((currentPrice - closes[0]) / closes[0]) * 100;

        let direction = 'HOLD';
        let score     = 50;

        if (rsi < RSI_OVERSOLD) {
            // Oversold: BUY — extra score if momentum starting to turn positive
            const strength = RSI_OVERSOLD - rsi; // 0–35
            score     = 55 + Math.min(strength * 1.2, 40);
            direction = 'BUY';
        } else if (rsi > RSI_OVERBOUGHT) {
            // Overbought: SELL
            const strength = rsi - RSI_OVERBOUGHT; // 0–35
            score     = 55 + Math.min(strength * 1.2, 40);
            direction = 'SELL';
        }

        return { direction, score: Math.round(score), rsi: Math.round(rsi * 10) / 10, momentum, trend, currentPrice };
    } catch {
        return { direction: 'HOLD', score: 50 };
    }
}

// ─── Dynamic Scan List ───────────────────────────────────────────────────────
async function getDynamicScanList(exchange, limit = TOP_COINS_TO_SCAN) {
    try {
        const tickers = await exchange.fetchTickers();
        // Futures CCXT format: 'BTC/USDT:USDT' (USDT-margined perpetual)
        // NOT 'BTC/USDT' — that's spot format
        const pairs = Object.values(tickers)
            .filter(t =>
                t.symbol.endsWith(':USDT') &&           // USDT-margined perpetuals only
                (t.quoteVolume || 0) > MIN_VOLUME_USDT &&
                t.percentage != null
            )
            .sort((a, b) => Math.abs(b.percentage) - Math.abs(a.percentage))
            .slice(0, limit)
            .map(t => ({
                ccxtSymbol:   t.symbol,                                    // 'BTC/USDT:USDT'
                displaySymbol: t.symbol.replace(':USDT', ''),              // 'BTC/USDT'
                engineSymbol: t.symbol.split('/')[0] + '-USD',            // 'BTC-USD'
                change24h:    t.percentage?.toFixed(2),
                volume:       t.quoteVolume,
                currentPrice: t.last
            }));

        console.log(`[BotScanner] ${pairs.length} futures pairs selected from ${Object.keys(tickers).length} total.`);
        return pairs;
    } catch (err) {
        console.error('[BotScanner] fetchTickers error:', err.message);
        return [
            { ccxtSymbol: 'BTC/USDT:USDT', displaySymbol: 'BTC/USDT', engineSymbol: 'BTC-USD' },
            { ccxtSymbol: 'ETH/USDT:USDT', displaySymbol: 'ETH/USDT', engineSymbol: 'ETH-USD' },
            { ccxtSymbol: 'SOL/USDT:USDT', displaySymbol: 'SOL/USDT', engineSymbol: 'SOL-USD' },
        ];
    }
}

class BotScannerService {
    constructor() {
        this.globalInterval = 10000;
        this.activeScanners = new Set();
        // Use futures-type exchange for scanning so only valid perpetual futures pairs are returned
        this._futuresExchange = new ccxt.binance({
            enableRateLimit: true,
            options: { defaultType: 'future' }
        });
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

        const scanList = await getDynamicScanList(this._futuresExchange);
        await this.log(userId, `🔍 [${activeType}] Piyasa taraması başladı. En aktif ${scanList.length} coin RSI+AI ile analiz ediliyor...`, 'info');

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
                // ── Step 2: Fast RSI-based technical signal (no AI call needed here) ──
                const techSignal = await getTechnicalSignal(pair.ccxtSymbol, this._futuresExchange);
                testedCount++;

                if (techSignal.direction === 'HOLD') continue;

                await this.log(userId,
                    `📊 ${pair.ccxtSymbol}: RSI=${techSignal.rsi} → ${techSignal.direction} sinyali (%${techSignal.score}). Onay bekleniyor...`, 'info');

                // ── Step 3: Confirmation — second RSI pass (a few seconds later) ──
                // Small delay to get a slightly different snapshot
                await new Promise(r => setTimeout(r, 2000));
                const confirmSignal = await getTechnicalSignal(pair.ccxtSymbol, this._futuresExchange);

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
