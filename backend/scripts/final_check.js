const { ExecutedTrade, BinanceBotConfig, sequelize } = require('./models');

async function run() {
    try {
        console.log('--- 1. Fixing DB Columns ---');
        try {
            await sequelize.query('ALTER TABLE "BinanceBotConfigs" ADD COLUMN IF NOT EXISTS "leverage" INTEGER DEFAULT 1');
            await sequelize.query('ALTER TABLE "BinanceBotConfigs" ADD COLUMN IF NOT EXISTS "riskLevel" VARCHAR(20) DEFAULT \'MODERATE\'');
            console.log('DB Columns fixed.');
        } catch (dbErr) {
            console.warn('DB Fix Warning (might already exist):', dbErr.message);
        }

        console.log('--- 2. Clearing Invalid Trades ---');
        // Clear everything to ensure a fresh sync from Binance
        const count = await ExecutedTrade.destroy({ where: {} });
        console.log(`Cleared ${count} trades.`);

        console.log('--- 3. Ready for Sync ---');
        process.exit(0);
    } catch (err) {
        console.error('Final Check Error:', err);
        process.exit(1);
    }
}
run();
