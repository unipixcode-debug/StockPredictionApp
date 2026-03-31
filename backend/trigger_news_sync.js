const newsService = require('./services/newsService');
const sequelize = require('./config/database');

async function trigger() {
    try {
        console.log('🚀 Triggering manual news synchronization...');
        await newsService.syncNewsWithImpacts();
        console.log('✅ Manual sync completed.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Trigger failed:', error);
        process.exit(1);
    }
}

trigger();
