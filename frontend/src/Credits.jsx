import React, { useState } from 'react';
import { Check, Zap, Star, Crown, ShieldCheck, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import api from './api';

const Credits = () => {
    const { user, updateCredits } = useAuth();
    const { language } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const packages = [
        {
            id: 'starter',
            name: 'Starter',
            credits: 100,
            price: '₺49.99',
            icon: <Zap className="text-blue-400" size={24} />,
            features: [
                '100 AI Analysis',
                'Basic Predictions',
                'Daily Market News'
            ],
            popular: false
        },
        {
            id: 'pro',
            name: 'Pro',
            credits: 500,
            price: '₺199.99',
            icon: <Star className="text-amber-400" size={24} />,
            features: [
                '500 AI Analysis',
                'Priority Processing',
                'Advance Technical Analysis',
                'Early Data Access'
            ],
            popular: true
        },
        {
            id: 'whale',
            name: 'Whale',
            credits: 2000,
            price: '₺699.99',
            icon: <Crown className="text-purple-400" size={24} />,
            features: [
                '2000 AI Analysis',
                'Dedicated Support',
                'Deep Learning Insights',
                'Custom Strategy Bot'
            ],
            popular: false
        }
    ];

    const handlePurchase = async (pkg) => {
        setLoading(true);
        try {
            // Simulated transaction delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // If Mock user, skip backend and update locally
            if (user?.id === 'mock-user-123') {
                updateCredits((user.credits || 0) + pkg.credits);
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
                return;
            }

            const response = await api.post('/auth/add-credits', { amount: pkg.credits });
            
            if (response && response.newCredits !== undefined) {
                updateCredits(response.newCredits);
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
            }
        } catch (error) {
            console.error('Purchase error:', error);
            alert('Satın alma sırasında bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto py-12 px-4 animate-in fade-in duration-700">
            {/* Header */}
            <div className="text-center mb-16">
                <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight uppercase italic bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
                    PredictPro Token Store
                </h1>
                <p className="text-muted-foreground text-lg font-medium max-w-2xl mx-auto">
                    {language === 'TR' 
                        ? 'Hesabınıza kredi yükleyin ve yapay zeka destekli finansal asistanımızın tüm gücünü kullanmaya başlayın.' 
                        : 'Top up your credits and start using the full power of our AI-powered financial assistant.'}
                </p>
                <div className="mt-6 inline-flex items-center space-x-2 bg-secondary/50 px-4 py-2 rounded-full border border-border">
                    <Sparkles className="text-accent" size={16} />
                    <span className="text-sm font-bold uppercase tracking-wider">Aktif Bakiye: {user?.credits || 0} Token</span>
                </div>
            </div>

            {/* Success Animation */}
            {success && (
                <div className="bg-green-500/20 border border-green-500/50 text-green-400 p-4 rounded-2xl mb-8 flex items-center justify-center space-x-3 animate-bounce">
                    <ShieldCheck size={24} />
                    <span className="font-bold">Satın alma başarılı! Kredileriniz hesabınıza tanımlandı.</span>
                </div>
            )}

            {/* Packages Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {packages.map((pkg) => (
                    <div 
                        key={pkg.id} 
                        className={`relative glass-card p-8 rounded-4xl border-2 transition-all hover:scale-105 ${
                            pkg.popular ? 'border-primary shadow-[0_0_40px_rgba(0,242,254,0.15)] bg-primary/5' : 'border-border/50 bg-secondary/10'
                        }`}
                    >
                        {pkg.popular && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                                Most Popular
                            </div>
                        )}

                        <div className="flex items-center justify-between mb-6">
                            <div className="p-3 bg-secondary rounded-2xl">
                                {pkg.icon}
                            </div>
                            <span className="text-3xl font-black">{pkg.credits} <span className="text-xs text-muted-foreground uppercase">Tokens</span></span>
                        </div>

                        <h3 className="text-2xl font-black uppercase italic mb-2 tracking-tight">{pkg.name}</h3>
                        <div className="text-4xl font-black text-foreground mb-8">{pkg.price}</div>

                        <div className="space-y-4 mb-10">
                            {pkg.features.map((feature, i) => (
                                <div key={i} className="flex items-center space-x-3">
                                    <div className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center">
                                        <Check size={12} className="text-primary" />
                                    </div>
                                    <span className="text-sm font-medium text-muted-foreground">{feature}</span>
                                </div>
                            ))}
                        </div>

                        <button 
                            disabled={loading}
                            onClick={() => handlePurchase(pkg)}
                            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-3 ${
                                pkg.popular 
                                    ? 'bg-primary text-primary-foreground shadow-lg hover:shadow-primary/30 rotate-1' 
                                    : 'bg-secondary hover:bg-secondary/80 text-foreground -rotate-1'
                            }`}
                        >
                            {loading ? (
                                <Loader2 size={24} className="animate-spin" />
                            ) : (
                                <span>Get Package</span>
                            )}
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-20 p-8 glass-card rounded-4xl bg-secondary/5 border-2 border-dashed border-border flex flex-col md:flex-row items-center justify-between">
                <div className="flex items-center space-x-6 mb-6 md:mb-0">
                    <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center">
                        <ShieldCheck size={32} className="text-accent" />
                    </div>
                    <div>
                        <h4 className="text-xl font-bold uppercase tracking-tight italic">Secure Google Checkout</h4>
                        <p className="text-muted-foreground font-medium">Satın alma işlemi Google hesabınız ile eşleştirilecektir.</p>
                    </div>
                </div>
                <div className="flex space-x-4">
                    <div className="w-12 h-12 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center opacity-50 grayscale">Visa</div>
                    <div className="w-12 h-12 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center opacity-50 grayscale">MC</div>
                </div>
            </div>
        </div>
    );
};

export default Credits;
