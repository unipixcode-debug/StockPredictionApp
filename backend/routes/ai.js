const express = require('express');
const router = express.Router();
const chatService = require('../services/chatService');
const { protect } = require('../middleware/auth');

// @desc    Send a message to the AI Chatbot
// @route   POST /api/ai/chat
// @access  Private
router.post('/chat', protect, async (req, res) => {
    try {
        const { message, history } = req.body;
        const user = req.user;
        
        if (!message) {
            return res.status(400).json({ message: 'Message is required' });
        }

        // 1 Credit check
        if (user.credits < 1) {
            return res.status(403).json({ 
                message: 'Yetersiz kredi. Sohbet için en az 1 krediniz olmalı.',
                credits: user.credits 
            });
        }

        const reply = await chatService.processUserMessage(message, history || []);
        
        // Deduct 1 credit
        user.credits -= 1;
        await user.save();

        res.json({ reply, credits: user.credits });
    } catch (error) {
        console.error("AI Chat Route Error:", error.message);
        res.status(500).json({ message: 'AI Chat failed' });
    }
});

module.exports = router;
