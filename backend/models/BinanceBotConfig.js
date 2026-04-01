const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const crypto = require('crypto');
require('dotenv').config();

// Use a secure key from env or fallback for dev
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'predictpro_secure_encryption_key_32_bytes'.padEnd(32, '0').slice(0, 32);
const IV_LENGTH = 16;

function encrypt(text) {
    if (!text) return text;
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    if (!text) return text;
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

const BinanceBotConfig = sequelize.define('BinanceBotConfig', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true
    },
    apiKey: {
        type: DataTypes.STRING,
        allowNull: true,
        set(value) {
            this.setDataValue('apiKey', encrypt(value));
        },
        get() {
            const val = this.getDataValue('apiKey');
            return val ? decrypt(val) : null;
        }
    },
    apiSecret: {
        type: DataTypes.STRING,
        allowNull: true,
        set(value) {
            this.setDataValue('apiSecret', encrypt(value));
        },
        get() {
            const val = this.getDataValue('apiSecret');
            return val ? decrypt(val) : null;
        }
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    isTestnet: {
        type: DataTypes.BOOLEAN,
        defaultValue: true // Testnet as per user request mapping
    },
    budgetMode: {
        type: DataTypes.ENUM('PERCENTAGE', 'FIXED'),
        defaultValue: 'PERCENTAGE' // Use specific % of free balance or fixed USD amount
    },
    budgetAmount: {
        type: DataTypes.FLOAT,
        defaultValue: 10 // E.g., 10% or 10 USDT
    },
    maxPositions: {
        type: DataTypes.INTEGER,
        defaultValue: 3 // E.g., max 3 active trades
    },
    maxPerAsset: {
        type: DataTypes.FLOAT,
        defaultValue: 50.0 // E.g., max 50 USDT per asset
    },
    enableSpot: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    enableFutures: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    defaultLeverage: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    riskLevel: {
        type: DataTypes.ENUM('CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'),
        defaultValue: 'MODERATE' // Controls SL/TP offsets
    }
}, {
    timestamps: true,
});

module.exports = BinanceBotConfig;
