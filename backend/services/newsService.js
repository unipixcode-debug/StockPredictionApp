const RSSParser = require('rss-parser');
const parser = new RSSParser();
const DataSource = require('../models/DataSource');
const NewsSummary = require('../models/NewsSummary');
const aiService = require('./aiService');
const { Op } = require('sequelize');

class NewsService {
    constructor() {
        this.staticFeeds = [
            'https://www.cnbc.com/id/10000664/device/rss/rss.html',
            'https://www.cnbc.com/id/15839069/device/rss/rss.html',
            'https://www.investing.com/rss/news_25.rss',
            'https://cointelegraph.com/rss/tag/bitcoin',
            'https://www.coindesk.com/arc/outboundfeeds/rss/',
            'https://www.bloomberg.com/politics/feeds/site.xml',
            'https://www.reutersagency.com/feed/?best-sectors=business-finance',
            'https://www.marketwatch.com/rss/topstories'
        ];
        
        // Mapping for better search results
        this.searchMappings = {
            'BTC-USD': 'Bitcoin Crypto',
            'ETH-USD': 'Ethereum Crypto',
            'AAPL': 'Apple Stock Finance',
            'TSLA': 'Tesla Stock Finance',
            'GC=F': 'Gold Price Market',
            '^VIX': 'VIX Volatility Market'
        };
    }

    calculateImportanceScore(item) {
        let score = 50; // Base score
        const text = (item.title + " " + (item.contentSnippet || "")).toLowerCase();
        
        // High impact keywords
        const highImpactWords = ['fed', 'faiz', 'enflasyon', 'kriz', 'çöküş', 'ralli', 'merkez bankası', 'savaş', 'rates', 'inflation', 'crisis', 'crash', 'rally', 'central bank', 'war', 'ai', 'yapay zeka', 'bitcoin', 'bankruptcy', 'iflas'];
        // Medium impact keywords
        const mediumImpactWords = ['bilanço', 'kar', 'zarar', 'earnings', 'profit', 'loss', 'büyüme', 'growth', 'hisse', 'stock', 'piyasa', 'market', 'yatırım', 'investment'];

        for (const word of highImpactWords) {
            if (text.includes(word)) score += 15;
        }
        for (const word of mediumImpactWords) {
            if (text.includes(word)) score += 8;
        }

        // Time decay (newer is more important)
        const ageHours = (Date.now() - new Date(item.pubDate).getTime()) / (1000 * 60 * 60);
        if (ageHours < 1) score += 20;
        else if (ageHours < 4) score += 10;
        else if (ageHours < 12) score += 5;
        else if (ageHours > 24) score -= 10;
        else if (ageHours > 72) score -= 30;

        // Add a small pseudo-random variation based on title length to break ties and make it look natural
        score += (item.title?.length || 0) % 5;

        return Math.min(Math.max(score, 10), 99); // Cap between 10 and 99
    }

    async getFeedsWithNames() {
        const defaultFeeds = [
            { name: 'CNBC', url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html' },
            { name: 'CNBC Main', url: 'https://www.cnbc.com/id/15839069/device/rss/rss.html' },
            { name: 'Investing.com', url: 'https://www.investing.com/rss/news_25.rss' },
            { name: 'Cointelegraph', url: 'https://cointelegraph.com/rss/tag/bitcoin' },
            { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
            { name: 'Bloomberg', url: 'https://www.bloomberg.com/politics/feeds/site.xml' },
            { name: 'Reuters', url: 'https://www.reutersagency.com/feed/?best-sectors=business-finance' },
            { name: 'MarketWatch', url: 'https://www.marketwatch.com/rss/topstories' }
        ];

        let dynamicSources = [];
        try {
            dynamicSources = await DataSource.findAll({ where: { type: 'NEWS_RSS', isActive: true } });
        } catch (dbError) {
            console.warn('DB Error fetching dynamic feeds, falling back to JSON:', dbError.message);
        }

        const dynamicFeeds = dynamicSources.map(s => ({ name: s.name, url: s.url }));
        const allFeeds = [...defaultFeeds, ...dynamicFeeds];
        const uniqueFeeds = Array.from(new Map(allFeeds.map(item => [item.url, item])).values());
        
        return uniqueFeeds;
    }

    async fetchLatestNews(days = 7) {
        try {
            // First, cleanup news older than 1 year
            await this.cleanupOldNews();

            const feeds = await this.getFeedsWithNames();
            let allItems = [];

            const fetchPromises = feeds.map(async (feed) => {
                try {
                    const parsed = await parser.parseURL(feed.url);
                    return parsed.items.map(item => ({
                        ...item,
                        sourceName: feed.name,
                        importanceScore: this.calculateImportanceScore(item)
                    }));
                } catch (e) {
                    console.error(`Error parsing feed ${feed.name}:`, e.message);
                    return [];
                }
            });

            const results = await Promise.all(fetchPromises);
            allItems = results.flat();

            // Filter by date (if days is provided)
            if (days && days > 0) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - days);
                allItems = allItems.filter(item => new Date(item.pubDate) >= cutoffDate);
            }

            // Sort by importance then by date
            allItems.sort((a, b) => {
                const scoreDiff = (b.importanceScore || 0) - (a.importanceScore || 0);
                if (Math.abs(scoreDiff) > 10) return scoreDiff;
                return new Date(b.pubDate) - new Date(a.pubDate);
            });

            return allItems.slice(0, 50); // Return top 50
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
