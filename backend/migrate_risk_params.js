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
        console.log(`🚀 [Migration V3] risk_params Sync starting...`);
        await sequelize.authenticate();
        const queryInterface = sequelize.getQueryInterface();

        const configCols = await sequelize.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'BinanceBotConfigs'`);
        const existingCols = configCols[0].map(c => c.column_name);

        const columnsToAdd = [
            { name: 'rsiOversold', type: DataTypes.FLOAT, defaultValue: 35 },
            { name: 'rsiOverbought', type: DataTypes.FLOAT, defaultValue: 65 },
            { name: 'minConfirmationScore', type: DataTypes.FLOAT, defaultValue: 58 }
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

        console.log('✅ [Migration V3] Risk parameters synchronized.');
    } catch (error) {
        console.error('❌ [Migration V3] Failed:', error.message);
    } finally {
        await sequelize.close();
    }
}

migrate();
