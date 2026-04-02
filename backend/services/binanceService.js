const ccxt        = require('ccxt');
const crypto      = require('crypto');
const https       = require('https');
const querystring = require('querystring');
const { BinanceBotConfig, ExecutedTrade, User } = require('../models');

/**
 * Direct HTTPS POST to Binance Futures API (bypasses CCXT URL routing bugs for Demo Trading).
 * Works for both testnet (demo-fapi) and mainnet (fapi).
 */
function rawFuturesOrder(apiKey, apiSecret, params, isTestnet = true, timeOffset = 0) {
    return new Promise((resolve, reject) => {
        const hostname = isTestnet ? 'demo-fapi.binance.com' : 'fapi.binance.com';
        const path     = '/fapi/v1/order';

        // Synchronize with server time using CCXT's calculated offset
        const timestamp = Date.now() + timeOffset;
        const body      = querystring.stringify({ ...params, timestamp, recvWindow: 10000 });
        const signature = crypto.createHmac('sha256', apiSecret).update(body).digest('hex');
        const fullBody  = body + '&signature=' + signature;

        const options = {
            hostname,
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
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.code && parsed.code < 0) {
                        reject(new Error(`binance ${JSON.stringify(parsed)}`));
                    } else {
                        resolve(parsed);
                    }
                } catch {
                    reject(new Error('Invalid JSON: ' + data));
                }
            });
        });
        req.on('error', reject);
        req.write(fullBody);
        req.end();
    });
}

/**
 * Direct HTTPS GET for balance (bypasses CCXT URL routing)
 */
function rawFuturesBalance(apiKey, apiSecret, isTestnet = true, timeOffset = 0) {
    return new Promise((resolve, reject) => {
        const hostname = isTestnet ? 'demo-fapi.binance.com' : 'fapi.binance.com';
        console.log(`[Binance] Raw Balance check for ${hostname} (Key prefix: ${apiKey?.substring(0, 4)})`);
        const timestamp = Date.now() + timeOffset;
        const query = querystring.stringify({ timestamp, recvWindow: 10000 });
        const signature = crypto.createHmac('sha256', apiSecret).update(query).digest('hex');
        const path = `/fapi/v2/account?${query}&signature=${signature}`;

        https.get({
            hostname,
            path,
            headers: { 'X-MBX-APIKEY': apiKey }
        }, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.assets) {
                        const usdtAsset = parsed.assets.find(a => a.asset === 'USDT');
                        resolve({ free: parseFloat(usdtAsset?.availableBalance || 0), total: parseFloat(usdtAsset?.walletBalance || 0) });
                    } else if (parsed.code) {
                        reject(new Error(`binance balance ${JSON.stringify(parsed)}`));
                    } else {
                        reject(new Error('Invalid balance response'));
                    }
                } catch { reject(new Error('Invalid JSON: ' + data)); }
            });
        }).on('error', reject);
    });
}

/**
 * Direct HTTPS POST for leverage
 */
function rawFuturesLeverage(apiKey, apiSecret, params, isTestnet = true, timeOffset = 0) {
    return new Promise((resolve, reject) => {
        const hostname = isTestnet ? 'demo-fapi.binance.com' : 'fapi.binance.com';
        const timestamp = Date.now() + timeOffset;
        const body = querystring.stringify({ ...params, timestamp, recvWindow: 10000 });
        const signature = crypto.createHmac('sha256', apiSecret).update(body).digest('hex');
        const fullBody = body + '&signature=' + signature;

        const req = https.request({
            hostname,
            path: '/fapi/v1/leverage',
            method: 'POST',
            headers: {
                'X-MBX-APIKEY': apiKey,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(fullBody),
            }
        }, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.code && parsed.code < 0) reject(new Error(`binance leverage ${JSON.stringify(parsed)}`));
                    else resolve(parsed);
                } catch { reject(new Error('Invalid JSON: ' + data)); }
            });
        });
        req.on('error', reject);
        req.write(fullBody);
        req.end();
    });
}

/**
 * Direct HTTPS GET for server time (public)
 */
function rawFuturesTime(isTestnet = true) {
    return new Promise((resolve, reject) => {
        const hostname = isTestnet ? 'demo-fapi.binance.com' : 'fapi.binance.com';
        https.get(`https://${hostname}/fapi/v1/time`, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed.serverTime);
                } catch { reject(new Error('Invalid JSON from time API')); }
            });
        }).on('error', reject);
    });
}

/**
 * Direct HTTPS GET for exchangeInfo (public)
 */
