const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ExecutedTrade = sequelize.define('ExecutedTrade', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    symbol: {
        type: DataTypes.STRING, // e.g., 'BTC/USDT'
        allowNull: false
    },
    side: {
        type: DataTypes.ENUM('BUY', 'SELL'),
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('SPOT', 'FUTURES'),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('OPEN', 'CLOSED', 'FAILED'),
        defaultValue: 'OPEN'
    },
    entryPrice: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    exitPrice: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    amount: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    pnl: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    pnlPercentage: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    exchangeOrderId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    stopLossPrice: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    targetPrice: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    leverage: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    timestamps: true,
});

module.exports = ExecutedTrade;
