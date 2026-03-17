import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Bot, User, Sparkles, ShieldAlert, 
  MessageSquare, Trash2, Maximize2, Minimize2,
  TrendingUp, Newspaper, Zap
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import api from './api';

const Chatbot = () => {
    const { user, updateCredits } = useAuth();
    const { t, language } = useLanguage();
    const [messages, setMessages] = useState([
        { 
            role: 'assistant', 
            content: language === 'TR' 
                ? 'Merhaba! Ben PredictPro AI asistanıyım. Piyasa verileri, haberler ve tahminler hakkında size analiz sunabilirim. Sohbet başına 1 kredi kullanılır. Nasıl yardımcı olabilirim?' 
                : 'Hello! I am PredictPro AI assistant. I can provide analysis on market data, news, and predictions. 1 credit used per chat. How can I help you?'
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        if (user.credits < 1) {
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: language === 'TR' 
                    ? 'Yetersiz kredi! Lütfen kredi yükleyin.' 
                    : 'Insufficient credits! Please recharge.' 
            }]);
            return;
        }

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
            const response = await api.post('/ai/chat', { message: input, history });
            
            if (response.data.credits !== undefined) {
                updateCredits(response.data.credits);
            }
            
            setMessages(prev => [...prev, { role: 'assistant', content: response.data.reply }]);
        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: language === 'TR' 
                    ? 'Üzgünüm, şu an bağlantı sorunu yaşıyorum.' 
                    : 'Sorry, I am having connection issues right now.' 
            }]);
        } finally {
            setLoading(false);
        }
    };

    const clearChat = () => {
        setMessages([{ 
            role: 'assistant', 
            content: language === 'TR' 
                ? 'Sohbet temizlendi. Size nasıl yardımcı olabilirim?' 
                : 'Chat cleared. How can I help you?' 
        }]);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] max-w-5xl mx-auto space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between p-6 glass-card border-primary/20 bg-primary/5 rounded-3xl">
                <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center animate-pulse shadow-[0_0_20px_rgba(0,242,254,0.2)]">
                        <Bot className="text-primary" size={28} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tight italic">AI Financial Assistant</h2>
                        <div className="flex items-center space-x-3">
                             <div className="flex items-center space-x-1.5 bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">
                                <Zap size={10} className="text-accent" />
                                <span className="text-[10px] font-black text-accent uppercase tracking-tighter">{user.credits} Credit</span>
                             </div>
                             <div className="flex items-center space-x-2">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active</span>
                             </div>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={clearChat}
                    className="p-3 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                    title="Temizle"
                >
                    <Trash2 size={20} />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide glass-card rounded-4xl bg-secondary/10">
                {messages.map((msg, index) => (
                    <div 
                        key={index} 
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}
                    >
                        <div className={`flex max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3`}>
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1 shadow-lg ${
                                msg.role === 'user' ? 'bg-primary/20 ml-3' : 'bg-secondary/80 mr-3'
                            }`}>
                                {msg.role === 'user' ? <User size={16} className="text-primary" /> : <Sparkles size={16} className="text-accent" />}
                            </div>
                            <div className={`p-4 rounded-3xl text-sm leading-relaxed ${
                                msg.role === 'user' 
                                    ? 'bg-primary text-primary-foreground font-medium rounded-tr-none' 
                                    : 'bg-card/80 backdrop-blur-md border border-border/50 text-foreground rounded-tl-none shadow-xl'
                            }`}>
                                {msg.content.split('\n').map((line, i) => (
                                    <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
                                ))}
                                {msg.role === 'assistant' && msg.content.includes('tavsiyesi değildir') && (
                                    <div className="mt-4 pt-3 border-t border-border/30 flex items-center space-x-2 text-[10px] font-bold text-muted-foreground uppercase tracking-tighter italic">
                                        <ShieldAlert size={12} className="text-amber-500" />
                                        <span>Official Financial Safety Disclaimer</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start animate-pulse">
                        <div className="bg-secondary/50 p-4 rounded-3xl rounded-tl-none">
                            <div className="flex space-x-2">
                                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Hint Chips */}
            <div className="flex space-x-2 overflow-x-auto py-2 scrollbar-hide">
                <HintChip icon={<TrendingUp size={14} />} text="BTC Tahmini" onClick={() => setInput("Bitcoin hakkında ne düşünüyorsun?")} />
                <HintChip icon={<Newspaper size={14} />} text="Son Haberler" onClick={() => setInput("Piyasayı en çok etkileyen 3 haber nedir?")} />
                <HintChip icon={<Zap size={14} />} text="Pazar Baskısı" onClick={() => setInput("Küresel pazar baskısı şu an ne durumda?")} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="relative group">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={language === 'TR' ? 'Analiz için sorun...' : 'Ask for analysis...'}
                    className="w-full bg-card/60 backdrop-blur-3xl border-2 border-border/50 focus:border-primary/50 p-6 pr-20 rounded-3xl text-lg font-medium transition-all shadow-2xl outline-none"
                    disabled={loading}
                />
                <button 
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="absolute right-4 top-4 w-12 h-12 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 shadow-[0_0_20px_rgba(0,242,254,0.3)]"
                >
                    <Send size={20} />
                </button>
            </form>
        </div>
    );
};

const HintChip = ({ icon, text, onClick }) => (
    <button 
        onClick={onClick}
        className="flex items-center space-x-2 px-4 py-2 rounded-2xl bg-secondary/30 border border-border/50 text-xs font-bold whitespace-nowrap hover:bg-primary/10 hover:border-primary/30 transition-all text-muted-foreground hover:text-primary"
    >
        {icon}
        <span>{text}</span>
    </button>
);

export default Chatbot;
