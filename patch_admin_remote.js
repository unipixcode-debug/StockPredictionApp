const fs = require('fs');
const file = '/home/ubuntu/StockPredictionApp/backend/routes/admin.js';
let content = fs.readFileSync(file, 'utf8');
if (!content.includes('/packages')) {
    const patch = `
// Get token packages
router.get('/packages', async (req, res) => {
    try {
        const pkgKeys = ['pkg_starter_tokens', 'pkg_starter_price', 'pkg_pro_tokens', 'pkg_pro_price', 'pkg_whale_tokens', 'pkg_whale_price'];
        const { GlobalSetting } = require('../models');
        const settings = await GlobalSetting.findAll();
        res.json(settings.filter(s => pkgKeys.includes(s.key)));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update token package
router.post('/packages', async (req, res) => {
    try {
        const { key, value } = req.body;
        const { GlobalSetting, AdminLog } = require('../models');
        await GlobalSetting.upsert({ key, value: String(value) });
        await AdminLog.create({ 
            adminName: 'Admin', 
            action: 'UPDATE_PACKAGE', 
            targetId: key,
            details: { newValue: value } 
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
`;
    content = content.replace('module.exports = router;', patch + '\nmodule.exports = router;');
    fs.writeFileSync(file, content);
    console.log('PATCH_SUCCESS');
} else {
    console.log('PATCH_ALREADY_EXISTS');
}
