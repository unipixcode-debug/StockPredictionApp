const sequelize = require('./config/database');
const AIProvider = require('./models/AIProvider');

async function fix() {
    try {
        await sequelize.authenticate();
        console.log('--- RE-ORDERING AI PROVIDERS ---');
        
        // Ensure Deepseek is priority 0
        const ds = await AIProvider.findOne({ where: { type: 'DEEPSEEK' } });
        if (ds) {
            await ds.update({ priority: 0, isActive: true, status: 'active' });
            console.log('✅ Deepseek set to Priority 0');
        }

        // Ensure Geminis are priority 1+
        const geminis = await AIProvider.findAll({ where: { type: 'GEMINI' } });
        for (let i = 0; i < geminis.length; i++) {
            await geminis[i].update({ priority: i + 1, isActive: true, status: 'active' });
            console.log(`✅ ${geminis[i].name} set to Priority ${i + 1}`);
        }

        console.log('--- SUCCESS ---');
    } catch (e) {
        console.error('Fix Error:', e.message);
    }
    process.exit();
}
fix();
