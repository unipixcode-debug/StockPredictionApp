const yahooFinance = require('yahoo-finance2').default;
yahooFinance.setGlobalConfig({ validation: { logErrors: false } });
const NewsSummary = require('../models/NewsSummary');
const aiService = require('./aiService');
const { Op } = require('sequelize');

class NewsService {
    async fetchLatestNews(days = 7, targetLang = 'TR') {
        try {
            console.log(`🔄 Fetching News (${targetLang})...`);
            
            // Yahoo Finance News Query
            const result = await yahooFinance.search('Economy', { newsCount: 50 });
            const rawNews = result.news || [];
            
            // Limit to top 50
            const top50 = rawNews.slice(0, 50);

            // Intelligent Cache Check
            if (targetLang === 'TR') {
                const urls = top50.map(n => n.link).filter(Boolean);
                const existingCache = await NewsSummary.findAll({
                    where: { url: { [Op.in]: urls } }
                });
                const cacheMap = new Map(existingCache.map(c => [c.url, c]));

                const itemsToTranslate = [];
                for (const item of top50) {
                    if (!item.link) continue;
                    const cached = cacheMap.get(item.link);
                    if (!cached || !cached.titleTR) {
                        itemsToTranslate.push(item);
                    } else {
                        item.titleTR = cached.titleTR;
                        item.snippetTR = cached.snippetTR;
                        item.importanceScore = cached.importanceScore;
                    }
                }

                if (itemsToTranslate.length > 0) {
                    console.log(`📝 Intelligent Cache: Requires TR translation for ${itemsToTranslate.length} new news items...`);
                    try {
                        const translatedChunk = await aiService.batchTranslateNews(itemsToTranslate, 'TR');
                        for (let j = 0; j < itemsToTranslate.length; j++) {
                            const original = itemsToTranslate[j];
                            const translated = (translatedChunk && translatedChunk[j]) ? translatedChunk[j] : original; 
                            
                            const titleTR = translated.titleTR || original.title;
                            const snippetTR = translated.snippetTR || original.contentSnippet || original.content || '';

                            const [record, created] = await NewsSummary.findOrCreate({
                                where: { url: original.link },
                                defaults: {
                                    url: original.link,
                                    titleEN: original.title,
                                    snippetEN: original.contentSnippet || original.content || '',
                                    titleTR: titleTR,
                                    snippetTR: snippetTR,
                                    importanceScore: original.importanceScore || 50,
                                    sentimentScore: translated.sentimentScore || 50,
                                    tags: translated.tags || '',
                                    lastProcessed: new Date()
                                }
                            });

                            if (!created) {
                                await record.update({
                                    titleEN: original.title,
                                    snippetEN: original.contentSnippet || original.content || '',
                                    titleTR: titleTR,
                                    snippetTR: snippetTR,
                                    importanceScore: original.importanceScore || 50,
                                    sentimentScore: translated.sentimentScore || 50,
                                    tags: translated.tags || '',
                                    lastProcessed: new Date()
                                });
                            }
                            
                            // Add to memory for immediate return
                            original.titleTR = titleTR;
                            original.snippetTR = snippetTR;
                        }
                    } catch (err) {
                        console.error('Translation batch error:', err.message);
                    }
                }
            }

            // UNIFIED RETURN: Always use the same structure so frontend doesn't break
            return top50.map(item => {
                const cached = NewsSummary.cacheMap?.get(item.link); // Mock logic for mapping tags
                return {
                    ...item,
                    title: (targetLang === 'TR' ? item.titleTR : item.title) || item.title,
                    contentSnippet: (targetLang === 'TR' ? item.snippetTR : (item.contentSnippet || item.content)) || item.contentSnippet || item.content,
                    isTranslated: !!item.titleTR && item.titleTR !== item.title,
                    sentimentScore: item.sentimentScore || 50,
                    tags: item.tags || ''
                };
            });

        } catch (error) {
            console.error('FetchNews Error:', error.message);
            throw error;
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
