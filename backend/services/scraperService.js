const axios = require('axios');
const cheerio = require('cheerio');
const DailyMarketInsight = require('../models/DailyMarketInsight');

class ScraperService {
    constructor() {
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    }

    /**
     * Scrapes Trade Ideas from Danelfin
     */
    async getDanelfinTradeIdeas() {
        try {
            console.log('🔍 Scraping Danelfin Trade Ideas...');
            const { data } = await axios.get('https://danelfin.com/trade-ideas', {
                headers: { 'User-Agent': this.userAgent }
            });

            const $ = cheerio.load(data);
            const ideas = [];

            // Updated selectors based on verified browser research
            $('tr').each((i, element) => {
                const ticker = $(element).find('a[href^="/stock/"] span span').first().text().trim();
                const scoreAttr = $(element).find('div[role="img"][aria-label*="out of 10"]').attr('aria-label');
                const probability = $(element).find('td:nth-child(4) [class*="PercentageDisplay"]').text().trim();

                if (ticker && scoreAttr) {
                    const score = parseInt(scoreAttr.split(' ')[0]) || 0;
                    ideas.push({
                        symbol: ticker,
                        score: score,
                        probability: probability || 'N/A',
                        source: 'Danelfin AI'
                    });
                }
            });

            console.log(`✅ Scraped ${ideas.length} ideas from Danelfin.`);
            return ideas.slice(0, 10);
        } catch (error) {
            console.error('Danelfin scrape failed:', error.message);
            return [];
        }
    }

    /**
     * Scrapes Latest Analysis from Investing.com
     */
    async getInvestingAnalysis() {
        try {
            console.log('🔍 Scraping Investing.com Analysis...');
            const { data } = await axios.get('https://www.investing.com/analysis', {
                headers: { 'User-Agent': this.userAgent }
            });

            const $ = cheerio.load(data);
            const articles = [];

            $('a[href*="/analysis/"].font-bold').each((i, el) => {
                const title = $(el).text().trim();
                let href = $(el).attr('href');
                const link = href.startsWith('http') ? href : ('https://www.investing.com' + href);
                const author = $(el).closest('article, .articleItem').find('.articleDetails .byLine').text().replace('By ', '').trim() || 'Investing.com';

                if (title && title.length > 5) {
                    articles.push({
                        title,
                        link,
                        author,
                        source: 'Investing.com Analysis'
                    });
                }
            });

            console.log(`✅ Scraped ${articles.length} articles from Investing.com.`);
            return articles.slice(0, 10);
        } catch (error) {
            console.error('Investing Analysis scrape failed:', error.message);
            return [];
        }
    }

    /**
     * Starts the daily background archiving process
     */
    startBackgroundTasks() {
        console.log('📅 Scraper background tasks started...');
        // Run immediately on start (using a small delay to let DB connect)
        setTimeout(() => {
            this.performDailyArchive();
        }, 5000);

        // Run every 24 hours
        setInterval(() => {
            this.performDailyArchive();
        }, 24 * 60 * 60 * 1000);
    }

    async performDailyArchive() {
        try {
            console.log('📦 Performing daily market archive...');

            // 1. Archive Danelfin Ideas
            const ideas = await this.getDanelfinTradeIdeas();
            if (ideas.length > 0) {
                for (const idea of ideas) {
                    await DailyMarketInsight.upsert({
                        date: new Date().toISOString().split('T')[0],
                        type: 'TRADE_IDEA',
                        source: 'Danelfin',
                        symbol: idea.symbol,
                        score: idea.score,
                        metadata: { probability: idea.probability },
                        title: `AI Trade Idea: ${idea.symbol}`
                    });
                }
            }

            // 2. Archive Investing Analysis
            const analyses = await this.getInvestingAnalysis();
            if (analyses.length > 0) {
                for (const analysis of analyses) {
                    await DailyMarketInsight.upsert({
                        date: new Date().toISOString().split('T')[0],
                        type: 'MARKET_ANALYSIS',
                        source: 'Investing',
                        title: analysis.title,
                        content: analysis.link,
                        metadata: { author: analysis.author }
                    });
                }
            }

            console.log('✅ Daily market archive completed.');
        } catch (error) {
            console.error('Error in daily archive:', error.message);
        }
    }
}

module.exports = new ScraperService();
