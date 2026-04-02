const binanceService = require('../services/binanceService');
const { ExecutedTrade, BinanceBotConfig } = require('../models');

async function check() {
    try {
        const userId = 1; // Assuming primary user 1
        const config = await BinanceBotConfig.findOne({ where: { userId } });
        if (!config) throw new Error('Config missing');

        console.log('--- RAW BINANCE FUTURES ---');
        const pos = await binanceService.rawFuturesPositions(config.apiKey, config.apiSecret, !!config.isTestnet);
        
        const targets = pos.filter(p => p.symbol.includes('PORT3') || p.symbol.includes('SKATE'));
        console.log('Targets on Binance:', JSON.stringify(targets, null, 2));

        console.log('--- DB OPEN TRADES ---');
        const dbTrades = await ExecutedTrade.findAll({ where: { userId, status: 'OPEN' } });
        console.log('Current DB OPEN:', dbTrades.map(t => t.symbol));
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
