const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai');
const axios = require('axios');
const emailService = require('./emailService');

class AIService {
    constructor() {
        this.providers = [];
        this.isInitialized = false;
        this.initProviders();
    }

    async initProviders() {
        try {
            const AIProvider = require('../models/AIProvider');
            
            // 1. Fetch from Database
            let dbProviders = await AIProvider.findAll({
                where: { isActive: true },
                order: [['priority', 'ASC']]
            });

            // 2. Seed from ENV if DB is empty (First run)
            if (dbProviders.length === 0) {
                console.log('🌱 No AI providers in DB, seeding from ENV...');
                const seedData = [];
                
                // Deepseek (Primary)
                if (process.env.DEEPSEEK_API_KEY) {
                    seedData.push({ name: 'Deepseek', type: 'DEEPSEEK', apiKey: process.env.DEEPSEEK_API_KEY, priority: 0 });
                }
                
                // Gemini Pool
                const geminiKeys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_1, process.env.GEMINI_API_KEY_2, process.env.GEMINI_API_KEY_3, process.env.GEMINI_API_KEY_4, process.env.GEMINI_API_KEY_5].filter(Boolean);
                geminiKeys.forEach((key, i) => {
                    seedData.push({ name: `Gemini-${i+1}`, type: 'GEMINI', apiKey: key, priority: 1 });
                });

                if (seedData.length > 0) {
                    await AIProvider.bulkCreate(seedData);
                    dbProviders = await AIProvider.findAll({ where: { isActive: true }, order: [['priority', 'ASC']] });
                }
            }

            // 3. Transform to instances
            this.providers = dbProviders.map(p => {
                const provider = {
                    id: p.id,
                    name: p.name,
                    type: p.type,
                    key: p.apiKey,
                    priority: p.priority,
                };

                if (p.type === 'GEMINI') {
                    provider.instance = new GoogleGenerativeAI(p.apiKey);
                } else if (p.type === 'OPENAI') {
                    provider.instance = new OpenAI({ apiKey: p.apiKey });
                }
                
                return provider;
            });

            this.isInitialized = true;
            console.log(`AI Service re-initialized with ${this.providers.length} providers from DB.`);
        } catch (error) {
            console.error("Critical error in AIService initialization:", error.message);
        }
    }

    async generateContent(prompt, modelOverride = null, providerId = null) {
        let lastError = null;

        // If specific provider requested (health check)
        const targetProviders = providerId 
            ? this.providers.filter(p => p.id === providerId)
            : this.providers;

        for (const provider of targetProviders) {
            try {
                console.log(`Attempting with AI Provider: ${provider.name}...`);
                
                if (provider.type === 'GEMINI') {
                    // Use verified gemini-2.5-flash
                    const model = provider.instance.getGenerativeModel({ model: modelOverride || "gemini-2.5-flash" });
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
                    // Prevent passing gemini model strings to deepseek
                    const dsModel = (modelOverride && modelOverride.includes('deepseek')) ? modelOverride : "deepseek-chat";
                    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
                        model: dsModel,
                        messages: Array.isArray(prompt) ? prompt : [{ role: "user", content: prompt }]
                    }, {
                        headers: { 'Authorization': `Bearer ${provider.key}` },
                        timeout: 10000 // 10s timeout
                    });
                    return response.data.choices[0].message.content;
                }

                if (provider.type === 'OPENROUTER') {
                    // Chatbot has its own dedicated method, mostly skip here for background tasks
                    if (!modelOverride) continue; 
                    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                        model: modelOverride || "deepseek/deepseek-chat",
                        messages: Array.isArray(prompt) ? prompt : [{ role: "user", content: prompt }]
                    }, {
                        headers: { 
                            'Authorization': `Bearer ${provider.key}`,
                            'HTTP-Referer': 'https://stockpredictionapp.com', // Optional but recommended
                            'X-Title': 'PredictPro'
                        },
                        timeout: 15000 // 15s timeout
                    });
                    return response.data.choices[0].message.content;
                }

            } catch (error) {
                console.error(`AI Provider ${provider.name} failed:`, error.message);
                lastError = error;
                // Continue to next provider...
            }
        }

        // If we get here, all providers failed
        if (this.isQuotaError(lastError)) {
            emailService.sendQuotaExhaustedAlert('Tüm Mevcut AI Sağlayıcıları');
        }

        throw new Error(`All AI providers failed. Last error: ${lastError?.message || 'Unknown'}`);
    }

    // Updated to use Gemini Pool for cost optimization
    async generateChatContent(messages) {
        try {
            // Convert message array to a unified prompt for any provider in the pool
            const prompt = Array.isArray(messages) 
                ? messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')
                : messages;

            console.log("ChatBot: Generating content via Gemini Pool (2.5 Flash)...");
            return await this.generateContent(prompt, "gemini-2.5-flash");
        } catch (error) {
            console.error('ChatBot AI error:', error.message);
            throw error;
        }
    }

    isQuotaError(error) {
        if (!error) return false;
        const msg = error.message?.toLowerCase() || "";
        const status = error.response?.status;
        return (
            status === 429 || 
            msg.includes("quota") || 
            msg.includes("limit") || 
            msg.includes("exhausted") || 
            msg.includes("credit")
        );
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
            
            const responseText = await this.generateContent(prompt, null); // Use Gemini pool only
            
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
            
            Return ONLY a valid JSON object with the following structure:
            {
              "tr": "# 🇹🇷 Türkçe Özet\\n\\n**Özet:**\\n[summary text here...]",
              "en": " # 🇬🇧 English Summary\\n\\n**Summary:**\\n[summary text here...]"
            }

            Article Text:
            ${textToSummarize.substring(0, 15000)}`;

            const responseText = await this.generateContent(prompt, "gemini-2.5-flash");
            
            try {
                let cleanJson = responseText.trim();
                // Strip markdown code fences if present
                if (cleanJson.startsWith('```')) {
                    const nextLine = cleanJson.indexOf('\n');
                    if (nextLine !== -1) {
                        cleanJson = cleanJson.substring(nextLine + 1);
                    } else {
                        cleanJson = cleanJson.substring(3);
                    }
                    if (cleanJson.endsWith('```')) cleanJson = cleanJson.substring(0, cleanJson.lastIndexOf('```'));
                }
                return JSON.parse(cleanJson.trim());
            } catch (pErr) {
                console.warn("AI response not valid JSON, using fallback splitting");
                return { tr: responseText, en: responseText };
            }
        } catch (error) {
            console.error("AI Article Summarization Error:", error.message);
            throw error;
        }
    }
}

module.exports = new AIService();
