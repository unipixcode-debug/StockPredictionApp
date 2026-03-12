const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Prediction = sequelize.define('Prediction', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    symbol: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    market: {
        type: DataTypes.ENUM('US', 'CRYPTO', 'BIST'),
        allowNull: false
    },
    direction: {
        type: DataTypes.ENUM('BUY', 'SELL', 'HOLD'),
        allowNull: false
    },
    targetPrice: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    score: {
        type: DataTypes.INTEGER, // 1 to 100 based on news + ML
        allowNull: false
    },
    confidence: {
        type: DataTypes.FLOAT, // Model confidence %
        allowNull: false
    },
    analysis_details: {
        type: DataTypes.JSONB, // Store correlations (VIX, Gold) & Sentiment snippets
        allowNull: true
    }
}, {
    timestamps: true,
});

module.exports = Prediction;
