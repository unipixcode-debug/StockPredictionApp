const axios = require('axios');
const keys = [
    'AIzaSyC41pdpT0TKCxL5ARS_BJ83d0aWoQLTeXw',
    'AIzaSyCGrnKtS-ArC9x8dYTZs4KpxX5E1AfCbbY',
    'AIzaSyC-FGDv988pBch0AgP0MZtD2gbJILHkc4g',
    'AIzaSyAtpluHfTleZBehq54sJSxQLVFqiovi7fw'
];

async function testAll() {
    for (const key of keys) {
        console.log(`\nTesting Key: ${key.substring(0, 10)}...`);
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
            const response = await axios.post(url, {
                contents: [{ parts: [{ text: "hi" }] }]
            }, { timeout: 10000 });
            console.log('✅ VALID!');
        } catch (e) {
            console.log('❌ INVALID:', e.response ? e.response.data.error.message : e.message);
        }
    }
}
testAll();
