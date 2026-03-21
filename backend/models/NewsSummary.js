const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NewsSummary = sequelize.define('NewsSummary', {
    url: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false
    },
    summaryTR: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    summaryEN: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    titleTR: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    titleEN: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    snippetTR: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    snippetEN: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    importanceScore: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    sentimentScore: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 50
    },
    tags: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    impacts: {
        type: DataTypes.JSONB,
        allowNull: true
    },
    lastProcessed: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: true
});

module.exports = NewsSummary;
