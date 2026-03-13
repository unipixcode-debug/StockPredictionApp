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
        defaultValue: 100,  // Free tier starts with 100 credits (5 analyses)
        allowNull: false
    }
}, {
    timestamps: true,
});

module.exports = User;
