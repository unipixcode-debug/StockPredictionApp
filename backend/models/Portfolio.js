const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Portfolio = sequelize.define('Portfolio', {
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
    symbol: {
        type: DataTypes.STRING,
        allowNull: false
    },
    market: {
        type: DataTypes.ENUM('STOCK', 'CRYPTO', 'COMMODITY', 'BOND', 'FIAT'),
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0
    },
    avgPrice: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0
    },
    totalInvested: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0
    },
    purchaseCurrency: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'USD'
    }
}, {
    timestamps: true,
});

module.exports = Portfolio;
