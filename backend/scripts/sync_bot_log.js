require('dotenv').config();
const sequelize = require('../config/database');
const { BotLog } = require('../models');

async function sync() {
    try {
        await sequelize.authenticate();
        console.log('Connection passed.');
        await BotLog.sync({ alter: true });
        console.log('BotLog table synchronized successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error syncing:', error);
        process.exit(1);
    }
}

sync();
