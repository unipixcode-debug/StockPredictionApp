const yahooFinance = require('yahoo-finance2').default;

async function test() {
    try {
        const symbol = 'PEP';
        const period1Date = new Date();
        period1Date.setMonth(period1Date.getMonth() - 2); 
        const result = await yahooFinance.chart(symbol, {
            period1: Math.floor(period1Date.getTime() / 1000),
            interval: '1d'
        });
        console.log(`Symbol: ${symbol}`);
        console.log(`Latest Quote:`, result.quotes[result.quotes.length - 1]);
        
        const quote = await yahooFinance.quote(symbol);
        console.log(`Regular Market Price:`, quote.regularMarketPrice);
    } catch (e) {
        console.error(e);
    }
}
test();
