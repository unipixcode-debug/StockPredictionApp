const AIProvider = require('./models/AIProvider');
AIProvider.update(
    { type: 'OLLAMA_CLOUD', name: 'Ollama Cloud' },
    { where: { name: 'ollama-cloude' } }
).then((count) => {
    console.log(`Updated ${count} providers to OLLAMA_CLOUD`);
    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
