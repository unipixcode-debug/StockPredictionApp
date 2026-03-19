import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Zap, Star, Crown, ChevronRight, Sparkles, ShieldCheck, Coins } from 'lucide-react-native';
import { Config } from '@/constants/Config';
import { useAuth } from '../_layout';

const { width } = Dimensions.get('window');

interface Package {
    id: string;
    name: string;
    tokens: number;
    price: string;
    popular?: boolean;
    features?: string[];
}

const CreditsScreen = () => {
    const { user, updateCredits } = useAuth();
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [apiPackages, setApiPackages] = useState<Package[]>([]);

    const fetchPackages = async () => {
        try {
            const response = await fetch(`${Config.API_BASE}/admin/packages`);
            const data = await response.json();
            setApiPackages(data);
        } catch (error) {
            console.error('Error fetching packages:', error);
            // Fallback list
            setApiPackages([
                { id: 'starter', name: 'Başlangıç', tokens: 100, price: '₺49.99' },
                { id: 'pro', name: 'Profesyonel', tokens: 500, price: '₺199.99', popular: true },
                { id: 'whale', name: 'Balina', tokens: 2000, price: '₺699.99' }
            ]);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchPackages();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchPackages();
    };

    const getIcon = (id: string, color: string) => {
        const idLower = id.toLowerCase();
        if (idLower.includes('starter')) return <Zap color={color} size={24} />;
        if (idLower.includes('pro')) return <Star color={color} size={24} />;
        if (idLower.includes('whale')) return <Crown color={color} size={24} />;
        return <Sparkles color={color} size={24} />;
    };

    const getColor = (id: string) => {
        const idLower = id.toLowerCase();
        if (idLower.includes('starter')) return '#60a5fa';
        if (idLower.includes('pro')) return '#fbbf24';
        if (idLower.includes('whale')) return '#a78bfa';
        return '#22d3ee';
    };

    const handlePurchase = async (pkg: Package) => {
        setLoading(true);
        try {
            // Simulated delay for UI feedback
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // For now, simple credit addition (Simulation or Backend verify)
            // If admin/dev, auto-approve
            if (user?.role === 'admin' || user?.role === 'developer' || user?.email?.includes('admin')) {
                const response = await fetch(`${Config.API_BASE}/auth/add-credits`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: pkg.tokens })
                });
                const data = await response.json();
                if (data.newCredits !== undefined) {
                    updateCredits(data.newCredits);
                    Alert.alert('Başarılı', `${pkg.tokens} Token hesabınıza tanımlandı! ✨`);
                }
            } else {
                Alert.alert('Ödeme Sistemi', 'Google Play ödeme penceresi açılıyor... (Simülasyon)');
            }
        } catch (error: any) {
            console.error('Mobile Purchase Error:', error);
            Alert.alert('Hata', 'İşlem tamamlanamadı.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <ScrollView 
                    contentContainerStyle={styles.scrollContent} 
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22d3ee" />}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerIcon}>
                            <Sparkles color="#22d3ee" size={32} />
                        </View>
                        <Text style={styles.headerTitle}>Token Mağazası</Text>
                        <Text style={styles.headerSubtitle}>AI tahminleri ve analizler için hesabınıza kredi yükleyin. Paketler web sitesi ile senkronizedir.</Text>
                        
                        <View style={styles.balanceBadge}>
                            <Coins color="#f59e0b" size={16} />
                            <Text style={styles.balanceText}>Güncel Bakiye: {user?.credits || 0} Token</Text>
                        </View>
                    </View>

                    {/* Packages */}
                    <View style={styles.packagesGrid}>
                        {apiPackages.map((pkg) => {
                            const pkgColor = getColor(pkg.id || pkg.name);
                            return (
                                <TouchableOpacity 
                                    key={pkg.id || pkg.name} 
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
                                        <View style={[styles.iconBox, { backgroundColor: pkgColor + '20' }]}>
                                            {getIcon(pkg.id || pkg.name, pkgColor)}
                                        </View>
                                        <View style={styles.textContainer}>
                                            <Text style={styles.packageName}>{pkg.name}</Text>
                                            <Text style={styles.packageCredits}>{pkg.tokens} Token</Text>
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
                            );
                        })}
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
    container: { flex: 1, backgroundColor: '#060d1a' },
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
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(34, 211, 238, 0.2)'
    },
    headerTitle: { fontSize: 28, fontWeight: '900', color: 'white', letterSpacing: -0.5 },
    headerSubtitle: { 
        fontSize: 14, 
        color: 'rgba(255,255,255,0.5)', 
        textAlign: 'center', 
        marginTop: 8, 
        lineHeight: 20,
        paddingHorizontal: 10 
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
    popularBadgeText: { fontSize: 10, fontWeight: '900', color: '#060d1a' },
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
