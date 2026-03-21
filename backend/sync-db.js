const sequelize = require('./config/database');
require('./models/NewsSummary');
require('./models/Prediction');
require('./models/User');
require('./models/AIProvider');
require('./models/DailyMarketInsight');

async function syncDB() {
    try {
        console.log('🔄 Syncing database schema (alter: true)...');
        await sequelize.sync({ alter: true });
        console.log('✅ Database synchronized successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Sync failed:', error);
        process.exit(1);
    }
}

syncDB();
