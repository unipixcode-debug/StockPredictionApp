const { BinanceBotConfig } = require('./models');
const sequelize = require('./config/database');

async function migrate() {
    try {
        console.log('🚀 [Migration] Adding riskConsent to BinanceBotConfigs...');
        const queryInterface = sequelize.getQueryInterface();
        const tableInfo = await queryInterface.describeTable('BinanceBotConfigs');

        if (!tableInfo.riskConsent) {
            await queryInterface.addColumn('BinanceBotConfigs', 'riskConsent', {
                type: require('sequelize').DataTypes.BOOLEAN,
                defaultValue: false
            });
            console.log('✅ Column riskConsent added.');
        } else {
            console.log('ℹ️ Column riskConsent already exists.');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    } finally {
        process.exit(0);
    }
}

migrate();
