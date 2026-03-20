const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DailyMarketInsight = sequelize.define('DailyMarketInsight', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  type: {
    type: DataTypes.STRING, // 'TRADE_IDEA', 'MARKET_ANALYSIS', 'AI_SCORE'
    allowNull: false
  },
  source: {
    type: DataTypes.STRING, // 'Danelfin', 'Investing', 'StockInvest'
    allowNull: false
  },
  symbol: {
    type: DataTypes.STRING,
    allowNull: true
  },
  title: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  score: {
    type: DataTypes.INTEGER, // 0-100 AI Score or Sentiment
    allowNull: true,
    defaultValue: 50
  },
  metadata: {
    type: DataTypes.JSONB, // For probability, target price, etc.
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['date'] },
    { fields: ['type'] },
    { fields: ['symbol'] }
  ]
});

module.exports = DailyMarketInsight;
