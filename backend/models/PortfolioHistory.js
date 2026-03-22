const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PortfolioHistory = sequelize.define('PortfolioHistory', {
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
    totalValue: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false
    },
    dailyPL: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true
    },
    weeklyPL: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true
    },
    monthlyPL: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true
    }
}, {
    timestamps: true,
});

module.exports = PortfolioHistory;
