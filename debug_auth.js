// Debug auth test: reads keys from DB, tests order placement
require('dotenv').config();
const { BinanceBotConfig } = require('./models');
const ccxt = require('ccxt');
const crypto = require('crypto');
const https  = require('https');
const querystring = require('querystring');

const demoUrl = 'https://demo-fapi.binance.com';

// Direct HTTPS POST — zero CCXT, zero abstraction
function rawPost(path, qs, apiKey, apiSecret) {
    return new Promise((resolve, reject) => {
        const timestamp = Date.now();
        const params = { ...qs, timestamp };
        const body    = querystring.stringify(params);
        const sig     = crypto.createHmac('sha256', apiSecret).update(body).digest('hex');
        const fullBody = body + '&signature=' + sig;

        const options = {
            hostname: 'demo-fapi.binance.com',
            port: 443,
            path,
            method: 'POST',
            headers: {
                'X-MBX-APIKEY': apiKey,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(fullBody),
            },
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        req.write(fullBody);
        req.end();
    });
}

async function run() {
    const config = await BinanceBotConfig.findOne({ order: [['createdAt','DESC']] });
    if (!config || !config.futuresApiKey) {
        console.log('No futures config found in DB');
        process.exit(1);
    }
    const apiKey    = config.futuresApiKey.trim();
    const apiSecret = config.futuresApiSecret.trim();
    console.log('Key length:', apiKey.length, '| Secret length:', apiSecret.length);

    // Test 3: V2 balance (should work based on testConnection)
    console.log('\n=== TEST 3: CCXT fapiPrivateV2GetBalance ===');
    try {
        const ex = new ccxt.binance({ apiKey, secret: apiSecret, enableRateLimit: true, options: { defaultType: 'future', adjustForTimeDifference: true } });
        Object.assign(ex.urls.api, {
            fapiPublic: demoUrl+'/fapi/v1', fapiPrivate: demoUrl+'/fapi/v1',
            fapiPublicV2: demoUrl+'/fapi/v2', fapiPrivateV2: demoUrl+'/fapi/v2',
        });
        await ex.loadTimeDifference();
        const bal = await ex.fapiPrivateV2GetBalance();
        const usdt = bal.find(b => b.asset === 'USDT');
        console.log('OK — USDT:', usdt?.balance);
    } catch(e) { console.log('FAIL:', e.message); }

    // Test 4: Raw HTTPS POST to demo-fapi (no CCXT at all)
    console.log('\n=== TEST 4: Raw HTTPS POST /fapi/v1/order (BTCUSDT MARKET BUY 0.001) ===');
    try {
        const res = await rawPost('/fapi/v1/order', { symbol: 'BTCUSDT', side: 'BUY', type: 'MARKET', quantity: '0.001' }, apiKey, apiSecret);
        console.log('HTTP', res.status, '→', JSON.stringify(res.body).substring(0, 300));
    } catch(e) { console.log('FAIL:', e.message); }

    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
