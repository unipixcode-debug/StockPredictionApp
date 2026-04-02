const ccxt        = require('ccxt');
const crypto      = require('crypto');
const https       = require('https');
const querystring = require('querystring');
const { BinanceBotConfig, ExecutedTrade, User } = require('../models');
const marketDataService = require('./marketDataService');

/**
 * Direct HTTPS POST to Binance Futures API (bypasses CCXT URL routing bugs for Demo Trading).
 * Works for both testnet (demo-fapi) and mainnet (fapi).
 */
function rawFuturesOrder(apiKey, apiSecret, params, isTestnet = true) {
    return new Promise((resolve, reject) => {
        const hostname = isTestnet ? 'demo-fapi.binance.com' : 'fapi.binance.com';
        const path     = '/fapi/v1/order';

        if (params.symbol) params.symbol = params.symbol.toUpperCase();
        const timestamp = Date.now();
        const body      = querystring.stringify({ ...params, timestamp, recvWindow: 60000 });
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
function rawFuturesBalance(apiKey, apiSecret, isTestnet = true) {
    return new Promise((resolve, reject) => {
        const hostname = isTestnet ? 'demo-fapi.binance.com' : 'fapi.binance.com';
        const timestamp = Date.now();
        const query = querystring.stringify({ timestamp, recvWindow: 60000 });
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
function rawFuturesLeverage(apiKey, apiSecret, params, isTestnet = true) {
    return new Promise((resolve, reject) => {
        const hostname = isTestnet ? 'demo-fapi.binance.com' : 'fapi.binance.com';
        if (params.symbol) params.symbol = params.symbol.toUpperCase();
        const timestamp = Date.now();
        const body = querystring.stringify({ ...params, timestamp, recvWindow: 60000 });
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
 * Fetches OHLCV directly via public HTTPS (Unauthenticated)
 */
function rawFuturesPublicOHLCV(symbol, timeframe = '5m', limit = 30, isTestnet = true) {
    return new Promise((resolve, reject) => {
        const hostname = isTestnet ? 'demo-fapi.binance.com' : 'fapi.binance.com';
        const url = `https://${hostname}/fapi/v1/klines?symbol=${symbol.toUpperCase()}&interval=${timeframe}&limit=${limit}`;
        https.get(url, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.code) reject(new Error(`binance ${data}`));
                    else resolve(parsed.map(c => [
                        c[0], // open time
                        parseFloat(c[1]), // open
                        parseFloat(c[2]), // high
                        parseFloat(c[3]), // low
                        parseFloat(c[4]), // close
                        parseFloat(c[5])  // volume
                    ]));
                } catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

/**
 * Fetches current price directly via public HTTPS (Unauthenticated)
 */
function rawFuturesPublicTickers(isTestnet = true, symbol = null) {
    return new Promise((resolve, reject) => {
        const hostname = isTestnet ? 'demo-fapi.binance.com' : 'fapi.binance.com';
        const url = `https://${hostname}/fapi/v1/ticker/price` + (symbol ? `?symbol=${symbol.toUpperCase()}` : '');
        https.get(url, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.code) reject(new Error(`binance ${data}`));
                    else {
                        const priceMap = {};
                        if (Array.isArray(parsed)) {
                            parsed.forEach(t => { priceMap[t.symbol] = parseFloat(t.price); });
                        } else {
                            priceMap[parsed.symbol] = parseFloat(parsed.price);
                        }
                        resolve(priceMap);
                    }
                } catch (e) { reject(e); }
            });
        }).on('error', reject);
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

class BinanceService {
    constructor() {
        this.activeProcessing = new Set();
    }

    async getExchangeInstance(userId, marketType = 'SPOT') {
        if (!userId) {
            const publicEx = new ccxt.binance({
                apiKey: null,
                secret: null,
                options: { defaultType: marketType === 'FUTURES' ? 'future' : 'spot' }
            });
            if (marketType === 'FUTURES') {
                publicEx.urls['api'] = { ...publicEx.urls['api'], 'fapiPublic': 'https://demo-fapi.binance.com/fapi/v1' };
                publicEx.setSandboxMode(true);
            }
            return { exchange: publicEx, config: { isTestnet: true } };
        }

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

        const exchange = new ccxt.binance({
            apiKey: apiKey.trim(),
            secret: apiSecret.trim(),
            enableRateLimit: true,
            options: { defaultType: marketType === 'FUTURES' ? 'future' : 'spot' }
        });

        if (config.isTestnet) {
            if (marketType === 'FUTURES') {
                const demoUrl = 'https://demo-fapi.binance.com';
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
                exchange.options['adjustForTimeDifference'] = true;
                exchange.options['recvWindow'] = 10000;
            } else {
                exchange.setSandboxMode(true);
            }
        }

        return { exchange, config };
    }

    async testConnection(userId, marketType = 'SPOT') {
        try {
            const { exchange } = await this.getExchangeInstance(userId, marketType);
            await exchange.loadTimeDifference();
            
            let freeUSDT = 0;
            let totalUSDT = 0;

            if (marketType === 'FUTURES') {
                const balanceArray = await exchange.fapiPrivateV2GetBalance();
                const usdtBalance = balanceArray.find(b => b.asset === 'USDT');
                freeUSDT = parseFloat(usdtBalance?.withdrawAvailable || usdtBalance?.balance || 0);
                totalUSDT = parseFloat(usdtBalance?.balance || usdtBalance?.marginBalance || 0);
            } else {
                const balance = await exchange.fetchBalance();
                freeUSDT = balance['USDT']?.free || 0;
                totalUSDT = balance['USDT']?.total || 0;
            }
            return { success: true, freeUSDT, totalUSDT, testnet: true, marketType };
        } catch (error) {
            return { success: false, error: error.message, marketType };
        }
    }

    async executeTrade(userId, signal) {
        if (signal.market !== 'CRYPTO') return null;
        
        const baseSymbol = signal.symbol.replace('-USD', '') + '/USDT';
        const marketType = signal.type || 'SPOT';
        const pair = marketType === 'FUTURES' ? baseSymbol + ':USDT' : baseSymbol;
        const side = signal.direction === 'BUY' ? 'buy' : 'sell';

        const lockKey = `${userId}_${pair}`;
        if (this.activeProcessing.has(lockKey)) {
            console.warn(`[Binance] Already processing ${lockKey}.`);
            return null;
        }
        this.activeProcessing.add(lockKey);

        try {
            const { exchange, config } = await this.getExchangeInstance(userId, marketType);
            const apiKey    = (marketType === 'FUTURES' ? config.futuresApiKey    : config.apiKey)?.trim();
            const apiSecret = (marketType === 'FUTURES' ? config.futuresApiSecret : config.apiSecret)?.trim();
            const isTestnet = !!config.isTestnet;

            // Final Guard: Check DB for existing open trade
            const existing = await ExecutedTrade.findOne({ where: { userId, symbol: pair, status: 'OPEN' } });
            if (existing) {
                console.warn(`[Binance] ${pair} already has open trade.`);
                this.activeProcessing.delete(lockKey);
                return null;
            }

            // Fetch Market Info & Price
            const currentPrice = await marketDataService.fetchPrice(pair);
            if (!currentPrice || currentPrice <= 0) throw new Error('COULD_NOT_FETCH_PRICE');

            // Budget
            let freeUSDT = 0;
            if (marketType === 'FUTURES') {
                const stats = await rawFuturesBalance(apiKey, apiSecret, isTestnet);
                freeUSDT = stats.free;
            } else {
                const balance = await exchange.fetchBalance();
                freeUSDT = balance['USDT']?.free || 0;
            }
            let tradeAmountUSDT = config.budgetMode === 'PERCENTAGE' ? (freeUSDT * config.budgetAmount) / 100 : config.budgetAmount;
            tradeAmountUSDT = Math.min(tradeAmountUSDT, config.maxPerAsset || 1000);
            if (tradeAmountUSDT < 5) throw new Error('INSUFFICIENT_BALANCE');

            const leverage = config.defaultLeverage || 1;
            const notional = tradeAmountUSDT * leverage;
            const amountValue = notional / currentPrice;

            // Execute
            console.log(`[Binance] Executing ${marketType} for ${pair}`);
            let order;
            const apiSymbol = pair.split('/')[0].split('-')[0].split(':')[0].toUpperCase() + 'USDT';

            if (marketType === 'FUTURES') {
                if (leverage > 1) {
                    await rawFuturesLeverage(apiKey, apiSecret, { symbol: apiSymbol, leverage }, isTestnet);
                }
                const rawQty = parseFloat(amountValue.toFixed(3));
                order = await rawFuturesOrder(apiKey, apiSecret, { symbol: apiSymbol, side: side.toUpperCase(), type: 'MARKET', quantity: rawQty }, isTestnet);
            } else {
                order = await exchange.createMarketOrder(pair, side, amountValue);
            }

            const entryPrice = parseFloat(order.avgPrice || order.price || order.average || 0) || currentPrice;
            
            const newTrade = await ExecutedTrade.create({
                userId, symbol: pair, side: signal.direction, type: marketType, amount: amountValue, entryPrice, status: 'OPEN', exchangeOrderId: order.orderId || order.id || 'N/A'
            });

            // SL/TP for Futures
            if (marketType === 'FUTURES') {
                const ep = parseFloat(newTrade.entryPrice);
                const slPct = signal.stopLossPct || 0.02;
                newTrade.stopLossPrice = side === 'buy' ? ep * (1 - slPct) : ep * (1 + slPct);
                newTrade.targetPrice = side === 'buy' ? ep * (1 + (slPct * 1.5)) : ep * (1 - (slPct * 1.5));
                try {
                    await rawFuturesOrder(apiKey, apiSecret, { symbol: apiSymbol, side: side === 'buy' ? 'SELL' : 'BUY', type: 'STOP_MARKET', stopPrice: newTrade.stopLossPrice.toFixed(4), closePosition: 'true' }, isTestnet);
                } catch (slErr) { console.warn('SL Failed:', slErr.message); }
                await newTrade.save();
            }

            this.activeProcessing.delete(lockKey);
            return newTrade;

        } catch (error) {
            this.activeProcessing.delete(lockKey);
            console.error('Binance Bot Error:', error.message);
            throw error;
        }
    }
}

const service = new BinanceService();
service.rawFuturesOrder = rawFuturesOrder;
service.rawFuturesBalance = rawFuturesBalance;
service.rawFuturesLeverage = rawFuturesLeverage;
service.rawFuturesPublicOHLCV = rawFuturesPublicOHLCV;
service.rawFuturesPublicTickers = rawFuturesPublicTickers;
service.rawFuturesTime = rawFuturesTime;
service.rawFuturesMarkets = rawFuturesMarkets;

module.exports = service;
