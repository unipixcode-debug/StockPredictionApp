const express = require('express');
const router = express.Router();
const { Portfolio } = require('../models');
const portfolioService = require('../services/portfolioService');

const { isAuthenticated } = require('../middleware/auth');

// Get user portfolio
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const data = await portfolioService.getPortfolioData(req.user.id);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add/Update holding
router.post('/', isAuthenticated, async (req, res) => {
    try {
        const { symbol, market, amount, avgPrice } = req.body;
        const totalInvested = amount * avgPrice;

        const [holding, created] = await Portfolio.findOrCreate({
            where: { userId: req.user.id, symbol },
            defaults: { market, amount, avgPrice, totalInvested }
        });

        if (!created) {
            holding.amount = amount;
            holding.avgPrice = avgPrice;
            holding.totalInvested = totalInvested;
            holding.market = market;
            await holding.save();
        }

        res.json(holding);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete holding
router.delete('/:id', isAuthenticated, async (req, res) => {
    try {
        await Portfolio.destroy({ where: { id: req.params.id, userId: req.user.id } });
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get AI Analysis
router.get('/analysis', isAuthenticated, async (req, res) => {
    try {
        const analysis = await portfolioService.getComprehensiveAnalysis(req.user.id);
        res.json(analysis);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
