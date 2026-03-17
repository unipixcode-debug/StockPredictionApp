const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    googleId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true // True because Google OAuth users won't have a PW initially
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    role: {
        type: DataTypes.ENUM('user', 'admin', 'developer'),
        defaultValue: 'user'
    },
    tier: {
        type: DataTypes.ENUM('FREE', 'PRO', 'PREMIUM'),
        defaultValue: 'FREE'
    },
    credits: {
        type: DataTypes.INTEGER,
        defaultValue: 50,  // New users start with 50 credits (configurable)
        allowNull: false
    },
    newsletterSubscribed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    moneyFlowSubscribed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    autoPredictionSubscribed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    lastNewsletterDeduction: {
        type: DataTypes.DATE,
        allowNull: true
    },
    lastMoneyFlowDeduction: {
        type: DataTypes.DATE,
        allowNull: true
    },
    lastAutoPredictionDeduction: {
        type: DataTypes.DATE,
        allowNull: true
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    bio: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    timestamps: true,
});

module.exports = User;
