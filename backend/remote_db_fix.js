const sequelize = require('./config/database');
const { DataTypes } = require('sequelize');

async function fix() {
    try {
        const queryInterface = sequelize.getQueryInterface();
        // Check if column exists first
        const tableInfo = await queryInterface.describeTable('NewsSummaries');
        if (tableInfo.impacts) {
            console.log('✅ Column already exists');
        } else {
            await queryInterface.addColumn('NewsSummaries', 'impacts', {
                type: DataTypes.JSONB,
                allowNull: true
            });
            console.log('✅ Column added successfully');
        }
    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        process.exit();
    }
}
fix();
