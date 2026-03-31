const flowService = require('./services/flowService');
const sequelize = require('./config/database');

async function test() {
    try {
        await sequelize.authenticate();
        console.log('🔄 Fetching Global Flow...');
        const flow = await flowService.getGlobalFlow('1G');
        const crypto = flow.assets.find(a => a.id === 'crypto');
        console.log('--- CRYPTO ASSET ---');
        console.log(`Value: ${crypto.value}`);
        console.log(`Change: ${crypto.change}`);
        console.log('--- SUB ASSETS ---');
        crypto.subAssets.forEach(s => {
            console.log(`- ${s.name}: ${s.value} T$ | ${s.change}%`);
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

test();
