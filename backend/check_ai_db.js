const sequelize = require('./config/database');
const AIProvider = require('./models/AIProvider');

async function check() {
    try {
        await sequelize.authenticate();
        const providers = await AIProvider.findAll({
            order: [['priority', 'ASC']]
        });
        console.log('--- AI PROVIDERS IN DB ---');
        providers.forEach(p => {
            console.log(`${p.priority}: ${p.name} (${p.type}) - Active: ${p.isActive}, Status: ${p.status}`);
        });
    } catch (e) {
        console.error('Error:', e.message);
    }
    process.exit();
}
check();
