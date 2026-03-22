import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Activity, ShieldCheck, Zap, ArrowLeft, BarChart3, ChevronRight } from 'lucide-react-native';
import { Config } from '@/constants/Config';
import { useRouter } from 'expo-router';

const AnalysisScreen = () => {
    const [insights, setInsights] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchInsights = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${Config.API_BASE}/market/insights`);
                const data = await res.json();
                if (Array.isArray(data)) {
                    setInsights(data);
                }
            } catch (error) {
                console.error('Analysis fetch error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInsights();
    }, []);

    const renderInsight = (insight: any, i: number) => {
        const isTradeIdea = insight.type === 'TRADE_IDEA';
        const badgeColor = isTradeIdea ? styles.badgeGreen : styles.badgeBlue;
        const textColor = isTradeIdea ? styles.textGreen : styles.textBlue;
        const icon = isTradeIdea ? <Zap size={14} color="#4ade80" /> : <Activity size={14} color="#60a5fa" />;

        return (
            <View key={i} style={styles.insightCard}>
                <View style={styles.insightHeader}>
                    <View style={styles.insightHeaderLeft}>
                        <View style={[styles.typeBadge, badgeColor]}>
                            {icon}
                            <Text style={[styles.typeText, textColor]}>{insight.type}</Text>
                        </View>
                        <Text style={styles.timeText}>
                            {new Date(insight.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                    <View style={styles.sourceBadge}>
                        <ShieldCheck size={12} color="#22d3ee" />
                        <Text style={styles.sourceText}>{insight.source} AI</Text>
                    </View>
                </View>

                <Text style={styles.titleText}>{insight.title}</Text>

                <View style={styles.insightFooter}>
                    <TouchableOpacity style={styles.readMoreBtn}>
                        <Text style={styles.readMoreText}>Detayları Görüntüle</Text>
                        <ChevronRight size={14} color="#22d3ee" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#22d3ee" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <ArrowLeft size={24} color="white" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerSubtitle}>Tüm Raporlar</Text>
                        <Text style={styles.headerTitle}>Genel Analiz</Text>
                    </View>
                    <View style={styles.iconWrap}>
                        <BarChart3 size={24} color="#22d3ee" />
                    </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    <View style={styles.listHeader}>
                        <Text style={styles.listTitle}>Son AI Sinyalleri</Text>
                        <Text style={styles.listSubtitle}>{insights.length} aktif analiz</Text>
                    </View>

                    {insights.length > 0 ? (
                        <View style={styles.listContainer}>
                            {insights.map((insight, i) => renderInsight(insight, i))}
                        </View>
                    ) : (
                        <View style={styles.emptyState}>
                            <Activity size={48} color="rgba(255,255,255,0.1)" />
                            <Text style={styles.emptyTitle}>Yeni Sinyal Yok</Text>
                            <Text style={styles.emptyDesc}>AI modelleri piyasayı analiz etmeye devam ediyor. Önemli bir hareketliliktesinyaller buraya düşecektir.</Text>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    loadingContainer: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
    safeArea: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    headerTitleContainer: { flex: 1 },
    headerSubtitle: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 },
    headerTitle: { fontSize: 24, fontWeight: '900', color: 'white', letterSpacing: -0.5 },
    iconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(34,211,238,0.1)', alignItems: 'center', justifyContent: 'center' },
    
    scrollContent: { padding: 20, paddingBottom: 40 },
    listHeader: { marginBottom: 20 },
    listTitle: { fontSize: 18, fontWeight: '900', color: 'white', marginBottom: 4 },
    listSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
    
    listContainer: { gap: 16 },
    insightCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    insightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    insightHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    typeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
    badgeGreen: { backgroundColor: 'rgba(74, 222, 128, 0.1)' },
    badgeBlue: { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
    typeText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
    textGreen: { color: '#4ade80' },
    textBlue: { color: '#60a5fa' },
    timeText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
    sourceBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(34,211,238,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    sourceText: { fontSize: 10, fontWeight: '900', color: '#22d3ee', textTransform: 'uppercase' },
    
    titleText: { fontSize: 16, fontWeight: '700', color: 'white', lineHeight: 24, marginBottom: 16 },
    
    insightFooter: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    readMoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    readMoreText: { fontSize: 12, fontWeight: '800', color: '#22d3ee', textTransform: 'uppercase' },

    emptyState: { padding: 40, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    emptyTitle: { fontSize: 18, fontWeight: '900', color: 'white', marginTop: 16, marginBottom: 8 },
    emptyDesc: { fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 20 }
});

export default AnalysisScreen;
