const YahooFinance = require('yahoo-finance2').default;
try {
    const yahooFinance = new YahooFinance();
    console.log('Successfully created instance with new YahooFinance()');
    yahooFinance.quote('AAPL').then(q => {
        console.log('Quote fetched successfully:', q.regularMarketPrice);
        process.exit(0);
    }).catch(e => {
        console.error('Quote error:', e.message);
        process.exit(1);
    });
} catch (e) {
    console.error('Instantiation error:', e.message);
}
