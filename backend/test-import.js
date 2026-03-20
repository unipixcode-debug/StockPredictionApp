const yf = require('yahoo-finance2');
console.log('--- Yahoo Finance Import Test ---');
console.log('Type of require:', typeof yf);
if (yf.default) {
    console.log('Found .default property');
    console.log('Type of .default:', typeof yf.default);
    console.log('Type of .default.quote:', typeof yf.default.quote);
    console.log('Type of .default.search:', typeof yf.default.search);
} else {
    console.log('No .default property found');
}
console.log('Type of base.quote:', typeof yf.quote);
console.log('Type of base.search:', typeof yf.search);
console.log('--- End Test ---');
