const { BinanceBotConfig, BotLog, ExecutedTrade } = require('../models');
const predictionEngine = require('./predictionEngine');
const binanceService = require('./binanceService');
const ccxt = require('ccxt');

// Minimum score threshold to act on a signal
const MIN_SCORE_THRESHOLD = 68;
// Minimum score from second confirmation to proceed
const MIN_CONFIRM_THRESHOLD = 65;
// How many top-volatile coins to run AI on (out of all Binance listings)
const TOP_COINS_TO_SCAN = 50;

/**
 * Fetches all active USDT pairs from Binance, sorted by absolute 24h change (most volatile first).
 * Returns top N pairs formatted for predictionEngine.
 */
async function getDynamicScanList(limit = TOP_COINS_TO_SCAN) {
    try {
        const exchange = new ccxt.binance({ enableRateLimit: true });
        const tickers = await exchange.fetchTickers(); // All tickers at once (1 API call)

        const usdtPairs = Object.values(tickers)
            .filter(t =>
                t.symbol.endsWith('/USDT') &&
                t.quoteVolume > 100000 && // Min 100k USDT daily volume
                t.percentage != null
            )
            .sort((a, b) => Math.abs(b.percentage) - Math.abs(a.percentage)) // Most volatile first
            .slice(0, limit)
            .map(t => ({
                // Convert 'BTC/USDT' -> 'BTC-USD' for predictionEngine
                symbol: t.symbol.replace('/USDT', '-USD'),
                market: 'CRYPTO',
                displaySymbol: t.symbol,
                change24h: t.percentage?.toFixed(2)
            }));

        console.log(`[BotScanner] Dynamic list: ${usdtPairs.length} coins selected from ${Object.keys(tickers).length} total pairs.`);
        return usdtPairs;
    } catch (err) {
        console.error('[BotScanner] Failed to fetch dynamic coin list, falling back to defaults:', err.message);
        // Fallback to a safe default list
        return [
            { symbol: 'BTC-USD', market: 'CRYPTO' },
            { symbol: 'ETH-USD', market: 'CRYPTO' },
            { symbol: 'SOL-USD', market: 'CRYPTO' },
            { symbol: 'BNB-USD', market: 'CRYPTO' },
            { symbol: 'XRP-USD', market: 'CRYPTO' },
        ];
    }
}


class BotScannerService {
    constructor() {
        this.globalInterval = 10000; // Check user intervals every 10s
        this.activeScanners = new Set(); // Prevent overlapping scans per user
    }

    async log(userId, message, type = 'info') {
        try {
            await BotLog.create({ userId, message, type });
            const count = await BotLog.count({ where: { userId } });
            if (count > 50) {
                const oldestLogs = await BotLog.findAll({
                    where: { userId },
                    order: [['createdAt', 'ASC']],
                    limit: count - 50
                });
                for (const log of oldestLogs) await log.destroy();
            }
        } catch (error) {
            console.error('BotLog Create Error:', error);
        }
    }

    startBackgroundTasks() {
        console.log('🤖 Bot Scanner (AI-Powered) started (10s sync loop)...');
        setInterval(() => this.checkUserIntervals(), this.globalInterval);
    }

    async checkUserIntervals() {
        try {
            const now = new Date();
            const activeConfigs = await BinanceBotConfig.findAll({
                where: {
                    [require('sequelize').Op.or]: [
                        { isSpotActive: true },
                        { isFuturesActive: true }
                    ]
                }
            });

            if (activeConfigs.length === 0) return;

            for (const config of activeConfigs) {
                const intervalMs = (config.scanInterval || 300) * 1000;
                const lastScan = config.lastScanAt ? new Date(config.lastScanAt).getTime() : 0;

                if (now.getTime() - lastScan >= intervalMs) {
                    await config.update({ lastScanAt: now });

                    // Prevent overlapping scans for same user
                    if (this.activeScanners.has(config.userId)) {
                        console.log(`[Bot] Scan already in progress for user ${config.userId}, skipping.`);
                        continue;
                    }

                    this.activeScanners.add(config.userId);
                    this.runScanForUser(config).finally(() => {
                        this.activeScanners.delete(config.userId);
                    });
                }
            }
        } catch (error) {
            console.error('[BotScanner] Interval check error:', error);
        }
    }

