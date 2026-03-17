const express = require('express');
const router = express.Router();
const AIProvider = require('../models/AIProvider');
const aiService = require('../services/aiService');
const { isAdmin } = require('../middleware/auth'); // Assuming you have an isAdmin middleware

// Registering Admin-only routes
router.use(isAdmin);

// GET all providers
router.get('/providers', async (req, res) => {
    try {
        const providers = await AIProvider.findAll({
            order: [['priority', 'ASC']]
        });
        res.json(providers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST add new provider
router.post('/providers', async (req, res) => {
    try {
        const provider = await AIProvider.create(req.body);
        // Refresh aiService pool
        await aiService.initProviders();
        res.json(provider);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH update provider (toggle active, change key, priority etc)
router.patch('/providers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const provider = await AIProvider.findByPk(id);
        if (!provider) return res.status(404).json({ error: 'Provider not found' });
        
        await provider.update(req.body);
        // Refresh aiService pool
        await aiService.initProviders();
        res.json(provider);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE provider
router.delete('/providers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const provider = await AIProvider.findByPk(id);
        if (!provider) return res.status(404).json({ error: 'Provider not found' });
        
        await provider.destroy();
        // Refresh aiService pool
        await aiService.initProviders();
        res.json({ message: 'Provider deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check and manual status refresh
router.get('/providers/check/:id', async (req, res) => {
    try {
        const provider = await AIProvider.findByPk(req.params.id);
        if (!provider) return res.status(404).json({ error: 'Not found' });

        let status = 'Error';
        try {
           const testPrompt = "Respond with 'OK'";
           await aiService.generateContent(testPrompt, null, provider.id); // Passing ID to force specific provider test
           status = 'Active';
        } catch (e) {
           status = 'Failed: ' + e.message;
        }

        await provider.update({ status, lastUsed: new Date() });
        res.json({ status });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
