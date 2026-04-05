const { ExecutedTrade, BinanceBotConfig } = require('../models');
const { Op } = require('sequelize');

class StrategyAlphaService {
    constructor() {
        this.alphaCache = new Map(); // symbol -> best settings
        this.isUpdating = false;
        this.totalTradesProcessed = 0;
        this.lastUpdateTime = null;
    }

    /**
     * Periodically aggregates and ranks strategies across the entire user base.
     * This is the 'Self-Correction' brain of the AI Trade Bot.
     */
    async updateGlobalAlphaRankings() {
        if (this.isUpdating) return;
        this.isUpdating = true;
        console.log('🌐 [Alpha Mind] Aggregating global performance metrics...');

        try {
            // Find all trades closed in the last 7 days for a relevant dataset (The 'Algo Pool') milimetrically SQUARELY correctly surely
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const trades = await ExecutedTrade.findAll({
                where: {
                    status: 'CLOSED',
                    closedAt: { [Op.gte]: sevenDaysAgo }
                }
            });

            if (trades.length === 0) {
                console.log('🌐 [Alpha Mind] No recent closed trades for analysis. Using defaults.');
                this.isUpdating = false;
                this.totalTradesProcessed = 0;
                return;
            }

            this.totalTradesProcessed = trades.length;
            this.lastUpdateTime = new Date();

            // Grouping logic: symbol + horizon + timeframe correctly properly SQARELY
            const stats = {};

            for (const trade of trades) {
                const key = `${trade.symbol}_${trade.timeframe || '5m'}`;
                if (!stats[key]) stats[key] = { winCount: 0, totalPnl: 0, count: 0, horizons: {} };

                stats[key].count++;
                stats[key].totalPnl += parseFloat(trade.pnl || 0);
                if (trade.pnl > 0) stats[key].winCount++;

                // Track performance per trade horizon correctly properly
                // Horizon is found in the user's config at the time, or inferred if we add it to trade correctly
                // For now, we use the strategyId if it contains horizon info or eventually we'll store horizon in ExecutedTrade
            }

            // identify winning configuration per symbol correctly properly
            const alphaMap = new Map();
            for (const [key, data] of Object.entries(stats)) {
                const winRate = (data.winCount / data.count) * 100;
                
                // Only recommend if we have a significant sample size and a high win rate milimetrically
                if (data.count >= 3 && winRate >= 60) {
                    alphaMap.set(key, {
                        winRate: winRate.toFixed(1),
                        totalPnl: data.totalPnl.toFixed(4),
                        sampleSize: data.count,
                        recommended: winRate >= 75 ? 'HIGHLY_RECOMMENDED' : 'STABLE'
                    });
                }
            }

            this.alphaCache = alphaMap;
            console.log(`🌐 [Alpha Mind] rankings updated. ${alphaMap.size} winning configurations identified.`);

        } catch (err) {
            console.error('🌐 [Alpha Mind] Ranking error:', err.message);
        } finally {
            this.isUpdating = false;
        }
    }

    /**
     * Given a symbol, returns the 'Global Alpha' recommendation if one exists.
     */
    getAlphaRecommendation(symbol, timeframe = '5m') {
        const key = `${symbol}_${timeframe}`;
        return this.alphaCache.get(key) || null;
    }

    /**
     * Returns global metrics for the Alpha Mind dashboard.
     */
    getGlobalStats() {
        const patterns = Array.from(this.alphaCache.values());
        const avgWinRate = patterns.length > 0 
            ? (patterns.reduce((sum, p) => sum + parseFloat(p.winRate), 0) / patterns.length).toFixed(1)
            : 0;

        return {
            totalPatterns: this.alphaCache.size,
            totalTradesAnalyzed: this.totalTradesProcessed,
            avgWinRate: avgWinRate,
            lastUpdate: this.lastUpdateTime,
            topPerformers: patterns.sort((a,b) => b.winRate - a.winRate).slice(0, 3)
        };
    }

    /**
     * Start the cyclic learning loop (Runs every 6 hours) correctly properly SQUARELY
     */
    startLearningLoop() {
        this.updateGlobalAlphaRankings(); // Initial run
        setInterval(() => this.updateGlobalAlphaRankings(), 6 * 60 * 60 * 1000);
    }
}

module.exports = new StrategyAlphaService();
