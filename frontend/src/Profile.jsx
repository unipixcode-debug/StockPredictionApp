import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, FileText, Save, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import api from './api';

const Profile = () => {
    const { user, checkUser } = useAuth();
    const { t } = useLanguage();
    
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        bio: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                phone: user.phone || '',
                bio: user.bio || ''
            });
        }
    }, [user]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            const response = await api.put('/auth/profile', formData);
            if (response.success) {
                setMessage({ type: 'success', text: 'Profil başarıyla güncellendi!' });
                await checkUser(); // Refresh user state in AuthContext
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Güncelleme başarısız: ' + (error.response?.data?.error || error.message) });
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <RefreshCw className="animate-spin text-primary/30" size={40} />
            </div>
        );
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto space-y-8 pb-20"
        >
            <header>
                <h1 className="text-4xl font-black tracking-tighter uppercase italic">Profilim</h1>
                <p className="text-muted-foreground font-medium mt-1">Kişisel bilgilerinizi ve hesap ayarlarınızı yönetin</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Profile Card */}
                <div className="md:col-span-1">
                    <div className="glass-card p-8 text-center space-y-6">
                        <div className="relative inline-block">
                            <div className="w-24 h-24 bg-primary/10 rounded-full border-2 border-primary/20 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(0,242,254,0.1)]">
                                <User size={40} className="text-primary" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-6 h-6 rounded-full border-2 border-background flex items-center justify-center">
                                <CheckCircle2 size={12} className="text-white" />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight">{user.name}</h2>
                            <p className="text-xs text-muted-foreground mt-1 lowercase opacity-60">{user.email}</p>
                            <div className="inline-block px-3 py-1 bg-primary/10 border border-primary/20 rounded-full mt-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary">{user.role}</span>
                            </div>
                        </div>
                        <div className="pt-6 border-t border-border/50 text-left">
                            <div className="flex items-center space-x-3 text-xs opacity-50 font-bold uppercase tracking-widest">
                                <Mail size={12} />
                                <span>Kredilerim</span>
                            </div>
                            <p className="text-2xl font-black mt-1">{user.credits} CR</p>
                        </div>
                    </div>
                </div>

                {/* Edit Form */}
                <div className="md:col-span-2">
                    <div className="glass-card p-10">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">İsim Soyisim</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={18} />
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="w-full bg-secondary/30 border border-border rounded-2xl pl-12 pr-5 py-4 focus:border-primary/50 transition-all outline-none font-bold text-sm"
                                            placeholder="Adınız"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Telefon Numarası</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={18} />
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            className="w-full bg-secondary/30 border border-border rounded-2xl pl-12 pr-5 py-4 focus:border-primary/50 transition-all outline-none font-bold text-sm"
                                            placeholder="+90 5xx xxx xx xx"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Kısa Biyografi</label>
                                <div className="relative">
                                    <FileText className="absolute left-4 top-4 text-muted-foreground/40" size={18} />
                                    <textarea
                                        name="bio"
                                        rows="4"
                                        value={formData.bio}
                                        onChange={handleChange}
                                        className="w-full bg-secondary/30 border border-border rounded-2xl pl-12 pr-5 py-4 focus:border-primary/50 transition-all outline-none font-bold text-sm resize-none"
                                        placeholder="Kendinizden bahsedin..."
                                    />
                                </div>
                            </div>

                            {message.text && (
                                <div className={`p-4 rounded-xl text-xs font-bold uppercase tracking-widest ${
                                    message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}>
                                    {message.text}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full premium-button flex items-center justify-center space-x-3 group"
                            >
                                {loading ? (
                                    <RefreshCw className="animate-spin" size={18} />
                                ) : (
                                    <>
                                        <Save size={18} />
                                        <span className="uppercase tracking-tighter">Değişiklikleri Kaydet</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default Profile;
