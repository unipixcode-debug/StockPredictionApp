const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: console.log
    }
);

async function migrate() {
    try {
        console.log(`Connecting to ${process.env.DB_NAME} on ${process.env.DB_HOST}:${process.env.DB_PORT}...`);
        await sequelize.authenticate();
        console.log('Connection established.');

        const queryInterface = sequelize.getQueryInterface();
        
        // Use raw query to check column existence to avoid describeTable issues if it fails
        const [results] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'BinanceBotConfigs' AND column_name = 'tradeHorizon'
        `);

        if (results.length === 0) {
            console.log('Adding tradeHorizon column to BinanceBotConfigs...');
            
            // First create the ENUM type if it doesn't exist
            try {
                await sequelize.query(`CREATE TYPE "enum_BinanceBotConfigs_tradeHorizon" AS ENUM('SHORT', 'MID', 'LONG')`);
            } catch (e) {
                console.log('Enum type might already exist, continuing...');
            }

            await queryInterface.addColumn('BinanceBotConfigs', 'tradeHorizon', {
                type: DataTypes.ENUM('SHORT', 'MID', 'LONG'),
                defaultValue: 'SHORT',
                allowNull: false
            });
            console.log('Column added successfully.');
        } else {
            console.log('tradeHorizon column already exists.');
        }
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await sequelize.close();
    }
}

migrate();
