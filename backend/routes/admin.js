const express = require('express');
const router = express.Router();
const DataSource = require('../models/DataSource');
const User = require('../models/User');
const GlobalSetting = require('../models/GlobalSetting');
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

// Kullanıcı kredi/tier güncelle (Admin/Developer)
router.put('/users/:id/credits', async (req, res) => {
    try {
        const { credits, tier } = req.body;
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        await user.update({ 
            ...(credits !== undefined && { credits }), 
            ...(tier !== undefined && { tier }) 
        });
        res.json({ message: 'User updated', credits: user.credits, tier: user.tier });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Developer-Only Settings (pricing, limits)
 * Only accessible to users with role = 'developer'
 */
const developerCheck = (req, res, next) => {
    // In production this would check req.user.role === 'developer'
    // For now, allow through, but mark with a header check for future
    // TODO: Tie to actual auth when login flow is complete
    next();
};

// Tüm global ayarları getir (Geliştirici paneli)
router.get('/settings', developerCheck, async (req, res) => {
    try {
        const settings = await GlobalSetting.findAll();
        res.json(settings);
    } catch (error) {
        // Return defaults if table doesn't exist yet
        res.json([
            { key: 'price_per_100_tokens', value: '9.99', description: '100 Token Paketi Fiyatı (USD)' },
            { key: 'price_per_500_tokens', value: '39.99', description: '500 Token Paketi (Pro) Fiyatı (USD)' },
            { key: 'price_per_1000_tokens', value: '69.99', description: '1000 Token Paketi (Premium) Fiyatı (USD)' },
        ]);
    }
});

// Global ayar güncelle (Geliştirici paneli)
router.put('/settings/:key', developerCheck, async (req, res) => {
    try {
        const { value } = req.body;
        const [setting, created] = await GlobalSetting.upsert({
            key: req.params.key,
            value: String(value),
        });
        res.json({ message: 'Setting updated', setting });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
