const AIProvider = require('./models/AIProvider');
AIProvider.findAll({ order: [['lastChecked', 'DESC']] })
    .then(providers => {
        console.log('--- AI SYNC STATUS ---');
        providers.forEach(p => {
            console.log(`${p.name}: ${p.status} (Checked: ${p.lastChecked}, Latency: ${p.latency}ms)`);
        });
        process.exit(0);
    })
    .catch(e => { console.error(e); process.exit(1); });