    async runScanForUser(config) {
        const userId = config.userId;
        const activeType = config.isSpotActive && config.isFuturesActive ? 'Spot+Futures'
            : config.isSpotActive ? 'Spot' : 'Futures';

        // Fetch the dynamic coin list (top volatile USDT pairs from all of Binance)
        const scanList = await getDynamicScanList();

        await this.log(userId, `🔍 [${activeType}] Piyasa taraması başladı. Binance'teki en aktif ${scanList.length} coin analiz ediliyor...`, 'info');

        let signalsFound = 0;

        for (const pair of scanList) {
            try {
                // --- Step 1: First-pass AI Analysis ---
                const firstAnalysis = await predictionEngine.generatePrediction(pair.symbol, pair.market, userId);

                if (!firstAnalysis || firstAnalysis.direction === 'HOLD') {
                    continue; // No signal, move on
                }

                const firstScore = firstAnalysis.score || 50;
                const firstDirection = firstAnalysis.direction; // 'BUY' or 'SELL'

                // Only continue if score meets threshold
                if (firstScore < MIN_SCORE_THRESHOLD) {
                    await this.log(userId, `⏳ ${pair.symbol}: ${firstDirection} sinyali (%${firstScore}) - Eşik altında, bekleniyor.`, 'info');
                    continue;
                }

                await this.log(userId, `📊 ${pair.symbol}: Güçlü ${firstDirection} sinyali (%${firstScore}). İkinci analiz başlatılıyor...`, 'info');

                // --- Step 2: Second-pass Confirmation Analysis ---
                const confirmAnalysis = await predictionEngine.generatePrediction(pair.symbol, pair.market, userId);

                if (!confirmAnalysis) continue;

                const confirmScore = confirmAnalysis.score || 50;
                const confirmDirection = confirmAnalysis.direction;

                // Both analyses must agree on direction
                if (firstDirection !== confirmDirection) {
                    await this.log(userId, `⚠️ ${pair.symbol}: Analizler çelişiyor (${firstDirection} vs ${confirmDirection}). Giriş yapılmadı.`, 'warning');
                    continue;
                }

                // Average score from both passes
                const avgScore = Math.round((firstScore + confirmScore) / 2);

                if (avgScore < MIN_CONFIRM_THRESHOLD) {
                    await this.log(userId, `⏳ ${pair.symbol}: Onay skoru yetersiz (%${avgScore}). Giriş yapılmadı.`, 'info');
                    continue;
                }

                // --- Step 3: Determine market type and check if allowed ---
                // SELL signals → only valid for FUTURES (SHORT)
                // BUY signals → valid for SPOT or FUTURES (LONG)
                const isBuy = firstDirection === 'BUY';
                const isSell = firstDirection === 'SELL';

                let targetMarket = null;
                if (isBuy && config.isSpotActive) targetMarket = 'SPOT';
                if (isBuy && config.isFuturesActive) targetMarket = 'FUTURES'; // Futures takes priority for LONG too
                if (isSell && config.isFuturesActive) targetMarket = 'FUTURES'; // SHORT only on Futures

                if (!targetMarket) {
                    await this.log(userId, `🚫 ${pair.symbol}: ${firstDirection} sinyali için uygun piyasa aktif değil (${isSell ? 'SHORT sadece Futures' : 'Spot veya Futures gerekli'}).`, 'warning');
                    continue;
                }

                // --- Step 4: Check max positions ---
                const openPositions = await ExecutedTrade.count({ where: { userId, status: 'OPEN' } });
                if (openPositions >= config.maxPositions) {
                    await this.log(userId, `🚫 Maksimum açık pozisyon sayısına ulaşıldı (${openPositions}/${config.maxPositions}). ${pair.symbol} atlandı.`, 'warning');
                    continue;
                }

                // --- Step 5: Execute Trade ---
                await this.log(userId, `🚀 ${pair.symbol}: ${firstDirection === 'BUY' ? 'LONG' : 'SHORT'} işlemi açılıyor (Güven: %${avgScore}, Piyasa: ${targetMarket})...`, 'info');

                await binanceService.executeTrade(userId, {
                    symbol: pair.symbol,
                    direction: firstDirection, // 'BUY' or 'SELL'
                    market: pair.market,
                    type: targetMarket // 'SPOT' or 'FUTURES'
                });

                await this.log(userId, `✅ ${pair.symbol}: ${firstDirection === 'BUY' ? 'LONG' : 'SHORT'} pozisyonu başarıyla açıldı! Hedef: $${firstAnalysis.targetPrice?.toFixed(2)}, Stop: $${firstAnalysis.stopLoss?.toFixed(2)}`, 'success');
                signalsFound++;

            } catch (pairError) {
                console.error(`[BotScanner] Error scanning ${pair.symbol} for user ${userId}:`, pairError.message);
                await this.log(userId, `❌ ${pair.symbol} taranırken hata: ${pairError.message}`, 'error');
            }
        }

        if (signalsFound === 0) {
            await this.log(userId, `📋 [${activeType}] Tarama tamamlandı. Giriş kriteri karşılayan sinyal bulunamadı.`, 'info');
        } else {
            await this.log(userId, `📋 [${activeType}] Tarama tamamlandı. ${signalsFound} yeni pozisyon açıldı.`, 'success');
        }
    }
}

module.exports = new BotScannerService();
