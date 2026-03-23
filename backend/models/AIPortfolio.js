const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AIPortfolio = sequelize.define('AIPortfolio', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'AI Strategic Portfolio'
    },
    rationale: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    initialValue: {
        type: DataTypes.FLOAT,
        defaultValue: 100
    },
    assets: {
        type: DataTypes.JSONB, 
        allowNull: false
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    timestamps: true
});

module.exports = AIPortfolio;
