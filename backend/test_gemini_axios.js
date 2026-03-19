const axios = require('axios');
const apiKey = 'AIzaSyC41pdpT0TKCxL5ARS_BJ83d0aWoQLTeXw';

async function test() {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: "hi" }] }]
        }, { timeout: 10000 });
        
        console.log('SUCCESS!');
        console.log('Response:', JSON.stringify(response.data.candidates[0].content.parts[0].text));
        process.exit(0);
    } catch (e) {
        console.error('FAILED!');
        if (e.response) {
            console.error('Status:', e.response.status);
            console.error('Data:', JSON.stringify(e.response.data));
        } else {
            console.error('Error:', e.message);
        }
        process.exit(1);
    }
}
test();
