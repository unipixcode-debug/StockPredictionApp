const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai');
const AIProvider = require('./models/AIProvider');
require('dotenv').config();

async function testAll() {
    const providers = await AIProvider.findAll({ where: { isActive: true } });
    console.log(`Found ${providers.length} active providers in DB.`);

    for (const p of providers) {
        console.log(`\n--- Testing ${p.name} (Type: ${p.type}) ---`);
        try {
            if (p.type === 'GEMINI') {
                const genAI = new GoogleGenerativeAI(p.apiKey.trim());
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const result = await model.generateContent("Hi");
                console.log(`✅ ${p.name} Success: ${result.response.text().substring(0, 20)}...`);
            } else if (p.type === 'OLLAMA_CLOUD' || p.type === 'OPENAI') {
                const baseURL = p.type === 'OLLAMA_CLOUD' ? 'https://api.ollama.com/v1' : undefined;
                console.log(`Using BaseURL: ${baseURL || 'Default OpenAI'}`);
                const openai = new OpenAI({ apiKey: p.apiKey.trim(), baseURL });
                const completion = await openai.chat.completions.create({
                    messages: [{ role: "user", content: "Hi" }],
                    model: p.type === 'OLLAMA_CLOUD' ? "llama3" : "gpt-3.5-turbo",
                });
                console.log(`✅ ${p.name} Success: ${completion.choices[0].message.content.substring(0, 20)}...`);
            }
        } catch (error) {
            console.error(`❌ ${p.name} Failed!`);
            console.error(`Error Message: ${error.message}`);
            if (error.response) {
                console.error(`Status: ${error.response.status}`);
                console.error(`Data: ${JSON.stringify(error.response.data)}`);
            }
            if (error.cause) console.error(`Cause: ${error.cause.message}`);
        }
    }
}

testAll();
