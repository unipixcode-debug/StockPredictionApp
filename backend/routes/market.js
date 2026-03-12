const express = require('express');
const router = express.Router();
const flowService = require('../services/flowService');
const marketDataService = require('../services/marketDataService');

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

router.get('/news', async (req, res) => {
    try {
        const { symbol, lang } = req.query;
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
        const { url, title, snippet } = req.query;
        if (!url) return res.status(400).json({ error: 'URL is required' });

        let cleanText = '';
        let extractedLength = 0;

        try {
            // 1. Fetch raw HTML from source
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                },
                timeout: 8000 // 8s timeout
            });

            // 2. Parse HTML and extract main text blocks using cheerio
            const $ = cheerio.load(response.data);
            
            // Remove scripts, styles, nav, footer to clean up text
            $('script, style, nav, footer, header, iframe, aside, .ad, .advertisement').remove();
            
            let articleText = '';
            // Try to locate main article content, fallback to body paragraphs
            const mainContent = $('article, main, .article-content, .post-content').first();
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
            console.warn(`Scraping failed for ${url}, falling back to snippet. Error: ${fetchError.message}`);
        }

        // Fallback to title and snippet if scraping failed or returned too little content
        if (extractedLength < 150) {
            console.log(`Using fallback text for ${url} (Extracted Length: ${extractedLength})`);
            cleanText = `Başlık: ${title || 'Bilinmiyor'}\nÖzet: ${snippet || 'Kısa bilgi bulunamadı.'}\n\nBu makalenin tam metni güvenlik duvarı (bot erişimi) nedeniyle çekilemedi. Lütfen orijinal kaynağa giderek tamamını okuyunuz.`;
            extractedLength = cleanText.length;
        }

        // 3. Summarize and Translate using Gemini in BOTH languages
        const markdownAnalysis = await aiService.summarizeAndTranslateArticle(cleanText);

        res.json({
            url,
            content: markdownAnalysis,
            extractedLength,
            usedFallback: extractedLength < 150
        });

    } catch (error) {
        console.error('Article Reader API error:', error.message);
        res.status(500).json({ error: 'Failed to read or translate article', details: error.message });
    }
});

module.exports = router;
