const YF = require('yahoo-finance2').default;
const yahooFinance = new YF({ suppressNotices: ['yahooSurvey'] });
const axios = require('axios');
const cheerio = require('cheerio');
const NewsSummary = require('../models/NewsSummary');
const DataSource = require('../models/DataSource');
const aiService = require('./aiService');
const { Op, Sequelize } = require('sequelize');

class NewsService {
    async fetchLatestNews(days = 3, targetLang = 'TR', symbol = null, strict = false) {
        try {
            console.log(`🔄 Fetching News from DB (${targetLang}, Symbol: ${symbol || 'ALL'})...`);
            
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - (days || 3));

            const whereClause = {
                createdAt: { [Op.gte]: oneWeekAgo }
            };

            if (symbol) {
                const upperSymbol = symbol.toUpperCase();
                // 🛡️ NATIVE JSONB SEARCH: Industry standard Postgres operator for performance and accuracy
                const jsonMatch = Sequelize.literal(`impacts @> '[{"asset": "${upperSymbol}"}]'::jsonb`);
                
                whereClause[Op.or] = [
                    { titleEN: { [Op.iLike]: `%${upperSymbol}%` } },
                    { titleTR: { [Op.iLike]: `%${upperSymbol}%` } },
                    { tags: { [Op.iLike]: `%${upperSymbol}%` } },
                    jsonMatch
                ];
            }

            let dbNews = await NewsSummary.findAll({
                where: whereClause,
                order: [['createdAt', 'DESC']],
                limit: 500
            });

            // 🚀 PROACTIVE Yahoo Finance Search (Trigger if DB has < 3 fresh items or none)
            if (symbol && dbNews.length < 3) {
                console.log(`🔍 Symbol ${symbol} has sparse news (${dbNews.length}). Searching LIVE Yahoo Finance...`);
                try {
                    const searchResults = await yahooFinance.search(symbol);
                    if (searchResults && searchResults.news && searchResults.news.length > 0) {
                        const topNews = searchResults.news.slice(0, 5);
                        for (const n of topNews) {
                            try {
                                const analysis = await aiService.batchTranslateNews([{ 
                                    title: n.title, 
                                    contentSnippet: n.publisher || '' 
                                }], 'TR');
                                const trans = analysis[0] || {};
                                
                                await NewsSummary.upsert({
                                    url: n.link || `LIVE_${Date.now()}_${Math.random()}`,
                                    titleEN: n.title,
                                    snippetEN: n.publisher || '',
                                    titleTR: trans.titleTR || n.title,
                                    snippetTR: trans.snippetTR || n.publisher || '',
                                    importanceScore: trans.importanceScore || 90,
                                    sentimentScore: trans.sentimentScore || 50,
                                    tags: symbol.toUpperCase(),
                                    impacts: trans.impacts || [{ asset: symbol.toUpperCase(), score: Math.abs((trans.sentimentScore || 50) - 50) * 2, direction: (trans.sentimentScore || 50) >= 50 ? 'POSITIVE' : 'NEGATIVE' }],
                                    sourceName: n.publisher || 'Yahoo Live',
                                    lastProcessed: new Date()
                                });
                            } catch (e) { console.error(`AI News Analysis failed for ${n.title}: ${e.message}`); }
                        }
                        // Re-fetch after sync
                        dbNews = await NewsSummary.findAll({
                            where: whereClause,
                            order: [['createdAt', 'DESC']],
                            limit: 10
                        });
                    }
                } catch (liveErr) {
                    console.error('Yahoo Live Search Failed:', liveErr.message);
                }
            }

            if (dbNews.length > 0) {
                return dbNews.map(item => {
                    let parsedImpacts = [];
                    try {
                        parsedImpacts = typeof item.impacts === 'string' ? JSON.parse(item.impacts) : (item.impacts || []);
                    } catch(e) {}

                    return {
                        title: (targetLang === 'TR' ? item.titleTR : item.titleEN) || item.titleEN,
                        contentSnippet: (targetLang === 'TR' ? item.snippetTR : item.snippetEN) || item.snippetEN,
                        link: item.url,
                        pubDate: item.createdAt,
                        sourceName: item.sourceName || 'Piyasa', 
                        importanceScore: item.importanceScore || 50,
                        sentimentScore: item.sentimentScore || 50,
                        tags: item.tags || '',
                        impacts: parsedImpacts,
                        isTranslated: !!item.titleTR
                    };
                }).filter(n => {
                    // 🎯 EXPLICIT INTEREST: If user clicks a symbol, we ALWAYS show news for that symbol.
                    // This bypasses the strict filter ONLY for the requested symbol.
                    if (symbol) {
                        const upperSym = symbol.toUpperCase();
                        const matchesSymbol = (n.tags || '').toUpperCase().includes(upperSym) || 
                                           (Array.isArray(n.impacts) && n.impacts.some(imp => imp.asset === upperSym));
                        if (matchesSymbol) return true;
                    }

                    // 🛡️ GENERAL STRICT FILTER: Standard professional signal filtering for the general feed
                    if (strict) {
                        const isGloballySignificant = Math.abs((n.sentimentScore || 50) - 50) >= 20 || (n.importanceScore || 0) >= 85;
                        return isGloballySignificant;
                    }
                    return true;
                }).filter(n => {
                    // 🛡️ SUPER-GUARD: Final manual filter to ensure 100% accuracy before sending to UI correctly milimetrically
                    if (symbol) {
                        const upperSym = symbol.toUpperCase();
                        const titleMatch = (n.title || '').toUpperCase().includes(upperSym);
                        const tagMatch = (n.tags || '').toUpperCase().includes(upperSym);
                        const impactMatch = Array.isArray(n.impacts) && n.impacts.some(imp => imp.asset === upperSym);
                        return titleMatch || tagMatch || impactMatch;
                    }
                    return true;
                });
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
                    { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', name: 'CoinDesk' },
                    { url: 'https://www.investing.com/rss/news.rss', name: 'Investing.com' },
                    { url: 'https://www.reutersagency.com/feed/?best-sectors=business-finance&post_type=best', name: 'Reuters' },
                    { url: 'https://feeds.bloomberg.com/business/news.rss', name: 'Bloomberg' },
                    { url: 'https://news.google.com/rss/search?q=crypto+bitcoin&hl=en-US&gl=US&ceid=US:en', name: 'Google News Crypto' },
                    { url: 'https://www.nasdaq.com/feed/rssoutbound?category=Markets', name: 'Nasdaq Markets' },
                    { url: 'https://www.nasdaq.com/feed/rssoutbound?category=Stocks', name: 'Nasdaq Stocks' },
                    { url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml', name: 'WSJ Markets' },
                    { url: 'https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml', name: 'WSJ Business' },
                    { url: 'https://www.ft.com/markets?format=rss', name: 'Financial Times' },
                    { url: 'https://fortune.com/feed/', name: 'Fortune' },
                    { url: 'https://seekingalpha.com/market_currents.xml', name: 'Seeking Alpha' },
                    { url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', name: 'MarketWatch' },
                    { url: 'https://finance.yahoo.com/news/rssindex', name: 'Yahoo Finance' },
                    { url: 'https://www.dunya.com/rss', name: 'Dunya Gazetesi' },
                    { url: 'https://www.finansgundem.com/rss', name: 'FinansGundem' },
                    { url: 'https://www.hurriyet.com.tr/rss/ekonomi', name: 'BigPara Ekonomi' },
                    { url: 'https://www.theblock.co/rss.xml', name: 'The Block' },
                    { url: 'https://cointelegraph.com/rss', name: 'CoinTelegraph' }
                ];

            let count = 0;
            for(const source of rssUrls) {
                try {
                    const { data } = await axios.get(source.url, { timeout: 10000 });
                    const $ = cheerio.load(data, { xmlMode: true });
                    const items = [];
                    $('item').each((i, el) => {
                        if (i >= 20) return; // Process top 20 per source for deep coverage
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

    async getSentimentAggregation(days = 3, strict = false) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - (days || 3));

            const summaries = await NewsSummary.findAll({
                where: {
                    createdAt: { [Op.gte]: cutoffDate },
                    impacts: { [Op.ne]: null }
                },
                attributes: ['impacts', 'sourceName']
            });

            const assetMap = {};

            summaries.forEach(news => {
                let impacts = [];
                try {
                    impacts = typeof news.impacts === 'string' ? JSON.parse(news.impacts) : news.impacts;
                } catch (e) { return; }

                if (!Array.isArray(impacts)) return;

                impacts.forEach(imp => {
                    const asset = imp.asset;
                    if (!assetMap[asset]) {
                        assetMap[asset] = { asset: asset, totalScore: 0, count: 0, sources: {} };
                    }

                    const score = parseInt(imp.score) * (imp.direction === 'NEGATIVE' ? -1 : 1);
                    assetMap[asset].totalScore += score;
                    assetMap[asset].count += 1;

                    const source = news.sourceName || 'Other';
                    if (!assetMap[asset].sources[source]) {
                        assetMap[asset].sources[source] = { scoreSum: 0, count: 0 };
                    }
                    assetMap[asset].sources[source].scoreSum += score;
                    assetMap[asset].sources[source].count += 1;
                });
            });

            let resultData = Object.values(assetMap).map(data => {
                const avg = Math.round(data.totalScore / data.count);
                const sourceDetails = Object.entries(data.sources).map(([name, sdata]) => ({
                    name, avgScore: Math.round(sdata.scoreSum / sdata.count), count: sdata.count
                })).sort((a, b) => b.count - a.count).slice(0, 5);

                return {
                    asset: data.asset,
                    averageScore: avg,
                    totalCount: data.count,
                    sources: sourceDetails
                };
            });

            // Filter ONLY for UI display if strict is set to TRUE
            if (strict) {
                resultData = resultData.filter(data => Math.abs(data.averageScore) >= 70);
            }

            return resultData.sort((a, b) => b.totalCount - a.totalCount);
        } catch (error) {
            console.error('getSentimentAggregation Error:', error.message);
            return [];
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
    
    /**
     * Specialized sentiment check for a specific asset to help the bot decide on emergency interventions.
     * Returns { shouldIntervene: boolean, reason: string, score: number }
     */
    async getSentimentImpactForAsset(symbol) {
        try {
            const cleanSymbol = symbol.split('/')[0].split(':')[0].toUpperCase();
            const oneDayAgo = new Date();
            oneDayAgo.setHours(oneDayAgo.getHours() - 24);

            const news = await NewsSummary.findAll({
                where: {
                    createdAt: { [Op.gte]: oneDayAgo },
                    [Op.or]: [
                        { titleEN: { [Op.iLike]: `%${cleanSymbol}%` } },
                        { titleTR: { [Op.iLike]: `%${cleanSymbol}%` } },
                        { tags: { [Op.iLike]: `%${cleanSymbol}%` } }
                    ]
                },
                order: [['importanceScore', 'DESC']],
                limit: 10
            });

            if (news.length === 0) return { shouldIntervene: false, score: 50 };

            let negativeSum = 0;
            let totalWeight = 0;
            let criticalReason = "";

            news.forEach(item => {
                const sentiment = item.sentimentScore || 50;
                const weight = (item.importanceScore || 50) / 100;
                
                if (sentiment < 40) { // Bearish news
                    const severity = (40 - sentiment) * weight;
                    negativeSum += severity;
                    if (severity > 15) criticalReason = item.titleTR || item.titleEN;
                }
                totalWeight += weight;
            });

            const interventionScore = totalWeight > 0 ? (negativeSum / totalWeight) : 0;
            
            // If negative impact exceeds 20 points (normalized), suggest intervention
            return {
                shouldIntervene: interventionScore > 20,
                reason: criticalReason || "Birikmiş negatif haber duyarlılığı.",
                score: Math.round(interventionScore)
            };
        } catch (e) {
            console.error('getSentimentImpactForAsset Error:', e.message);
            return { shouldIntervene: false, score: 0 };
        }
    }
}

module.exports = new NewsService();
