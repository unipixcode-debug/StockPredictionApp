const https = require('https');
const fs = require('fs');

const url = 'https://demo-fapi.binance.com/fapi/v1/exchangeInfo';

https.get(url, (res) => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
        try {
            const p = JSON.parse(data);
            const symbols = p.symbols.map(s => s.symbol).sort();
            fs.writeFileSync('demo_symbols.json', JSON.stringify(symbols, null, 2));
            console.log(`Saved ${symbols.length} symbols to demo_symbols.json`);
            
            const check = ['SOLVUSDT', 'ENAUSDT', 'TAUSDT', 'BTCUSDT', 'NOMUSDT', 'RIVERUSDT', 'KITEUSDT'];
            check.forEach(s => {
                console.log(`${s}: ${symbols.includes(s) ? 'EXISTS' : 'MISSING'}`);
            });
        } catch (e) {
            console.error('Error:', e.message);
        }
    });
}).on('error', (e) => {
    console.error('Network error:', e.message);
});
