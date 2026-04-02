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
 * Direct HTTPS GET for Futures Account (Positions, Balances)
 */
function rawFuturesAccount(apiKey, apiSecret, isTestnet = true) {
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
                    if (parsed.assets) resolve(parsed);
                    else reject(new Error(`binance account ${data}`));
                } catch { reject(new Error('Invalid JSON: ' + data)); }
            });
        }).on('error', reject);
    });
}

/**
 * Direct HTTPS GET for Futures Position Risk (Leverage, EntryPrice, Margin)
 */
function rawFuturesPositions(apiKey, apiSecret, isTestnet = true) {
    return new Promise((resolve, reject) => {
        const hostname = isTestnet ? 'demo-fapi.binance.com' : 'fapi.binance.com';
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
 * Fetches 24hr ticker data (including volume) directly via public HTTPS (Unauthenticated)
 */
function rawFutures24hrTickers(isTestnet = true) {
    return new Promise((resolve, reject) => {
        const hostname = isTestnet ? 'demo-fapi.binance.com' : 'fapi.binance.com';
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
            console.log(`[Binance] Executing ${marketType} for ${pair} with ${leverage}x leverage`);
            let order;
            const apiSymbol = pair.split('/')[0].split('-')[0].split(':')[0].toUpperCase() + 'USDT';

            if (marketType === 'FUTURES') {
                const markets = await rawFuturesMarkets(isTestnet);
                const marketInfo = markets[apiSymbol];
                const qtyPrecision = marketInfo ? marketInfo.precision.amount : 3;
                const pricePrecision = marketInfo ? marketInfo.precision.price : 4;

                if (leverage > 1) {
                    await rawFuturesLeverage(apiKey, apiSecret, { symbol: apiSymbol, leverage }, isTestnet);
                }
                const rawQty = parseFloat(amountValue.toFixed(qtyPrecision));
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
                targetPrice: target
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
            const dbOpenTrades = await ExecutedTrade.findAll({ where: { userId, status: 'OPEN', type: 'FUTURES' } });

            const results = { closed: 0, updated: 0, added: 0 };
            // 3. Update existing OPEN trades and ensure TP/SL is sent
            for (const dbTrade of dbOpenTrades) {
                const apiSymbol = dbTrade.symbol.replace('/', '').replace(':USDT', '');
                const stillOpen = activeReal.find(p => p.symbol === apiSymbol && Math.abs(parseFloat(p.positionAmt)) > 0);

                if (!stillOpen) {
                    dbTrade.status = 'CLOSED';
                    dbTrade.closedAt = new Date();
                    dbTrade.exitPrice = 0;
                    await dbTrade.save();
                    results.closed++;
                } else {
                    // Always try to push TP/SL if missing on exchange
                    try {
                        await this.setExchangeTPSL(userId, dbTrade.id);
                    } catch (e) { /* sync-tpsl log if needed */ }

                    if (dbTrade.leverage !== parseInt(stillOpen.leverage)) {
                        dbTrade.leverage = parseInt(stillOpen.leverage);
                        await dbTrade.save();
                        results.updated++;
                    }
                }
            }

            const allDbTrades = await ExecutedTrade.findAll({ where: { userId } });
            for (const realPos of activeReal) {
                const apiSymbol = realPos.symbol;
                const standardSymbol = apiSymbol.replace('USDT', '/USDT') + ':USDT';
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
                    // Create new DETECTED
                    const slPrice = isBuy ? entryPrice * 0.97 : entryPrice * 1.03;
                    const tpPrice = isBuy ? entryPrice * 1.06 : entryPrice * 0.94;
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
                        stopLossPrice: slPrice,
                        targetPrice: tpPrice
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

    async closePosition(userId, tradeId) {
        const config = await BinanceBotConfig.findOne({ where: { userId } });
        const trade = await ExecutedTrade.findOne({ where: { id: tradeId, userId, status: 'OPEN' } });
        if (!trade || !config) throw new Error('Trade or Config not found.');

        const isTestnet = config.isTestnet;
        const apiKey = config.futuresApiKey;
        const apiSecret = config.futuresApiSecret;
        const apiSymbol = trade.symbol.replace('/', '').replace(':USDT', '');

        let order;
        if (trade.type === 'FUTURES') {
            const side = trade.side === 'BUY' ? 'SELL' : 'BUY';
            order = await rawFuturesOrder(apiKey, apiSecret, {
                symbol: apiSymbol,
                side,
                type: 'MARKET',
                quantity: trade.amount,
                reduceOnly: 'true'
            }, isTestnet);
        } else {
             const { exchange } = await this.getExchangeInstance(userId, 'SPOT');
             const side = trade.side === 'BUY' ? 'sell' : 'buy';
             order = await exchange.createMarketOrder(trade.symbol, side, trade.amount);
        }

        trade.status = 'CLOSED';
        trade.closedAt = new Date();
        trade.exitPrice = parseFloat(order.avgPrice || order.price || order.average || 0);
        trade.pnl = (trade.side === 'BUY' 
            ? (trade.exitPrice - trade.entryPrice) 
            : (trade.entryPrice - trade.exitPrice)) * trade.amount;
        
        await trade.save();
        return trade;
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
        const pricePrec = mInfo ? mInfo.precision.price : 4;

        if (trade.stopLossPrice) {
            const stopPrice = parseFloat(trade.stopLossPrice.toFixed(pricePrec));
            await rawFuturesOrder(apiKey, apiSecret, {
                symbol: apiSymbol,
                side: closeSide,
                type: 'STOP_MARKET',
                stopPrice,
                closePosition: 'true'
            }, isTestnet);
        }

        if (trade.targetPrice) {
            const targetPrice = parseFloat(trade.targetPrice.toFixed(pricePrec));
            await rawFuturesOrder(apiKey, apiSecret, {
                symbol: apiSymbol,
                side: closeSide,
                type: 'TAKE_PROFIT_MARKET',
                stopPrice: targetPrice,
                closePosition: 'true'
            }, isTestnet);
        }
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
