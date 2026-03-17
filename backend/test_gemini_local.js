const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '/home/ubuntu/StockPredictionApp/backend/.env' });

async function test() {
    const keys = [
        process.env.GEMINI_API_KEY,
        process.env.GEMINI_API_KEY_1,
        process.env.GEMINI_API_KEY_2,
        process.env.GEMINI_API_KEY_3
    ].filter(Boolean);

    console.log("Found " + keys.length + " keys to test.");

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        console.log("Testing Key " + i + " starting with: " + key.substring(0, 7) + "...");
        try {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const result = await model.generateContent('Merhaba, 1 cümle ile cevap ver.');
            const response = await result.response;
            console.log("Key " + i + " Success: " + response.text().substring(0, 50));
            return;
        } catch (err) {
            console.log("Key " + i + " Failed: " + err.message);
        }
    }
}
test();
