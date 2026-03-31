const { Sequelize, Op } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const sequelize = new Sequelize(
    process.env.DB_NAME || 'prediction_db',
    process.env.DB_USER || 'erdem',
    process.env.DB_PASS || 'password',
    {
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false, 
    }
);

const DataSource = require('../backend/models/DataSource');
const NewsSummary = require('../backend/models/NewsSummary');
const DailyMarketInsight = require('../backend/models/DailyMarketInsight');
const marketDataService = require('../backend/services/marketDataService');

async function diagnostic() {
    try {
        await sequelize.authenticate();
        console.log('--- 1. DataSources ---');
        const sources = await DataSource.findAll({ where: { isActive: true } });
        console.log(`Active sources: ${sources.length}`);
        sources.forEach(s => console.log(`- ${s.name} (${s.type}): ${s.url}`));

        console.log('\n--- 2. NewsSummary ---');
        const newsCount = await NewsSummary.count();
        const latestNews = await NewsSummary.findOne({ order: [['createdAt', 'DESC']] });
        console.log(`Total news: ${newsCount}`);
        if (latestNews) {
            console.log(`Latest news: ${latestNews.titleEN} (${latestNews.createdAt})`);
        } else {
            console.log('No news found in DB.');
        }

        console.log('\n--- 3. Scraper Insights ---');
        const insightsCount = await DailyMarketInsight.count();
        const latestInsight = await DailyMarketInsight.findOne({ order: [['createdAt', 'DESC']] });
        console.log(`Total insights: ${insightsCount}`);
        if (latestInsight) {
            console.log(`Latest insight: ${latestInsight.title} (${latestInsight.createdAt})`);
        }

        console.log('\n--- 4. Market Data (Investing Scrape) ---');
        const indicators = await marketDataService.getGlobalIndicators();
        console.log('Indicators keys:', Object.keys(indicators));
        if (indicators.btc) {
            console.log('BTC Data:', indicators.btc);
        } else {
            console.log('❌ BTC Data MISSING from Investing scrape.');
        }
        
        // Check if ANY crypto data exists in indicators (keys that are not in the main list)
        const mainKeys = ['vix','dxy','gold','silver','oil','sp500','nasdaq','us10y','us02y','eurusd','gbpusd','usdtry'];
        const cryptoKeys = Object.keys(indicators).filter(k => !mainKeys.includes(k));
        console.log('Crypto keys in indicators:', cryptoKeys);

    } catch (error) {
        console.error('Diagnostic error:', error);
    } finally {
        await sequelize.close();
    }
}

diagnostic();
