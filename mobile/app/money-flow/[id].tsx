import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, TrendingUp, TrendingDown, PieChart, Zap, Target, AlignLeft, LayoutGrid } from 'lucide-react-native';
import { Config } from '@/constants/Config';

const AssetDetails = () => {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchAssetData = async () => {
        setLoading(true);
        try {
            const result = await fetch(`${Config.API_BASE}/market/flow?timeframe=1G`);
            const json = await result.json();
            const asset = json?.assets?.find((a: any) => a.id === id);
            
            if (asset) {
                setData(asset);
            } else {
                throw new Error("Asset not found");
            }
        } catch (error) {
            console.error('Asset detail fetch error:', error);
            const mult = 1;
            const mockAssets: any = {
                'commodities': {
                    id: 'commodities', name: 'EMTİA', value: 18.0, change: -0.15 * mult, color: 'orange', unit: 'T$',
                    subAssets: [
                        { name: 'Altın', value: 14.5, change: 0.2 * mult },
                        { name: 'Petrol', value: 2.1, change: 8.4 * mult },
                        { name: 'Gümüş', value: 1.4, change: -1.1 * mult },
                        { name: 'Bakır', value: 0.8, change: -5.5 * mult }
                    ]
                },
                'crypto': {
                    id: 'crypto', name: 'KRİPTO', value: 2.6, change: 1.2 * mult, color: 'cyan', unit: 'T$',
                    subAssets: [
                        { name: 'Bitcoin', value: 1.3, change: 1.5 * mult },
                        { name: 'Ethereum', value: 0.4, change: 0.8 * mult },
                        { name: 'Solana', value: 0.15, change: 2.4 * mult }
                    ]
                },
                'stocks': {
                    id: 'stocks', name: 'BORSALAR', value: 110.0, change: 0.8 * mult, color: 'green', unit: 'T$',
                    subAssets: [
                        { name: 'S&P500', value: 45.0, change: 0.8 * mult },
                        { name: 'Nasdaq', value: 20.0, change: 1.2 * mult },
                        { name: 'BIST100', value: 0.35, change: -0.3 * mult }
                    ]
                }
            };
            setData(mockAssets[id as string] || mockAssets['commodities']);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchAssetData();
        }
    }, [id]);

    if (loading || !data) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#22d3ee" />
            </View>
        );
    }

    const subAssetsWithContribution = data.subAssets.map((sub: any) => {
        const contribution = (sub.value * sub.change) / data.value;
        return { ...sub, contribution };
    });

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <ArrowLeft size={24} color="white" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerSubtitle}>Varlık Detay Analizi</Text>
                        <Text style={styles.headerTitle}>{data.name} Kırılımı</Text>
                    </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {/* Top Cards */}
                    <View style={styles.cardsRow}>
                        <View style={styles.statCard}>
                            <View style={styles.statIconContainer}><PieChart size={24} color="rgba(255,255,255,0.2)" /></View>
                            <Text style={styles.statLabel}>Pay</Text>
                            <Text style={styles.statValue}>${data.value.toFixed(1)}{data.unit}</Text>
                        </View>
                        <View style={styles.statCard}>
                            <View style={styles.statIconContainer}>
                                {data.change >= 0 ? <TrendingUp size={24} color="rgba(74,222,128,0.2)" /> : <TrendingDown size={24} color="rgba(248,113,113,0.2)" />}
                            </View>
                            <Text style={styles.statLabel}>Performans</Text>
                            <Text style={[styles.statValue, data.change >= 0 ? styles.textGreen : styles.textRed]}>
                                {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}%
                            </Text>
                        </View>
                        <View style={styles.statCard}>
                            <View style={styles.statIconContainer}><Zap size={24} color="rgba(34,211,238,0.2)" /></View>
                            <Text style={styles.statLabel}>En Büyük</Text>
                            <Text style={[styles.statValue, { fontSize: 16 }]} numberOfLines={1}>
                                {data.subAssets.sort((a: any, b: any) => b.value - a.value)[0].name}
                            </Text>
                        </View>
                    </View>

                    {/* Breakdown List */}
                    <View style={styles.listContainer}>
                        <View style={styles.listHeader}>
                            <Target size={20} color="#22d3ee" />
                            <Text style={styles.listTitle}>Katkı Analizi</Text>
                        </View>

                        {subAssetsWithContribution.map((sub: any, idx: number) => (
                            <View key={idx} style={styles.listItem}>
                                <View style={styles.listItemLeft}>
                                    <View style={styles.iconInitial}>
                                        <Text style={styles.iconInitialText}>{sub.name[0]}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.subName}>{sub.name}</Text>
                                        <Text style={styles.subValue}>
                                            {sub.value < 0.1 ? `$${(sub.value * 1000).toFixed(0)}M` : `$${sub.value.toFixed(1)}${data.unit}`}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.listItemRight}>
                                    <View style={[styles.badge, sub.change >= 0 ? styles.badgeGreen : styles.badgeRed]}>
                                        <Text style={[styles.badgeText, sub.change >= 0 ? styles.textGreen : styles.textRed]}>
                                            {sub.change >= 0 ? '+' : ''}{sub.change.toFixed(2)}%
                                        </Text>
                                    </View>
                                    <Text style={[styles.contributionText, sub.contribution >= 0 ? styles.textGreen : styles.textRed]}>
                                        Katkı: {sub.contribution >= 0 ? '+' : ''}{sub.contribution.toFixed(3)} pt
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* AI Info */}
                    <View style={styles.aiBox}>
                        <View style={styles.aiHeader}>
                            <Zap size={20} color="#22d3ee" />
                            <Text style={styles.aiTitle}>Özet Bulgu</Text>
                        </View>
                        <Text style={styles.aiContent}>
                            {data.name} kategorisi totalde {data.change > 0 ? 'pozitif' : 'negatif'} bir seyir izlerken, {subAssetsWithContribution.sort((a: any, b: any) => b.contribution - a.contribution)[0].name} varlığı itici güç oluşturuyor. Bu varlığın kategoride yarattığı rüzgar piyasa dengelerini etkileyebilir.
                        </Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    loadingContainer: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
    safeArea: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 10, paddingBottom: 10 },
    backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    headerTitleContainer: { flex: 1 },
    headerSubtitle: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 },
    headerTitle: { fontSize: 24, fontWeight: '900', color: 'white', letterSpacing: -0.5 },
    scrollContent: { padding: 20, paddingBottom: 40 },
    
    cardsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' },
    statIconContainer: { position: 'absolute', top: 12, right: 12, opacity: 0.5 },
    statLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 8 },
    statValue: { fontSize: 22, fontWeight: '900', color: 'white' },
    textGreen: { color: '#4ade80' },
    textRed: { color: '#f87171' },

    listContainer: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: 20, marginBottom: 24 },
    listHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    listTitle: { fontSize: 18, fontWeight: '900', color: 'white', textTransform: 'uppercase' },
    
    listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    listItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconInitial: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    iconInitialText: { fontSize: 16, fontWeight: '900', color: 'white' },
    subName: { fontSize: 16, fontWeight: '800', color: 'white', marginBottom: 2 },
    subValue: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
    
    listItemRight: { alignItems: 'flex-end', gap: 6 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    badgeGreen: { backgroundColor: 'rgba(74, 222, 128, 0.1)' },
    badgeRed: { backgroundColor: 'rgba(248, 113, 113, 0.1)' },
    badgeText: { fontSize: 12, fontWeight: '800' },
    contributionText: { fontSize: 10, fontWeight: '800' },

    aiBox: { backgroundColor: 'rgba(34, 211, 238, 0.05)', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(34, 211, 238, 0.2)' },
    aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    aiTitle: { fontSize: 14, fontWeight: '900', color: 'white', textTransform: 'uppercase' },
    aiContent: { fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 22, fontWeight: '600' }
});

export default AssetDetails;
