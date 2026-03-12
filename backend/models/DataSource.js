const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DataSource = sequelize.define('DataSource', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM('NEWS_RSS', 'MARKET_API', 'SCRAPER'),
        allowNull: false
    },
    url: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    config: {
        type: DataTypes.JSONB, // Store extra fields like API Key, headers, etc.
        allowNull: true
    }
}, {
    timestamps: true,
});

module.exports = DataSource;
