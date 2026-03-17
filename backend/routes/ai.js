const ChatMessage = require('../models/ChatMessage');

// @desc    Get chat history
// @route   GET /api/ai/history
// @access  Private
router.get('/history', protect, async (req, res) => {
    try {
        const history = await ChatMessage.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'ASC']],
            limit: 50
        });
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// @desc    Send a message to the AI Chatbot
// @route   POST /api/ai/chat
// @access  Private
router.post('/chat', protect, async (req, res) => {
    const { message, history: clientHistory } = req.body;
    const user = req.user;
    
    if (!message) {
        return res.status(400).json({ message: 'Message is required' });
    }

    // 1. Credit check (1 credit required)
    if (user.credits < 1) {
        return res.status(403).json({ 
            message: 'Yetersiz kredi. Sohbet için en az 1 krediniz olmalı.',
            credits: user.credits 
        });
    }

    try {
        // 2. Fetch recent DB history if client didn't provide much
        let history = clientHistory || [];
        if (history.length < 2) {
            const dbHistory = await ChatMessage.findAll({
                where: { userId: user.id },
                order: [['createdAt', 'DESC']],
                limit: 10
            });
            // Reverse so it's chronological for the prompt
            history = dbHistory.reverse().map(h => ({ role: h.role, content: h.content }));
        }

        // 3. Process Message
        const reply = await chatService.processUserMessage(message, history);
        
        // 4. Persistence & Fair Billing
        // CRITICAL: chatService now throws error or returns specific "failed" flag if AI fails
        if (reply.includes("bağlantı kuramıyorum") && !reply.includes("pazar baskısı")) {
             // Treat as failure -> Don't charge, don't save
             return res.status(503).json({ message: 'AI Hizmeti şu an meşgul. Krediniz düşülmedi.' });
        }

        // 5. Save locally
        await ChatMessage.create({ userId: user.id, role: 'user', content: message });
        await ChatMessage.create({ userId: user.id, role: 'assistant', content: reply });

        // 6. Deduct 1 credit (ONLY ON SUCCESS)
        user.credits -= 1;
        await user.save();

        res.json({ reply, credits: user.credits });
    } catch (error) {
        console.error("AI Chat Route Error:", error.message);
        res.status(500).json({ message: 'AI Chat failed. Krediniz düşülmedi.' });
    }
});

module.exports = router;
