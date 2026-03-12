/**
 * Auth Middleware
 * Verifies if the user is logged in and has the necessary roles.
 */

const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized: login required' });
};

const isAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'admin') {
        return next();
    }
    res.status(403).json({ error: 'Forbidden: admin access required' });
};

module.exports = {
    isAuthenticated,
    isAdmin
};
