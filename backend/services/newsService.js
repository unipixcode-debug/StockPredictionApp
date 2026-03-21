let yahooFinance = require('yahoo-finance2');
if (yahooFinance.default) yahooFinance = yahooFinance.default;

if (typeof yahooFinance.setGlobalConfig === 'function') {
    yahooFinance.setGlobalConfig({ validation: { logErrors: false } });
}
const axios = require('axios');
const cheerio = require('cheerio');
const NewsSummary = require('../models/NewsSummary');
const DataSource = require('../models/DataSource');
const aiService = require('./aiService');
const { Op } = require('sequelize');

class NewsService {
    async fetchLatestNews(days = 7, targetLang = 'TR') {
        try {
            console.log(`🔄 Fetching News from DB (${targetLang})...`);
            
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - (days || 7));

            const dbNews = await NewsSummary.findAll({
                where: {
                    createdAt: { [Op.gte]: oneWeekAgo }
                },
                order: [['createdAt', 'DESC']],
                limit: 50
            });

            if (dbNews.length > 0) {
                return dbNews.map(item => ({
                    title: (targetLang === 'TR' ? item.titleTR : item.titleEN) || item.titleEN,
                    contentSnippet: (targetLang === 'TR' ? item.snippetTR : item.snippetEN) || item.snippetEN,
                    link: item.url,
                    pubDate: item.createdAt,
                    sourceName: item.sourceName || 'Piyasa', 
                    importanceScore: item.importanceScore || 50,
                    sentimentScore: item.sentimentScore || 50,
                    tags: item.tags || '',
                    impacts: item.impacts || [],
                    isTranslated: !!item.titleTR
                }));
            }

            // Fallback if DB is completely empty (usually first run)
            return [{
                title: "Haberler analiz ediliyor...",
                contentSnippet: "Yapay zeka haberleri tarıyor ve etki analizi yapıyor. Lütfen kısa süre sonra sayfayı yenileyin.",
                pubDate: new Date(),
                link: "#",
                sourceName: "Sistem",
                importanceScore: 10,
                impacts: []
            }];
        } catch (error) {
            console.error('FetchNews Error:', error.message);
            return [];
        }
    }

    /**
     * Periodically scrapes and analyzes news in the background
     */
    startBackgroundTasks() {
        console.log('📅 News background synchronization started...');
        // Initial run
        setTimeout(() => this.syncNewsWithImpacts(), 10000);
        // Every 30 minutes
        setInterval(() => this.syncNewsWithImpacts(), 30 * 60 * 1000);
    }

    async syncNewsWithImpacts() {
        try {
            console.log('🔄 Syncing News with AI Impact Analysis...');
            const activeSources = await DataSource.findAll({ where: { isActive: true, type: 'NEWS_RSS' } });
            const rssUrls = activeSources.length > 0 
                ? activeSources.map(s => ({ url: s.url, name: s.name }))
                : [
                    { url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=15839069', name: 'CNBC' },
                    { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', name: 'CoinDesk' }
                ];

            let count = 0;
            for(const source of rssUrls) {
                try {
                    const { data } = await axios.get(source.url, { timeout: 10000 });
                    const $ = cheerio.load(data, { xmlMode: true });
                    const items = [];
                    $('item').each((i, el) => {
                        if (i >= 5) return; // Only process top 5 per source to avoid over-limit
                        items.push({
                            title: $(el).find('title').text(),
                            link: $(el).find('link').text(),
                            content: $(el).find('description').text().substring(0, 500),
                            sourceName: source.name
                        });
                    });

                    // filter items already in DB
                    const urls = items.map(i => i.link);
                    const existing = await NewsSummary.findAll({ where: { url: { [Op.in]: urls } } });
                    const existingUrls = new Set(existing.map(e => e.url));
                    const newItems = items.filter(i => !existingUrls.has(i.link));

                    if (newItems.length > 0) {
                        console.log(`📝 Processing ${newItems.length} new items from ${source.name}...`);
                        const translated = await aiService.batchTranslateNews(newItems, 'TR');
                        
                        for (let i = 0; i < newItems.length; i++) {
                            const original = newItems[i];
                            const trans = translated[i] || original;
                            
                            await NewsSummary.upsert({
                                url: original.link,
                                titleEN: original.title,
                                snippetEN: original.content,
                                titleTR: trans.titleTR || trans.title || original.title,
                                snippetTR: trans.snippetTR || trans.snippet || original.content,
                                importanceScore: trans.importanceScore || 50,
                                sentimentScore: trans.sentimentScore || 50,
                                tags: trans.tags || '',
                                impacts: trans.impacts || [],
                                sourceName: original.sourceName,
                                lastProcessed: new Date()
                            });
                            count++;
                        }
                    }
                } catch(e) { console.error(`Sync failed for ${source.url}: ${e.message}`); }
            }
            console.log(`✅ Background News Sync completed. Processed ${count} new items.`);
        } catch (error) {
            console.error('SyncNews Error:', error.message);
        }
    }

    async cleanupOldNews() {
        try {
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            
            const deleted = await NewsSummary.destroy({
                where: {
                    createdAt: {
                        [Op.lt]: oneYearAgo
                    }
                }
            });
            
            if (deleted > 0) {
                console.log(`🧹 Cleaned up ${deleted} old news summaries older than 1 year.`);
            }
        } catch (error) {
            console.error('CleanupOldNews Error:', error.message);
        }
    }

    async cleanupPoorNews() {
        try {
            console.log("🧹 Starting cleanup of poor quality news...");
            const deleted = await NewsSummary.destroy({
                where: {
                    [Op.or]: [
                        { titleTR: { [Op.like]: '%makalenin tam metni çekilemedi%' } },
                        { snippetTR: { [Op.like]: '%çekilemedi%' } },
                        { titleTR: null },
                        { snippetTR: { [Op.length]: { [Op.lt]: 20 } } }
                    ]
                }
            });
            if (deleted > 0) {
                console.log(`✅ Deleted ${deleted} poor quality news items.`);
            }
        } catch (error) {
            console.error('CleanupPoorNews Error:', error.message);
        }
    }

    async analyzeSentiment(text) {
        try {
            const prompt = `Analyze the market sentiment of the following news text. Provide a score from 0 (very bearish) to 100 (very bullish) and a short one-sentence explanation in Turkish.
            
            Text: ${text.substring(0, 1000)}
            
            JSON format: {"score": number, "explanation": "string"}`;

            const responseText = await aiService.generateContent(prompt, "gemini-flash-latest");
            try {
                let cleanJson = responseText.trim();
                if (cleanJson.startsWith('```')) {
                    cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '').trim();
                }
                return JSON.parse(cleanJson);
            } catch (e) {
                return { score: 50, explanation: "Sentiment analizi yapılamadı." };
            }
        } catch (error) {
            console.error('Sentiment Analysis Error:', error.message);
            return { score: 50, explanation: "Hata oluştu." };
        }
    }
}

module.exports = new NewsService();
