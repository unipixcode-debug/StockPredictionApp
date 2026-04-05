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
        console.log(`🚀 [Migration V2] Connecting to ${process.env.DB_NAME}...`);
        await sequelize.authenticate();
        const queryInterface = sequelize.getQueryInterface();

        const configCols = await sequelize.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'BinanceBotConfigs'`);
        const existingCols = configCols[0].map(c => c.column_name);

        const columnsToAdd = [
            { name: 'budgetMode', type: DataTypes.ENUM('PERCENTAGE', 'FIXED'), defaultValue: 'PERCENTAGE' },
            { name: 'budgetAmount', type: DataTypes.FLOAT, defaultValue: 10 },
            { name: 'maxPositions', type: DataTypes.INTEGER, defaultValue: 3 },
            { name: 'maxPerAsset', type: DataTypes.FLOAT, defaultValue: 50.0 },
            { name: 'isTestnet', type: DataTypes.BOOLEAN, defaultValue: true },
            { name: 'scanInterval', type: DataTypes.INTEGER, defaultValue: 300 },
            { name: 'defaultLeverage', type: DataTypes.INTEGER, defaultValue: 1 },
            { name: 'tradeHorizon', type: DataTypes.ENUM('SHORT', 'MID', 'LONG'), defaultValue: 'SHORT' },
            { name: 'riskLevel', type: DataTypes.ENUM('CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'), defaultValue: 'MODERATE' },
            { name: 'autoOptimize', type: DataTypes.BOOLEAN, defaultValue: true }
        ];

        for (const col of columnsToAdd) {
            if (!existingCols.includes(col.name.toLowerCase())) {
                console.log(`Adding ${col.name} to BinanceBotConfigs...`);
                try {
                    await queryInterface.addColumn('BinanceBotConfigs', col.name, { 
                        type: col.type, 
                        defaultValue: col.defaultValue, 
                        allowNull: true 
                    });
                } catch (e) {
                    console.warn(`[Warning] Could not add ${col.name}:`, e.message);
                }
            }
        }

        console.log('✅ [Migration V2] All configuration columns synchronized.');
    } catch (error) {
        console.error('❌ [Migration V2] Failed:', error.message);
    } finally {
        await sequelize.close();
    }
}

migrate();
