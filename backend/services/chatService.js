const aiService = require('./aiService');
const marketDataService = require('./marketDataService');
const newsService = require('./newsService');
const Prediction = require('../models/Prediction');

class ChatService {
    async processUserMessage(message, history = []) {
        try {
            // 1. Gather Context with individual timeouts/fallbacks
            let globalIndicators = null;
            let pressure = 50;
            let latestPredictions = [];
            let topNews = [];

            try {
                const indicatorsPromise = marketDataService.getGlobalIndicators();
                globalIndicators = await Promise.race([
                    indicatorsPromise,
                    new Promise(resolve => setTimeout(() => resolve(null), 3000))
                ]);
                if (globalIndicators) {
                    pressure = marketDataService.calculateMarketPressure(globalIndicators);
                }
            } catch (e) { console.warn("Chat context: indicators failed."); }

            try {
                latestPredictions = await Prediction.findAll({
                    limit: 5,
                    order: [['createdAt', 'DESC']]
                });
            } catch (e) { console.warn("Chat context: predictions failed."); }

            try {
                // Short timeout for news, we don't want to block the whole chat
                const newsPromise = newsService.fetchLatestNews('', 'EN');
                topNews = await Promise.race([
                    newsPromise,
                    new Promise(resolve => setTimeout(() => resolve([]), 4000))
                ]);
            } catch (e) { console.warn("Chat context: news failed."); }

            // 2. Format Context
            const contextText = this.formatContext(globalIndicators, pressure, latestPredictions, topNews);

            // 3. Prompt Construction
            const systemPrompt = `Sen, PredictPro platformunun yapay zeka finans asistanısın. 
Görevin, kullanıcılara sunulan güncel pazar verileri, haberler ve sistem tahminleri ışığında bilgilendirici analizler sunmaktır.

KURALLAR:
1. YATIRIM TAVSİYESİ VERME.
2. Profesyonel ve yardımcı ton kullan.
3. Elindeki verileri (Piyasa baskısı: ${pressure}/100 vb.) kullanarak konuş.

GÜNCEL VERİLER:
${contextText}`;

            // 4. Generate Content
            // We pass the full history directly to generateContent which now handles arrays
            const promptForAI = [
                { role: "system", content: systemPrompt },
                ...history,
                { role: "user", content: message }
            ];

            const response = await aiService.generateContent(promptForAI, "gemini-1.5-flash");
            return response;

        } catch (error) {
            console.error("ChatService Error:", error.message);
            // Re-throw so the route knows it failed
            throw error;
        }
    }

    formatContext(indicators, pressure, predictions, news) {
        let text = `Piyasa Baskı Skoru: ${pressure}/100 (Yüksek = Bearish/Riskli)\n`;
        
        if (indicators) {
            text += `Önemli Göstergeler:\n`;
            if (indicators.vix) text += `- VIX: ${indicators.vix.price}\n`;
            if (indicators.gold) text += `- Altın: ${indicators.gold.price} (${indicators.gold.change}%)\n`;
            if (indicators.dxy) text += `- DXY: ${indicators.dxy.price}\n`;
            if (indicators.sp500) text += `- S&P 500: ${indicators.sp500.price}\n`;
        }

        text += `\nSon Tahminler:\n`;
        predictions.forEach(p => {
            text += `- ${p.symbol}: ${p.direction} (Güven: ${p.confidence}%, Skor: ${p.score})\n`;
        });

        text += `\nÖnemli Haber Başlıkları:\n`;
        news.slice(0, 5).forEach(n => {
            text += `- ${n.title}\n`;
        });

        return text;
    }
}

module.exports = new ChatService();
