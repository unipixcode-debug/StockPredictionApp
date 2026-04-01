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

        const exchange = new ccxt.binance({
            apiKey,
            secret: apiSecret,
            enableRateLimit: true,
            options: {
                defaultType: marketType === 'FUTURES' ? 'future' : 'spot',
            }
        });

        if (config.isTestnet) {
            try {
                exchange.setSandboxMode(true);
            } catch (e) {
                if (marketType === 'FUTURES' && e.message.includes('not supported for futures')) {
                    throw new Error('BINANCE_FUTURES_TESTNET_DEPRECATED: Binance vadeli işlemler testneti artık desteklenmiyor. Lütfen "Mock Trading" anahtarlarınızı kullanın ve "Testnet Modu" şalterini kapatın.');
                }
                throw e;
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
            const balance = await exchange.fetchBalance();
            return {
                success: true,
                freeUSDT: balance['USDT']?.free || 0,
                totalUSDT: balance['USDT']?.total || 0,
                testnet: exchange.urls.api.public.includes('testnet'),
                marketType
            };
        } catch (error) {
            let errorMsg = error.message;
            if (errorMsg.includes('-2008') || errorMsg.includes('Invalid API-key ID')) {
                errorMsg = 'Hata (-2008): API Anahtarı geçersiz. Lütfen girdiğiniz anahtarların doğruluğunu ve "Testnet Modu" şalterinin anahtarlarla uyumlu (Spot Testnet -> Açık, Mock Trading/Mainnet/Real -> Kapalı) olduğunu kontrol edin.';
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
        
        // Map symbol format: BTC-USD -> BTC/USDT
        const pair = signal.symbol.replace('-USD', '') + '/USDT';
        const marketType = signal.type || 'SPOT'; // Default to spot if not specified

        try {
            const { exchange, config } = await this.getExchangeInstance(userId, marketType);
            
            // Check specific activation
            if (marketType === 'SPOT' && !config.isSpotActive) return null;
            if (marketType === 'FUTURES' && !config.isFuturesActive) return null;

            // Simple basic logic for execution
            const ticker = await exchange.fetchTicker(pair);
            const currentPrice = ticker.last;

            // Decide budget
            const balance = await exchange.fetchBalance();
            const freeUSDT = balance['USDT']?.free || 0;

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
            const side = signal.direction.toLowerCase(); // 'buy' or 'sell'
            
            let activeOpenPositions = await ExecutedTrade.count({
                where: { userId, status: 'OPEN' }
            });

            if (side === 'buy' && activeOpenPositions >= config.maxPositions) {
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
                const order = await exchange.createMarketOrder(pair, side, amount);
                
                tradeRecord.exchangeOrderId = order.id;
                tradeRecord.entryPrice = order.average || order.price || currentPrice;
                await tradeRecord.save();

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
