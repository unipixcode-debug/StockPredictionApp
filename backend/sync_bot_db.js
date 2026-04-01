const { BinanceBotConfig, ExecutedTrade } = require('./models');
const sequelize = require('./config/database');

async function syncBotTables() {
    try {
        await sequelize.authenticate();
        console.log('DB Connection ok.');
        await BinanceBotConfig.sync({ alter: true });
        console.log('BinanceBotConfig table synced.');
        await ExecutedTrade.sync({ alter: true });
        console.log('ExecutedTrade table synced.');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

syncBotTables();
