const ss = require('./services/scraperService');
async function run() {
    console.log('--- MANUAL SCRAPE START ---');
    try {
        await ss.performDailyArchive();
        console.log('--- MANUAL SCRAPE SUCCESS ---');
    } catch (e) {
        console.error('--- MANUAL SCRAPE FAILED ---');
        console.error(e);
    }
    process.exit();
}
run();
