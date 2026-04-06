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
    futuresApiKey: {
        type: DataTypes.STRING,
        allowNull: true,
        set(value) {
            this.setDataValue('futuresApiKey', encrypt(value));
        },
        get() {
            const val = this.getDataValue('futuresApiKey');
            return val ? decrypt(val) : null;
        }
    },
    futuresApiSecret: {
        type: DataTypes.STRING,
        allowNull: true,
        set(value) {
            this.setDataValue('futuresApiSecret', encrypt(value));
        },
        get() {
            const val = this.getDataValue('futuresApiSecret');
            return val ? decrypt(val) : null;
        }
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    isSpotActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    isFuturesActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    scanInterval: {
        type: DataTypes.INTEGER,
        defaultValue: 300 // default 5 mins
    },
    lastScanAt: {
        type: DataTypes.DATE,
        allowNull: true
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
    },
    tradeHorizon: {
        type: DataTypes.ENUM('SHORT', 'MID', 'LONG'),
        defaultValue: 'SHORT' // SHORT=%5-10, MID=%10-15, LONG=%50-100 ROI
    },
    autoOptimize: {
        type: DataTypes.BOOLEAN,
        defaultValue: true // AI Sentinel & Strategy Alpha Logic
    },
    rsiOversold: {
        type: DataTypes.FLOAT,
        defaultValue: 35
    },
    rsiOverbought: {
        type: DataTypes.FLOAT,
        defaultValue: 65
    },
    minConfirmationScore: {
        type: DataTypes.FLOAT,
        defaultValue: 58
    },
    keskinYapiActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    formasyonOnayiActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    riskConsent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    telegramToken: {
        type: DataTypes.STRING,
        allowNull: true,
        set(value) {
            this.setDataValue('telegramToken', encrypt(value));
        },
        get() {
            const val = this.getDataValue('telegramToken');
            return val ? decrypt(val) : null;
        }
    },
    telegramChatId: {
        type: DataTypes.STRING,
        allowNull: true,
        set(value) {
            this.setDataValue('telegramChatId', encrypt(value));
        },
        get() {
            const val = this.getDataValue('telegramChatId');
            return val ? decrypt(val) : null;
        }
    }
}, {
    timestamps: true,
});

module.exports = BinanceBotConfig;
