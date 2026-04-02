const ccxt = require('ccxt');
const { BinanceBotConfig, ExecutedTrade, User } = require('../models');

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

        try {
            const { exchange, config } = await this.getExchangeInstance(userId, marketType);

            // Sync time before any signed request (critical for Demo Trading)
            if (marketType === 'FUTURES') await exchange.loadTimeDifference();

            // Load markets and validate pair exists in this exchange environment
            // (Demo Trading only supports a subset of all futures pairs)
            await exchange.loadMarkets();
            if (!exchange.markets[pair]) {
                throw new Error(`SYMBOL_NOT_AVAILABLE: ${pair} is not listed in this exchange environment.`);
            }

            // Check specific activation
            if (marketType === 'SPOT' && !config.isSpotActive) return null;
            if (marketType === 'FUTURES' && !config.isFuturesActive) return null;

            // Simple basic logic for execution
            const ticker = await exchange.fetchTicker(pair);
            const currentPrice = ticker.last;

            // Decide budget
            let freeUSDT = 0;
            if (marketType === 'FUTURES') {
                // Use V2 balance endpoint (same as testConnection) for consistency
                try {
                    const balArray = await exchange.fapiPrivateV2GetBalance();
                    const usdt = balArray.find(b => b.asset === 'USDT');
                    freeUSDT = parseFloat(usdt?.withdrawAvailable || usdt?.balance || 0);
                } catch { freeUSDT = 0; }
            } else {
                const balance = await exchange.fetchBalance();
                freeUSDT = balance['USDT']?.free || 0;
            }

            let tradeAmountUSDT = 0;
            if (config.budgetMode === 'PERCENTAGE') {
                tradeAmountUSDT = (freeUSDT * config.budgetAmount) / 100;
            } else {
                tradeAmountUSDT = config.budgetAmount;
            }

            // Cap at maxPerAsset
            if (tradeAmountUSDT > config.maxPerAsset) {
                tradeAmountUSDT = config.maxPerAsset;
            }

            // If we don't have enough balance, fallback
            if (tradeAmountUSDT > freeUSDT) {
                tradeAmountUSDT = freeUSDT;
            }

            // Min order size check
            if (tradeAmountUSDT < 5) {
                throw new Error('INSUFFICIENT_BALANCE_FOR_MIN_ORDER');
            }

            // Calculate coin amount
            const amount = tradeAmountUSDT / currentPrice;
            // BUY = LONG on Spot or Futures, SELL = SHORT on Futures
            const side = signal.direction === 'BUY' ? 'buy' : 'sell';
            
            // Max positions applies to both LONG and SHORT
            let activeOpenPositions = await ExecutedTrade.count({
                where: { userId, status: 'OPEN' }
            });

            if (activeOpenPositions >= config.maxPositions) {
                throw new Error('MAX_POSITIONS_REACHED');
            }

            // Create record
            const tradeRecord = await ExecutedTrade.create({
                userId,
                symbol: pair,
                side: signal.direction,
                type: marketType,
                amount: amount,
                status: 'OPEN'
            });

            try {
                // For Futures, pass positionSide to support both hedge and one-way mode
                const orderParams = {};
                if (marketType === 'FUTURES') {
                    orderParams.positionSide = side === 'buy' ? 'LONG' : 'SHORT';
                }

                const order = await exchange.createMarketOrder(pair, side, amount, orderParams);
                
                tradeRecord.exchangeOrderId = order.id;
                tradeRecord.entryPrice = order.average || order.price || currentPrice;
                await tradeRecord.save();

                // ── Place Stop-Loss order immediately after entry ──────────────────
                if (signal.stopLossPct && marketType === 'FUTURES') {
                    try {
                        const ep = tradeRecord.entryPrice;
                        const slPrice = side === 'buy'
                            ? ep * (1 - signal.stopLossPct)
                            : ep * (1 + signal.stopLossPct);
                        const slParams = {
                            stopPrice: exchange.priceToPrecision(pair, slPrice),
                            reduceOnly: true,
                        };
                        if (orderParams.positionSide) slParams.positionSide = orderParams.positionSide;

                        await exchange.createOrder(pair, 'STOP_MARKET', side === 'buy' ? 'sell' : 'buy', amount, undefined, slParams);
                        console.log(`[Binance] Stop-loss placed at ${slPrice.toFixed(4)} for ${pair}`);
                    } catch (slErr) {
                        // SL failure is non-fatal — log it but don't abort the trade
                        console.warn(`[Binance] Stop-loss order failed for ${pair}:`, slErr.message);
                    }
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
