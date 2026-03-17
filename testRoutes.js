
try {
    const admin = require('./StockPredictionApp/backend/routes/admin');
    console.log('admin is:', typeof admin, admin.name || 'anonymous');
    const ai = require('./StockPredictionApp/backend/routes/ai');
    console.log('ai is:', typeof ai, ai.name || 'anonymous');
    const auth = require('./StockPredictionApp/backend/routes/auth');
    console.log('auth is:', typeof auth, auth.name || 'anonymous');
} catch (e) {
    console.error('Error:', e);
}

