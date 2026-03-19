const aiService = require('./services/aiService');
setTimeout(() => {
    console.log('--- AI SERVICE STATE ---');
    console.log('isInitialized:', aiService.isInitialized);
    console.log('Providers Count:', aiService.providers.length);
    if (aiService.providers.length > 0) {
        console.log('First Provider:', aiService.providers[0].name);
    }
    process.exit(0);
}, 10000);
