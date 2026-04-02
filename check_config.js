require('dotenv').config();
const { BinanceBotConfig } = require('./models');

BinanceBotConfig.findOne().then(c => {
    if (!c) { console.log('NO CONFIG FOUND'); return; }
    console.log('isTestnet:', c.isTestnet, '| typeof:', typeof c.isTestnet);
    console.log('futuresApiKey length:', c.futuresApiKey?.trim().length);
    console.log('futuresApiSecret length:', c.futuresApiSecret?.trim().length);
    console.log('isFuturesActive:', c.isFuturesActive);
    console.log('budgetMode:', c.budgetMode, '| budgetAmount:', c.budgetAmount);
}).catch(e => console.error('DB error:', e.message));
