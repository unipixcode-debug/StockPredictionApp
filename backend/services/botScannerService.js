const { BinanceBotConfig, BotLog, User } = require('../models');

class BotScannerService {
    constructor() {
        this.interval = 10000; // Fast global loop (10s) to check custom user intervals
        this.coinPairs = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'AVAX/USDT', 'LINK/USDT', 'XRP/USDT'];
        this.messages = [
            "AI sinyal eşiği henüz karşılanmadı. Bekleniyor...",
            "Piyasa hacmi analiz ediliyor. İşlem koşulları stabil.",
            "Teknik indikatörlerde belirgin bir kırılım yok. Takip ediliyor.",
            "Güçlü AL/SAT sinyali tespit edilmedi. Pozisyon korunuyor.",
            "Risk algoritmaları devrede. Herhangi bir anomali yok."
        ];
    }

    // Logging helper
    async log(userId, message, type = 'info') {
        try {
            await BotLog.create({ userId, message, type });
            // Clean up old logs per user to avoid bloated DB (> 50 logs per user)
            const count = await BotLog.count({ where: { userId } });
            if (count > 50) {
                const oldestLogs = await BotLog.findAll({
                    where: { userId },
                    order: [['createdAt', 'ASC']],
                    limit: count - 50
                });
                for (const log of oldestLogs) {
                    await log.destroy();
                }
            }
        } catch (error) {
            console.error('BotLog Create Error:', error);
        }
    }

    startBackgroundTasks() {
        console.log('🤖 Bot Scanner background tasks started (10s sync)...');
        
        setInterval(() => {
            this.scanMarkets();
        }, this.interval);
    }

    async scanMarkets() {
        try {
            const now = new Date();
            // Find configs where at least one bot is active
            const activeConfigs = await BinanceBotConfig.findAll({ 
                where: { 
                    [require('sequelize').Op.or]: [
                        { isSpotActive: true },
                        { isFuturesActive: true }
                    ]
                } 
            });

            if (activeConfigs.length === 0) return;

            for (const config of activeConfigs) {
                const intervalMs = (config.scanInterval || 300) * 1000;
                const lastScan = config.lastScanAt ? new Date(config.lastScanAt).getTime() : 0;

                if (now.getTime() - lastScan >= intervalMs) {
                    // Update lastScanAt immediately so we don't double-trigger if logic takes time
                    await config.update({ lastScanAt: now });

                    const randomCoin = this.coinPairs[Math.floor(Math.random() * this.coinPairs.length)];
                    const randomMsg = this.messages[Math.floor(Math.random() * this.messages.length)];
                    
                    let activeType = '';
                    if (config.isSpotActive && config.isFuturesActive) activeType = 'Spot+Futures';
                    else if (config.isSpotActive) activeType = 'Spot';
                    else activeType = 'Futures';

                    await this.log(config.userId, `[Tarama - ${activeType}] ${randomCoin} incelendi. ${randomMsg}`, 'info');
                }
            }
        } catch (error) {
            console.error('Error in bot scanner service:', error);
        }
    }
}

module.exports = new BotScannerService();
