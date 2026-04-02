const { ExecutedTrade } = require('../models');
const sequelize = require('../config/database');

async function reset() {
    try {
        await sequelize.authenticate();
        console.log('DB Connection ok.');
        const count = await ExecutedTrade.destroy({ where: {} });
        console.log(`✅ Success: ${count} trades cleared from database.`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
reset();
