const binanceService = require('./services/binanceService');
const { ExecutedTrade, BinanceBotConfig } = require('./models');

async function diag() {
    try {
        const userId = 1;
        const config = await BinanceBotConfig.findOne({ where: { userId } });
        console.log('--- BINANCE POSITIONS ---');
        const pos = await binanceService.rawFuturesPositions(config.apiKey, config.apiSecret, !!config.isTestnet);
        const targets = pos.filter(p => ['CESSUSDT', 'PORT3USDT', 'OBOLUSDT', 'SKATEUSDT'].some(s => p.symbol.includes(s)));
        console.log(JSON.stringify(targets.map(p => ({ sym: p.symbol, amt: p.positionAmt, entry: p.entryPrice })), null, 2));

        console.log('--- DB TRADES ---');
        const trades = await ExecutedTrade.findAll({ where: { userId, status: 'OPEN' } });
        console.log(JSON.stringify(trades.filter(t => t.symbol.includes('PORT') || t.symbol.includes('CESS') || t.symbol.includes('OBOL')).map(t => ({ 
            sym: t.symbol, 
            amt: t.amount, 
            entry: t.entryPrice,
            pnl_col: t.pnl
        })), null, 2));
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
diag();
