const newsService = require('./services/newsService');
const sequelize = require('./config/database');

async function test() {
    try {
        await sequelize.authenticate();
        console.log('--- TESTING BOTH LANGUAGES ---');
        
        const enNews = await newsService.fetchLatestNews(7, 'EN');
        console.log(`[EN] Count: ${enNews.length}`);
        if (enNews.length > 0) {
            console.log('[EN] First Item Sample:');
            console.log(JSON.stringify(enNews[0], null, 2).substring(0, 500));
        }

        const trNews = await newsService.fetchLatestNews(7, 'TR');
        console.log(`\n[TR] Count: ${trNews.length}`);
        if (trNews.length > 0) {
            console.log('[TR] First Item Sample:');
            console.log(JSON.stringify(trNews[0], null, 2).substring(0, 500));
        }
        
    } catch (e) {
        console.error('Test Error:', e.message);
    }
    process.exit();
}
test();