function rawFuturesMarkets(isTestnet = true) {
    return new Promise((resolve, reject) => {
        const hostname = isTestnet ? 'demo-fapi.binance.com' : 'fapi.binance.com';
        https.get(`https://${hostname}/fapi/v1/exchangeInfo`, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    const marketMap = {};
                    parsed.symbols.forEach(s => {
                        const symbol = s.symbol; // e.g., 'BTCUSDT'
                        marketMap[symbol] = {
                            precision: { amount: s.quantityPrecision, price: s.pricePrecision },
                            filters: s.filters
                        };
                    });
                    resolve(marketMap);
                } catch { reject(new Error('Invalid JSON from exchangeInfo')); }
            });
        }).on('error', reject);
    });
}

// ── Demo-fapi symbol cache ────────────────────────────────────────────────────
// CCXT loadMarkets() ignores URL overrides → fetches mainnet symbols.
// We cache demo-fapi's own exchangeInfo via raw HTTPS to validate symbols correctly.
let _demoSymbolCache = null;
let _demoSymbolCacheTime = 0;
const DEMO_CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCachedDemoSymbols() {
    if (_demoSymbolCache && Date.now() - _demoSymbolCacheTime < DEMO_CACHE_TTL) {
        return Promise.resolve(_demoSymbolCache);
    }
    return new Promise((resolve) => {
        const req = https.request({
            hostname: 'demo-fapi.binance.com',
            port: 443,
            path: '/fapi/v1/exchangeInfo',
            method: 'GET',
        }, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    const symbols = new Set(parsed.symbols.map(s => s.symbol));
                    _demoSymbolCache = symbols;
                    _demoSymbolCacheTime = Date.now();
                    console.log(`[Binance] demo-fapi cache: ${symbols.size} available symbols.`);
                    resolve(symbols);
                } catch (err) {
                    // Comprehensive Whitelist Fallback (Top 20 most liquid USDS-M Perpetual/Testnet pairs)
                    resolve(new Set([
                        'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
                        'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT',
                        'POLUSDT', 'LTCUSDT', 'SHIBUSDT', 'NEARUSDT', 'TRXUSDT',
                        'PEPEUSDT', 'WIFUSDT', 'SUIUSDT', 'APTUSDT', 'FETUSDT'
                    ]));
                }
            });
        });
        req.on('error', () => resolve(new Set(['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'])));
        req.end();
    });
}

class BinanceService {
    /**
     * Initializes a ccxt binance instance for a user
     * @param {string} userId
     * @param {string} marketType - 'SPOT' or 'FUTURES'
     */
    async getExchangeInstance(userId, marketType = 'SPOT') {
        const config = await BinanceBotConfig.findOne({ where: { userId } });
        if (!config) throw new Error('BINANCE_NOT_CONFIGURED');

        let apiKey, apiSecret;
        if (marketType === 'FUTURES') {
            apiKey = config.futuresApiKey;
            apiSecret = config.futuresApiSecret;
            if (!apiKey || !apiSecret) throw new Error('BINANCE_FUTURES_API_NOT_CONFIGURED');
        } else {
            apiKey = config.apiKey;
            apiSecret = config.apiSecret;
            if (!apiKey || !apiSecret) throw new Error('BINANCE_SPOT_API_NOT_CONFIGURED');
        }

        // Trim keys to remove any accidental spaces/newlines which cause -2008 errors
        const trimmedKey = apiKey.trim();
        const trimmedSecret = apiSecret.trim();

        // Security-safe length log for debugging -2008 errors
        console.log(`[Binance] Instance created for ${marketType}. Key length: ${trimmedKey.length}, Secret length: ${trimmedSecret.length}`);

        const exchange = new ccxt.binance({
            apiKey: trimmedKey,
            secret: trimmedSecret,
            enableRateLimit: true,
            options: {
                defaultType: marketType === 'FUTURES' ? 'future' : 'spot',
            }
        });

        if (config.isTestnet) {
            if (marketType === 'FUTURES') {
                // IMPORTANT: Binance modern Demo Trading (v2) configuration
                const demoUrl = 'https://demo-fapi.binance.com';
                
                // Comprehensive manual URL map for Demo Trading (to avoid CCXT internal errors)
                exchange.urls['api'] = {
                    ...exchange.urls['api'],
                    'fapiPublic': `${demoUrl}/fapi/v1`,
                    'fapiPrivate': `${demoUrl}/fapi/v1`,
                    'fapiPublicV2': `${demoUrl}/fapi/v2`,
                    'fapiPrivateV2': `${demoUrl}/fapi/v2`,
                    'fapiUser': `${demoUrl}/fapi/v1`,
                    'public': `${demoUrl}/fapi/v1`,
                    'private': `${demoUrl}/fapi/v1`
                };
                
                // Critical options for Demo Trading authentication
                exchange.options['adjustForTimeDifference'] = true;
                exchange.options['recvWindow'] = 10000;
            } else {
                // Standard sandbox mode still works fine for Spot
                exchange.setSandboxMode(true);
            }
        }

        return { exchange, config };
    }

