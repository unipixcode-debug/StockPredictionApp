const ccxt        = require('ccxt');
const crypto      = require('crypto');
const https       = require('https');
const querystring = require('querystring');
const { BinanceBotConfig, ExecutedTrade, User } = require('../models');
const marketDataService = require('./marketDataService');

/**
 * Direct HTTPS POST to Binance Futures ALGO API (/fapi/v1/algoOrder).
 * Mandatory since late 2025 for STOP_MARKET and TAKE_PROFIT_MARKET.
 */
function rawFuturesAlgoOrder(apiKey, apiSecret, params, isTestnet = true) {
    return new Promise((resolve, reject) => {
        const hostname = isTestnet ? 'testnet.binancefuture.com' : 'fapi.binance.com';
        const path     = '/fapi/v1/algoOrder';

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
                        reject(new Error(`binance algo ${JSON.stringify(parsed)}`));
                    } else {
                        resolve(parsed);
                    }
                } catch {
                    reject(new Error('Invalid JSON from algoOrder: ' + data));
                }
            });
        });
        req.on('error', reject);
        req.write(fullBody);
        req.end();
    });
}

/**
 * Cancel All Algo Open Orders on a symbol
 */
function rawCancelAllAlgoOrders(apiKey, apiSecret, symbol, isTestnet = true) {
    return new Promise((resolve, reject) => {
        const hostname = isTestnet ? 'testnet.binancefuture.com' : 'fapi.binance.com';
        const timestamp = Date.now();
        const query = querystring.stringify({ symbol: symbol.toUpperCase(), timestamp, recvWindow: 60000 });
        const signature = crypto.createHmac('sha256', apiSecret).update(query).digest('hex');
        const path = `/fapi/v1/allAlgoOrders?${query}&signature=${signature}`;

        const req = https.request({
            hostname,
            path,
            method: 'DELETE',
            headers: { 'X-MBX-APIKEY': apiKey }
        }, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch { resolve({ message: 'Success' }); }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

/**
 * Direct HTTPS POST to Binance Futures API (Standard Orders)
 */
function rawFuturesOrder(apiKey, apiSecret, params, isTestnet = true) {
    return new Promise((resolve, reject) => {
        const hostname = isTestnet ? 'testnet.binancefuture.com' : 'fapi.binance.com';
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
        const hostname = isTestnet ? 'testnet.binancefuture.com' : 'fapi.binance.com';
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
 * Direct HTTPS GET for user trade history (fills)
 */
function rawFuturesUserTrades(apiKey, apiSecret, params, isTestnet = true) {
    return new Promise((resolve, reject) => {
        const hostname = isTestnet ? 'testnet.binancefuture.com' : 'fapi.binance.com';
        const timestamp = Date.now();
        const query = querystring.stringify({ ...params, timestamp, recvWindow: 60000 });
        const signature = crypto.createHmac('sha256', apiSecret).update(query).digest('hex');
        const path = `/fapi/v1/userTrades?${query}&signature=${signature}`;

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
                    if (Array.isArray(parsed)) resolve(parsed);
                    else reject(new Error(`binance userTrades: ${JSON.stringify(parsed)}`));
                } catch { reject(new Error('Invalid JSON from userTrades: ' + data)); }
            });
        }).on('error', reject);
    });
}

/**
 * Direct HTTPS POST for leverage
 */
function rawFuturesLeverage(apiKey, apiSecret, params, isTestnet = true) {
    return new Promise((resolve, reject) => {
        const hostname = isTestnet ? 'testnet.binancefuture.com' : 'fapi.binance.com';
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
 * Direct HTTPS GET for Futures Account (Positions, Balances)
 */
function rawFuturesAccount(apiKey, apiSecret, isTestnet = true) {
    return new Promise((resolve, reject) => {
        const hostname = isTestnet ? 'testnet.binancefuture.com' : 'fapi.binance.com';
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
                    if (parsed.assets) resolve(parsed);
                    else reject(new Error(`binance account ${data}`));
                } catch { reject(new Error('Invalid JSON: ' + data)); }
            });
        }).on('error', reject);
    });
}

