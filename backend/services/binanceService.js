const ccxt = require('ccxt');
const { BinanceBotConfig, ExecutedTrade, User } = require('../models');

class BinanceService {
    /**
     * Initializes a ccxt binance instance for a user
     */
    async getExchangeInstance(userId) {
        const config = await BinanceBotConfig.findOne({ where: { userId } });
        if (!config || !config.apiKey || !config.apiSecret) {
            throw new Error('BINANCE_API_NOT_CONFIGURED');
        }

        const exchange = new ccxt.binance({
            apiKey: config.apiKey,
            secret: config.apiSecret,
            enableRateLimit: true,
            options: {
                defaultType: config.enableSpot ? 'spot' : 'future', // spot or future
            }
        });

        if (config.isTestnet) {
            exchange.setSandboxMode(true);
        }

        return { exchange, config };
    }

    /**
     * Tests connection for given userId
     */
    async testConnection(userId) {
        try {
            const { exchange } = await this.getExchangeInstance(userId);
            const balance = await exchange.fetchBalance();
            return {
                success: true,
                freeUSDT: balance['USDT']?.free || 0,
                totalUSDT: balance['USDT']?.total || 0,
                testnet: exchange.urls.api.public.includes('testnet')
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Executes a trade based on AI Signal
     * @param {*} userId 
     * @param {Object} signal - { symbol: 'BTC-USD', direction: 'BUY'|'SELL', market: 'CRYPTO' }
     */
    async executeTrade(userId, signal) {
        if (signal.market !== 'CRYPTO') return null;
        
        // Map symbol format: BTC-USD -> BTC/USDT
        const pair = signal.symbol.replace('-USD', '') + '/USDT';

        try {
            const { exchange, config } = await this.getExchangeInstance(userId);
            
            if (!config.isActive) return null;

            // Simple basic logic for execution
            // We fetch ticker to get current price to calculate size
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

            // Min order size for Binance is normally 5-10 USDT depending on pair
            if (tradeAmountUSDT < 5) {
                throw new Error('INSUFFICIENT_BALANCE_FOR_MIN_ORDER');
            }

            // Calculate coin amount
            const amount = tradeAmountUSDT / currentPrice;
            const side = signal.direction.toLowerCase(); // 'buy' or 'sell'
            
            // Execute Market Order
            // Warning: For 'sell', we should check if we already hold the coin in spot. 
            // If it's spot, we can't 'short'. So 'sell' only works if we hold it.
            // If futures, we can short.
            let activeOpenPositions = await ExecutedTrade.count({
                where: { userId, status: 'OPEN' }
            });

            if (side === 'buy' && activeOpenPositions >= config.maxPositions) {
                 throw new Error('MAX_POSITIONS_REACHED');
            }

            // Let's create a pending DB record
            const tradeRecord = await ExecutedTrade.create({
                userId,
                symbol: pair,
                side: signal.direction,
                type: exchange.options.defaultType.toUpperCase(),
                amount: amount,
                status: 'OPEN'
            });

            try {
                // Warning: This is a simplified market order logic. 
                // In production, we should handle filters like lot size, min notional, etc.
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
            console.error(`Binance bot error for user ${userId}:`, error.message);
            throw error;
        }
    }
}

module.exports = new BinanceService();
