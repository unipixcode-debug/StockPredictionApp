import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Globe, LayoutGrid, Zap, ShieldCheck, ChevronRight, BarChart3, Info, ArrowLeft } from 'lucide-react-native';
import { Config } from '@/constants/Config';
import { useRouter } from 'expo-router';

const Market360Screen = () => {
    const [heatmapData, setHeatmapData] = useState<any[]>([]);
    const [insights, setInsights] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSector, setSelectedSector] = useState('All');
    const router = useRouter();

    useEffect(() => {
        const fetchMarket360Data = async () => {
            setLoading(true);
            try {
                const [heatmapRes, insightsRes] = await Promise.all([
                    fetch(`${Config.API_BASE}/market/heatmap`),
                    fetch(`${Config.API_BASE}/market/insights`)
                ]);
                
                let hData = await heatmapRes.json();
                let iData = await insightsRes.json();
                
                if (Array.isArray(hData)) {
                    setHeatmapData(hData);
                }
                if (Array.isArray(iData)) {
                    setInsights(iData);
                }
            } catch (error) {
                console.error('Market 360 fetch error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMarket360Data();
    }, []);

    const sectors = ['All', ...new Set(heatmapData.map(d => d.sector))];
    const filteredData = selectedSector === 'All' 
        ? heatmapData 
        : heatmapData.filter(d => d.sector === selectedSector);

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
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <ArrowLeft size={24} color="white" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Market 360 <Globe size={20} color="#22d3ee" /></Text>
                        <Text style={styles.headerSubtitle}>Sektörel Isı Haritası</Text>
                    </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {/* Status Bar */}
                    <View style={styles.statusBar}>
                        <View style={styles.statusBox}>
                            <LayoutGrid size={16} color="rgba(255,255,255,0.8)" />
                        </View>
                        <View style={styles.statusDetails}>
                            <Text style={styles.statusLabel}>Piyasa Durumu</Text>
                            <View style={styles.statusActiveRow}>
                                <View style={styles.statusDot} />
                                <Text style={styles.statusActiveText}>AÇIK</Text>
                            </View>
                        </View>
                    </View>

                    {/* Sector Filter */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sectorScroll} contentContainerStyle={styles.sectorContent}>
                        {sectors.map(s => (
                            <TouchableOpacity
                                key={s}
                                onPress={() => setSelectedSector(s)}
                                style={[styles.sectorBtn, selectedSector === s && styles.sectorBtnActive]}
                            >
                                <Text style={[styles.sectorText, selectedSector === s && styles.sectorTextActive]}>{s}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Heatmap Grid */}
                    <View style={styles.heatmapGrid}>
                        {filteredData.map((stock, i) => {
                            const change = stock.change || 0;
                            const isUp = change >= 0;
                            const absChange = Math.abs(change).toFixed(2);
                            const intensity = Math.min(Math.abs(change) / 3, 1); 
                            const bgColor = isUp 
                                ? `rgba(16, 185, 129, ${0.1 + intensity * 0.7})` 
                                : `rgba(225, 29, 72, ${0.1 + intensity * 0.7})`;

                            return (
                                <TouchableOpacity 
                                    key={i}
                                    style={[styles.heatmapCell, { backgroundColor: bgColor, borderColor: isUp ? 'rgba(16, 185, 129, 0.4)' : 'rgba(225, 29, 72, 0.4)' }]}
                                    onPress={() => router.push({ pathname: '/market-chart' as any, params: { name: stock.symbol, symbol: stock.symbol } })}
                                >
                                    <Text style={styles.cellSymbol}>{stock.symbol}</Text>
                                    <View style={styles.cellBadge}>
                                        <Text style={styles.cellChange}>{isUp ? '+' : '-'}{absChange}%</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                        {filteredData.length === 0 && (
                            <View style={styles.emptyGrid}>
                                <Text style={styles.emptyGridText}>Seçili sektörde veri bulunmuyor</Text>
                            </View>
                        )}
                    </View>

                    {/* Insights Box */}
                    <View style={styles.insightsCard}>
                        <View style={styles.insightsHeader}>
                            <View style={styles.zapIconWrap}>
                                <ShieldCheck size={20} color="#22d3ee" />
                            </View>
                            <Text style={styles.insightsTitle}>Smart Tracker</Text>
                        </View>
                        
                        {insights.length > 0 ? (
                            insights.slice(0, 5).map((insight, i) => (
                                <View key={i} style={styles.insightRow}>
                                    <View style={styles.insightHeaderRow}>
                                        <View style={[styles.insightTypeBadge, insight.type === 'TRADE_IDEA' ? styles.badgeGreen : styles.badgeBlue]}>
                                            <Text style={[styles.insightTypeText, insight.type === 'TRADE_IDEA' ? styles.textGreen : styles.textBlue]}>{insight.type}</Text>
                                        </View>
                                        <Text style={styles.insightTime}>{new Date(insight.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                    </View>
                                    <Text style={styles.insightText}>{insight.title}</Text>
                                    <View style={styles.insightFooter}>
                                        <Text style={styles.insightSource}>{insight.source} AI</Text>
                                        <ChevronRight size={14} color="rgba(255,255,255,0.4)" />
                                    </View>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyInsights}>Yakın zamanda üretilmiş analiz uyarısı bulunmuyor.</Text>
                        )}
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
    headerTitle: { fontSize: 24, fontWeight: '900', color: 'white', letterSpacing: -0.5, flexWrap: 'wrap' },
    headerSubtitle: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 },
    scrollContent: { padding: 20, paddingBottom: 40 },
    
    statusBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 20 },
    statusBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#22d3ee', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    statusDetails: { flex: 1, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.1)', paddingLeft: 12 },
    statusLabel: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    statusActiveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80' },
    statusActiveText: { fontSize: 12, fontWeight: '900', color: '#4ade80', letterSpacing: 1 },

    sectorScroll: { marginBottom: 20, flexGrow: 0 },
    sectorContent: { paddingRight: 20 },
    sectorBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', marginRight: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    sectorBtnActive: { backgroundColor: '#22d3ee', borderColor: '#22d3ee' },
    sectorText: { fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 },
    sectorTextActive: { color: '#0f172a' },

    heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    heatmapCell: { width: '31%', aspectRatio: 1, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', padding: 8 },
    cellSymbol: { fontSize: 16, fontWeight: '900', color: 'white', marginBottom: 6 },
    cellBadge: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    cellChange: { fontSize: 10, fontWeight: '900', color: 'white' },
    emptyGrid: { width: '100%', padding: 40, alignItems: 'center' },
    emptyGridText: { color: 'rgba(255,255,255,0.3)', fontWeight: '700' },

    insightsCard: { backgroundColor: 'rgba(34,211,238,0.05)', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(34,211,238,0.2)' },
    insightsHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    zapIconWrap: { width: 36, height: 36, backgroundColor: 'rgba(34,211,238,0.15)', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    insightsTitle: { fontSize: 18, fontWeight: '900', color: 'white', fontStyle: 'italic' },
    
    insightRow: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    insightHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    insightTypeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    badgeGreen: { backgroundColor: 'rgba(74, 222, 128, 0.15)' },
    badgeBlue: { backgroundColor: 'rgba(59, 130, 246, 0.15)' },
    insightTypeText: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
    textGreen: { color: '#4ade80' },
    textBlue: { color: '#60a5fa' },
    insightTime: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.3)' },
    insightText: { fontSize: 13, fontWeight: '700', color: 'white', lineHeight: 18, marginBottom: 12 },
    insightFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    insightSource: { fontSize: 10, fontWeight: '900', color: '#22d3ee', textTransform: 'uppercase' },
    emptyInsights: { fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center', paddingVertical: 20, fontStyle: 'italic' }
});

export default Market360Screen;
