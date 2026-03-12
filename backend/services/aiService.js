const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai');
const axios = require('axios');

class AIService {
    constructor() {
        this.providers = [];
        this.initProviders();
    }

    initProviders() {
        try {
            // 1. Gemini Keys (Supports up to 5 as requested, plus the main one)
            const geminiKeys = [
                process.env.GEMINI_API_KEY,
                process.env.GEMINI_API_KEY_1,
                process.env.GEMINI_API_KEY_2,
                process.env.GEMINI_API_KEY_3,
                process.env.GEMINI_API_KEY_4,
                process.env.GEMINI_API_KEY_5
            ].filter(Boolean);

            geminiKeys.forEach((key, index) => {
                try {
                    this.providers.push({
                        name: `Gemini-${index + 1}`,
                        type: 'GEMINI',
                        key: key,
                        priority: 1,
                        instance: new GoogleGenerativeAI(key)
                    });
                } catch (e) {
                    console.error(`Failed to init Gemini-${index + 1}:`, e.message);
                }
            });

            // 2. OpenAI
            if (process.env.OPENAI_API_KEY) {
                try {
                    this.providers.push({
                        name: 'OpenAI',
                        type: 'OPENAI',
                        key: process.env.OPENAI_API_KEY,
                        priority: 2,
                        instance: new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
                    });
                } catch (e) {
                    console.error(`Failed to init OpenAI:`, e.message);
                }
            }

            // 3. Deepseek (via API)
            if (process.env.DEEPSEEK_API_KEY) {
                this.providers.push({
                    name: 'Deepseek',
                    type: 'DEEPSEEK',
                    key: process.env.DEEPSEEK_API_KEY,
                    priority: 3
                });
            }

            // Sort by priority
            this.providers.sort((a, b) => a.priority - b.priority);
            console.log(`AI Service initialized with ${this.providers.length} providers.`);
        } catch (error) {
            console.error("Critical error in AIService initialization:", error.message);
        }
    }

    async generateContent(prompt, modelOverride = null) {
        let lastError = null;

        for (const provider of this.providers) {
            try {
                console.log(`Attempting with AI Provider: ${provider.name}...`);
                
                if (provider.type === 'GEMINI') {
                    // Correcting SDK usage: getGenerativeModel
                    const model = provider.instance.getGenerativeModel({ model: modelOverride || "gemini-1.5-flash" });
                    const result = await model.generateContent(prompt);
                    const response = await result.response;
                    return response.text();
                }

                if (provider.type === 'OPENAI') {
                    const response = await provider.instance.chat.completions.create({
                        model: modelOverride || "gpt-3.5-turbo",
                        messages: [{ role: "user", content: prompt }],
                    });
                    return response.choices[0].message.content;
                }

                if (provider.type === 'DEEPSEEK') {
                    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
                        model: modelOverride || "deepseek-chat",
                        messages: [{ role: "user", content: prompt }]
                    }, {
                        headers: { 'Authorization': `Bearer ${provider.key}` }
                    });
                    return response.data.choices[0].message.content;
                }

            } catch (error) {
                console.error(`AI Provider ${provider.name} failed:`, error.message);
                lastError = error;
                // Continue to next provider...
            }
        }

        throw new Error(`All AI providers failed. Last error: ${lastError?.message || 'Unknown'}`);
    }

    async translateNewsItems(newsItems, targetLang) {
        if (!newsItems || newsItems.length === 0) return [];
        if (targetLang !== 'TR') return newsItems; // Only translating to TR for now

        try {
            // Limit to top 20 items to prevent Gemini output truncation/JSON errors
            const itemsToTranslate = newsItems.slice(0, 20);
            console.log(`Translating ${itemsToTranslate.length} news items to ${targetLang}...`);
            
            // Map to a smaller payload to save tokens
            const payload = itemsToTranslate.map((item, index) => ({
                id: index,
                title: item.title,
                snippet: item.contentSnippet || ''
            }));

            const prompt = `Translate the following JSON array of news articles to Turkish. Ensure the output is valid, complete JSON. Do not cut off the output. Return ONLY the JSON array containing exactly the same 'id' fields and the translated 'title' and 'snippet' fields.\n\n${JSON.stringify(payload)}`;
            
            const responseText = await this.generateContent(prompt, "gemini-1.5-flash");
            
            // Clean up backticks if model ignored instruction
            let cleanJson = responseText.trim();
            if (cleanJson.startsWith('```json')) cleanJson = cleanJson.substring(7);
            if (cleanJson.startsWith('```')) cleanJson = cleanJson.substring(3);
            if (cleanJson.endsWith('```')) cleanJson = cleanJson.substring(0, cleanJson.length - 3);

            const translatedArray = JSON.parse(cleanJson.trim());
            
            // Re-merge with original data
            const translatedItems = itemsToTranslate.map((item, index) => {
                const trans = translatedArray.find(t => t.id === index);
                if (trans) {
                    return { ...item, title: trans.title, contentSnippet: trans.snippet };
                }
                return item;
            });

            // Append the rest of the untranslated items if any
            return [...translatedItems, ...newsItems.slice(20)];

        } catch (error) {
            console.error("AI Batch Translation Error:", error.message);
            return newsItems; // Fallback to original English if error
        }
    }

    async summarizeAndTranslateArticle(textToSummarize) {
        try {
            console.log(`Summarizing article text length: ${textToSummarize.length}`);
            
            const prompt = `Read the following article text (or snippet). Provide a well-formatted Markdown summary in BOTH Turkish and English. Extract the key points and any market impact.

Use the exact following structure:

# 🇹🇷 Türkçe Özet

**Özet:**
[1-2 paragraph translated summary in Turkish]

**Önemli Çıkarımlar:**
- [Point 1]
- [Point 2]

---

# 🇬🇧 English Summary

**Summary:**
[1-2 paragraph summary in English]

**Key Takeaways:**
- [Point 1]
- [Point 2]

Article Text:
${textToSummarize.substring(0, 15000)}
`;
            return await this.generateContent(prompt, "gemini-1.5-flash");
        } catch (error) {
            console.error("AI Article Summarization Error:", error.message);
            throw error;
        }
    }
}

module.exports = new AIService();
