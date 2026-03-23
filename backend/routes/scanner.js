const express = require('express');
const router = express.Router();
const marketDataService = require('../services/marketDataService');
const aiService = require('../services/aiService');
const newsService = require('../services/newsService');

// GET /api/scanner/top
router.get('/top', async (req, res) => {
    console.log('🚀 [Scanner API] GET Request received for /top');
    try {
        const limit = parseInt(req.query.limit) || 40;
        const market = req.query.market || 'crypto';
        const data = await marketDataService.getScannerData(market, limit);
        res.json(data);
    } catch (error) {
        console.error('Scanner API Error:', error);
        res.status(500).json({ error: 'Tarayıcı verisi alınamadı' });
    }
});

// POST /api/scanner/analyze
router.post('/analyze', async (req, res) => {
    try {
        const { symbol, rsi, macd, price } = req.body;
        const sentimentSummary = await newsService.getSentimentAggregation(3);
        
        const prompt = `Sen profesyonel bir AI Trading Botusun. Aşağıdaki teknik verileri analiz et:
        Sembol: ${symbol}
        Fiyat: ${price}
        RSI (14): ${rsi}
        MACD: ${JSON.stringify(macd)}
        Haber Duyarlılığı: ${JSON.stringify(sentimentSummary.slice(0, 3))}

        GÖREV: Varlık için net bir işlem kararı (AL, SAT veya BEKLE) ver.
        Pozisyon yönünü (LONG veya SHORT) ve yatırım vadesini (KISA VADE veya UZUN VADE) belirle.
        Teknik seviyelere göre Giriş, Hedef (TP) ve Stop Loss (SL) seviyelerini belirle.
        2 cümlelik bir strateji açıklaması yap.

        ÖNEMLİ: Yanıtın TAMAMEN TÜRKÇE olsun.
        
        Format gereksinimi (Satır satır göster, tablo yapma):
        Karar : [AL/SAT/BEKLE]
        Yön : [LONG/SHORT]
        Vade : [KISA VADE/UZUN VADE]
        Giriş : [Fiyat]
        Hedef (TP) : [Seviye]
        Stop (SL) : [Seviye]
        Strateji Notu : [Açıklama]
        `;

        const aiResponse = await aiService.generateContent(prompt, "gemini-flash-latest");
        res.json({ analysis: aiResponse });
    } catch (error) {
        console.error('Analysis API Error:', error);
        res.status(500).json({ error: 'Analiz yapılamadı' });
    }
});

module.exports = router;
