const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BotLog = sequelize.define('BotLog', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    type: {
        type: DataTypes.STRING,
        defaultValue: 'info', // 'info', 'success', 'warning', 'error'
    }
}, {
    tableName: 'bot_logs',
    timestamps: true, // Will automatically add createdAt
    indexes: [
        {
            fields: ['userId', 'createdAt']
        }
    ]
});

module.exports = BotLog;
