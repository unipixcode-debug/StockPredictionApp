const { Portfolio, PortfolioHistory, PortfolioPrediction } = require('../models');
const marketDataService = require('./marketDataService');
const newsService = require('./newsService');
const aiService = require('./aiService');

class PortfolioService {
    async getPortfolioData(userId) {
        try {
            const holdings = await Portfolio.findAll({ where: { userId } });
            const indicators = await marketDataService.getGlobalIndicators();
            
            if (!indicators) console.warn('No global indicators, using fetchPrice for all holdings');

            const analyzedHoldings = await Promise.all(holdings.map(async h => {
                const symbolKey = h.symbol.toLowerCase();
                const indicator = indicators ? indicators[symbolKey] : null;
                
                let currentPrice = 0;
                if (indicator && indicator.price) {
                    currentPrice = indicator.price;
                } else {
                    currentPrice = await marketDataService.fetchPrice(h.symbol);
                }

                const value = h.amount * currentPrice;
                const pl = value - Number(h.totalInvested);
                const plPercent = Number(h.totalInvested) > 0 ? (pl / Number(h.totalInvested)) * 100 : 0;

                return {
                    ...h.toJSON(),
                    currentPrice,
                    value,
                    pl,
                    plPercent
                };
            }));

            return analyzedHoldings;
        } catch (error) {
            console.error('Error in PortfolioService.getPortfolioData:', error);
            return [];
        }
    }

    async getComprehensiveAnalysis(userId) {
        try {
            const holdings = await this.getPortfolioData(userId);
            if (holdings.length === 0) return { message: 'No holdings found.' };

            // Aggregate News for all symbols
            const newsSentiment = await newsService.getSentimentAggregation(); // Reusing existing sentiment logic
            
            const analysis = holdings.map(h => {
                const sentimentMatch = newsSentiment.find(s => s.asset.toUpperCase() === h.symbol.toUpperCase());
                let sentimentLabel = 'NEUTRAL';
                if (sentimentMatch) {
                    if (sentimentMatch.averageScore >= 20) sentimentLabel = 'POSITIVE';
                    else if (sentimentMatch.averageScore <= -20) sentimentLabel = 'NEGATIVE';
                }
                return {
                    symbol: h.symbol,
                    sentiment: sentimentLabel,
                    plPercent: h.plPercent,
                    status: h.plPercent >= 0 ? 'PROFIT' : 'LOSS'
                };
            });

            // Call AI for a brief summary of the entire portfolio
            const aiSummary = await aiService.analyzePortfolio(analysis);

            return {
                holdings: analysis,
                aiSummary
            };
        } catch (error) {
            console.error('Error in PortfolioService.getComprehensiveAnalysis:', error);
            return null;
        }
    }

    async updateHistory(userId) {
        // Logic to capture daily total value and P/L
        // This would be called by a daily cron job
    }

    async verifyPredictions() {
        // Logic to check PortfolioPrediction records where targetDate <= today
        // and update status/actualPL
    }
}

module.exports = new PortfolioService();
