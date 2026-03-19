const aiService = require('./services/aiService');
async function run() {
    console.log('Triggering manual sync...');
    await aiService.checkAllProviders();
    console.log('Done!');
    process.exit(0);
}
run();
