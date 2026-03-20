const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai');
const axios = require('axios');
const emailService = require('./emailService');

class AIService {
    constructor() {
        this.providers = [];
        this.isInitialized = false;
        this.initProviders().then(() => {
            this.startHealthCheckLoop();
        });
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
                    seedData.push({ name: `Gemini-${i+1}`, type: 'GEMINI', apiKey: key.trim(), priority: 1 });
                });

                if (seedData.length > 0) {
                    await AIProvider.bulkCreate(seedData);
                    dbProviders = await AIProvider.findAll({ where: { isActive: true }, order: [['priority', 'ASC']] });
                }
            }

            // 3. Transform to instances
            this.providers = dbProviders.map(p => {
                console.log(`[AI-INIT] Loading Provider: ${p.name} (Type: ${p.type}, Priority: ${p.priority}, Active: ${p.isActive})`);
                const provider = {
                    id: p.id,
                    name: p.name,
                    type: p.type,
                    key: p.apiKey.trim(),
                    priority: p.priority,
                    cooldownUntil: 0
                };

                if (p.type === 'GEMINI') {
                    provider.instance = new GoogleGenerativeAI(p.apiKey.trim());
                } else if (p.type === 'OPENAI') {
                    provider.instance = new OpenAI({ 
                        apiKey: p.apiKey.trim()
                    });
                }
                
                return provider;
            });

            this.isInitialized = true;
            console.log(`AI Service re-initialized with ${this.providers.length} providers from DB.`);
        } catch (error) {
            console.error("Critical error in AIService initialization:", error.message);
        }
    }

    startHealthCheckLoop() {
        // Run every 15 minutes to "not kill the apis"
        setInterval(() => {
            this.checkAllProviders();
        }, 15 * 60 * 1000);
        
        // Initial run after a short delay
        setTimeout(() => this.checkAllProviders(), 5000);
    }

    async checkAllProviders() {
        console.log("🌐 Starting background AI health check...");
        const AIProvider = require('../models/AIProvider');
        
        for (const provider of this.providers) {
            console.log(`Checking ${provider.name}...`);
            const start = Date.now();
            let status = 'active';
            let lastError = null;
            let latency = 0;

            try {
                // Sequential test to avoid overwhelming
                await this.generateContent('Reply with: OK', null, provider.id);
                latency = Date.now() - start;
            } catch (e) {
                lastError = e.message;
                status = this.isQuotaError(e) ? 'quota_exceeded' : 'error';
                latency = Date.now() - start;
                console.warn(`Health check failed for ${provider.name}: ${lastError}`);
            }

            try {
                await AIProvider.update({
                    status,
                    lastError: lastError ? lastError.substring(0, 500) : null,
                    lastChecked: new Date(),
                    latency
                }, { where: { id: provider.id } });
            } catch (dbErr) {
                console.error(`Failed to update DB for provider ${provider.name}:`, dbErr.message);
            }

            // Small delay between tests
            await new Promise(r => setTimeout(r, 2000));
        }
        console.log("✅ Background AI health check completed.");
    }

    async generateContent(prompt, modelOverride = null, providerId = null) {
        let lastError = null;

        // If specific provider requested (health check)
        const targetProviders = providerId 
            ? this.providers.filter(p => p.id === providerId)
            : this.providers;

        for (const provider of targetProviders) {
            try {
                if (provider.cooldownUntil && provider.cooldownUntil > Date.now()) {
                    console.log(`Skipping ${provider.name} (on cooldown due to quota)...`);
                    continue;
                }

                console.log(`Attempting with AI Provider: ${provider.name}...`);
                
                let safeModelOverride = modelOverride;
                if (safeModelOverride) {
                    const m = safeModelOverride.toLowerCase();
                    if ((provider.type === 'OLLAMA' || provider.type === 'OLLAMA_CLOUD') && (m.includes('gemini') || m.includes('gpt') || m.includes('claude') || m.includes('deepseek'))) safeModelOverride = null;
                    else if (provider.type === 'GEMINI' && !m.includes('gemini')) safeModelOverride = null;
                    else if (provider.type === 'OPENAI' && !m.includes('gpt') && !m.includes('o1') && !m.includes('o3')) safeModelOverride = null;
                    else if (provider.type === 'DEEPSEEK' && !m.includes('deepseek')) safeModelOverride = null;
                    else if (provider.type === 'ANTHROPIC' && !m.includes('claude')) safeModelOverride = null;
                }

                if (provider.type === 'GEMINI') {
                    const modelName = safeModelOverride || "gemini-flash-latest";
                    const genModel = provider.instance.getGenerativeModel({ model: modelName });
                    
                    let contents = [];

                    if (Array.isArray(prompt)) {
                        let currentRole = 'user';
                        let systemContent = "";
                        let historyItems = [];

                        prompt.forEach(m => {
                            if (m.role === 'system') {
                                systemContent += m.content + "\n\n";
                            } else {
                                const role = m.role === 'assistant' ? 'model' : 'user';
                                historyItems.push({ role, text: m.content });
                            }
                        });

                        // Merge same-role consecutive blocks
                        let merged = [];
                        if (historyItems.length > 0) {
                            let last = historyItems[0];
                            for (let i = 1; i < historyItems.length; i++) {
                                if (historyItems[i].role === last.role) {
                                    last.text += "\n\n" + historyItems[i].text;
                                } else {
                                    merged.push(last);
                                    last = historyItems[i];
                                }
                            }
                            merged.push(last);
                        }

                        // Prepend system to first user message
                        if (systemContent && merged.length > 0) {
                            const firstUser = merged.find(m => m.role === 'user');
                            if (firstUser) {
                                firstUser.text = `[SYSTEM INSTRUCTION]\n${systemContent}\n[END SYSTEM INSTRUCTION]\n\n${firstUser.text}`;
                            }
                        }

                        // Ensure starts with user
                        if (merged.length > 0 && merged[0].role === 'model') {
                            merged.unshift({ role: 'user', text: '.' });
                        }

                        contents = merged.map(m => ({
                            role: m.role,
                            parts: [{ text: String(m.text) }]
                        }));
                    } else {
                        // For health checks and simple prompts, use simple string array
                        contents = [{ role: 'user', parts: [{ text: String(prompt) }] }];
                    }

                    if (contents.length === 0) throw new Error("No Gemini contents generated");

                    // Use the most compatible call structure
                    const result = await genModel.generateContent({ contents });
                    const response = await result.response;
                    return response.text();
                }

                if (provider.type === 'OPENAI') {
                    const messages = Array.isArray(prompt) 
                        ? (typeof prompt[0] === 'object' ? prompt : prompt.map(p => ({role:'user', content: String(p)})))
                        : [{ role: "user", content: String(prompt) }];

                    const response = await provider.instance.chat.completions.create({
                        model: modelOverride || (provider.type === 'OLLAMA_CLOUD' ? "llama3" : "gpt-3.5-turbo"),
                        messages: messages,
                    });
                    return response.choices[0].message.content;
                }

                if (provider.type === 'DEEPSEEK') {
                    const dsModel = safeModelOverride || "deepseek-chat";
                    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
                        model: dsModel,
                        messages: Array.isArray(prompt) ? (typeof prompt[0] === 'object' ? prompt : prompt.map(p => ({role:'user', content: p}))) : [{ role: "user", content: prompt }]
                    }, {
                        headers: { 'Authorization': `Bearer ${provider.key}` },
                        timeout: 20000 
                    });
                    return response.data.choices[0].message.content;
                }

                if (provider.type === 'OLLAMA') {
                    // key is treated as base URL for Ollama
                    let baseUrl = provider.key || 'http://localhost:11434';
                    if (!baseUrl.startsWith('http')) baseUrl = `http://${baseUrl}`;
                    const response = await axios.post(`${baseUrl}/api/generate`, {
                        model: safeModelOverride || "llama3",
                        prompt: typeof prompt === 'string' ? prompt : JSON.stringify(prompt),
                        stream: false
                    }, { timeout: 30000 });
                    return response.data.response;
                }

                if (provider.type === 'ANTHROPIC') {
                    const response = await axios.post('https://api.anthropic.com/v1/messages', {
                        model: safeModelOverride || "claude-3-5-sonnet-20240620",
                        max_tokens: 1024,
                        messages: [{ role: "user", content: typeof prompt === 'string' ? prompt : JSON.stringify(prompt) }]
                    }, {
                        headers: { 
                            'x-api-key': provider.key,
                            'anthropic-version': '2023-06-01',
                            'content-type': 'application/json'
                        },
                        timeout: 20000
                    });
                    return response.data.content[0].text;
                }

                if (provider.type === 'OLLAMA_CLOUD') {
                    const baseUrl = 'https://ollama.com';
                    const messages = Array.isArray(prompt) 
                        ? (typeof prompt[0] === 'object' ? prompt : prompt.map(p => ({role:'user', content: String(p)})))
                        : [{ role: "user", content: String(prompt) }];
                    
                    const response = await axios.post(`${baseUrl}/api/chat`, {
                        model: safeModelOverride || provider.modelName || "gpt-oss:120b",
                        messages: messages,
                        stream: false
                    }, {
                        headers: { 'Authorization': `Bearer ${provider.key}` },
                        timeout: 30000
                    });
                    
                    if (response.data && response.data.message) {
                        return response.data.message.content;
                    }
                    throw new Error("Invalid response from Ollama Cloud");
                }

                // OpenAI Compatible Providers
                const openAiCompatible = {
                    'GROQ': 'https://api.groq.com/openai/v1',
                    'MISTRAL': 'https://api.mistral.ai/v1',
                    'PERPLEXITY': 'https://api.perplexity.ai',
                    'COHERE': 'https://api.cohere.ai/v1',
                    'XAI': 'https://api.x.ai/v1'
                };

                if (openAiCompatible[provider.type] && provider.type !== 'OLLAMA_CLOUD') {
                    const baseUrl = openAiCompatible[provider.type];
                    const response = await axios.post(`${baseUrl}/chat/completions`, {
                        model: safeModelOverride || (provider.type === 'GROQ' ? 'llama3-8b-8192' : 'mistral-large-latest'),
                        messages: [{ role: "user", content: typeof prompt === 'string' ? prompt : JSON.stringify(prompt) }]
                    }, {
                        headers: { 'Authorization': `Bearer ${provider.key}` },
                        timeout: 15000
                    });
                    return response.data.choices[0].message.content;
                }

                if (provider.type === 'OPENROUTER') {
                    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                        model: safeModelOverride || "deepseek/deepseek-chat",
                        messages: Array.isArray(prompt) ? (typeof prompt[0] === 'object' ? prompt : prompt.map(p => ({role:'user', content: p}))) : [{ role: "user", content: prompt }]
                    }, {
                        headers: { 
                            'Authorization': `Bearer ${provider.key}`,
                            'HTTP-Referer': 'https://unipixcode.xyz',
                            'X-Title': 'Unipix Prediction'
                        },
                        timeout: 20000
                    });
                    return response.data.choices[0].message.content;
                }

            } catch (error) {
                if (this.isQuotaError(error)) {
                    provider.cooldownUntil = Date.now() + 30000; // 30s cooldown
                }
                lastError = error;
                // Continue to next provider...
            }
        }

        // If we get here, all providers failed
        if (this.isQuotaError(lastError)) {
            emailService.sendQuotaExhaustedAlert('Tüm Mevcut AI Sağlayıcıları').catch(err => console.error('Silent alert failure:', err.message));
        }

        throw new Error("All AI providers failed. Last error: " + (lastError && lastError.message ? lastError.message : 'Unknown'));
    }

    // Updated to use Gemini Pool for cost optimization
    async generateChatContent(messages) {
        try {
            // Convert message array to a unified prompt for any provider in the pool
            const prompt = Array.isArray(messages) 
                ? messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')
                : messages;

            console.log("ChatBot: Generating content via Gemini Pool (Flash Latest)...");
            return await this.generateContent(prompt, "gemini-flash-latest");
        } catch (error) {
            console.error('ChatBot AI error:', error.message);
            throw error;
        }
    }

    isQuotaError(error) {
        if (!error) return false;
        const msg = (error.message ? error.message.toLowerCase() : "");
        const status = (error.response ? error.response.status : null);
        return (
            status === 429 || 
            msg.indexOf("quota") !== -1 || 
            msg.indexOf("limit") !== -1 || 
            msg.indexOf("exhausted") !== -1 || 
            msg.indexOf("credit") !== -1 ||
            msg.indexOf("insufficient") !== -1 ||
            msg.indexOf("billing") !== -1 ||
            msg.indexOf("budget") !== -1
        );
    }

    async batchTranslateNews(newsItems, targetLang) {
        if (!newsItems || newsItems.length === 0) return [];
        if (targetLang !== 'TR') return newsItems; // Only translating to TR for now

        try {
            const allTranslatedItems = [];
            const CHUNK_SIZE = 20;
            
            for (let i = 0; i < newsItems.length; i += CHUNK_SIZE) {
                const chunk = newsItems.slice(i, i + CHUNK_SIZE);
                console.log(`Translating chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(newsItems.length / CHUNK_SIZE)} (${chunk.length} items)...`);
                
                const payload = chunk.map((item, index) => ({
                    id: index,
                    title: item.title,
                    snippet: item.contentSnippet || ''
                }));

                const prompt = `Translate the following JSON array of news articles to Turkish. 
                Also, for each article:
                1. Assign a 'sentimentScore' from 0 (very bearish/negative) to 100 (very bullish/positive).
                2. Identify related asset 'tags' (e.g., BTC, XRP, ETH, XAU, DXY, SP500, TSLA, etc.). Use abbreviations.
                
                Ensure the output is valid, complete JSON. Return ONLY the JSON array containing exactly the same 'id' fields and the translated 'title', 'snippet', 'sentimentScore', and 'tags' fields.\n\n${JSON.stringify(payload)}`;
                
                const responseText = await this.generateContent(prompt, "gemini-flash-latest");
                
                let cleanJson = responseText.trim();
                const jsonStart = cleanJson.indexOf('[');
                const jsonEnd = cleanJson.lastIndexOf(']');
                if (jsonStart !== -1 && jsonEnd !== -1) {
                    cleanJson = cleanJson.substring(jsonStart, jsonEnd + 1);
                }
                
                const translatedArray = JSON.parse(cleanJson);
                
                const translatedChunk = chunk.map((item, index) => {
                    const trans = translatedArray.find(t => t.id === index);
                    if (trans) {
                        return { 
                            ...item, 
                            titleTR: trans.title || trans.titleTR, 
                            snippetTR: trans.snippet || trans.snippetTR,
                            sentimentScore: trans.sentimentScore || 50,
                            tags: Array.isArray(trans.tags) ? trans.tags.join(', ') : (trans.tags || '')
                        };
                    }
                    return item;
                });
                
                allTranslatedItems.push(...translatedChunk);
            }

            return allTranslatedItems;

        } catch (error) {
            console.error("AI Batch Translation CRITICAL Error:", error.message);
            console.warn("Falling back to original English news items due to AI failure.");
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
              "en": " # 🇬🇧 English Summary\\n\\n**Summary:**\\n[summary text here...]",
              "sentimentScore": number (0-100),
              "tags": "string (comma separated assets like BTC, XRP, GLD)"
            }

            Article Text:
            ${textToSummarize.substring(0, 15000)}`;

            const responseText = await this.generateContent(prompt, "gemini-flash-latest");
            console.log(`[AI Summary] Raw response for article (${textToSummarize.length} chars):`, responseText.substring(0, 500) + "...");
            
            try {
                let cleanJson = responseText.trim();
                const jsonStart = cleanJson.indexOf('{');
                const jsonEnd = cleanJson.lastIndexOf('}');
                
                if (jsonStart !== -1 && jsonEnd !== -1) {
                    cleanJson = cleanJson.substring(jsonStart, jsonEnd + 1);
                    const parsed = JSON.parse(cleanJson);
                    // Standardize field names just in case Gemini gets creative
                    return {
                        tr: parsed.tr || parsed.summaryTR || parsed.TurkishSummary || parsed.turkish_summary || "Özet hazırlanamadı.",
                        en: parsed.en || parsed.summaryEN || parsed.EnglishSummary || parsed.english_summary || "Summary not available.",
                        sentimentScore: parsed.sentimentScore || 50,
                        tags: parsed.tags || ""
                    };
                }
                throw new Error("No JSON boundaries found in AI response");
            } catch (pErr) {
                console.warn("[AI Summary] JSON Parsing failed, raw response:", responseText.substring(0, 200));
                return { 
                    tr: "# 🇹🇷 Türkçe Özet\n\n" + responseText, 
                    en: "# 🇬🇧 English Summary\n\n" + responseText 
                };
            }
        } catch (error) {
            console.error("AI Article Summarization Error:", error.message);
            throw error;
        }
    }
}

module.exports = new AIService();
