const AIProvider = require('./models/AIProvider');
const sequelize = require('./config/database');

async function check() {
    try {
        await sequelize.authenticate();
        const providers = await AIProvider.findAll();
        console.log('--- AI PROVIDERS IN DB ---');
        providers.forEach(p => {
            const keyPreview = p.apiKey ? p.apiKey.substring(0, 4) + '...' : 'NONE';
            console.log(`ID: ${p.id} | Name: ${p.name} | Type: ${p.type} | Priority: ${p.priority} | Active: ${p.isActive}`);
            console.log(`   Key: ${keyPreview} | Status: ${p.status}`);
            console.log(`   Last Error: ${p.lastError ? p.lastError.substring(0, 100) : 'NONE'}`);
        });
        process.exit(0);
    } catch (e) {
        console.error('Check failed:', e.message);
        process.exit(1);
    }
}

check();
