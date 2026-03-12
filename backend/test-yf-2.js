const yf = require('yahoo-finance2').default;
console.log('Default Keys:', Object.keys(yf));
try {
    const yahooFinance = yf; // default IS the instance usually
    yahooFinance.quote('AAPL').then(q => console.log('Quote OK')).catch(e => console.log('Quote Error:', e.message));
} catch (e) {
    console.log('Error:', e.message);
}
