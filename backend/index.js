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
const User = require('./models/User');
const Prediction = require('./models/Prediction');
const DataSource = require('./models/DataSource');
const NewsSummary = require('./models/NewsSummary');
const ChatMessage = require('./models/ChatMessage');
const AIProvider = require('./models/AIProvider');
const AdminLog = require('./models/AdminLog');
const DailyMarketInsight = require('./models/DailyMarketInsight');

const predictionRoutes = require('./routes/predictions');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const marketRoutes = require('./routes/market');
const aiRoutes = require('./routes/ai');
const aiAdminRoutes = require('./routes/aiAdmin');
const paymentRoutes = require('./routes/payment');
const cacheService = require('./services/cacheService');
const creditService = require('./services/creditService');
const scraperService = require('./services/scraperService');
const newsService = require('./services/newsService');

const app = express();

// Start Background Tasks
cacheService.startBackgroundUpdates();
creditService.startBackgroundTasks();
scraperService.startBackgroundTasks();
newsService.startBackgroundTasks();

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
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

// Basic Route for testing
app.get('/', (req, res) => {
    res.json({ message: 'Prediction API is running' });
});

const PORT = process.env.PORT || 5000;

// Start server immediately — DB sync is non-blocking
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});

// Sync Database in background (non-blocking)
sequelize.sync({ alter: true })
    .then(() => {
        console.log('✅ Database synchronized');
    })
    .catch(err => {
        console.error('⚠️  Database sync failed (server still running):', err.message);
        console.error('   Market stats & AI features still work. Only prediction history requires DB.');
    });

