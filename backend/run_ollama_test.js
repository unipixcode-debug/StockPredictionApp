const axios = require('axios');
const AIProvider = require('./models/AIProvider');
const sequelize = require('./config/database');

async function run() {
    try {
        await sequelize.authenticate();
        const p = await AIProvider.findOne({ where: { name: 'Ollama Cloud' } });
        if (!p) {
            console.error('Ollama Cloud provider not found in DB');
            process.exit(1);
        }

        console.log(`Testing Ollama Cloud with Key starting with: ${p.apiKey.substring(0, 5)}...`);
        const baseUrl = 'https://ollama.com';
        
        const testConfigs = [
            { name: 'Standard Chat (gpt-oss:120b)', url: `${baseUrl}/api/chat`, body: { model: 'gpt-oss:120b', messages: [{role:'user', content:'hi'}], stream: false } },
            { name: 'Standard Generate (llama3)', url: `${baseUrl}/api/generate`, body: { model: 'llama3', prompt: 'hi', stream: false } },
            { name: 'V1 Compatible Chat', url: `https://api.ollama.com/v1/chat/completions`, body: { model: 'llama3', messages: [{role:'user', content:'hi'}] } }
        ];

        for (const config of testConfigs) {
            console.log(`\n--- Testing ${config.name} ---`);
            try {
                const response = await axios.post(config.url, config.body, {
                    headers: { 'Authorization': `Bearer ${p.apiKey}` },
                    timeout: 20000
                });
                console.log(`SUCCESS [${config.name}]:`, response.status);
            } catch (e) {
                console.log(`FAILED [${config.name}]:`, e.message);
                if (e.response) {
                    console.log(`  Status: ${e.response.status}`);
                    console.log(`  Data: ${JSON.stringify(e.response.data).substring(0, 200)}`);
                }
            }
        }
        process.exit(0);
    } catch (e) {
        console.error('Test run failed:', e.message);
        process.exit(1);
    }
}

run();