    /**
     * Tests connection for given userId and market
     */
    async testConnection(userId, marketType = 'SPOT') {
        try {
            const { exchange } = await this.getExchangeInstance(userId, marketType);
            
            // Explicitly sync time with Binance server to avoid signature/-2008 errors
            // (Uses /fapi/v1/time as suggested by the user's documentation)
            await exchange.loadTimeDifference();
            
            let freeUSDT = 0;
            let totalUSDT = 0;

            if (marketType === 'FUTURES') {
                // IMPORTANT: Upgraded to V2 as V1 returned -5000 (Method GET invalid) on Demo
                const balanceArray = await exchange.fapiPrivateV2GetBalance();
                const usdtBalance = balanceArray.find(b => b.asset === 'USDT');
                freeUSDT = parseFloat(usdtBalance?.withdrawAvailable || usdtBalance?.balance || 0);
                totalUSDT = parseFloat(usdtBalance?.balance || usdtBalance?.marginBalance || 0);
            } else {
                const balance = await exchange.fetchBalance();
                freeUSDT = balance['USDT']?.free || 0;
                totalUSDT = balance['USDT']?.total || 0;
            }

            const currentUrl = exchange.urls.api.fapiPublic || exchange.urls.api.public;
            const isTestnetEnv = currentUrl.includes('testnet') || currentUrl.includes('demo-fapi');

            return {
                success: true,
                freeUSDT,
                totalUSDT,
                testnet: isTestnetEnv,
                marketType
            };
        } catch (error) {
            let errorMsg = error.message;
            if (errorMsg.includes('-2008') || errorMsg.includes('Invalid API-key ID')) {
                errorMsg = 'Hata (-2008): API Anahtarı geçersiz. Lütfen girdiğiniz anahtarların doğruluğunu ve "Testnet Modu" şalterinin anahtarlarla uyumlu (Spot Testnet & Mock Trading -> Açık, Mainnet/Real -> Kapalı) olduğunu kontrol edin.';
            } else if (error.message.includes('404')) {
                errorMsg = 'Hata (404): Binance sunucusuna bağlanılamadı. Lütfen "Testnet Modu" şalterinin anahtarlarınızla uyumlu olduğundan emin olun (Yenile düğmesine basıp deneyin).';
            }
            return { success: false, error: errorMsg, marketType };
        }
    }

