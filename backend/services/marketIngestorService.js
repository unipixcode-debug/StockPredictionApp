const binanceService = require('./binanceService');
const { CandleData, PivotPoint, sequelize } = require('../models');
const { Op } = require('sequelize');

class MarketIngestorService {
    constructor() {
        this.isRunning = false;
        this.symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'BTC/USDT', 'ETH/USDT']; // Default list, can be expanded
    }

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('📊 Market Ingestor Service started (15m OHLCV Sync)…');
        
        // Initial sync
        await this.syncAll();

        // Run sync every 15 minutes
        setInterval(() => this.syncAll(), 15 * 60 * 1000);
    }

    async syncAll() {
        console.log(`[Ingestor] Syncing ${this.symbols.length} symbols at ${new Date().toISOString()}`);
        for (const symbol of this.symbols) {
            try {
                await this.syncSymbol(symbol);
            } catch (err) {
                console.error(`[Ingestor] Error syncing ${symbol}:`, err.message);
            }
        }
    }

    async syncSymbol(symbol) {
        // 1. Fetch last 100 candles (15m)
        const isTestnet = true; // Use testnet for OHLCV source if configured
        const apiSymbol = symbol.replace('/', '');
        const candles = await binanceService.rawFuturesPublicOHLCV(apiSymbol, '15m', 100, isTestnet);

        if (!Array.isArray(candles)) return;

        // 2. Map and UPSERT into CandleData
        const candleRecords = candles.map(c => ({
            symbol: symbol,
            open_time: new Date(c[0]),
            open: parseFloat(c[1]),
            high: parseFloat(c[2]),
            low: parseFloat(c[3]),
            close: parseFloat(c[4]),
            volume: parseFloat(c[5])
        }));

        for (const record of candleRecords) {
            await CandleData.upsert(record);
        }

        // 3. Process ZigZag (Pivot Points) for this symbol
        await this.updatePivotPoints(symbol);
    }

    async updatePivotPoints(symbol, deviationThreshold = 3.0) {
        // Fetch last 200 candles to find pivots
        const candles = await CandleData.findAll({
            where: { symbol },
            order: [['open_time', 'ASC']],
            limit: 200
        });

        if (candles.length < 2) return;

        // Simple ZigZag implementation
        let lastPivotPrice = parseFloat(candles[0].close);
        let lastPivotType = null; // 'PEAK' or 'TROUGH'
        
        // Clear existing pivots for this range to recalculate (or use a smarter approach)
        // For simplicity, we recalculate the window
        
        const pivots = [];
        let currentExtremum = lastPivotPrice;
        let extremumIndex = 0;

        for (let i = 1; i < candles.length; i++) {
            const price = parseFloat(candles[i].close);
            const move = ((price - lastPivotPrice) / lastPivotPrice) * 100;

            if (lastPivotType === null) {
                // Determine first direction
                if (Math.abs(move) >= deviationThreshold) {
                    lastPivotType = move > 0 ? 'PEAK' : 'TROUGH';
                    lastPivotPrice = price;
                    pivots.push({
                        symbol,
                        time: candles[i].open_time,
                        price: price,
                        type: lastPivotType,
                        significance: Math.abs(move)
                    });
                }
                continue;
            }

            if (lastPivotType === 'PEAK') {
                if (price > lastPivotPrice) {
                    // New higher peak
                    lastPivotPrice = price;
                    pivots[pivots.length - 1].time = candles[i].open_time;
                    pivots[pivots.length - 1].price = price;
                } else if (((lastPivotPrice - price) / lastPivotPrice) * 100 >= deviationThreshold) {
                    // Reversal to Trough
                    lastPivotType = 'TROUGH';
                    lastPivotPrice = price;
                    pivots.push({
                        symbol,
                        time: candles[i].open_time,
                        price: price,
                        type: 'TROUGH',
                        significance: deviationThreshold
                    });
                }
            } else {
                if (price < lastPivotPrice) {
                    // New lower trough
                    lastPivotPrice = price;
                    pivots[pivots.length - 1].time = candles[i].open_time;
                    pivots[pivots.length - 1].price = price;
                } else if (((price - lastPivotPrice) / lastPivotPrice) * 100 >= deviationThreshold) {
                    // Reversal to Peak
                    lastPivotType = 'PEAK';
                    lastPivotPrice = price;
                    pivots.push({
                        symbol,
                        time: candles[i].open_time,
                        price: price,
                        type: 'PEAK',
                        significance: deviationThreshold
                    });
                }
            }
        }

        // Save pivots
        for (const pivot of pivots) {
            await PivotPoint.upsert(pivot, {
                conflictFields: ['symbol', 'time']
            });
        }
    }
}

module.exports = new MarketIngestorService();
