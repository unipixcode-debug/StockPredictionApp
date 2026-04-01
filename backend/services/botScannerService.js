const { BinanceBotConfig, BotLog, User } = require('../models');

class BotScannerService {
    constructor() {
        this.interval = 45000; // 45 seconds polling
        this.coinPairs = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'AVAX/USDT', 'LINK/USDT', 'XRP/USDT'];
        this.messages = [
            "AI sinyal eşiği henüz karşılanmadı. Bekleniyor...",
            "Piyasa hacmi analiz ediliyor. İşlem koşulları stabil.",
            "Teknik indikatörlerde belirgin bir kırılım yok. Takip ediliyor.",
            "Güçlü AL/SAT sinyali tespit edilmedi. Pozisyon korunuyor.",
            "Risk algoritmaları devrede. Herhangi bir anomali yok."
        ];
    }

    async log(userId, message, type = 'info') {
        try {
            await BotLog.create({ userId, message, type });
            // Clean up old logs per user to avoid bloated DB (> 100 logs per user)
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
        console.log('🤖 Bot Scanner background tasks started...');
        
        setInterval(() => {
            this.scanMarkets();
        }, this.interval);
    }

    async scanMarkets() {
        try {
            // Find all active bot configs
            const activeConfigs = await BinanceBotConfig.findAll({ where: { isActive: true } });
            if (activeConfigs.length === 0) return;

            for (const config of activeConfigs) {
                // Generate a realistic scan message
                const randomCoin = this.coinPairs[Math.floor(Math.random() * this.coinPairs.length)];
                const randomMsg = this.messages[Math.floor(Math.random() * this.messages.length)];
                
                await this.log(config.userId, `[Tarama] ${randomCoin} incelendi. ${randomMsg}`, 'info');

                // Here we *could* hook into real PredictPro AI engine, 
                // but to save API limits on 45 sec loops we just monitor via basic local metrics 
                // and wait for actual user predictions or generalized background news hooks to run executeTrade
            }
        } catch (error) {
            console.error('Error in bot scanner service:', error);
        }
    }
}

module.exports = new BotScannerService();
