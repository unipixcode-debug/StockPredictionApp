const axios = require('axios');

/**
 * Telegram Notification Service for Trading Bot
 * Handles automated alerts for trade entries and exits.
 */
class TelegramService {
    constructor() {
        this.apiBase = 'https://api.telegram.org/bot';
    }

    /**
     * Sends a direct message via Telegram
     */
    async sendMessage(token, chatId, message) {
        if (!token || !chatId) return false;
        try {
            const url = `${this.apiBase}${token}/sendMessage`;
            await axios.post(url, {
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown'
            });
            return true;
        } catch (error) {
            console.error('[TelegramService] Error sending message:', error.response?.data || error.message);
            return false;
        }
    }

    /**
     * Notify about a NEW trade entry
     */
    async sendEntryNotification(config, trade, reason) {
        if (!config.telegramToken || !config.telegramChatId) return;

        const emoji = trade.side === 'BUY' ? '🚀' : '🔻';
        const positionType = trade.type === 'FUTURES' ? (trade.side === 'BUY' ? 'LONG' : 'SHORT') : 'SPOT BUY';
        
        const message = `
*${emoji} [YENİ İŞLEM] ${trade.symbol}*
────────────────────
📌 *Tür:* ${positionType}
💰 *Fiyat:* ${trade.entryPrice}
📊 *RSI:* ${reason.rsi || 'N/A'}
📈 *Güven Skoru:* %${reason.score || 'N/A'}
🧠 *Strateji:* ${trade.strategyId || 'ALPHA-MIND'}
🎯 *Hedef (TP):* ${trade.targetPrice || 'N/A'}
🛑 *Durdur (SL):* ${trade.stopLossPrice || 'N/A'}
────────────────────
🤖 _Alpha-Mind Trading Bot_
        `.trim();

        return this.sendMessage(config.telegramToken, config.telegramChatId, message);
    }

    /**
     * Notify about a trade EXIT (Close)
     */
    async sendExitNotification(config, trade, reason = 'KAPANDI') {
        if (!config.telegramToken || !config.telegramChatId) return;

        const pnlEmoji = trade.pnl >= 0 ? '✅' : '❌';
        const pnlSign = trade.pnl >= 0 ? '+' : '';
        const pnlPct = trade.pnlPercentage ? trade.pnlPercentage.toFixed(2) : '0';
        
        const message = `
*${pnlEmoji} [İŞLEM KAPANDI] ${trade.symbol}*
────────────────────
🏁 *Çıkış Fiyatı:* ${trade.exitPrice || 'N/A'}
💰 *PNL (Net):* ${pnlSign}${trade.pnl?.toFixed(2) || '0'} USDT
📈 *ROI:* ${pnlSign}${pnlPct}%
💡 *Neden:* ${reason}
────────────────────
🕒 _İşlem süresi bitti veya hedefe ulaşıldı._
        `.trim();

        return this.sendMessage(config.telegramToken, config.telegramChatId, message);
    }

    /**
     * Test message to verify configuration
     */
    async sendTestMessage(token, chatId) {
        const message = `
*🔔 [TEST MESAJI]*
────────────────────
Gratulasie! Telegram entegrasyonu başarıyla aktif edildi. 
Botunuz artık tüm emirlerde size rapor verecek.
────────────────────
🚀 _Bol kazançlar!_
        `.trim();
        return this.sendMessage(token, chatId, message);
    }
}

module.exports = new TelegramService();
