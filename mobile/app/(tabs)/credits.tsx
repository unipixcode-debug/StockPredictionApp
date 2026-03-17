import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Zap, Star, Crown, ChevronRight, Sparkles, ShieldCheck, Coins } from 'lucide-react-native';
import { Config } from '@/constants/Config';
import { useAuth } from '../_layout';

const { width } = Dimensions.get('window');

const CreditsScreen = () => {
    const { user, updateCredits } = useAuth();
    const [loading, setLoading] = useState(false);

    const packages = [
        {
            id: 'starter',
            name: 'Başlangıç',
            credits: 100,
            price: '₺49.99',
            icon: <Zap color="#60a5fa" size={24} />,
            color: '#60a5fa',
            popular: false
        },
        {
            id: 'pro',
            name: 'Profesyonel',
            credits: 500,
            price: '₺199.99',
            icon: <Star color="#fbbf24" size={24} />,
            color: '#fbbf24',
            popular: true
        },
        {
            id: 'whale',
            name: 'Balina',
            credits: 2000,
            price: '₺699.99',
            icon: <Crown color="#a78bfa" size={24} />,
            color: '#a78bfa',
            popular: false
        }
    ];

    const handlePurchase = async (pkg: any) => {
        setLoading(true);
        try {
            // Simulated payment delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            // If Mock user, skip backend and update locally
            if (user?.email === 'admin@predictpro.com') { // Using the email as a marker for the mock development account
                updateCredits((user.credits || 0) + pkg.credits);
                Alert.alert('Başarılı', `${pkg.credits} kredi (Mock) hesabınıza eklendi! ✨`);
                return;
            }

            const response = await fetch(`${Config.API_BASE}/auth/add-credits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: pkg.credits })
            });

            const data = await response.json();

            if (data.newCredits !== undefined) {
                updateCredits(data.newCredits);
                Alert.alert('Başarılı', `${pkg.credits} kredi hesabınıza eklendi! ✨`);
            }
        } catch (error) {
            console.error('Mobile Purchase Error:', error);
            Alert.alert('Hata', 'İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerIcon}>
                            <Sparkles color="#22d3ee" size={32} />
                        </View>
                        <Text style={styles.headerTitle}>Token Mağazası</Text>
                        <Text style={styles.headerSubtitle}>AI tahminleri ve analizler için hesabınıza kredi yükleyin.</Text>
                        
                        <View style={styles.balanceBadge}>
                            <Coins color="#f59e0b" size={16} />
                            <Text style={styles.balanceText}>Güncel Bakiye: {user?.credits || 0}</Text>
                        </View>
                    </View>

                    {/* Packages */}
                    <View style={styles.packagesGrid}>
                        {packages.map((pkg) => (
                            <TouchableOpacity 
                                key={pkg.id} 
                                style={[styles.packageCard, pkg.popular && styles.popularCard]}
                                onPress={() => handlePurchase(pkg)}
                                disabled={loading}
                            >
                                {pkg.popular && (
                                    <View style={styles.popularBadge}>
                                        <Text style={styles.popularBadgeText}>EN POPÜLER</Text>
                                    </View>
                                )}
                                
                                <View style={styles.cardInfo}>
                                    <View style={[styles.iconBox, { backgroundColor: pkg.color + '20' }]}>
                                        {pkg.icon}
                                    </View>
                                    <View style={styles.textContainer}>
                                        <Text style={styles.packageName}>{pkg.name}</Text>
                                        <Text style={styles.packageCredits}>{pkg.credits} Token</Text>
                                    </View>
                                </View>

                                <View style={styles.priceContainer}>
                                    <Text style={styles.packagePrice}>{pkg.price}</Text>
                                    <View style={styles.buyButtonCircle}>
                                        {loading ? (
                                            <ActivityIndicator size="small" color="#0f172a" />
                                        ) : (
                                            <ChevronRight color="#0f172a" size={20} />
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Security Info */}
                    <View style={styles.securityBox}>
                        <ShieldCheck color="rgba(255,255,255,0.4)" size={20} />
                        <Text style={styles.securityText}>Google Hesabı ile Güvenli Ödeme</Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    safeArea: { flex: 1 },
    scrollContent: { padding: 24, paddingBottom: 40 },
    header: { alignItems: 'center', marginBottom: 32 },
    headerIcon: { 
        width: 70, 
        height: 70, 
        backgroundColor: 'rgba(34, 211, 238, 0.1)', 
        borderRadius: 25, 
        alignItems: 'center', 
        justifyContent: 'center',
        marginBottom: 16
    },
    headerTitle: { fontSize: 28, fontWeight: '900', color: 'white', letterSpacing: -0.5 },
    headerSubtitle: { 
        fontSize: 14, 
        color: 'rgba(255,255,255,0.5)', 
        textAlign: 'center', 
        marginTop: 8, 
        lineHeight: 20,
        paddingHorizontal: 20 
    },
    balanceBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 8, 
        backgroundColor: 'rgba(245, 158, 11, 0.1)', 
        paddingHorizontal: 16, 
        paddingVertical: 10, 
        borderRadius: 20,
        marginTop: 20,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.2)'
    },
    balanceText: { color: '#f59e0b', fontWeight: '800', fontSize: 13 },
    packagesGrid: { gap: 16 },
    packageCard: { 
        backgroundColor: 'rgba(255,255,255,0.03)', 
        borderRadius: 24, 
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)'
    },
    popularCard: {
        borderColor: '#22d3ee',
        backgroundColor: 'rgba(34, 211, 238, 0.05)',
        borderWidth: 2
    },
    popularBadge: {
        position: 'absolute',
        top: -10,
        right: 20,
        backgroundColor: '#22d3ee',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8
    },
    popularBadgeText: { fontSize: 10, fontWeight: '900', color: '#0f172a' },
    cardInfo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    iconBox: { 
        width: 50, 
        height: 50, 
        borderRadius: 15, 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    textContainer: {},
    packageName: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' },
    packageCredits: { fontSize: 20, fontWeight: '900', color: 'white' },
    priceContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    packagePrice: { fontSize: 16, fontWeight: '800', color: '#22d3ee' },
    buyButtonCircle: { 
        width: 36, 
        height: 36, 
        backgroundColor: '#22d3ee', 
        borderRadius: 18, 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    securityBox: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: 8, 
        marginTop: 40,
        opacity: 0.5
    },
    securityText: { color: 'white', fontSize: 12, fontWeight: '600' }
});

export default CreditsScreen;
