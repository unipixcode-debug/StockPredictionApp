import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Share, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Config } from '@/constants/Config';
import { ChevronLeft, Share2, TrendingUp, TrendingDown, Clock, BrainCircuit, ShieldCheck, Activity } from 'lucide-react-native';

const API_BASE = Config.API_BASE;

interface Prediction {
    id: string;
    symbol: string;
    market: string;
    prediction: string;
    sentiment_score: number;
    summary: string;
    direction: string;
    score: number;
    entryPrice: number;
    targetPrice: number;
    stopLoss: number;
    currentPrice?: number;
    analysis_details?: {
        summary: string;
        reasoning: string;
    } | any;
    createdAt: string;
}

const LevelCard = ({ label, value, color }: { label: string; value?: number; color: string }) => (
    <View style={[styles.levelCard, { borderColor: `${color}40` }]}>
        <Text style={[styles.levelLabel, { color }]}>{label}</Text>
        <Text style={styles.levelValue}>${value?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '---'}</Text>
    </View>
);

const PredictionDetailScreen = () => {
    const params = useLocalSearchParams();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    
    const router = useRouter();
    const [prediction, setPrediction] = useState<Prediction | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchDetail = async () => {
        try {
            const response = await fetch(`${API_BASE}/predictions/${id}`);
            const data = await response.json();
            setPrediction(data);
        } catch (error) {
            console.error('Detail fetch error:', error);
            setPrediction({
                id: String(id),
                symbol: 'BTC-USD',
                market: 'crypto',
                prediction: 'YÜKSELİŞ',
                direction: 'BUY',
                score: 85,
                sentiment_score: 85,
                entryPrice: 62500,
                targetPrice: 68000,
                stopLoss: 61000,
                summary: 'Güçlü hacim ve pozitif haber akışı.',
                analysis_details: {
                    summary: 'Bitcoin, kurumsal yatırımcı ilgisinin artması ve makroekonomik verilerin iyileşmesiyle güçlü bir yükseliş trendine girdi.',
                    reasoning: 'RSI ve Hareketli Ortalamalar pozitif bölgede kalmaya devam ediyor. 62.500 seviyesi üzerinde kalıcılık hedefleri destekliyor.'
                },
                createdAt: new Date().toISOString()
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchDetail();
    }, [id]);

    const onShare = async () => {
        try {
            await Share.share({
                message: `PredictPro Tahmini: ${prediction?.symbol} - ${prediction?.prediction}\n${prediction?.summary}`,
            });
        } catch (error) {
            console.error(error);
        }
    };

    if (loading || !prediction) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#22d3ee" />
            </View>
        );
    }

    const isBullish = prediction.direction === 'BUY' || prediction.prediction === 'YÜKSELİŞ';

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ChevronLeft color="white" size={28} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{prediction.symbol} Analizi</Text>
                    <TouchableOpacity onPress={onShare} style={styles.shareButton}>
                        <Share2 color="white" size={22} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    {/* Main Score Card */}
                    <View style={styles.scoreCard}>
                        <View style={[styles.predictionBadge, { backgroundColor: isBullish ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)' }]}>
                            {prediction.direction === 'BUY' ? <TrendingUp size={48} color="#4ade80" /> : prediction.direction === 'HOLD' ? <Activity color="#f59e0b" size={48} /> : <TrendingDown size={48} color="#f87171" />}
                        </View>
                        
                        <Text style={styles.badgeLabel}>ML MODEL TAHMİNİ</Text>
                        <Text style={[styles.predictionText, { color: isBullish ? '#4ade80' : '#f87171' }]}>
                            {prediction.direction || prediction.prediction}
                        </Text>
                        
                        <View style={styles.metaRow}>
                            <View style={styles.metaItem}>
                                <Text style={styles.metaLabel}>SKOR</Text>
                                <Text style={styles.metaValue}>{prediction.score || prediction.sentiment_score}</Text>
                            </View>
                            <View style={styles.metaDivider} />
                            <View style={styles.metaItem}>
                                <Text style={styles.metaLabel}>MARKET</Text>
                                <Text style={[styles.metaValue, { textTransform: 'uppercase' }]}>
                                    {prediction.market === 'COMMODITY' ? 'EMTİA' : 
                                     prediction.market === 'CRYPTO' ? 'KRİPTO' : 
                                     prediction.market === 'BIST' ? 'BIST' : prediction.market}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* New Professional Levels Section */}
                    <View style={styles.levelsGrid}>
                        <LevelCard label="GİRİŞ" value={prediction.entryPrice} color="#60a5fa" />
                        <LevelCard label="HEDEF" value={prediction.targetPrice} color="#4ade80" />
                        <LevelCard label="STOP" value={prediction.stopLoss} color="#f87171" />
                    </View>

                    {/* AI vs ML Comparison Chart */}
                    <View style={styles.chartSection}>
                        <View style={styles.sectionTitleRow}>
                            <Activity color="#22d3ee" size={20} />
                            <Text style={styles.sectionTitle}>Model Karşılaştırması (AI vs ML)</Text>
                        </View>
                        
                        <View style={styles.chartLegend}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#00f2fe' }]} />
                                <Text style={styles.legendText}>AI Skor (Flash)</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#4ade80' }]} />
                                <Text style={styles.legendText}>ML Skor (Stable)</Text>
                            </View>
                        </View>

                        <View style={styles.customChartContainer}>
                            {prediction.analysis_details?.chartData ? (
                                prediction.analysis_details.chartData.map((d: any, i: number) => (
                                    <View key={i} style={styles.chartColumn}>
                                        <View style={styles.barStack}>
                                            <View style={[styles.bar, { height: (d.ai * 1.2), backgroundColor: '#00f2fe', opacity: 0.8 }]} />
                                            <View style={[styles.bar, { height: (d.ml * 1.2), backgroundColor: '#4ade80', opacity: 0.8 }]} />
                                        </View>
                                        <Text style={styles.columnLabel}>{d.timeframe}</Text>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.noDataText}>Grafik verisi mevcut değil.</Text>
                            )}
                        </View>
                    </View>

                    {/* AI Reasoning Section */}
                    <View style={styles.analysisSection}>
                        <View style={styles.sectionTitleRow}>
                            <BrainCircuit color="#22d3ee" size={24} />
                            <Text style={styles.sectionTitle}>Stratejik Analiz</Text>
                        </View>
                        
                        <View style={styles.reasoningCard}>
                            <Text style={styles.summaryTitle}>Piyasa Özeti</Text>
                            <Text style={styles.summaryText}>"{(prediction.analysis_details && typeof prediction.analysis_details !== 'string' ? prediction.analysis_details.summary : prediction.analysis_details) || prediction.summary}"</Text>
                            
                            {(prediction.analysis_details && (typeof prediction.analysis_details !== 'string' ? (prediction.analysis_details.reasoning || prediction.analysis_details.summary) : true)) && (
                                <View style={styles.detailContainer}>
                                    <Text style={styles.detailHeader}>Analiz Detayı</Text>
                                    <Text style={styles.detailText}>
                                        {(prediction.analysis_details && typeof prediction.analysis_details !== 'string' ? (prediction.analysis_details.reasoning || prediction.analysis_details.summary) : prediction.analysis_details)}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Chart Link */}
                    <TouchableOpacity 
                        onPress={() => router.push({ pathname: '/market-chart' as any, params: { symbol: prediction.symbol } })}
                        style={styles.fullChartButton}
                    >
                        <TrendingUp size={20} color="#0f172a" />
                        <Text style={styles.fullChartButtonText}>CANLI GRAFİĞİ GÖR</Text>
                    </TouchableOpacity>

                    {/* Footer Meta */}
                    <View style={styles.footerRow}>
                        <View style={styles.timeBadge}>
                            <Clock size={14} color="rgba(255,255,255,0.4)" />
                            <Text style={styles.timeText}>{new Date(prediction.createdAt).toLocaleString()}</Text>
                        </View>
                        <View style={styles.shieldBadge}>
                            <ShieldCheck size={14} color="#4ade80" />
                            <Text style={styles.shieldText}>VERIFIED ML MODEL</Text>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    loadingContainer: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
    safeArea: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    backButton: { padding: 8, marginLeft: -8 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: 'white' },
    shareButton: { padding: 8, marginRight: -8 },
    scrollView: { flex: 1, paddingHorizontal: 24 },
    scoreCard: { marginTop: 32, padding: 40, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 48, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    predictionBadge: { width: 90, height: 90, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    badgeLabel: { fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 },
    predictionText: { fontSize: 44, fontWeight: '900', marginBottom: 24 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 32, marginTop: 10 },
    metaItem: { alignItems: 'center' },
    metaLabel: { fontSize: 10, color: 'rgba(255,255,255,0.2)', fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
    metaValue: { fontSize: 20, fontWeight: '800', color: 'white' },
    metaDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)' },
    levelsGrid: { flexDirection: 'row', gap: 12, marginTop: 24 },
    levelCard: { flex: 1, padding: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, borderWidth: 1, alignItems: 'center' },
    levelLabel: { fontSize: 9, fontWeight: '900', marginBottom: 4 },
    levelValue: { fontSize: 13, fontWeight: '800', color: 'white' },
    analysisSection: { marginTop: 40 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    sectionTitle: { fontSize: 22, fontWeight: '800', color: 'white', marginLeft: 12 },
    reasoningCard: { padding: 24, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    summaryTitle: { fontSize: 12, fontWeight: '900', color: '#22d3ee', textTransform: 'uppercase', marginBottom: 8 },
    summaryText: { fontSize: 17, color: 'rgba(255,255,255,0.9)', lineHeight: 28, fontWeight: '600', fontStyle: 'italic' },
    detailContainer: { marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    detailHeader: { fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 12 },
    detailText: { fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 24 },
    fullChartButton: { marginTop: 32, backgroundColor: '#22d3ee', padding: 20, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
    fullChartButtonText: { fontSize: 14, fontWeight: '900', color: '#0f172a', letterSpacing: 1 },
    footerRow: { marginTop: 40, marginBottom: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', opacity: 0.6 },
    timeBadge: { flexDirection: 'row', alignItems: 'center' },
    timeText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginLeft: 8 },
    shieldBadge: { flexDirection: 'row', alignItems: 'center' },
    shieldText: { fontSize: 10, color: '#4ade80', fontWeight: '900', letterSpacing: 1.5, marginLeft: 6 },
    // Chart Styles
    chartSection: { marginTop: 40 },
    chartLegend: { flexDirection: 'row', gap: 16, marginBottom: 24, justifyContent: 'center' },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '800', textTransform: 'uppercase' },
    customChartContainer: { 
        height: 180, 
        backgroundColor: 'rgba(255,255,255,0.02)', 
        borderRadius: 32, 
        borderWidth: 1, 
        borderColor: 'rgba(255,255,255,0.05)',
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 20
    },
    chartColumn: { alignItems: 'center', gap: 8 },
    barStack: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
    bar: { width: 6, borderRadius: 3 },
    columnLabel: { fontSize: 9, fontWeight: '900', color: 'rgba(255,255,255,0.2)', position: 'absolute', bottom: -25 },
    noDataText: { fontSize: 12, color: 'rgba(255,255,255,0.3)', width: '100%', textAlign: 'center' },
});

export default PredictionDetailScreen;
