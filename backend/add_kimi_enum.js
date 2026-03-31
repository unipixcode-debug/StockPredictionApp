const { Sequelize } = require('sequelize');
const sequelize = require('./config/database');

async function migrate() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
        
        // Use raw query to alter enum type in PostgreSQL
        await sequelize.query(`ALTER TYPE "enum_AIProviders_type" ADD VALUE IF NOT EXISTS 'KIMI';`);
        console.log('Migration successful: Added KIMI to AIProvider type enum.');
        
        process.exit(0);
    } catch (error) {
        console.error('Unable to connect to the database or run migration:', error);
        process.exit(1);
    }
}

migrate();
