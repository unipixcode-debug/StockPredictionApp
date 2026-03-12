const RSSParser = require('rss-parser');
const parser = new RSSParser();
const DataSource = require('../models/DataSource');
const aiService = require('./aiService');

class NewsService {
    constructor() {
        this.staticFeeds = [
            'https://www.cnbc.com/id/10000664/device/rss/rss.html',
            'https://www.cnbc.com/id/15839069/device/rss/rss.html',
            'https://www.investing.com/rss/news_25.rss',
            'https://cointelegraph.com/rss/tag/bitcoin',
            'https://www.coindesk.com/arc/outboundfeeds/rss/'
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

    async getFeedsWithNames() {
        const defaultFeeds = [
            { name: 'CNBC', url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html' },
            { name: 'CNBC Main', url: 'https://www.cnbc.com/id/15839069/device/rss/rss.html' },
            { name: 'Investing.com', url: 'https://www.investing.com/rss/news_25.rss' },
            { name: 'Cointelegraph', url: 'https://cointelegraph.com/rss/tag/bitcoin' },
            { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' }
        ];

        let dynamicSources = [];
        try {
            // Try database first
            dynamicSources = await DataSource.findAll({ where: { type: 'NEWS_RSS', isActive: true } });
        } catch (dbError) {
            console.warn('DB Error fetching dynamic feeds, falling back to JSON:', dbError.message);
        }

        try {
            // If DB is empty or failed, try JSON fallback
            if (!dynamicSources || dynamicSources.length === 0) {
                const fs = require('fs');
                const path = require('path');
                const fallbackFilePath = path.join(__dirname, '..', 'fallback_sources.json');
                if (fs.existsSync(fallbackFilePath)) {
                    const fallbackData = JSON.parse(fs.readFileSync(fallbackFilePath, 'utf8'));
                    dynamicSources = fallbackData.filter(s => s.type === 'NEWS_RSS' && s.active !== false);
                }
            }

            const dynamicFeeds = dynamicSources.map(s => ({ name: s.name, url: s.url }));
            
            // Deduplicate by URL
            const allFeeds = [...defaultFeeds, ...dynamicFeeds];
            const uniqueFeeds = Array.from(new Map(allFeeds.map(item => [item.url, item])).values());
            
            return uniqueFeeds;
        } catch (error) {
            console.error('Critical error in getFeedsWithNames:', error.message);
            return defaultFeeds;
        }
    }

    async getFeeds() {
        const feeds = await this.getFeedsWithNames();
        return feeds.map(f => f.url);
    }

    async fetchLatestNews(symbol = '', lang = 'EN') {
        try {
            const query = this.searchMappings[symbol] || symbol;
            const getFeedsResponse = await this.getFeedsWithNames();
            const allNews = [];
            
            console.log(`Fetching news for: ${query} across ${getFeedsResponse.length} feeds...`);

            for (const { name, url } of getFeedsResponse) {
                try {
                    const feed = await parser.parseURL(url);
                    allNews.push(...feed.items.map(item => ({
                        title: item.title,
                        link: item.link,
                        pubDate: item.pubDate,
                        contentSnippet: item.contentSnippet,
                        sourceName: name || feed.title || 'Other' // Extract source name
                    })));
                } catch (e) {
                    console.error(`RSS fetch error (${url}):`, e.message);
                }
            }

            console.log(`Total raw news items found: ${allNews.length}`);

            // Sort all news by publication date descending
            allNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

            let finalNews = allNews.slice(0, 50);

            // Filter news based on query keywords
            if (query) {
                const keywords = query.toLowerCase().split(' ');
                const filtered = allNews.filter(n => {
                    const text = (n.title + ' ' + (n.contentSnippet || '')).toLowerCase();
                    return keywords.some(kw => text.includes(kw));
                });
                console.log(`Filtered news items for "${query}": ${filtered.length}`);
                finalNews = filtered.slice(0, 15);
            }

            if (lang === 'TR') {
                finalNews = await aiService.translateNewsItems(finalNews, lang);
            }

            return finalNews;
        } catch (error) {
            console.error('News fetch error:', error);
            return [];
        }
    }

    /**
     * AI Sentiment Analysis using Multi-Provider AIService
     */
    async analyzeSentiment(newsList) {
        if (!newsList || newsList.length === 0) {
            console.log("No news to analyze. Returning 50.");
            return 50;
        }

        try {
            console.log(`Analyzing sentiment for ${newsList.length} items...`);
            // Prepare a text prompt summarizing the news
            const newsSummaries = newsList.map(n => `- ${n.title}: ${n.contentSnippet || ''}`).join('\n');
            const prompt = `Analyze the sentiment of the following financial news and return a single integer score between 0 and 100. 
0 means extremely negative/bearish, 50 means neutral, and 100 means extremely positive/bullish. 
Respond ONLY with the integer number.

News:
${newsSummaries}`;

            const responseText = await aiService.generateContent(prompt, "gemini-1.5-flash");
            const score = parseInt(responseText.trim(), 10);

            if (!isNaN(score) && score >= 0 && score <= 100) {
                return score;
            } else {
                console.error("Failed to parse AI response to a valid score:", responseText);
                return 50;
            }
        } catch (error) {
            console.error("AI Sentiment Analysis Error:", error.message);
            return 50; // default neutral
        }
    }
}

module.exports = new NewsService();
