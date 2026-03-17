const express = require('express');
const passport = require('passport');
const User = require('../models/User');
const GlobalSetting = require('../models/GlobalSetting');
const router = express.Router();

// Google Auth Trigger
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  prompt: 'select_account'
}));

// Google Auth Callback
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, redirect to dashboard.
    res.redirect(process.env.FRONTEND_URL || 'https://unipixcode.xyz');
  }
);

// Check Auth Status
router.get('/current_user', (req, res) => {
  if (req.user) {
    console.log(`--- DEBUG: current_user (API) for ${req.user.email} | Credits: ${req.user.credits} | Role: ${req.user.role}`);
  }
  res.send(req.user);
});

// Logout
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect(process.env.FRONTEND_URL || 'https://unipixcode.xyz');
  });
});

// Add Credits (Mock Payment Success)
router.post('/add-credits', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Auth required' });
    }
    const { amount } = req.body;
    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    // Refresh user from DB to get latest credits
    const user = await User.findByPk(req.user.id);
    user.credits = (user.credits || 0) + parseInt(amount);
    await user.save();
    
    // Update session user
    req.user.credits = user.credits;
    
    res.json({ success: true, newCredits: user.credits });
  } catch (error) {
    console.error('Add credits error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle Subscription
router.post('/toggle-subscription', async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Auth required' });
        
        const { feature, action } = req.body; 
        const user = await User.findByPk(req.user.id);
        
        if (!user) return res.status(404).json({ error: 'User not found' });

        let featureKey, deductionKey, costKey;
        if (feature === 'newsletter') {
            featureKey = 'newsletterSubscribed';
            deductionKey = 'lastNewsletterDeduction';
            costKey = 'monthly_newsletter_cost';
        } else if (feature === 'moneyFlow') {
            featureKey = 'moneyFlowSubscribed';
            deductionKey = 'lastMoneyFlowDeduction';
            costKey = 'monthly_money_flow_cost';
        } else if (feature === 'autoPrediction') {
            featureKey = 'autoPredictionSubscribed';
            deductionKey = 'lastAutoPredictionDeduction';
            costKey = 'monthly_auto_prediction_cost';
        }

        if (action === 'subscribe') {
            let cost = 5;
            try {
                const setting = await GlobalSetting.findByPk(costKey);
                if (setting) cost = parseInt(setting.value);
            } catch (e) {
                console.error('Error fetching cost setting:', e);
            }

            if (user.credits < cost && user.role !== 'admin' && user.role !== 'developer') {
                return res.status(403).json({ error: 'Yetersiz Kredi', required: cost });
            }

            // Deduct upfront and subscribe
            await user.update({
                [featureKey]: true,
                [deductionKey]: new Date(),
                credits: (user.role === 'admin' || user.role === 'developer') ? user.credits : (user.credits - cost)
            });
        } else {
            await user.update({ [featureKey]: false });
        }

        // Update session user to match
        req.user.credits = user.credits;
        req.user[featureKey] = user[featureKey];

        res.json({ success: true, user: { 
            credits: user.credits, 
            newsletterSubscribed: user.newsletterSubscribed,
            moneyFlowSubscribed: user.moneyFlowSubscribed,
            autoPredictionSubscribed: user.autoPredictionSubscribed
        }});
    } catch (error) {
        console.error('Toggle subscription error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update User Profile
router.put('/profile', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Auth required' });
    }
    const { name, phone, bio } = req.body;
    const user = await User.findByPk(req.user.id);
    
    if (!user) return res.status(404).json({ error: 'User not found' });

    await user.update({
      name: name || user.name,
      phone: phone !== undefined ? phone : user.phone,
      bio: bio !== undefined ? bio : user.bio
    });

    // Update session user
    req.user.name = user.name;
    req.user.phone = user.phone;
    req.user.bio = user.bio;

    res.json({ success: true, user: { 
      name: user.name, 
      email: user.email,
      phone: user.phone,
      bio: user.bio,
      credits: user.credits,
      role: user.role
    }});
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
