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
            'OLLAMA', 'ANTHROPIC', 'GROQ', 'MISTRAL', 
            'PERPLEXITY', 'COHERE', 'XAI'
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
    }
}, {
    timestamps: true
});

module.exports = AIProvider;
