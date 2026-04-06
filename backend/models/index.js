const User = require('./User');
const Prediction = require('./Prediction');
const DataSource = require('./DataSource');
const NewsSummary = require('./NewsSummary');
const ChatMessage = require('./ChatMessage');
const AIProvider = require('./AIProvider');
const AdminLog = require('./AdminLog');
const DailyMarketInsight = require('./DailyMarketInsight');
const Portfolio = require('./Portfolio');
const PortfolioHistory = require('./PortfolioHistory');
const PortfolioPrediction = require('./PortfolioPrediction');
const AIPortfolio = require('./AIPortfolio');
const BinanceBotConfig = require('./BinanceBotConfig');
const ExecutedTrade = require('./ExecutedTrade');
const BotLog = require('./BotLog');
const CandleData = require('./CandleData');
const PivotPoint = require('./PivotPoint');

// Associations
User.hasMany(Portfolio, { foreignKey: 'userId' });
Portfolio.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(PortfolioHistory, { foreignKey: 'userId' });
PortfolioHistory.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(PortfolioPrediction, { foreignKey: 'userId' });
PortfolioPrediction.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(BinanceBotConfig, { foreignKey: 'userId' });
BinanceBotConfig.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(ExecutedTrade, { foreignKey: 'userId' });
ExecutedTrade.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(BotLog, { foreignKey: 'userId' });
BotLog.belongsTo(User, { foreignKey: 'userId' });

const sequelize = require('../config/database');

module.exports = {
    User,
    Prediction,
    DataSource,
    NewsSummary,
    ChatMessage,
    AIProvider,
    AdminLog,
    DailyMarketInsight,
    Portfolio,
    PortfolioHistory,
    PortfolioPrediction,
    AIPortfolio,
    BinanceBotConfig,
    ExecutedTrade,
    BotLog,
    CandleData,
    PivotPoint,
    sequelize
};
