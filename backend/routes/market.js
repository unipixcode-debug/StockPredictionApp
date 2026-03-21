const express = require('express');
const router = express.Router();
const flowService = require('../services/flowService');
const marketDataService = require('../services/marketDataService');
const cacheService = require('../services/cacheService');
const newsService = require('../services/newsService');
const axios = require('axios');
const cheerio = require('cheerio');
const aiService = require('../services/aiService');
const NewsSummary = require('../models/NewsSummary');
const scraperService = require('../services/scraperService');
const DailyMarketInsight = require('../models/DailyMarketInsight');
const { Op } = require('sequelize');

// Market Flow Visualization Data
router.get('/flow', async (req, res) => {
    try {
        const { timeframe } = req.query;
        const data = await flowService.getGlobalFlow(timeframe || '1G');
        res.json(data);
    } catch (error) {
        console.error('Flow API error:', error);
        res.status(500).json({ error: 'Failed to fetch flow data' });
    }
});

// Dashboard Stat Cards — Real Market Indicators
router.get('/stats', async (req, res) => {
    try {
        const cachedStats = cacheService.getStats();
        if (cachedStats) {
            return res.json(cachedStats);
        }

        // Fallback if cache not ready
        console.log('⚠️ Cache missed for /stats, falling back to service...');
        const indicators = await marketDataService.getGlobalIndicators();
        if (!indicators) throw new Error('No data');

        const vix = indicators.vix;
        const dxy = indicators.dxy;
        const btc = indicators.btc;
        const pressure = marketDataService.calculateMarketPressure(indicators);

        // BTC Correlation label
        let btcLabel = 'Orta';
        let btcTrend = `${btc?.change >= 0 ? '+' : ''}${btc?.change?.toFixed(2) ?? '0'}%`;
        if (btc?.change > 2) btcLabel = 'Güçlü';
        else if (btc?.change < -2) btcLabel = 'Zayıf';

        // VIX Risk label
        let vixLabel = 'Orta';
        let vixTrend = `${vix?.change >= 0 ? '+' : ''}${vix?.change?.toFixed(2) ?? '0'}%`;
        if (vix?.price < 15) { vixLabel = 'Düşük'; }
        else if (vix?.price > 25) { vixLabel = 'Yüksek'; }

        // DXY Strength label
        let dxyLabel = 'Orta';
        let dxyTrend = `${dxy?.change >= 0 ? '+' : ''}${dxy?.change?.toFixed(2) ?? '0'}%`;
        if (dxy?.change > 0.5) { dxyLabel = 'Güçlü'; }
        else if (dxy?.change < -0.5) { dxyLabel = 'Zayıf'; }

        // Market Sentiment based on pressure score
        let sentimentLabel = 'Nötr';
        let sentimentTrend = 'Yatay';
        if (pressure < 40) { sentimentLabel = 'Pozitif'; sentimentTrend = 'Boğa'; }
        else if (pressure > 60) { sentimentLabel = 'Negatif'; sentimentTrend = 'Ayı'; }

        res.json({
            btcCorrelation: { label: btcLabel, trend: btcTrend, price: btc?.price },
            vix: { label: vixLabel, trend: vixTrend, price: vix?.price },
            dxy: { label: dxyLabel, trend: dxyTrend, price: dxy?.price },
            sentiment: { label: sentimentLabel, trend: sentimentTrend, pressureScore: pressure },
            raw: { vix, dxy, btc, sp500: indicators.sp500, gold: indicators.gold, nasdaq: indicators.nasdaq }
        });
    } catch (error) {
        console.error('Stats API error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

router.get('/news', async (req, res) => {
    try {
        const { lang, days } = req.query;
        const daysInt = parseInt(days) || 7; // Default 7 days
        
        const requestedLang = (lang || '').toUpperCase() === 'TR' ? 'TR' : 'EN';
        const news = await newsService.fetchLatestNews(daysInt, requestedLang);
        res.json(news);
    } catch (error) {
        console.error('News API error:', error);
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});

// Deep Article Reader & Translator
router.get('/read-article', async (req, res) => {
    try {
        const { url, title, snippet, lang } = req.query;
        if (!url) return res.status(400).json({ error: 'URL is required' });

        // 1. Check DB Cache First
        const existingSummary = await NewsSummary.findByPk(url);
        if (existingSummary) {
            return res.json({
                url,
                content: lang === 'EN' ? existingSummary.summaryEN : existingSummary.summaryTR,
                isCached: true
            });
        }

        let cleanText = '';
        let extractedLength = 0;

        try {
            // Fetch raw HTML
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                },
                timeout: 8000
            });

            const $ = cheerio.load(response.data);
            $('script, style, nav, footer, header, iframe, aside').remove();
            
            let articleText = '';
            const mainContent = $('article, main, .article-content').first();
            if (mainContent.length > 0) {
                articleText = mainContent.text();
            } else {
                $('p, h1, h2, h3').each((i, el) => {
                    articleText += $(el).text() + '\n\n';
                });
            }
            
            cleanText = articleText.replace(/\s+/g, ' ').trim();
            extractedLength = cleanText.length;
            
        } catch (fetchError) {
            console.warn(`Scraping failed for ${url}, fallback to snippet`);
        }

        if (extractedLength < 150) {
            cleanText = `Başlık: ${title || ''}\nÖzet: ${snippet || ''}\n\nBu makalenin tam metni çekilemedi.`;
        }

        // 2. AI Summarize (Both Languages)
        const analysis = await aiService.summarizeAndTranslateArticle(cleanText);

        // 3. Save to DB for future use
        console.log(`💾 Saving generated TR summary for: ${url}`);
        
        // Find existing to preserve importanceScore
        const existingRecord = await NewsSummary.findOne({ where: { url } });
        
        await NewsSummary.upsert({
            url: url,
            summaryTR: analysis.tr || analysis.summaryTR || analysis.TurkishSummary || analysis.turkish_summary || '',
            summaryEN: analysis.en || analysis.summaryEN || analysis.EnglishSummary || analysis.english_summary || '',
            importanceScore: existingRecord ? existingRecord.importanceScore : 50,
            titleTR: existingRecord?.titleTR,
            titleEN: existingRecord?.titleEN,
            snippetTR: existingRecord?.snippetTR,
            snippetEN: existingRecord?.snippetEN
        });

        res.json({
            url,
            content: lang === 'EN' ? analysis.en : analysis.tr,
            extractedLength,
            isCached: false
        });

    } catch (error) {
        console.error('Article Reader API error:', error.message);
        res.status(500).json({ error: 'Failed to read or translate article' });
    }
});

// AI Trade Ideas (Priority: Archive, Fallback: Scrape)
router.get('/ideas', async (req, res) => {
    try {
        // 1. Check Archive First (Today's Ideas)
        const today = new Date().toISOString().split('T')[0];
        const archivedIdeas = await DailyMarketInsight.findAll({
            where: { date: today, type: 'TRADE_IDEA' },
            order: [['score', 'DESC']]
        });

        if (archivedIdeas.length > 0) {
            return res.json(archivedIdeas.map(i => ({
                symbol: i.symbol,
                score: i.score,
                probability: i.metadata?.probability || 'N/A',
                source: 'Danelfin (Archived)'
            })));
        }

        // 2. Fallback to Scraper
        const ideas = await scraperService.getDanelfinTradeIdeas();
        res.json(ideas);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch trade ideas' });
    }
});

// Market Analysis (Priority: Archive, Fallback: Scrape)
router.get('/analysis', async (req, res) => {
    try {
        // 1. Check Archive First
        const archivedAnalysis = await DailyMarketInsight.findAll({
            where: { type: 'MARKET_ANALYSIS' },
            limit: 10,
            order: [['date', 'DESC'], ['createdAt', 'DESC']]
        });

        if (archivedAnalysis.length > 0) {
            return res.json(archivedAnalysis.map(a => ({
                title: a.title,
                link: a.content,
                author: a.metadata?.author || 'Investing.com',
                source: 'Investing (Archived)'
            })));
        }

        // 2. Fallback to Scraper
        const analysis = await scraperService.getInvestingAnalysis();
        res.json(analysis);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch analysis' });
    }
});

// Daily Global Insights (Archived)
router.get('/insights', async (req, res) => {
    try {
        const insights = await DailyMarketInsight.findAll({
            limit: 20,
            order: [['date', 'DESC'], ['createdAt', 'DESC']]
        });
        res.json(insights);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch insights' });
    }
});

// S&P 500 Heatmap Data
router.get('/heatmap', async (req, res) => {
    try {
        const data = await marketDataService.getHeatmapData();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch heatmap data' });
    }
});

// Public Package & Pricing List
router.get('/packages', async (req, res) => {
    try {
        const GlobalSetting = require('../models/GlobalSetting');
        const packageSetting = await GlobalSetting.findOne({ where: { key: 'token_packages' } });
        if (packageSetting) {
            return res.json(JSON.parse(packageSetting.value));
        }
        res.json([]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
