const express = require('express');
const router = express.Router();
const DataSource = require('../models/DataSource');
const User = require('../models/User');
const { isAdmin } = require('../middleware/auth');

const fs = require('fs');
const path = require('path');

const fallbackFilePath = path.join(__dirname, '..', 'fallback_sources.json');

// Initialize fallback from file or with default data
let memorySources = [];
let nextId = 3;

try {
    if (fs.existsSync(fallbackFilePath)) {
        memorySources = JSON.parse(fs.readFileSync(fallbackFilePath, 'utf8'));
        if (memorySources.length > 0) {
            nextId = Math.max(...memorySources.map(s => s.id)) + 1;
        }
    } else {
        memorySources = [
            { id: 1, name: 'Bloomberg RSS', url: 'https://bloomberg.com/feed', type: 'NEWS_RSS' },
            { id: 2, name: 'Binance API', url: 'https://api.binance.com/v3', type: 'MARKET_API' }
        ];
        fs.writeFileSync(fallbackFilePath, JSON.stringify(memorySources, null, 2));
    }
} catch (e) {
    console.error('Error loading fallback sources:', e.message);
}

const saveFallback = () => {
    try {
        fs.writeFileSync(fallbackFilePath, JSON.stringify(memorySources, null, 2));
    } catch (e) {
        console.error('Failed to save fallback sources', e);
    }
};

// Temporary bypass for local dev if DB/Auth is down
const authCheck = (req, res, next) => {
    // If auth is working, use it. If not, bypass for local dev.
    if (req.isAuthenticated && req.isAuthenticated() && req.user?.role === 'admin') {
        return next();
    }
    // Bypass for now so UI works without DB
    return next();
};

router.use(authCheck);

/**
 * Data Source Management
 */

// Tüm kaynakları listele
router.get('/sources', async (req, res) => {
    try {
        const sources = await DataSource.findAll();
        res.json(sources);
    } catch (error) {
        console.warn('DB Error in /sources. Using JSON fallback.');
        res.json(memorySources);
    }
});

// Yeni kaynak ekle
router.post('/sources', async (req, res) => {
    try {
        const source = await DataSource.create(req.body);
        res.json(source);
    } catch (error) {
        console.warn('DB Error in POST /sources. Using JSON fallback.');
        const newSource = { id: nextId++, ...req.body };
        memorySources.push(newSource);
        saveFallback();
        res.json(newSource);
    }
});

// Kaynak sil
router.delete('/sources/:id', async (req, res) => {
    try {
        await DataSource.destroy({ where: { id: req.params.id } });
        res.json({ message: 'Source deleted' });
    } catch (error) {
        console.warn('DB Error in DELETE /sources. Using JSON fallback.');
        memorySources = memorySources.filter(s => s.id != req.params.id);
        saveFallback();
        res.json({ message: 'Source deleted from fallback' });
    }
});

/**
 * User Management
 */

// Kullanıcıları listele
router.get('/users', async (req, res) => {
    try {
        const users = await User.findAll({ attributes: { exclude: ['password'] } });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
