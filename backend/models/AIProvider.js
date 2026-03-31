const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AIProvider = sequelize.define('AIProvider', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    type: {
        type: DataTypes.ENUM(
            'GEMINI', 'DEEPSEEK', 'OPENAI', 'OPENROUTER', 
            'OLLAMA', 'OLLAMA_CLOUD', 'ANTHROPIC', 'GROQ', 
            'MISTRAL', 'PERPLEXITY', 'COHERE', 'XAI', 'KIMI'
        ),
        allowNull: false
    },
    apiKey: {
        type: DataTypes.STRING,
        allowNull: false
    },
    modelName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    priority: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    quotaRemaining: {
        type: DataTypes.STRING,
        allowNull: true
    },
    lastUsed: {
        type: DataTypes.DATE,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'Unknown'
    },
    lastError: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    lastChecked: {
        type: DataTypes.DATE,
        allowNull: true
    },
    latency: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    timestamps: true
});

module.exports = AIProvider;
