require('dotenv').config();
const sequelize = require('../config/database');
const { BinanceBotConfig } = require('../models');

async function sync() {
    try {
        await sequelize.authenticate();
        console.log('Database connection established.');
        // alter: true will add missing columns
        await BinanceBotConfig.sync({ alter: true });
        console.log('BinanceBotConfig table synchronized successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error syncing BinanceBotConfig:', error);
        process.exit(1);
    }
}

sync();
