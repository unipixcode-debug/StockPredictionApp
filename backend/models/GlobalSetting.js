const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Stores developer-controlled global settings like token pricing
const GlobalSetting = sequelize.define('GlobalSetting', {
    key: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false
    },
    value: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    timestamps: true,
});

module.exports = GlobalSetting;
