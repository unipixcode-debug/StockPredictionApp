const express = require('express');
const passport = require('passport');
const router = express.Router();

// Google Auth Trigger
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// Google Auth Callback
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, redirect to dashboard.
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:3000');
  }
);

// Check Auth Status
router.get('/current_user', (req, res) => {
  res.send(req.user);
});

// Logout
router.get('/logout', (req, res) => {
  req.logout();
  res.redirect(process.env.FRONTEND_URL || 'http://localhost:3000');
});

module.exports = router;
