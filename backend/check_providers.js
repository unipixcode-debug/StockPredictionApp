const AIProvider = require('./models/AIProvider');
AIProvider.findAll()
    .then(providers => {
        console.log('--- AI PROVIDERS ---');
        console.log(JSON.stringify(providers, null, 2));
        console.log('--- END ---');
        process.exit(0);
    })
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
