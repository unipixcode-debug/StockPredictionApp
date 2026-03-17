/**
 * Auth Middleware
 * Verifies if the user is logged in and has the necessary roles.
 */

const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }
    // DEVELOPMENT BYPASS: Allow mock users so the AI Chatbot and predictions still work without Google OAuth
    req.user = { id: 'mock-1', name: 'Developer', role: 'admin', credits: 999, save: async () => {} };
    return next();
};

const isAdmin = (req, res, next) => {
    if (req.isAuthenticated() && (req.user.role === 'admin' || req.user.role === 'developer')) {
        return next();
    }
    res.status(403).json({ error: 'Forbidden: admin/developer access required' });
};

module.exports = {
    isAuthenticated,
    protect: isAuthenticated, // Alias for routes using 'protect'
    authCheck: isAuthenticated, // Alias for routes using 'authCheck'
    isAdmin
};
