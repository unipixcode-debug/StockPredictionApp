const yf = require('yahoo-finance2');
console.log('Keys:', Object.keys(yf));
try {
    const { YahooFinance } = yf;
    const yahooFinance = new YahooFinance();
    console.log('Instance created');
    yahooFinance.quote('AAPL').then(q => console.log('Quote OK')).catch(e => console.log('Quote Error:', e.message));
} catch (e) {
    console.log('Error:', e.message);
}
