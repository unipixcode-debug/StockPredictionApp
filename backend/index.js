require('dotenv').config();
const express = require('express');
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

const predictionRoutes = require('./routes/predictions');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const marketRoutes = require('./routes/market');

const app = express();

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

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/admin', adminRoutes);

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

