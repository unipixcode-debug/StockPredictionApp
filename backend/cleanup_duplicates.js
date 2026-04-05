const { ExecutedTrade } = require('./models');
const { Sequelize, Op } = require('sequelize');

async function cleanup() {
    try {
        console.log('🧹 [Cleanup] Duplicate trades starting...');
        
        // Find all users who have open trades
        const users = await ExecutedTrade.findAll({
            attributes: ['userId'],
            where: { status: 'OPEN' },
            group: ['userId']
        });

        for (const u of users) {
            const userId = u.userId;
            const openTrades = await ExecutedTrade.findAll({
                where: { userId, status: 'OPEN' },
                order: [['createdAt', 'ASC']]
            });

            const seenSymbols = new Set();
            for (const trade of openTrades) {
                if (seenSymbols.has(trade.symbol)) {
                    console.log(`[Cleanup] Found duplicate for ${trade.symbol} (ID: ${trade.id}). Deleting...`);
                    await trade.destroy();
                } else {
                    seenSymbols.add(trade.symbol);
                }
            }
        }

        console.log('✅ [Cleanup] Duplicates removed.');
    } catch (e) {
        console.error('❌ [Cleanup] Failed:', e.message);
    } finally {
        process.exit(0);
    }
}

cleanup();
