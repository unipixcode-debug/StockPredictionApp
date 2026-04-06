require('dotenv').config();
console.log('--- ENV DEBUG ---');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('GOOGLE_CALLBACK_URL:', process.env.GOOGLE_CALLBACK_URL);
console.log('-----------------');
const express = require('express');
const dns = require('dns');
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const passport = require('passport');
const cookieSession = require('cookie-session');
require('./config/passport'); // Import passport config
const sequelize = require('./config/database');

// Import Models to Sync
const {
    User, Prediction, DataSource, NewsSummary, ChatMessage,
    AIProvider, AdminLog, DailyMarketInsight,
    Portfolio, PortfolioHistory, PortfolioPrediction
} = require('./models');

const predictionRoutes = require('./routes/predictions');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const marketRoutes = require('./routes/market');
const aiRoutes = require('./routes/ai');
const aiAdminRoutes = require('./routes/aiAdmin');
const paymentRoutes = require('./routes/payment');
const portfolioRoutes = require('./routes/portfolio');
const aiPortfolioRoutes = require('./routes/aiPortfolio');
const scannerRoutes = require('./routes/scanner');
const botRoutes = require('./routes/bot');
const cacheService = require('./services/cacheService');
const creditService = require('./services/creditService');
const scraperService = require('./services/scraperService');
const newsService = require('./services/newsService');
const botScannerService = require('./services/botScannerService');
const StrategyAlphaService = require('./services/StrategyAlphaService');

const app = express();

// Middleware
app.set('trust proxy', 1); // Trust first proxy (Nginx) for secure cookies and OAuth URLs
app.use(express.json());
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));

app.use(
    cookieSession({
        name: 'session',
        keys: [process.env.JWT_SECRET || 'secret'],
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    })
);

// Fix for passport 0.6.0+ with cookie-session
app.use((req, res, next) => {
    if (req.session && !req.session.regenerate) {
        req.session.regenerate = (cb) => {
            cb();
        };
    }
    if (req.session && !req.session.save) {
        req.session.save = (cb) => {
            cb();
        };
    }
    next();
});

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin/ai', aiAdminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/ai-portfolio', aiPortfolioRoutes);
app.use('/api/scanner', scannerRoutes);
app.use('/api/bot', botRoutes);

// Basic Route for testing
app.get('/', (req, res) => {
    res.json({ message: 'Prediction API is running' });
});

// Sync Database and Start Server
console.log('🔄 Synchronizing database...');
sequelize.sync({ alter: false })
    .then(() => {
        console.log('✅ Database synchronized (Alter skipped)');
        startServices();
    })
    .catch(err => {
        console.error('⚠️ Database sync failed, but server will continue:', err.message);
        // Start services anyway so market stats/news can function
        startServices();
    });

function startServices() {
    // Start Background Tasks
    cacheService.startBackgroundUpdates();
    creditService.startBackgroundTasks();
    scraperService.startBackgroundTasks();
    newsService.startBackgroundTasks();
    botScannerService.startBackgroundTasks();
    StrategyAlphaService.startLearningLoop();
    
    // Quantitative AI Platform Services
    const marketIngestorService = require('./services/marketIngestorService');
    marketIngestorService.start();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ Server running on port ${PORT}`);
    });
}

