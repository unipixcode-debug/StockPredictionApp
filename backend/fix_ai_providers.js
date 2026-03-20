const AIProvider = require('./models/AIProvider');
const sequelize = require('./config/database');

async function fix() {
    try {
        await sequelize.authenticate();
        
        // 1. Fix Ollama Cloud
        const ollamas = await AIProvider.findAll({
            where: { name: 'Ollama Cloud' }
        });

        for (const p of ollamas) {
            console.log(`Fixing ${p.name}...`);
            await p.update({
                type: 'OLLAMA_CLOUD',
                apiKey: 'ollama', // Default or placeholder, aiService will use its internal URL
                status: 'active',
                lastError: null
            });
        }

        // 2. Reset Gemini Quota Status (to allow retries)
        const geminis = await AIProvider.findAll({
            where: { type: 'GEMINI' }
        });

        for (const p of geminis) {
            console.log(`Resetting status for ${p.name}...`);
            await p.update({
                status: 'active',
                lastError: null
            });
        }

        console.log('✅ AI Providers fixed successfully.');
        process.exit(0);
    } catch (e) {
        console.error('Fix failed:', e.message);
        process.exit(1);
    }
}

fix();
