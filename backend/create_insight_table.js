const DailyMarketInsight = require('./models/DailyMarketInsight');

async function migrate() {
    console.log('🚀 Creating DailyMarketInsights table...');
    try {
        await DailyMarketInsight.sync({ alter: true });
        console.log('✅ DailyMarketInsights table created/updated successfully.');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    }
    process.exit();
}

migrate();
