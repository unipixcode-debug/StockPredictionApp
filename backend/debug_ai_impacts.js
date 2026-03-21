
const aiService = require('./services/aiService');

async function debugAIResponse() {
    try {
        console.log("Waiting for AI Service initialization...");
        await aiService.ensureInitialized();
        console.log("AI Service Initialized.");

        const testItems = [
            { title: "Gold prices surge as investors flock to safe havens amid Middle East tensions", contentSnippet: "Spot gold rose 1.2% to $2,350 per ounce as geopolitical risks increased." },
            { title: "Bitcoin drops below $65k on regulatory concerns", contentSnippet: "The largest cryptocurrency faced sell-off pressure following reports of new SEC investigations." }
        ];

        console.log("Testing batchTranslateNews (Forcing Gemini/Flash)...");
        // We call the method, it will use its internal prompt and providers
        const result = await aiService.batchTranslateNews(testItems, 'TR');
        
        console.log("\n--- DEBUG RESULT ---");
        console.log(JSON.stringify(result, null, 2));
        console.log("--- END DEBUG RESULT ---");

        process.exit(0);
    } catch (error) {
        console.error("Debug Error:", error);
        process.exit(1);
    }
}

debugAIResponse();
