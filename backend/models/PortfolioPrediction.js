const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PortfolioPrediction = sequelize.define('PortfolioPrediction', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    targetDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    timeframe: {
        type: DataTypes.ENUM('DAILY', 'WEEKLY', 'MONTHLY'),
        allowNull: false
    },
    predictedPL: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    actualPL: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'SUCCESS', 'FAILED'),
        defaultValue: 'PENDING'
    }
}, {
    timestamps: true,
});

module.exports = PortfolioPrediction;
