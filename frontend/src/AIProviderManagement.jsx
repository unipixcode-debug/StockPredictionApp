import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Plus, Trash2, Power, Zap, RefreshCw, Key, ShieldCheck, Activity, BarChart3, AlertCircle, Database } from 'lucide-react';
import api from './api';

const AIProviderManagement = () => {
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newProvider, setNewProvider] = useState({ name: '', type: 'GEMINI', apiKey: '', priority: 1, isActive: true });
    const [editingProvider, setEditingProvider] = useState(null);
    const [refreshingId, setRefreshingId] = useState(null);

    useEffect(() => {
        fetchProviders();
    }, []);

    const fetchProviders = async () => {
        setLoading(true);
        try {
            const data = await api.get('/admin/ai/providers');
            setProviders(data);
        } catch (error) {
            console.error('Failed to fetch providers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            if (editingProvider) {
                await api.put(`/admin/ai/providers/${editingProvider.id}`, editingProvider);
                setEditingProvider(null);
            } else {
                await api.post('/admin/ai/providers', newProvider);
            }
            setIsModalOpen(false);
            setNewProvider({ name: '', type: 'GEMINI', apiKey: '', priority: 1, isActive: true });
            fetchProviders();
        } catch (error) {
            alert('İşlem başarısız: ' + error.message);
        }
    };

    const startEdit = (provider) => {
        setEditingProvider({ ...provider });
        setIsModalOpen(true);
    };

    const handleToggle = async (id, currentStatus) => {
        try {
            await api.patch(`/admin/ai/providers/${id}`, { isActive: !currentStatus });
            fetchProviders();
        } catch (error) {
            alert('Durum güncellenemedi');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bu sağlayıcıyı silmek istediğinize emin misiniz?')) return;
        try {
            await api.delete(`/admin/ai/providers/${id}`);
            fetchProviders();
        } catch (error) {
            alert('Silme işlemi başarısız');
        }
    };

    const handleCheckStatus = async (id) => {
        setRefreshingId(id);
        try {
            await api.get(`/admin/ai/providers/check/${id}`);
            fetchProviders();
        } catch (error) {
            alert('Kontrol başarısız');
        } finally {
            setRefreshingId(null);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10 pb-20 p-6 max-w-7xl mx-auto"
        >
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter uppercase italic text-primary">AI Sağlayıcı Yönetimi</h1>
                    <p className="text-muted-foreground font-medium mt-1">Yapay zeka modellerini, API anahtarlarını ve kotaları yönetin.</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="premium-button flex items-center space-x-2 px-8 py-3"
                >
                    <Plus size={20} />
                    <span className="uppercase tracking-widest text-xs font-black">Yeni Sağlayıcı Ekle</span>
                </button>
            </header>

            {loading ? (
                <div className="flex items-center justify-center py-40">
                    <RefreshCw className="animate-spin text-primary/30" size={48} />
                </div>
            ) : providers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40 space-y-4">
                    <Database className="text-muted-foreground/20 w-16 h-16" />
                    <p className="text-muted-foreground font-black uppercase tracking-widest italic opacity-30 text-xs text-center">
                        Hiç sağlayıcı bulunamadı.<br/>Ekleme butonunu kullanarak yeni bir API anahtarı ekleyin.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {providers.map((p) => (
                        <motion.div 
                            key={p.id}
                            layout
                            className={`glass-card p-6 flex flex-col border transition-all duration-300 ${!p.isActive ? 'opacity-60 bg-secondary/10' : 'border-primary/20 bg-primary/5 hover:shadow-[0_0_30px_rgba(0,242,254,0.1)]'}`}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center space-x-3">
                                    <div className={`p-3 rounded-xl border ${p.isActive ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-secondary/20 border-border text-muted-foreground'}`}>
                                        <Bot size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-black tracking-tight uppercase">{p.name}</h3>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">{p.type}</span>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button 
                                        onClick={() => handleCheckStatus(p.id)}
                                        disabled={refreshingId === p.id}
                                        className={`p-2 rounded-lg hover:bg-white/5 transition-colors ${refreshingId === p.id ? 'animate-spin' : ''}`}
                                    >
                                        <RefreshCw size={14} />
                                    </button>
                                    <button 
                                        onClick={() => handleToggle(p.id, p.isActive)}
                                        className={`p-2 rounded-lg transition-colors ${p.isActive ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-rose-500 hover:bg-rose-500/10'}`}
                                    >
                                        <Power size={14} />
                                    </button>
                                    <button 
                                        onClick={() => startEdit(p)}
                                        className="p-2 rounded-lg text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                                    >
                                        <Key size={14} />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(p.id)}
                                        className="p-2 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4 mb-6 flex-1">
                                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
                                    <span className="text-muted-foreground">Durum</span>
                                    <span className={p.status?.includes('Active') ? 'text-emerald-500' : p.status?.includes('Failed') ? 'text-rose-500' : 'text-amber-500'}>
                                        {p.status || 'Bilinmiyor'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
                                    <span className="text-muted-foreground">Öncelik</span>
                                    <span className="text-primary">{p.priority}</span>
                                </div>
                                <div className="p-3 bg-secondary/30 rounded-lg flex items-center space-x-2 text-[10px] text-muted-foreground font-mono truncate border border-border/50">
                                    <Key size={10} />
                                    <span>{p.apiKey.substring(0, 10)}*******************</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Son Kullanım</span>
                                <span className="text-[10px] font-black text-foreground">
                                    {p.lastUsed ? new Date(p.lastUsed).toLocaleDateString('tr-TR') : 'Hiç kullanılmadı'}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Add Provider Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="glass-card w-full max-w-md p-8 border border-border shadow-2xl relative"
                        >
                            <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-8 text-primary">
                                {editingProvider ? 'Sağlayıcıyı Düzenle' : 'Yeni Sağlayıcı'}
                            </h2>
                            <form onSubmit={handleAdd} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">İsim</label>
                                    <input 
                                        type="text" 
                                        required
                                        className="premium-input w-full"
                                        placeholder="Örn: Gemini Pro 2"
                                        value={editingProvider ? editingProvider.name : newProvider.name}
                                        onChange={(e) => editingProvider ? setEditingProvider({...editingProvider, name: e.target.value}) : setNewProvider({...newProvider, name: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Tip</label>
                                    <select 
                                        className="premium-input w-full bg-background"
                                        value={editingProvider ? editingProvider.type : newProvider.type}
                                        onChange={(e) => editingProvider ? setEditingProvider({...editingProvider, type: e.target.value}) : setNewProvider({...newProvider, type: e.target.value})}
                                    >
                                        <option value="GEMINI">GOOGLE GEMINI</option>
                                        <option value="DEEPSEEK">DEEPSEEK</option>
                                        <option value="OPENAI">OPENAI (GPT)</option>
                                        <option value="OLLAMA">OLLAMA (LOCAL)</option>
                                        <option value="OLLAMA_CLOUD">OLLAMA CLOUD</option>
                                        <option value="ANTHROPIC">ANTHROPIC (CLAUDE)</option>
                                        <option value="GROQ">GROQ</option>
                                        <option value="MISTRAL">MISTRAL AI</option>
                                        <option value="PERPLEXITY">PERPLEXITY</option>
                                        <option value="COHERE">COHERE</option>
                                        <option value="XAI">XAI (GROK)</option>
                                        <option value="OPENROUTER">OPENROUTER</option>
                                        <option value="KIMI">MOONSHOT / KIMI</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">API Key / URL</label>
                                        {(editingProvider?.type === 'KIMI' || newProvider.type === 'KIMI') && (
                                            <a 
                                                href="https://platform.moonshot.ai/console/api-keys" 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest flex items-center space-x-1"
                                            >
                                                <span>API Key Al (Kimi)</span>
                                                <Bot size={10} />
                                            </a>
                                        )}
                                    </div>
                                    <input 
                                        type="password" 
                                        required
                                        className="premium-input w-full"
                                        placeholder={(editingProvider ? editingProvider.type : newProvider.type) === 'OLLAMA' 
                                            ? 'http://localhost:11434' 
                                            : (editingProvider ? editingProvider.type : newProvider.type) === 'OLLAMA_CLOUD'
                                            ? 'Ollama Cloud API Key'
                                            : 'sk-...'}
                                        value={editingProvider ? editingProvider.apiKey : newProvider.apiKey}
                                        onChange={(e) => editingProvider ? setEditingProvider({...editingProvider, apiKey: e.target.value}) : setNewProvider({...newProvider, apiKey: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Öncelik (Düşük = Önce)</label>
                                    <input 
                                        type="number" 
                                        required
                                        className="premium-input w-full"
                                        value={editingProvider ? editingProvider.priority : newProvider.priority}
                                        onChange={(e) => editingProvider ? setEditingProvider({...editingProvider, priority: parseInt(e.target.value)}) : setNewProvider({...newProvider, priority: parseInt(e.target.value)})}
                                    />
                                </div>
                                <div className="pt-6 flex space-x-3">
                                    <button 
                                        type="button"
                                        onClick={() => { setIsModalOpen(false); setEditingProvider(null); }}
                                        className="flex-1 px-6 py-3 rounded-xl border border-border font-black text-xs uppercase tracking-widest hover:bg-white/5 transition-colors"
                                    >
                                        İPTAL
                                    </button>
                                    <button 
                                        type="submit"
                                        className="flex-1 premium-button px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest"
                                    >
                                        {editingProvider ? 'GÜNCELLE' : 'EKLE'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default AIProviderManagement;
