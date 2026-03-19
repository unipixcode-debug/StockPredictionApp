import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import api from './api';

const { Check, Zap, Star, Crown, ShieldCheck, Loader2, Sparkles, Flame, Rocket, Gem } = Icons;

const Credits = () => {
    const { user, updateCredits } = useAuth();
    const { language } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [apiPackages, setApiPackages] = useState([]);

    useEffect(() => {
        fetchPackages();
    }, []);

    const fetchPackages = async () => {
        try {
            const data = await api.get('/market/packages');
            setApiPackages(data);
        } catch (error) {
            console.error('Error fetching packages:', error);
        }
    };

    const getIcon = (iconName) => {
        const icons = { Zap, Star, Crown, Sparkles, Flame, Rocket, Gem };
        const IconComponent = icons[iconName] || Sparkles;
        return <IconComponent className="text-primary" size={24} />;
    };

    const packages = [...apiPackages]
        .sort((a, b) => Number(a.orderIndex || 0) - Number(b.orderIndex || 0))
        .map(pkg => ({
            ...pkg,
            credits: parseInt(pkg.tokens || 0),
            icon: getIcon(pkg.icon || pkg.id),
            displayFeatures: Array.isArray(pkg.features) ? pkg.features : (pkg.features ? (typeof pkg.features === 'string' ? pkg.features.split(',') : pkg.features) : [
                `${pkg.tokens} AI Analizi`,
                'Piyasa Tahminleri',
                'Finansal Öngörüler'
            ])
        }));

    const handlePurchase = async (pkg) => {
        setLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            if (user?.id === 'mock-user-123') {
                updateCredits((user.credits || 0) + (parseInt(pkg.tokens) || 0));
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
                return;
            }
            const response = await api.post('/auth/add-credits', { amount: parseInt(pkg.tokens) || 0 });
            if (response && response.newCredits !== undefined) {
                updateCredits(response.newCredits);
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
            }
        } catch (error) {
            console.error('Purchase error:', error);
            alert(language === 'TR' ? 'Satın alma sırasında bir hata oluştu. Lütfen tekrar deneyin.' : 'An error occurred during purchase. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto py-12 px-4 animate-in fade-in duration-700">
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
                    <span className="text-sm font-bold uppercase tracking-wider">
                        {language === 'TR' ? `Aktif Bakiye: ${user?.credits || 0} Token` : `Active Balance: ${user?.credits || 0} Tokens`}
                    </span>
                </div>
            </div>

            {success && (
                <div className="bg-green-500/20 border border-green-500/50 text-green-400 p-4 rounded-2xl mb-8 flex items-center justify-center space-x-3 animate-bounce">
                    <ShieldCheck size={24} />
                    <span className="font-bold">
                        {language === 'TR' ? 'Satın alma başarılı! Kredileriniz hesabınıza tanımlandı.' : 'Purchase successful! Credits added to your account.'}
                    </span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {packages.map((pkg, index) => (
                    <div 
                        key={pkg.id} 
                        className={`relative glass-card p-8 rounded-4xl border-2 transition-all hover:scale-105 ${
                            pkg.popular ? 'border-primary shadow-[0_0_40px_rgba(0,242,254,0.15)] bg-primary/5' : 'border-border/50 bg-secondary/10'
                        }`}
                    >
                        {pkg.popular && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest z-10">
                                {language === 'TR' ? 'En Popüler' : 'Most Popular'}
                            </div>
                        )}

                        <div className="flex items-center justify-between mb-6">

                            <div className="p-3 bg-secondary rounded-2xl">
                                {pkg.icon}
                            </div>
                            <span className="text-3xl font-black mr-8">{pkg.tokens} <span className="text-xs text-muted-foreground uppercase">Tokens</span></span>
                        </div>

                        <h3 className="text-2xl font-black uppercase italic mb-2 tracking-tight">{pkg.name}</h3>
                        <div className="text-4xl font-black text-foreground mb-8">{pkg.price}</div>

                        <div className="space-y-4 mb-10">
                            {pkg.displayFeatures.map((feature, i) => (
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
                                <span>{language === 'TR' ? 'Paketi Al' : 'Get Package'}</span>
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
                        <p className="text-muted-foreground font-medium">
                            {language === 'TR' ? 'Satın alma işlemi Google hesabınız ile eşleştirilecektir.' : 'Your purchase will be synchronized with your Google account.'}
                        </p>
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
