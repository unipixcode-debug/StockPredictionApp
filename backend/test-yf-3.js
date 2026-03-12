const yf = require('yahoo-finance2');
console.log('Keys:', Object.keys(yf));
// If keys are [default], maybe the classes are in the default?
console.log('Default Keys:', Object.keys(yf.default || {}));
const YahooFinance = yf.YahooFinance || yf.default?.YahooFinance;
if (YahooFinance) {
    const instance = new YahooFinance();
    console.log('Instance OK');
} else {
    console.log('YahooFinance not found in exports');
}
