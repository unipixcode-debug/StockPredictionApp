require('dotenv').config();
const { BinanceBotConfig } = require('./models');
const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');
const ccxt = require('ccxt');

async function test_bot_logic() {
    const config = await BinanceBotConfig.findOne();
    if (!config) { console.log('No config'); return; }

    const apiKey = config.futuresApiKey.trim();
    const apiSecret = config.futuresApiSecret.trim();
    const isTestnet = !!config.isTestnet;

    console.log(`Testing with isTestnet=${isTestnet}, keyLen=${apiKey.length}`);

    // Get time offset like the bot does
    const ex = new ccxt.binance({ options: { defaultType: 'future' } });
    if (isTestnet) {
        const demoUrl = 'https://demo-fapi.binance.com';
        ex.urls['api'] = { ...ex.urls['api'], fapiPublic: demoUrl + '/fapi/v1', fapiPrivate: demoUrl + '/fapi/v1', fapiPublicV2: demoUrl + '/fapi/v2', fapiPrivateV2: demoUrl + '/fapi/v2' };
    }
    await ex.loadTimeDifference();
    const timeOffset = ex.options['timeDifference'] || 0;
    console.log(`Time Offset: ${timeOffset}`);

    // Emulate rawFuturesOrder
    const params = { symbol: 'BTCUSDT', side: 'BUY', type: 'MARKET', quantity: 0.001 };
    const hostname = isTestnet ? 'demo-fapi.binance.com' : 'fapi.binance.com';
    const timestamp = Date.now() + timeOffset;
    const body = querystring.stringify({ ...params, timestamp, recvWindow: 10000 });
    const signature = crypto.createHmac('sha256', apiSecret).update(body).digest('hex');
    const fullBody = body + '&signature=' + signature;

    const opt = {
        hostname,
        port: 443,
        path: '/fapi/v1/order',
        method: 'POST',
        headers: {
            'X-MBX-APIKEY': apiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(fullBody),
        }
    };

    const req = https.request(opt, res => {
        let d = '';
        res.on('data', chunk => d += chunk);
        res.on('end', () => {
            console.log(`HTTP ${res.statusCode}`);
            console.log('Response:', d);
        });
    });
    req.write(fullBody);
    req.end();
}

test_bot_logic();
