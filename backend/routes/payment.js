const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const User = require('../models/User');
const GlobalSetting = require('../models/GlobalSetting');
const AdminLog = require('../models/AdminLog');
const path = require('path');
const fs = require('fs');

// Path to your Google Service Account JSON file
const KEY_FILE_PATH = path.join(__dirname, '..', 'config', 'google-service-account.json');

/**
 * Google Play Purchase Verification
 */
router.post('/verify-google', async (req, res) => {
    const { purchaseToken, productId, userId } = req.body;

    if (!purchaseToken || !productId) {
        return res.status(400).json({ error: 'Missing purchase information' });
    }

    try {
        // 1. Check if Service Account key exists
        if (!fs.existsSync(KEY_FILE_PATH)) {
            console.error('Google Service Account key file missing at:', KEY_FILE_PATH);
            return res.status(500).json({ error: 'Payment server configuration error (Missing Key)' });
        }

        // 2. Auth with Google
        const auth = new google.auth.GoogleAuth({
            keyFile: KEY_FILE_PATH,
            scopes: ['https://www.googleapis.com/auth/androidpublisher'],
        });

        const androidPublisher = google.androidpublisher({
            version: 'v3',
            auth,
        });

        // 3. Verify Purchase with Google Play API
        const response = await androidPublisher.purchases.products.get({
            packageName: 'com.unipix.predictpro',
            productId: productId,
            token: purchaseToken,
        });

        // 4. Check purchase state (0 = Purchased, 1 = Canceled, 2 = Pending)
        if (response.data.purchaseState !== 0) {
            return res.status(400).json({ error: 'Purchase not valid or canceled' });
        }

        // 5. Find User
        const targetUserId = userId || req.user?.id;
        const user = await User.findByPk(targetUserId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // 6. Get Token Amount for this Product from GlobalSettings
        const packageSetting = await GlobalSetting.findOne({ where: { key: 'token_packages' } });
        if (!packageSetting) throw new Error('Package settings not found');
        
        const packages = JSON.parse(packageSetting.value);
        const pkg = packages.find(p => p.id === productId);
        
        if (!pkg) {
            return res.status(400).json({ error: 'Invalid Product ID' });
        }

        const tokenAmount = parseInt(pkg.tokens || 0);

        // 7. Update User Credits
        const oldCredits = user.credits || 0;
        await user.update({ credits: oldCredits + tokenAmount });

        // 8. Log the transaction
        await AdminLog.create({
            adminId: 'SYSTEM_PAYMENT',
            adminName: 'Google Play Billing',
            action: 'RECHARGE_CREDITS',
            targetId: user.id,
            details: {
                productId,
                tokenAmount,
                oldCredits,
                newCredits: user.credits,
                purchaseToken: purchaseToken.substring(0, 10) + '...'
            },
            ipAddress: req.ip
        });

        res.json({ 
            success: true, 
            newCredits: user.credits,
            message: `${tokenAmount} tokens added to your account.`
        });

    } catch (error) {
        console.error('Google Play Verification Error:', error.message);
        res.status(500).json({ 
            error: 'Verification failed', 
            details: error.message 
        });
    }
});

module.exports = router;
