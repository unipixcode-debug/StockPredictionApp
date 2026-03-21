
const newsService = require('../services/newsService');
const aiService = require('../services/aiService');
const sequelize = require('../config/database');

async function runManualSync() {
    try {
        console.log('🚀 Starting manual news synchronization...');
        
        // Ensure AI is ready
        await aiService.ensureInitialized();
        
        // Run sync
        await newsService.syncNewsWithImpacts();
        
        console.log('✅ Manual news sync completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Manual news sync failed:', error);
        process.exit(1);
    }
}

runManualSync();