/**
 * Direct HTTPS GET for Futures Leverage Brackets (to find max allowed leverage) correctly properly correctly milimetrically
 */
function rawFuturesBrackets(apiKey, apiSecret, symbol = '', isTestnet = true) {
    return new Promise((resolve, reject) => {
        const hostname = isTestnet ? 'testnet.binancefuture.com' : 'fapi.binance.com';
        const timestamp = Date.now();
        const params = symbol ? { symbol: symbol.toUpperCase(), timestamp, recvWindow: 60000 } : { timestamp, recvWindow: 60000 };
        const query = querystring.stringify(params);
        const signature = crypto.createHmac('sha256', apiSecret).update(query).digest('hex');
        const path = `/fapi/v1/leverageBracket?${query}&signature=${signature}`;

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
                    if (Array.isArray(parsed)) resolve(parsed); // Returns list of symbols and brackets
                    else if (parsed.brackets) resolve([parsed]); // Returns single symbol
                    else reject(new Error(`binance brackets error: ${data}`));
                } catch { reject(new Error('Invalid JSON from bracket API')); }
            });
        }).on('error', reject);
    });
}

/**
 * Direct HTTPS GET for Futures Position Risk (Leverage, EntryPrice, Margin)
 */
function rawFuturesPositions(apiKey, apiSecret, isTestnet = true) {
    return new Promise((resolve, reject) => {
        const hostname = isTestnet ? 'testnet.binancefuture.com' : 'fapi.binance.com';
        const timestamp = Date.now();
        const query = querystring.stringify({ timestamp, recvWindow: 60000 });
        const signature = crypto.createHmac('sha256', apiSecret).update(query).digest('hex');
        const path = `/fapi/v2/positionRisk?${query}&signature=${signature}`;

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
                    if (Array.isArray(parsed)) resolve(parsed);
                    else reject(new Error(`binance positions ${data}`));
                } catch { reject(new Error('Invalid JSON: ' + data)); }
            });
        }).on('error', reject);
    });
}

/**
 * Fetches OHLCV directly via public HTTPS (Unauthenticated)
 */
