const express = require('express');
const router = express.Router();
router.get('/top', (req, res) => {
    res.json([{ symbol: 'TEST', price: 100, aiScore: 99, signal: 'Working' }]);
});
module.exports = router;
