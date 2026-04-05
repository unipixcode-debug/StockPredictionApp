const newsService = require('../services/newsService');
const db = require('../models');

async function triggerSync() {
    try {
        console.log('--- MANUALLY TRIGGERING NEWS SYNC ---');
        await db.sequelize.authenticate();
        await newsService.syncNewsWithImpacts();
        console.log('--- SYNC COMPLETED ---');
        process.exit(0);
    } catch (e) {
        console.error('--- SYNC FAILED ---', e.message);
        process.exit(1);
    }
}

triggerSync();
