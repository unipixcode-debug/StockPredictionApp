const { BinanceBotConfig } = require('./backend/models');

async function check() {
    try {
        const config = await BinanceBotConfig.describe();
        console.log('Columns in BinanceBotConfig:', Object.keys(config));
        if (config.telegramToken && config.telegramChatId) {
            console.log('SUCCESS: Telegram columns exist.');
        } else {
            console.log('FAILURE: Missing telegram columns.');
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
