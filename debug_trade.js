// Test script: debug demo-fapi connectivity step by step
const ccxt = require('ccxt');

const demoUrl = 'https://demo-fapi.binance.com';

// Read API key/secret from env or args
const apiKey    = process.argv[2] || '';
const apiSecret = process.argv[3] || '';

async function run() {
    // ── Test 1: Public time endpoint ──────────────────────────────────────────
    console.log('\n=== TEST 1: loadTimeDifference (public) ===');
    try {
        const pubEx = new ccxt.binance({ enableRateLimit: true, options: { defaultType: 'future' } });
        Object.assign(pubEx.urls.api, {
            fapiPublic:  demoUrl + '/fapi/v1',
            fapiPrivate: demoUrl + '/fapi/v1',
            fapiPublicV2:  demoUrl + '/fapi/v2',
            fapiPrivateV2: demoUrl + '/fapi/v2',
        });
        const diff = await pubEx.loadTimeDifference();
        console.log('loadTimeDifference OK, diff =', diff);
    } catch (e) {
        console.log('loadTimeDifference FAIL:', e.message);
    }

    // ── Test 2: loadMarkets (public) ──────────────────────────────────────────
    console.log('\n=== TEST 2: loadMarkets (public) ===');
    try {
        const pubEx2 = new ccxt.binance({ enableRateLimit: true, options: { defaultType: 'future' } });
        Object.assign(pubEx2.urls.api, { fapiPublic: demoUrl + '/fapi/v1' });
        const markets = await pubEx2.loadMarkets();
        const keys = Object.keys(markets).slice(0, 3);
        console.log('loadMarkets OK, sample:', keys);
    } catch (e) {
        console.log('loadMarkets FAIL:', e.message);
    }

    if (!apiKey) {
        console.log('\nNo API key provided — skipping auth tests. Run with: node debug_trade.js <apiKey> <apiSecret>');
        return;
    }

    // ── Test 3: Authenticated balance (V2) ───────────────────────────────────
    console.log('\n=== TEST 3: fapiPrivateV2GetBalance ===');
    try {
        const authEx = new ccxt.binance({ apiKey, secret: apiSecret, enableRateLimit: true, options: { defaultType: 'future', adjustForTimeDifference: true, recvWindow: 10000 } });
        Object.assign(authEx.urls.api, {
            fapiPublic:  demoUrl + '/fapi/v1',
            fapiPrivate: demoUrl + '/fapi/v1',
            fapiPublicV2:  demoUrl + '/fapi/v2',
            fapiPrivateV2: demoUrl + '/fapi/v2',
        });
        await authEx.loadTimeDifference();
        const bal = await authEx.fapiPrivateV2GetBalance();
        const usdt = bal.find(b => b.asset === 'USDT');
        console.log('fapiPrivateV2GetBalance OK, USDT balance:', usdt?.balance);
    } catch (e) {
        console.log('fapiPrivateV2GetBalance FAIL:', e.message);
    }

    // ── Test 4: Raw POST order (test order) ──────────────────────────────────
    console.log('\n=== TEST 4: fapiPrivatePostOrder BTCUSDT MARKET BUY (tiny qty) ===');
    try {
        const authEx2 = new ccxt.binance({ apiKey, secret: apiSecret, enableRateLimit: true, options: { defaultType: 'future', adjustForTimeDifference: true, recvWindow: 10000 } });
        Object.assign(authEx2.urls.api, {
            fapiPublic:  demoUrl + '/fapi/v1',
            fapiPrivate: demoUrl + '/fapi/v1',
            fapiPublicV2:  demoUrl + '/fapi/v2',
            fapiPrivateV2: demoUrl + '/fapi/v2',
        });
        await authEx2.loadTimeDifference();
        const order = await authEx2.fapiPrivatePostOrder({ symbol: 'BTCUSDT', side: 'BUY', type: 'MARKET', quantity: 0.001 });
        console.log('fapiPrivatePostOrder OK:', JSON.stringify(order).substring(0, 200));
    } catch (e) {
        console.log('fapiPrivatePostOrder FAIL:', e.message);
    }
}

run();
