const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CandleData = sequelize.define('CandleData', {
    symbol: {
        type: DataTypes.STRING(20),
        allowNull: false,
        primaryKey: true
    },
    open_time: {
        type: DataTypes.DATE,
        allowNull: false,
        primaryKey: true
    },
    open: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false
    },
    high: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false
    },
    low: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false
    },
    close: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false
    },
    volume: {
        type: DataTypes.DECIMAL(25, 8),
        allowNull: false
    },
    bandwidth: {
        type: DataTypes.DECIMAL(10, 6),
        allowNull: true
    },
    vol_avg_24h: {
        type: DataTypes.DECIMAL(25, 8),
        allowNull: true
    }
}, {
    tableName: 'candle_data',
    timestamps: true,
    indexes: [
        {
            fields: ['symbol', 'open_time'],
            unique: true
        }
    ]
});

module.exports = CandleData;
