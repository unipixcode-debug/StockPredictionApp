const { Op } = require('sequelize');
const User = require('../models/User');
const GlobalSetting = require('../models/GlobalSetting');

class CreditService {
    constructor() {
        this.checkInterval = 60 * 60 * 1000; // Check every hour
    }

    startBackgroundTasks() {
        console.log('💳 Credit Management background tasks started');
        
        // Initial check on startup
        this.processSubscriptions();

        // Repeated check
        setInterval(() => {
            this.processSubscriptions();
        }, this.checkInterval);
    }

    async processSubscriptions() {
        console.log('🔄 Checking for due credit deductions...');
        try {
            const settings = await this.getSubscriptionSettings();
            await this.processNewsletter(settings.newsletterCost);
            await this.processMoneyFlow(settings.moneyFlowCost);
            await this.processAutoPrediction(settings.autoPredictionCost);
            console.log('✅ Credit deduction check complete');
        } catch (error) {
            console.error('❌ Error processing subscriptions:', error);
        }
    }

    async getSubscriptionSettings() {
        let newsletterCost = 5;
        let moneyFlowCost = 5;
        let autoPredictionCost = 5;

        try {
            const nSetting = await GlobalSetting.findByPk('monthly_newsletter_cost');
            const mSetting = await GlobalSetting.findByPk('monthly_money_flow_cost');
            const aSetting = await GlobalSetting.findByPk('monthly_auto_prediction_cost');
            
            if (nSetting) newsletterCost = parseInt(nSetting.value);
            if (mSetting) moneyFlowCost = parseInt(mSetting.value);
            if (aSetting) autoPredictionCost = parseInt(aSetting.value);
        } catch (e) {
            console.warn('Using default subscription costs');
        }

        return { newsletterCost, moneyFlowCost, autoPredictionCost };
    }

    async processNewsletter(cost) {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        // Find users who are subscribed and haven't been charged in the last month
        const users = await User.findAll({
            where: {
                newsletterSubscribed: true,
                [Op.or]: [
                    { lastNewsletterDeduction: { [Op.lte]: oneMonthAgo } },
                    { lastNewsletterDeduction: null }
                ],
                credits: { [Op.gte]: cost }
            }
        });

        for (const user of users) {
            await user.update({
                credits: user.credits - cost,
                lastNewsletterDeduction: new Date()
            });
            console.log(`Charged ${user.email} ${cost} credits for Newsletter`);
        }
    }

    async processMoneyFlow(cost) {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const users = await User.findAll({
            where: {
                moneyFlowSubscribed: true,
                [Op.or]: [
                    { lastMoneyFlowDeduction: { [Op.lte]: oneMonthAgo } },
                    { lastMoneyFlowDeduction: null }
                ],
                credits: { [Op.gte]: cost }
            }
        });

        for (const user of users) {
            await user.update({
                credits: user.credits - cost,
                lastMoneyFlowDeduction: new Date()
            });
            console.log(`Charged ${user.email} ${cost} credits for Money Flow`);
        }
    }

    async processAutoPrediction(cost) {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const users = await User.findAll({
            where: {
                autoPredictionSubscribed: true,
                [Op.or]: [
                    { lastAutoPredictionDeduction: { [Op.lte]: oneMonthAgo } },
                    { lastAutoPredictionDeduction: null }
                ],
                credits: { [Op.gte]: cost }
            }
        });

        for (const user of users) {
            await user.update({
                credits: user.credits - cost,
                lastAutoPredictionDeduction: new Date()
            });
            console.log(`Charged ${user.email} ${cost} credits for Auto Prediction`);
        }
    }
}

module.exports = new CreditService();
