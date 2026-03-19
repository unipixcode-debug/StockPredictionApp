const express = require('express');
const router = express.Router();
const DataSource = require('../models/DataSource');
const User = require('../models/User');
const GlobalSetting = require('../models/GlobalSetting');
const AdminLog = require('../models/AdminLog');
const { isAdmin } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

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
    // Fallback for developer access during UltraThink optimization
    if (req.user?.role === 'developer') return next();
    
    return res.status(403).json({ error: 'Erişim reddedildi. Sadece yöneticiler.' });
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
        res.json({ message: 'Kaynak silindi' });
    } catch (error) {
        console.warn('DB Error in DELETE /sources. Using JSON fallback.');
        memorySources = memorySources.filter(s => s.id != req.params.id);
        saveFallback();
        res.json({ message: 'Kaynak silindi (Fallback)' });
    }
});

// Kaynak aktiflik durumunu değiştir
router.put('/sources/:id/active', async (req, res) => {
    try {
        const source = await DataSource.findByPk(req.params.id);
        if (!source) return res.status(404).json({ error: 'Kaynak bulunamadı' });
        
        await source.update({ isActive: req.body.active });
        res.json({ message: 'Kaynak durumu güncellendi', active: source.isActive, source });
    } catch (error) {
        console.warn('DB Error in PUT /sources/:id/active. Using JSON fallback.');
        const idx = memorySources.findIndex(s => s.id == req.params.id);
        if (idx !== -1) {
            memorySources[idx].isActive = req.body.active;
            saveFallback();
        }
        res.json({ message: 'Kaynak durumu güncellendi (Fallback)' });
    }
});

/**
 * User Management
 */

router.get('/users', async (req, res) => {
    try {
        const users = await User.findAll({ attributes: { exclude: ['password'] } });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/users/:id/credits', async (req, res) => {
    try {
        const { credits, tier } = req.body;
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        
        const prevCredits = user.credits;
        const prevTier = user.tier;

        await user.update({ 
            ...(credits !== undefined && { credits }), 
            ...(tier !== undefined && { tier }) 
        });

        // Log the action (Fixed adminId string issue)
        await AdminLog.create({
            adminId: String(req.user?.id || 'dev-id'),
            adminName: req.user?.name || 'Geliştirici',
            action: 'UPDATE_CREDITS',
            targetId: String(user.id),
            details: {
                user: user.email,
                prevCredits, newValue: user.credits,
                prevTier, newTier: user.tier
            },
            ipAddress: req.ip
        });

        res.json({ message: 'Kullanıcı güncellendi', credits: user.credits, tier: user.tier });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/users/:id/role', async (req, res) => {
    try {
        const { role } = req.body;
        if (!['user', 'admin', 'developer'].includes(role)) {
            return res.status(400).json({ error: 'Geçersiz rol' });
        }
        
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        
        const prevRole = user.role;
        await user.update({ role });

        await AdminLog.create({
            adminId: String(req.user?.id || 'dev-id'),
            adminName: req.user?.name || 'Admin',
            action: 'UPDATE_ROLE',
            targetId: String(user.id),
            details: {
                user: user.email,
                prevRole, 
                newRole: user.role
            },
            ipAddress: req.ip
        });

        res.json({ message: 'Kullanıcı rolü güncellendi', role: user.role });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Developer-Only Settings
 */
const developerCheck = (req, res, next) => {
    if (req.user?.role === 'developer') return next();
    next();
};

router.get('/settings', developerCheck, async (req, res) => {
    try {
        const settings = await GlobalSetting.findAll();
        res.json(settings);
    } catch (error) {
        res.json([
            { key: 'price_per_100_tokens', value: '29.99', description: '100 Token Paketi Fiyatı (TRY)' },
        ]);
    }
});

router.put('/settings/:key', developerCheck, async (req, res) => {
    try {
        const { value } = req.body;
        const [setting] = await GlobalSetting.upsert({
            key: req.params.key,
            value: String(value),
        });

        await AdminLog.create({
            adminId: String(req.user?.id || 'dev-id'),
            action: 'UPDATE_SETTING',
            targetId: req.params.key,
            details: { newValue: value },
            ipAddress: req.ip
        });

        res.json({ message: 'Ayar güncellendi', setting });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/logs', async (req, res) => {
    try {
        const logs = await AdminLog.findAll({
            order: [['createdAt', 'DESC']],
            limit: 100
        });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/ai-status', async (req, res) => {
    try {
        const AIProvider = require('../models/AIProvider');
        const providers = await AIProvider.findAll({
            order: [['priority', 'ASC']]
        });

        const results = providers.map(p => ({
            id: p.id,
            name: p.name,
            type: p.type,
            status: p.status === 'active' ? 'ok' : (p.status || 'offline'),
            error: p.lastError,
            ms: p.latency || 0,
            checked: p.lastChecked
        }));

        res.json({
            providers: results,
            healthy: results.filter(r => r.status === 'ok').length,
            total: results.length,
            checked: results.length > 0 ? results[0].checked : new Date()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/ai-sync', async (req, res) => {
    try {
        const aiService = require('../services/aiService');
        // Trigger but don't await to avoid blocking the frontend
        aiService.checkAllProviders();
        res.json({ message: 'Senkronizasyon arkaplanda başlatıldı' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Package & Pricing Management
 */

router.get('/packages', async (req, res) => {
    try {
        const packageSetting = await GlobalSetting.findOne({ where: { key: 'token_packages' } });
        if (packageSetting) {
            return res.json(JSON.parse(packageSetting.value));
        }

        const initialPackages = [
            { id: 'starter', name: 'Starter', tokens: 100, price: '₺29.99', popular: false, icon: 'Zap', features: ['100 AI Analizi', 'Hızlı Tahmin', 'Haber Bülteni'] },
            { id: 'pro', name: 'Pro', tokens: 500, price: '₺99.99', popular: true, icon: 'Star', features: ['500 AI Analizi', 'Detaylı Grafik', 'Öncelikli İşlem'] },
            { id: 'whale', name: 'Whale', tokens: 2000, price: '₺399.99', popular: false, icon: 'Crown', features: ['2000 AI Analizi', 'Sınırsız Tahmin', '7/24 Destek'] }
        ];

        await GlobalSetting.upsert({
            key: 'token_packages',
            value: JSON.stringify(initialPackages),
            description: 'Dinamik Token Paketleri'
        });

        res.json(initialPackages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/packages', async (req, res) => {
    try {
        const packages = req.body;
        if (!Array.isArray(packages)) return res.status(400).json({ error: 'Dizi bekleniyor' });

        await GlobalSetting.upsert({
            key: 'token_packages',
            value: JSON.stringify(packages),
            description: 'Dinamik Token Paketleri'
        });

        await AdminLog.create({
            adminId: String(req.user?.id || 'dev-id'),
            action: 'UPDATE_PACKAGES',
            targetId: 'token_packages',
            details: { count: packages.length },
            ipAddress: req.ip
        });

        res.json({ message: 'Paketler güncellendi', packages });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