    /**
     * Executes a trade based on AI Signal
     * @param {*} userId 
     * @param {Object} signal - { symbol: 'BTC-USD', direction: 'BUY'|'SELL', market: 'CRYPTO', type: 'SPOT'|'FUTURES' }
     */
    async executeTrade(userId, signal) {
        if (signal.market !== 'CRYPTO') return null;
        
        // Map symbol format: BTC-USD → BTC/USDT (spot) or BTC/USDT:USDT (futures perpetual)
        const baseSymbol = signal.symbol.replace('-USD', '') + '/USDT';
        const marketType = signal.type || 'SPOT';
        // Futures CCXT requires ':USDT' suffix for USDT-margined perpetuals
        const pair = marketType === 'FUTURES' ? baseSymbol + ':USDT' : baseSymbol;
        const side = signal.direction === 'BUY' ? 'buy' : 'sell';

        try {
            const { exchange, config } = await this.getExchangeInstance(userId, marketType);
            const apiKey    = (marketType === 'FUTURES' ? config.futuresApiKey    : config.apiKey)?.trim();
            const apiSecret = (marketType === 'FUTURES' ? config.futuresApiSecret : config.apiSecret)?.trim();
            const isTestnet = !!config.isTestnet;

            if (marketType === 'SPOT' && !config.isSpotActive) return null;
            if (marketType === 'FUTURES' && !config.isFuturesActive) return null;

            // ── Step 1: Sync Environment & Markets ────────────────────────────────────
            let timeOffset = 0;
            let marketInfo = null;

            if (marketType === 'FUTURES') {
                try {
                    const serverTime = await rawFuturesTime(isTestnet);
                    timeOffset = serverTime - Date.now();
                    const rawMarkets = await rawFuturesMarkets(isTestnet);
                    const apiSymbol = pair.split('/')[0] + 'USDT';
                    marketInfo = rawMarkets[apiSymbol];
                    if (!marketInfo) throw new Error(`SYMBOL_NOT_FOUND_ON_ENGINE: ${apiSymbol} not in exchangeInfo.`);
                } catch (rErr) {
                    console.warn(`[Binance] Futures raw sync failed:`, rErr.message);
                }
            } else {
                await exchange.loadMarkets();
                if (!exchange.markets[pair]) {
                    throw new Error(`SYMBOL_NOT_AVAILABLE: ${pair} not in spot exchange.`);
                }
            }

            // ── Step 2: Fetch Balance & Budget ────────────────────────────────────────
            let freeUSDT = 0;
            if (marketType === 'FUTURES') {
                const stats = await rawFuturesBalance(apiKey, apiSecret, isTestnet, timeOffset);
                freeUSDT = stats.free;
            } else {
                const balance = await exchange.fetchBalance();
                freeUSDT = balance['USDT']?.free || 0;
            }

            let tradeAmountUSDT = config.budgetMode === 'PERCENTAGE' 
                ? (freeUSDT * config.budgetAmount) / 100
                : config.budgetAmount;

            tradeAmountUSDT = Math.min(tradeAmountUSDT, config.maxPerAsset || 1000);
            if (tradeAmountUSDT < 5) throw new Error('INSUFFICIENT_BALANCE_FOR_MIN_ORDER');

            let currentPrice = signal.currentPrice;
            if (!currentPrice) {
                try {
                    const t = await exchange.fetchTicker(pair);
                    currentPrice = t.last;
                } catch { currentPrice = 0; }
            }
            if (!currentPrice || currentPrice <= 0) throw new Error('COULD_NOT_FETCH_PRICE');

            const leverage = config.defaultLeverage || 1;
            const amount = (tradeAmountUSDT * leverage) / currentPrice;

            // ── Step 3: Check Limits ──────────────────────────────────────────────────
            const openNow = await ExecutedTrade.count({ where: { userId, status: 'OPEN' } });
            if (openNow >= config.maxPositions) throw new Error('MAX_POSITIONS_REACHED');

            // ── Step 4: Execute Trade ─────────────────────────────────────────────────
            console.log(`[Binance] Executing ${marketType} trade for key prefix: ${apiKey?.substring(0, 4)} (isTestnet: ${isTestnet})`);

            const tradeRecord = await ExecutedTrade.create({
                userId, symbol: pair, side: signal.direction, type: marketType, amount, status: 'OPEN'
            });

            try {
                let order;
                const apiSymbol = pair.split('/')[0] + 'USDT';

                if (marketType === 'FUTURES') {
                    if (leverage > 1) {
                        try {
                            await rawFuturesLeverage(apiKey, apiSecret, { symbol: apiSymbol, leverage }, isTestnet, timeOffset);
                        } catch (lErr) { console.warn(`[Binance] Leverage set failed:`, lErr.message); }
                    }

                    const precision = marketInfo?.precision?.amount ?? 3;
                    const rawQty = parseFloat(amount.toFixed(precision));

                    console.log(`[Binance] Raw Order → ${apiSymbol} ${side.toUpperCase()} qty:${rawQty} testnet:${isTestnet}`);
                    order = await rawFuturesOrder(
                        apiKey, apiSecret,
                        { symbol: apiSymbol, side: side.toUpperCase(), type: 'MARKET', quantity: rawQty },
                        isTestnet,
                        timeOffset
                    );
                } else {
                    order = await exchange.createMarketOrder(pair, side, amount);
                }

                tradeRecord.exchangeOrderId = order.orderId || order.id;
                tradeRecord.entryPrice = order.avgPrice || order.price || order.average || currentPrice;
                await tradeRecord.save();

                // ── Step 5: Stop-Loss ─────────────────────────────────────────────────
                if (signal.stopLossPct && marketType === 'FUTURES') {
                    try {
                        const ep = parseFloat(tradeRecord.entryPrice) || currentPrice;
                        const slPrice = side === 'buy' ? ep * (1 - signal.stopLossPct) : ep * (1 + signal.stopLossPct);
                        
                        await rawFuturesOrder(apiKey, apiSecret, {
                            symbol: apiSymbol,
                            side: side === 'buy' ? 'SELL' : 'BUY',
                            type: 'STOP_MARKET',
                            stopPrice: slPrice.toFixed(4),
                            closePosition: 'true'
                        }, isTestnet, timeOffset);
                        console.log(`[Binance] SL placed at ${slPrice.toFixed(4)} for ${apiSymbol}`);
                    } catch (slErr) { console.warn(`[Binance] SL failed:`, slErr.message); }
                }

                return tradeRecord;

            } catch (exchangeError) {
                tradeRecord.status = 'FAILED';
                tradeRecord.errorMessage = exchangeError.message;
                await tradeRecord.save();
                throw exchangeError;
            }

        } catch (error) {
            console.error(`Binance bot error for user ${userId} (${marketType}):`, error.message);
            throw error;
        }
    }
}

module.exports = new BinanceService();