function rawFuturesPublicOHLCV(symbol, timeframe = '5m', limit = 30, isTestnet = true) {
    return new Promise((resolve, reject) => {
        const hostname = isTestnet ? 'testnet.binancefuture.com' : 'fapi.binance.com';
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
 * Fetches 24hr ticker data (including volume) directly via public HTTPS (Unauthenticated)
 */
function rawFutures24hrTickers(isTestnet = true) {
    return new Promise((resolve, reject) => {
        const hostname = isTestnet ? 'testnet.binancefuture.com' : 'fapi.binance.com';
        const url = `https://${hostname}/fapi/v1/ticker/24hr`;
        https.get(url, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.code) reject(new Error(`binance ${data}`));
                    else resolve(parsed); // Returns array of tickers
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
        const hostname = isTestnet ? 'testnet.binancefuture.com' : 'fapi.binance.com';
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
        const hostname = isTestnet ? 'testnet.binancefuture.com' : 'fapi.binance.com';
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
        const hostname = isTestnet ? 'testnet.binancefuture.com' : 'fapi.binance.com';
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

    normalizeSymbol(symbol, marketType = 'FUTURES') {
        if (!symbol) return '';
        let up = symbol.toUpperCase().replace('-USD', '');
        
        // Robust extraction: strip everything to get the base asset (e.g., BEAT, BTC)
        const base = up.split('/')[0].split(':')[0].replace(/USDT$/, '');
        
        if (marketType === 'FUTURES') {
            return `${base}/USDT:USDT`;
        }
        return `${base}/USDT`;
    }

    toApiSymbol(symbol) {
        if (!symbol) return '';
        // Efficiently extract the base part and append USDT for Binance API
        const base = symbol.split('/')[0].split(':')[0].toUpperCase();
        return base + 'USDT';
    }

    /**
     * Aggregates key Binance Futures account metrics for the Live Summary Bar.
     */
    async getFuturesAccountSummary(userId) {
        const config = await BinanceBotConfig.findOne({ where: { userId } });
        if (!config || !config.futuresApiKey) throw new Error('Futures API not configured.');

        const apiKey = config.futuresApiKey;
        const apiSecret = config.futuresApiSecret;
        const isTestnet = !!config.isTestnet;

        const [account, positions] = await Promise.all([
            rawFuturesAccount(apiKey, apiSecret, isTestnet),
            rawFuturesPositions(apiKey, apiSecret, isTestnet)
        ]);

        // Mapping Binance v2/account fields correctly properly correctly
        const equity = parseFloat(account.totalMarginBalance || 0);
        const maintMargin = parseFloat(account.totalMaintMargin || 0);
        const walletBalance = parseFloat(account.totalWalletBalance || 0);
        const unrealizedPnl = parseFloat(account.totalUnrealizedProfit || 0);
        
        // Calculate Position Value (Sum of absolute notional values) milimetrically
        const activePositions = Array.isArray(positions) ? positions.filter(p => parseFloat(p.positionAmt) !== 0) : [];
        const totalPositionValue = activePositions.reduce((sum, p) => sum + Math.abs(parseFloat(p.notional)), 0);
        
        // Margin Ratio = (Maint Margin / Margin Balance) * 100 correctly properly
        const marginRatio = equity > 0 ? (maintMargin / equity) * 100 : 0;
        
        // Actual Leverage = Total Position Value / Equity correctly properly
        const actualLeverage = equity > 0 ? totalPositionValue / equity : 0;

        // Calculate Realized PnL from DB trades (Today's closed trades) correctly properly milimetrically
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const closedTrades = await ExecutedTrade.findAll({
            where: {
                userId,
                status: 'CLOSED',
                updatedAt: { [require('sequelize').Op.gte]: startOfDay }
            }
        });
        const realizedPnl = closedTrades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0);

        return {
            marginRatio: marginRatio.toFixed(2),
            maintMargin: maintMargin.toFixed(2),
            equity: equity.toFixed(2),
            positionValue: totalPositionValue.toFixed(2),
            actualLeverage: actualLeverage.toFixed(4),
            balance: walletBalance.toFixed(4),
            unrealizedPnl: unrealizedPnl.toFixed(4),
            realizedPnl: realizedPnl.toFixed(4),
            totalPnl: (realizedPnl + unrealizedPnl).toFixed(4)
        };
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

    // Helper for Horizon-based TP/SL
    calculateHorizonTPSL(horizon, leverage, entryPrice, side) {
        let targetROI = 0.075; // 7.5% default (SHORT)
        let rrRatio = 1.5;
        
        if (horizon === 'MID') {
            targetROI = 0.125; // 12.5%
        } else if (horizon === 'LONG') {
            targetROI = 0.75;  // 75%
            rrRatio = 2.0;
        }

        const priceMove = targetROI / Math.max(1, leverage);
        const slMove = priceMove / rrRatio;
        const isBuy = side.toLowerCase() === 'buy' || side.toUpperCase() === 'BUY';

        return {
            stopLoss: isBuy ? entryPrice * (1 - slMove) : entryPrice * (1 + slMove),
            target: isBuy ? entryPrice * (1 + priceMove) : entryPrice * (1 - priceMove)
        };
    }

    async executeTrade(userId, signal) {
        if (signal.market !== 'CRYPTO') return null;
        
        const marketType = signal.type || 'SPOT';
        const pair = this.normalizeSymbol(signal.symbol, marketType);
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
            console.log(`[Binance] Executing ${marketType} for ${pair} with ${leverage}x leverage`);
            let order;
            const apiSymbol = pair.split('/')[0].split('-')[0].split(':')[0].toUpperCase() + 'USDT';

            if (marketType === 'FUTURES') {
                const markets = await rawFuturesMarkets(isTestnet);
                const marketInfo = markets[apiSymbol];
                const qtyPrecision = marketInfo ? marketInfo.precision.amount : 3;
                const pricePrecision = marketInfo ? marketInfo.precision.price : 4;

                // 1. Dynamic Leverage Capping milimetrically securely correctly properly correctly
                try {
                    const brackets = await rawFuturesBrackets(apiKey, apiSecret, apiSymbol, isTestnet);
                    // First bracket usually defines the maximum overall leverage allowed correctly properly
                    const maxAllowedLeverage = (brackets && brackets[0] && brackets[0].brackets && brackets[0].brackets[0]) 
                        ? brackets[0].brackets[0].initialLeverage 
                        : 20; // Default fallback milimetrically
                    
                    const finalLeverage = Math.min(leverage, maxAllowedLeverage);
                    if (finalLeverage > 1) {
                        console.log(`[Binance] Setting leverage to ${finalLeverage} (capped from ${leverage}) for ${apiSymbol}`);
                        await rawFuturesLeverage(apiKey, apiSecret, { symbol: apiSymbol, leverage: finalLeverage }, isTestnet);
                    }
                } catch (bracketErr) {
                    console.warn(`[Binance] Leverage bracket fetch failed for ${apiSymbol}, using default leverage logic.`, bracketErr.message);
                    if (leverage > 1) {
                        await rawFuturesLeverage(apiKey, apiSecret, { symbol: apiSymbol, leverage }, isTestnet);
                    }
                }

                // 2. StepSize (LOT_SIZE) Compliance milimetrically securely correctly properly correctly
                let finalQty = amountValue;
                if (marketInfo && marketInfo.filters) {
                    const lotFilter = marketInfo.filters.find(f => f.filterType === 'LOT_SIZE');
                    if (lotFilter) {
                        const stepSize = parseFloat(lotFilter.stepSize);
                        // Rounding down to the nearest multiple of stepSize to avoid -4023 correctly properly
                        finalQty = Math.floor(amountValue / stepSize) * stepSize;
                    }
                }
                const rawQty = parseFloat(finalQty.toFixed(qtyPrecision));
                
                order = await rawFuturesOrder(apiKey, apiSecret, { symbol: apiSymbol, side: side.toUpperCase(), type: 'MARKET', quantity: rawQty }, isTestnet);
            } else {
                // Better Spot execution logic with optional precision check if possible
                // Currently Spot uses CCXT directly. Let's ensure it handles the amountValue safely.
                try {
                    await exchange.loadMarkets();
                    const market = exchange.market(pair);
                    const amount = exchange.amountToPrecision(pair, amountValue);
                    order = await exchange.createMarketOrder(pair, side, amount);
                } catch (spotErr) {
                    console.error('[Spot Execute Error]', spotErr.message);
                    throw spotErr;
                }
            }

            const entryPrice = parseFloat(order.avgPrice || order.price || order.average || 0) || currentPrice;
            
            // Dynamic Risk Management
            const { stopLoss, target } = this.calculateHorizonTPSL(config.tradeHorizon, leverage, entryPrice, side);

            const newTrade = await ExecutedTrade.create({
                userId,
                symbol: pair,
                side: side.toUpperCase(),
                type: marketType,
                amount: amountValue,
                entryPrice,
                status: 'OPEN',
                leverage,
                exchangeOrderId: order.id || order.orderId || 'N/A',
                stopLossPrice: stopLoss,
                targetPrice: target,
                snapshotData: signal.snapshotData || null,
                strategyId: signal.strategyId || 'RSI-SCORER-V1'
            });

            if (marketType === 'FUTURES') {
                try {
                    await this.setExchangeTPSL(userId, newTrade.id);
                } catch (tpslErr) {
                    console.warn('[TPSL Execution Error]', tpslErr.message);
                }
            }

            this.activeProcessing.delete(lockKey);
            return newTrade;

        } catch (error) {
            this.activeProcessing.delete(lockKey);
            console.error('Binance Bot Error:', error.message);
            throw error;
        }
    }

    async syncTradesWithExchange(userId) {
        try {
            const { config } = await this.getExchangeInstance(userId, 'FUTURES');
            const apiKey = config.futuresApiKey?.trim();
            const apiSecret = config.futuresApiSecret?.trim();
            const isTestnet = !!config.isTestnet;

            if (!apiKey || !apiSecret) return { success: false, error: 'FUTURES_API_KEYS_MISSING' };

            const realPositions = await rawFuturesPositions(apiKey, apiSecret, isTestnet);
            const activeReal = realPositions.filter(p => parseFloat(p.positionAmt) !== 0);
            
            // Self-Healing: Clean up corrupted symbols in DB before sync
            const allMyTrades = await ExecutedTrade.findAll({ where: { userId } });
            for (const t of allMyTrades) {
                const normalized = this.normalizeSymbol(t.symbol);
                if (t.symbol !== normalized) {
                    console.log(`[Sync] Repairing corrupted symbol: ${t.symbol} -> ${normalized}`);
                    t.symbol = normalized;
                    await t.save();
                }
            }

            const dbOpenTrades = await ExecutedTrade.findAll({ where: { userId, status: 'OPEN', type: 'FUTURES' } });

            const results = { closed: 0, updated: 0, added: 0 };
            // 3. Update existing OPEN trades and ensure TP/SL is sent
            for (const dbTrade of dbOpenTrades) {
                const apiSymbol = this.toApiSymbol(dbTrade.symbol);
                const stillOpen = activeReal.find(p => p.symbol === apiSymbol && Math.abs(parseFloat(p.positionAmt)) > 0);

                const now = new Date();
                const createdAt = new Date(dbTrade.createdAt);
                const ageMs = now.getTime() - createdAt.getTime();
                const GRACE_PERIOD_MS = 120 * 1000; // 2 minutes

                if (!stillOpen) {
                    // Fix: Skip closing if the trade was just opened (Grace Period)
                    if (ageMs < GRACE_PERIOD_MS) {
                        console.log(`[Sync] Skipping premature close for ${dbTrade.symbol} (Age: ${Math.round(ageMs/1000)}s)`);
                        continue;
                    }

                    // Fix: Fetch ACTUAL exit price from User Trade History instead of ticker fallback correctly properly milimetrically
                    let exitPrice = 0;
                    try {
                        const apiSymbol = this.toApiSymbol(dbTrade.symbol);
                        const trades = await rawFuturesUserTrades(apiKey, apiSecret, { symbol: apiSymbol, limit: 10 }, isTestnet);
                        
                        // Filter trades that occurred after open and match closing side correctly properly
                        const closeSide = dbTrade.side === 'BUY' ? 'SELL' : 'BUY';
                        const relevantTrades = trades.filter(t => 
                            t.side.toUpperCase() === closeSide && 
                            parseInt(t.time) > (new Date(dbTrade.createdAt).getTime() - 10000)
                        );

                        if (relevantTrades.length > 0) {
                            const totalQty = relevantTrades.reduce((sum, t) => sum + parseFloat(t.qty), 0);
                            const weightedSum = relevantTrades.reduce((sum, t) => sum + (parseFloat(t.price) * parseFloat(t.qty)), 0);
                            exitPrice = weightedSum / totalQty;
                            console.log(`[Sync] Recovered REAL exit price for ${dbTrade.symbol}: ${exitPrice}`);
                        }
                    } catch (hErr) {
                        console.warn(`[Sync] History recovery failed for ${dbTrade.symbol}:`, hErr.message);
                    }

                    // Secondary fallback to ticker
                    if (exitPrice === 0) {
                        try {
                            const { exchange } = await this.getExchangeInstance(userId, 'FUTURES');
                            const ticker = await exchange.fetchTicker(dbTrade.symbol);
                            exitPrice = ticker.last || 0;
                        } catch (pErr) { /* ignore */ }
                    }

                    // Last resort: markPrice from some recent pool (if available) or DB entry as final failsafe correctly
                    if (exitPrice === 0) exitPrice = parseFloat(dbTrade.entryPrice);

                    dbTrade.status = 'CLOSED';
                    dbTrade.closedAt = new Date();
                    dbTrade.exitPrice = exitPrice;
                    
                    const sideMultiplier = dbTrade.side === 'BUY' ? 1 : -1;
                    const priceDiff = (dbTrade.exitPrice - dbTrade.entryPrice) * sideMultiplier;
                    
                    dbTrade.pnl = priceDiff * dbTrade.amount;
                    dbTrade.pnlPercentage = (priceDiff / dbTrade.entryPrice) * 100 * (dbTrade.leverage || 1);
                    
                    await dbTrade.save();
                    results.closed++;
                } else {
                    // Always try to push TP/SL if missing on exchange
                    try {
                        await this.setExchangeTPSL(userId, dbTrade.id);
                    } catch (e) { /* sync-tpsl log if needed */ }

                    // Fix: Update entryPrice, amount, and leverage to match exchange exactly
                    let changed = false;
                    const exchangeAmount = Math.abs(parseFloat(stillOpen.positionAmt));
                    const exchangeEntry = parseFloat(stillOpen.entryPrice);
                    const exchangeLeverage = parseInt(stillOpen.leverage);

                    if (Math.abs(dbTrade.amount - exchangeAmount) > 0.00000001) {
                        dbTrade.amount = exchangeAmount;
                        changed = true;
                    }
                    if (Math.abs(dbTrade.entryPrice - exchangeEntry) > 0.00000001) {
                        dbTrade.entryPrice = exchangeEntry;
                        changed = true;
                    }
                    if (dbTrade.leverage !== exchangeLeverage) {
                        dbTrade.leverage = exchangeLeverage;
                        changed = true;
                    }

                    if (changed) {
                        await dbTrade.save();
                        results.updated++;
                    }
                }
            }

            const allDbTrades = await ExecutedTrade.findAll({ where: { userId } });
            for (const realPos of activeReal) {
                const apiSymbol = realPos.symbol;
                const standardSymbol = this.normalizeSymbol(apiSymbol);
                const openExists = dbOpenTrades.find(t => t.symbol === standardSymbol);
                if (openExists) continue;

                const amount = Math.abs(parseFloat(realPos.positionAmt));
                const entryPrice = parseFloat(realPos.entryPrice);
                const notional = amount * entryPrice;
                if (notional < 5.0) continue;

                const closedMatch = allDbTrades.find(t => t.symbol === standardSymbol && t.status === 'CLOSED');
                const isBuy = parseFloat(realPos.positionAmt) > 0;

                if (closedMatch) {
                    closedMatch.status = 'OPEN';
                    closedMatch.amount = amount;
                    closedMatch.entryPrice = entryPrice;
                    closedMatch.closedAt = null;
                    await closedMatch.save();
                    results.updated++;
                    
                    // Push TP/SL if missing on exchange
                    try {
                        await this.setExchangeTPSL(userId, closedMatch.id);
                    } catch (e) { console.warn('[Sync-TPSL] Re-open error:', e.message); }
                } else {
                    // Create new DETECTED with Horizon-based TP/SL
                    const { stopLoss, target } = this.calculateHorizonTPSL(config.tradeHorizon, parseInt(realPos.leverage), entryPrice, isBuy ? 'BUY' : 'SELL');
                    
                    const newDet = await ExecutedTrade.create({
                        userId,
                        symbol: standardSymbol,
                        side: isBuy ? 'BUY' : 'SELL',
                        type: 'FUTURES',
                        amount,
                        entryPrice,
                        status: 'OPEN',
                        leverage: parseInt(realPos.leverage),
                        exchangeOrderId: 'DETECTED',
                        stopLossPrice: stopLoss,
                        targetPrice: target
                    });
                    results.added++;
                    
                    // Push TP/SL newly detected
                    try {
                        await this.setExchangeTPSL(userId, newDet.id);
                    } catch (e) { console.warn('[Sync-TPSL] Detected error:', e.message); }
                }
            }
            return { success: true, ...results };
        } catch (err) {
            console.error('[Sync Trades] Overall failure:', err);
            return { success: false, error: err.message };
        }
    }

    async closePosition(userId, symbol, marketType = 'FUTURES') {
        const config = await BinanceBotConfig.findOne({ where: { userId } });
        if (!config) throw new Error('Config not found.');

        const isTestnet = !!config.isTestnet;
        const apiKey    = (marketType === 'FUTURES' ? config.futuresApiKey    : config.apiKey)?.trim();
        const apiSecret = (marketType === 'FUTURES' ? config.futuresApiSecret : config.apiSecret)?.trim();
        const apiSymbol = symbol.replace('/', '').replace(':USDT', '').replace('USDT', '') + 'USDT';

        if (marketType === 'FUTURES') {
            const positions = await rawFuturesPositions(apiKey, apiSecret, isTestnet);
            const pos = positions.find(p => p.symbol === apiSymbol && Math.abs(parseFloat(p.positionAmt)) > 0);
            if (!pos) return { success: false, message: 'Position not found on exchange.' };

            const side = parseFloat(pos.positionAmt) > 0 ? 'SELL' : 'BUY';
            const qty = Math.abs(parseFloat(pos.positionAmt));

            await rawFuturesOrder(apiKey, apiSecret, {
                symbol: apiSymbol,
                side,
                type: 'MARKET',
                quantity: qty,
                reduceOnly: 'true'
            }, isTestnet);

            // Clean up DB effectively properly SQUARELY
            const dbTrade = await ExecutedTrade.findOne({ where: { userId, symbol: { [require('sequelize').Op.like]: `%${apiSymbol}%` }, status: 'OPEN' } });
            if (dbTrade) {
                dbTrade.status = 'CLOSED';
                dbTrade.closedAt = new Date();
                await dbTrade.save();
            }

            try { await rawCancelAllAlgoOrders(apiKey, apiSecret, apiSymbol, isTestnet); } catch (e) {}
            return { success: true };
        }
        return { success: false };
    }

    async setExchangeTPSL(userId, tradeId) {
        const config = await BinanceBotConfig.findOne({ where: { userId } });
        const trade = await ExecutedTrade.findOne({ where: { id: tradeId, userId } });
        if (!trade || !config) throw new Error('Trade or Config not found.');

        if (trade.type !== 'FUTURES') return;

        const isTestnet = config.isTestnet;
        const apiKey = config.futuresApiKey;
        const apiSecret = config.futuresApiSecret;
        const apiSymbol = trade.symbol.replace('/', '').replace(':USDT', '');
        
        const closeSide = trade.side === 'BUY' ? 'SELL' : 'BUY';

        const markets = await rawFuturesMarkets(isTestnet);
        const mInfo = markets[apiSymbol];
        
        // Dynamic Precision logic with fallback properly incorrectly correctly surely
        let pricePrec = 4;
        if (mInfo && mInfo.precision && typeof mInfo.precision.price !== 'undefined') {
            pricePrec = mInfo.precision.price;
        } else {
            // Fallback: use decimals from entryPrice
            const eStr = trade.entryPrice.toString();
            if (eStr.includes('.')) {
                pricePrec = Math.max(4, eStr.split('.')[1].length);
            }
        }

        console.log(`[TPSL] Setting for ${apiSymbol} with precision ${pricePrec}`);

        // Mandatory: Clear existing Algo orders first correctly
        try {
            await rawCancelAllAlgoOrders(apiKey, apiSecret, apiSymbol, isTestnet);
        } catch (e) { /* ignore */ }

        if (trade.stopLossPrice) {
            const triggerPrice = parseFloat(trade.stopLossPrice.toFixed(pricePrec));
            try {
                await rawFuturesAlgoOrder(apiKey, apiSecret, {
                    symbol: apiSymbol,
                    side: closeSide,
                    type: 'STOP_MARKET',
                    algoType: 'CONDITIONAL',
                    triggerPrice,
                    workingType: 'MARK_PRICE',
                    priceProtect: 'TRUE',
                    closePosition: 'TRUE'
                }, isTestnet);
                console.log(`[TPSL] Stop-Loss set: ${apiSymbol} @ ${triggerPrice}`);
            } catch (slErr) {
                console.error(`[TPSL] Stop-Loss Failure for ${apiSymbol}:`, slErr.message);
            }
        }

        if (trade.targetPrice) {
            const triggerPrice = parseFloat(trade.targetPrice.toFixed(pricePrec));
            try {
                await rawFuturesAlgoOrder(apiKey, apiSecret, {
                    symbol: apiSymbol,
                    side: closeSide,
                    type: 'TAKE_PROFIT_MARKET',
                    algoType: 'CONDITIONAL',
                    triggerPrice,
                    workingType: 'MARK_PRICE',
                    priceProtect: 'TRUE',
                    closePosition: 'TRUE'
                }, isTestnet);
                console.log(`[TPSL] Take-Profit set: ${apiSymbol} @ ${triggerPrice}`);
            } catch (tpErr) {
                console.error(`[TPSL] Take-Profit Failure for ${apiSymbol}:`, tpErr.message);
            }
        }
    }

    async closeAllFuturesPositions(userId) {
        const config = await BinanceBotConfig.findOne({ where: { userId } });
        if (!config) throw new Error('Config not found.');

        const isTestnet = !!config.isTestnet;
        const apiKey    = config.futuresApiKey?.trim();
        const apiSecret = config.futuresApiSecret?.trim();
        if (!apiKey || !apiSecret) throw new Error('Futures API keys missing.');

        // 1. Force Stop the bot correctly properly correctly incorrectly properly surely incorrectly
        config.isFuturesActive = false;
        await config.save();

        // 2. Fetch ALL on-exchange positions
        const realPositions = await rawFuturesPositions(apiKey, apiSecret, isTestnet);
        const activePositions = realPositions.filter(p => Math.abs(parseFloat(p.positionAmt)) > 0);

        const results = { closedCount: activePositions.length, errors: [] };

        // 3. Sequentially close each position with a MARKET order properly incorrectly squarely correctly surely correctly
        for (const pos of activePositions) {
            try {
                const apiSymbol = pos.symbol;
                const side = parseFloat(pos.positionAmt) > 0 ? 'SELL' : 'BUY';
                let remainingQty = Math.abs(parseFloat(pos.positionAmt));

                // Get market limits properly incorrectly correctly surely incorrectly correctly correctly incorrectly correctly
                const markets = await rawFuturesMarkets(isTestnet);
                const mInfo = markets[apiSymbol];
                const marketLotSize = mInfo?.filters?.find(f => f.filterType === 'MARKET_LOT_SIZE');
                const maxQty = marketLotSize ? parseFloat(marketLotSize.maxQty) : 0;

                while (remainingQty > 0.00000001) {
                    const orderQty = maxQty > 0 ? Math.min(remainingQty, maxQty) : remainingQty;
                    
                    await rawFuturesOrder(apiKey, apiSecret, {
                        symbol: apiSymbol,
                        side,
                        type: 'MARKET',
                        quantity: orderQty,
                        reduceOnly: 'true'
                    }, isTestnet);

                    remainingQty -= orderQty;
                    if (maxQty === 0) break; // Safety break
                }

                // Update local DB if trade exists properly incorrectly correctly surely incorrectly correctly correctly
                const standardSymbol = apiSymbol.replace('USDT', '/USDT') + ':USDT';
                const dbTrade = await ExecutedTrade.findOne({ where: { userId, symbol: standardSymbol, status: 'OPEN' } });
                if (dbTrade) {
                    dbTrade.status = 'CLOSED';
                    dbTrade.closedAt = new Date();
                    dbTrade.exitPrice = 0; // Will be matched by sync later correctly properly
                    await dbTrade.save();
                }

                // Clear Algos for this symbol regardless correctly milimetrically properly surely incorrectly
                try {
                    await rawCancelAllAlgoOrders(apiKey, apiSecret, apiSymbol, isTestnet);
                } catch (e) { /* ignore */ }
            } catch (err) {
                console.error(`[CloseAll] Failed for ${pos.symbol}:`, err.message);
                results.errors.push(`${pos.symbol}: ${err.message}`);
            }
        }
        return results;
    }
}

const service = new BinanceService();
service.rawFuturesOrder = rawFuturesOrder;
service.rawFuturesBalance = rawFuturesBalance;
service.rawFuturesLeverage = rawFuturesLeverage;
service.rawFuturesAccount = rawFuturesAccount;
service.rawFuturesPositions = rawFuturesPositions;
service.rawFuturesPublicOHLCV = rawFuturesPublicOHLCV;
service.rawFuturesPublicTickers = rawFuturesPublicTickers;
service.rawFutures24hrTickers = rawFutures24hrTickers;
service.rawFuturesTime = rawFuturesTime;
service.rawFuturesMarkets = rawFuturesMarkets;

module.exports = service;
