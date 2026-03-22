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

// Associations
User.hasMany(Portfolio, { foreignKey: 'userId' });
Portfolio.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(PortfolioHistory, { foreignKey: 'userId' });
PortfolioHistory.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(PortfolioPrediction, { foreignKey: 'userId' });
PortfolioPrediction.belongsTo(User, { foreignKey: 'userId' });

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
    PortfolioPrediction
};
