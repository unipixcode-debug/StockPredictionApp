const axios = require('axios');

async function testOllama() {
    const apiKey = 'fdc4bcc7...'; // I'll use a placeholder or read from DB in the real script
    // Note: I will read the actual key from the DB in the executed script to avoid hardcoding here
    
    console.log('Testing Ollama Cloud with gpt-oss:120b...');
    try {
        const response = await axios.post('https://ollama.com/api/chat', {
            model: 'gpt-oss:120b',
            messages: [{ role: 'user', content: 'Say hello' }],
            stream: false
        }, {
            headers: { 'Authorization': 'Bearer ' + process.argv[2] }, // Pass key as arg
            timeout: 10000
        });
        console.log('SUCCESS:', JSON.stringify(response.data, null, 2));
    } catch (e) {
        console.log('FAILED:', e.message);
        if (e.response) {
            console.log('Response status:', e.response.status);
            console.log('Response data:', JSON.stringify(e.response.data, null, 2));
        }
    }
}

testOllama();
