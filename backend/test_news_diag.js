const newsService = require('./services/newsService');
const sequelize = require('./config/database');

async function test() {
    try {
        await sequelize.authenticate();
        console.log('Testing EN:');
        const enNews = await newsService.fetchLatestNews(7, 'EN');
        console.log('EN length:', enNews.length);
        if (enNews.length > 0) console.log('First EN item title:', enNews[0].title);
        
        console.log('\nTesting TR:');
        const trNews = await newsService.fetchLatestNews(7, 'TR');
        console.log('TR length:', trNews.length);
        if (trNews.length > 0) console.log('First TR item title:', trNews[0].title);
        
    } catch (e) {
        console.error('Test Error:', e.message);
    }
    process.exit();
}
test();
