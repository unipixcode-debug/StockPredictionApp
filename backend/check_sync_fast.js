const AIProvider = require('./models/AIProvider');
AIProvider.findAll()
    .then(providers => {
        console.log('--- DB CACHE STATUS ---');
        providers.forEach(p => {
            console.log(`${p.name}: ${p.status} (Last: ${p.lastChecked}, Error: ${p.lastError ? p.lastError.substring(0, 30) : 'None'})`);
        });
        process.exit(0);
    })
    .catch(e => { console.error(e); process.exit(1); });
