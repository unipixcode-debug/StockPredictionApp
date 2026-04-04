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
        console.log(`🚀 [Migration] Connecting to ${process.env.DB_NAME}...`);
        await sequelize.authenticate();
        const queryInterface = sequelize.getQueryInterface();

        // 1. ExecutedTrade updates milimetrically properly SQUARELY
        const tradeCols = await sequelize.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'ExecutedTrades'`);
        const existingTradeCols = tradeCols[0].map(c => c.column_name);

        if (!existingTradeCols.includes('snapshotData')) {
            console.log('Adding snapshotData to ExecutedTrades...');
            await queryInterface.addColumn('ExecutedTrades', 'snapshotData', { type: DataTypes.JSONB, allowNull: true });
        }
        if (!existingTradeCols.includes('strategyId')) {
            console.log('Adding strategyId to ExecutedTrades...');
            await queryInterface.addColumn('ExecutedTrades', 'strategyId', { type: DataTypes.STRING, allowNull: true });
        }
        if (!existingTradeCols.includes('timeframe')) {
            console.log('Adding timeframe to ExecutedTrades...');
            await queryInterface.addColumn('ExecutedTrades', 'timeframe', { type: DataTypes.STRING, defaultValue: '5m', allowNull: true });
        }

        // 2. BinanceBotConfig updates
        const configCols = await sequelize.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'BinanceBotConfigs'`);
        const existingConfigCols = configCols[0].map(c => c.column_name);

        if (!existingConfigCols.includes('autoOptimize')) {
            console.log('Adding autoOptimize to BinanceBotConfigs...');
            await queryInterface.addColumn('BinanceBotConfigs', 'autoOptimize', { type: DataTypes.BOOLEAN, defaultValue: true, allowNull: false });
        }

        console.log('✅ [Migration] Alpha Mind columns successfully synchronized.');
    } catch (error) {
        console.error('❌ [Migration] Alpha Mind failed:', error.message);
    } finally {
        await sequelize.close();
    }
}

migrate();
