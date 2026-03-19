const axios = require('axios');
const apiKey = 'sk-3052a81004554b7d9f333fc99d84c97d';

async function test() {
    try {
        const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
            model: "deepseek-chat",
            messages: [{ role: "user", content: "hi" }]
        }, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            timeout: 10000
        });
        console.log('✅ DEEPSEEK VALID!');
        process.exit(0);
    } catch (e) {
        console.error('❌ DEEPSEEK INVALID:', e.response ? e.response.data.error.message : e.message);
        process.exit(1);
    }
}
test();
