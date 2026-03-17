const express = require('express');
const router = express.Router();
const flowService = require('../services/flowService');
const marketDataService = require('../services/marketDataService');
const cacheService = require('../services/cacheService');

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
// News Endpoints
const newsService = require('../services/newsService');

const axios = require('axios');
const cheerio = require('cheerio');
const aiService = require('../services/aiService');
const NewsSummary = require('../models/NewsSummary');

router.get('/news', async (req, res) => {
    try {
        const { symbol, lang } = req.query;
        
        // Use cache for general news if no symbol specified
        if (!symbol) {
            const cachedNews = cacheService.getNews(lang || 'TR');
            if (cachedNews) {
                return res.json(cachedNews);
            }
        }

        const news = await newsService.fetchLatestNews(symbol || '', lang || 'EN');
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
            console.log(`[DB CACHE] Found summary for ${url}`);
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
        await NewsSummary.upsert({
            url: url,
            summaryTR: analysis.tr,
            summaryEN: analysis.en,
            importanceScore: 50 // Default
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

module.exports = router;
