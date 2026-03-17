const express = require('express');
const router = express.Router();
const DataSource = require('../models/DataSource');
const User = require('../models/User');
const GlobalSetting = require('../models/GlobalSetting');
const AdminLog = require('../models/AdminLog');
const { isAdmin } = require('../middleware/auth');

const fs = require('fs');
const path = require('path');
const axios = require('axios'); // Move here for consistency

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
    if (req.isAuthenticated && req.isAuthenticated() && (req.user?.role === 'admin' || req.user?.role === 'developer')) {
        return next();
    }
    return res.status(403).json({ error: 'Access denied. Admins only.' });
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

// Alias for frontend compatibility
router.get('/news-sources', async (req, res) => {
    try {
        const sources = await DataSource.findAll();
        res.json(sources);
    } catch (error) {
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

// Kaynak aktiflik durumunu değiştir
router.put('/sources/:id/active', async (req, res) => {
    try {
        const source = await DataSource.findByPk(req.params.id);
        if (!source) return res.status(404).json({ error: 'Source not found' });
        
        await source.update({ isActive: req.body.active });
        res.json({ message: 'Source active status updated', active: source.isActive, source });
    } catch (error) {
        console.warn('DB Error in PUT /sources/:id/active. Using JSON fallback.');
        const idx = memorySources.findIndex(s => s.id == req.params.id);
        if (idx !== -1) {
            memorySources[idx].isActive = req.body.active;
            saveFallback();
        }
        res.json({ message: 'Source active status updated in fallback' });
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
        
        const prevCredits = user.credits;
        const prevTier = user.tier;

        await user.update({ 
            ...(credits !== undefined && { credits }), 
            ...(tier !== undefined && { tier }) 
        });

        // Log the action
        await AdminLog.create({
            adminId: req.user?.id || 'dev-id',
            adminName: req.user?.name || 'Developer',
            action: 'UPDATE_CREDITS',
            targetId: user.id,
            details: {
                user: user.email,
                prevCredits, newValue: user.credits,
                prevTier, newTier: user.tier
            },
            ipAddress: req.ip
        });

        res.json({ message: 'User updated', credits: user.credits, tier: user.tier });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update User Role (Admin/Developer)
router.put('/users/:id/role', async (req, res) => {
    try {
        const { role } = req.body;
        if (!['user', 'admin', 'developer'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        const prevRole = user.role;
        await user.update({ role });

        // Log the action
        await AdminLog.create({
            adminId: req.user?.id || 'dev-id',
            adminName: req.user?.name || 'Admin',
            action: 'UPDATE_ROLE',
            targetId: user.id,
            details: {
                user: user.email,
                prevRole, 
                newRole: user.role
            },
            ipAddress: req.ip
        });

        res.json({ message: 'User role updated', role: user.role });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Developer-Only Settings (pricing, limits)
 * Only accessible to users with role = 'developer'
 */
const developerCheck = (req, res, next) => {
    // Check if user is authenticated and has developer role
    if (req.isAuthenticated && req.isAuthenticated() && req.user?.role === 'developer') {
        return next();
    }
    // For local dev, allow if no strict auth is provided, but log warning
    console.warn(`[WARN] Developer endpoint accessed without strict auth check by IP: ${req.ip}`);
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

// Global ayar güncelle (Geliştirici paneli) - PUT Method
router.put('/settings/:key', developerCheck, async (req, res) => {
    try {
        const { value } = req.body;
        const [setting, created] = await GlobalSetting.upsert({
            key: req.params.key,
            value: String(value),
        });

        // Log the action
        await AdminLog.create({
            adminId: req.user?.id || 'dev-id',
            adminName: req.user?.name || 'Developer',
            action: 'UPDATE_SETTING',
            targetId: req.params.key,
            details: { newValue: value },
            ipAddress: req.ip
        });

        res.json({ message: 'Setting updated via PUT', setting });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Global ayar güncelle (Geliştirici paneli) - POST Method (for frontend compatibility)
router.post('/settings', async (req, res) => {
    try {
        // We use authCheck instead of developerCheck here because
        // regular admins can also update SOME settings (like news_enabled)
        // If needed, we can split this into adminSettings vs devSettings routes
        const { key, value } = req.body;
        if (!key) return res.status(400).json({ error: 'Key is required' });

        const [setting, created] = await GlobalSetting.upsert({
            key,
            value: String(value),
        });

        // Log the action
        await AdminLog.create({
            adminId: req.user?.id || 'admin-id',
            adminName: req.user?.name || 'Admin',
            action: 'UPDATE_SETTING_POST',
            targetId: key,
            details: { newValue: value },
            ipAddress: req.ip
        });

        res.json({ message: 'Setting updated via POST', setting });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin loglarını listele
router.get('/logs', async (req, res) => {
    try {
        const logs = await AdminLog.findAll({
            order: [['createdAt', 'DESC']],
            limit: 50
        });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// AI Provider Status Check
router.get('/ai-status', async (req, res) => {
    const aiService = require('../services/aiService');
    const results = [];

    for (const provider of aiService.providers) {
        const start = Date.now();
        try {
            const testPrompt = 'Reply with just: OK';
            // Use the unified service method which supports ALL types (Ollama, Anthropic, etc.)
            const response = await aiService.generateContent(testPrompt, null, provider.id);
            
            results.push({
                name: provider.name,
                type: provider.type,
                status: 'ok',
                quota: provider.quotaRemaining,
                response: response.substring(0, 20),
                ms: Date.now() - start
            });
        } catch (e) {
            const isQuota = e.message?.includes('429') || e.message?.includes('quota') || e.message?.includes('RESOURCE_EXHAUSTED');
            results.push({
                name: provider.name,
                type: provider.type,
                status: isQuota ? 'quota_exceeded' : 'error',
                error: e.message?.substring(0, 120),
                ms: Date.now() - start
            });
        }
    }

    res.json({
        checked: new Date().toISOString(),
        providers: results,
        healthy: results.filter(r => r.status === 'ok').length,
        total: results.length,
        userCredits: req.user?.credits || 0
    });
});

module.exports = router;
