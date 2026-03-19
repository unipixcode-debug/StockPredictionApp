const { GoogleGenerativeAI } = require('@google/generative-ai');
const apiKey = 'AIzaSyC41pdpT0TKCxL5ARS_BJ83d0aWoQLTeXw';

async function test() {
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Say 'Active'");
        console.log('RESULT:', result.response.text());
        process.exit(0);
    } catch (e) {
        console.error('ERROR:', e.message);
        process.exit(1);
    }
}
test();
