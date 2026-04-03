const service = require('./backend/services/binanceService');
async function run() {
    const markets = await service.rawFuturesMarkets(true);
    console.log('TOKENUSDT Market Info:', JSON.stringify(markets['TOKENUSDT'], null, 2));
}
run();
