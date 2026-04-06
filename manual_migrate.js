const sequelize = require('./backend/config/database');

async function migrate() {
    try {
        console.log('--- MANUAL MIGRATION START ---');
        // Add columns if they don't exist
        await sequelize.query('ALTER TABLE "BinanceBotConfigs" ADD COLUMN IF NOT EXISTS "telegramToken" VARCHAR(255)');
        await sequelize.query('ALTER TABLE "BinanceBotConfigs" ADD COLUMN IF NOT EXISTS "telegramChatId" VARCHAR(255)');
        console.log('✅ Columns added successfully (or already existed).');
        process.exit(0);
    } catch (e) {
        console.error('❌ Migration failed:', e.message);
        process.exit(1);
    }
}

migrate();
