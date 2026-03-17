const aiService = require('./aiService');
const marketDataService = require('./marketDataService');
const newsService = require('./newsService');
const Prediction = require('../models/Prediction');

class ChatService {
    async processUserMessage(message, history = []) {
        try {
            // 1. Gather Context
            const globalIndicators = await marketDataService.getGlobalIndicators();
            const pressure = marketDataService.calculateMarketPressure(globalIndicators);
            const latestPredictions = await Prediction.findAll({
                limit: 5,
                order: [['createdAt', 'DESC']]
            });
            // Fetch news in EN to avoid AI translation overhead (translation takes 12+ seconds)
            const topNewsPromise = newsService.fetchLatestNews('', 'EN');
            const topNews = await Promise.race([
                topNewsPromise,
                new Promise(resolve => setTimeout(() => resolve([]), 4000)) // 4s max wait
            ]);

            // 2. Format Context for AI
            const contextText = this.formatContext(globalIndicators, pressure, latestPredictions, topNews);

            // 3. Build System Prompt
            const systemPrompt = `Sen, PredictPro platformunun yapay zeka finans asistanısın. 
Görevin, kullanıcılara sunulan güncel pazar verileri, haberler ve sistem tahminleri ışığında bilgilendirici analizler sunmaktır.

KRİTİK KURALLAR:
1. KESİNLİKLE YATIRIM TAVSİYESİ VERME. Her yanıtının sonunda veya başında "Bu bilgiler kesinlikle yatırım tavsiyesi değildir." ibaresini kullan.
2. Sadece sana sağlanan güncel verileri ve genel finansal bilgilerini kullan.
3. Yanıtlarını profesyonel, objektif ve yardımcı bir tonda tut.
4. Karmaşık terimleri basitçe açıkla.
5. Kullanıcıya grafikler, duyarlılık skorları ve piyasa baskısı hakkında yorum yap.

GÜNCEL SİSTEM VERİLERİ (CONTEXT):
${contextText}`;

            // 4. Call AI
            const messages = [
                { role: "system", content: systemPrompt },
                ...history,
                { role: "user", content: message }
            ];

            const response = await aiService.generateChatContent(messages);
            return response;
        } catch (error) {
            console.error("ChatService Error:", error.message, error.stack);
            return "Üzgünüm, şu an bağlantı kuramıyorum. Lütfen daha sonra tekrar deneyin.";
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
