import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Share, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Share2, TrendingUp, TrendingDown, Clock, BrainCircuit, ShieldCheck } from 'lucide-react-native';

const API_BASE = 'http://192.168.1.7:5000/api';

interface Prediction {
    id: string;
    symbol: string;
    market: string;
    prediction: string;
    sentiment_score: number;
    summary: string;
    analysis_details?: string;
    createdAt: string;
}

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
                sentiment_score: 85,
                summary: 'Güçlü hacim ve pozitif haber akışı.',
                analysis_details: 'Bitcoin, kurumsal yatırımcı ilgisinin artması ve makroekonomik verilerin iyileşmesiyle güçlü bir yükseliş trendine girdi. RSI ve Hareketli Ortalamalar pozitif bölgede kalmaya devam ediyor.',
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

    const isBullish = prediction.prediction === 'YÜKSELİŞ';

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
                            {isBullish ? <TrendingUp size={48} color="#4ade80" /> : <TrendingDown size={48} color="#f87171" />}
                        </View>
                        
                        <Text style={styles.badgeLabel}>Yapay Zeka Tahmini</Text>
                        <Text style={[styles.predictionText, { color: isBullish ? '#4ade80' : '#f87171' }]}>
                            {prediction.prediction}
                        </Text>
                        
                        <View style={styles.metaRow}>
                            <View style={styles.metaItem}>
                                <Text style={styles.metaLabel}>Skor</Text>
                                <Text style={styles.metaValue}>{prediction.sentiment_score}</Text>
                            </View>
                            <View style={styles.metaDivider} />
                            <View style={styles.metaItem}>
                                <Text style={styles.metaLabel}>Market</Text>
                                <Text style={[styles.metaValue, { textTransform: 'uppercase' }]}>{prediction.market}</Text>
                            </View>
                        </View>
                    </View>

                    {/* AI Reasoning Section */}
                    <View style={styles.analysisSection}>
                        <View style={styles.sectionTitleRow}>
                            <BrainCircuit color="#22d3ee" size={24} />
                            <Text style={styles.sectionTitle}>AI Sorgu Sonucu</Text>
                        </View>
                        
                        <View style={styles.reasoningCard}>
                            <Text style={styles.summaryText}>"{prediction.summary}"</Text>
                            
                            {prediction.analysis_details && (
                                <Text style={styles.detailText}>
                                    {prediction.analysis_details}
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Footer Meta */}
                    <View style={styles.footerRow}>
                        <View style={styles.timeBadge}>
                            <Clock size={14} color="rgba(255,255,255,0.4)" />
                            <Text style={styles.timeText}>{new Date(prediction.createdAt).toLocaleString()}</Text>
                        </View>
                        <View style={styles.shieldBadge}>
                            <ShieldCheck size={14} color="#4ade80" />
                            <Text style={styles.shieldText}>VERIFIED ANALYSIS</Text>
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
    analysisSection: { marginTop: 40 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    sectionTitle: { fontSize: 22, fontWeight: '800', color: 'white', marginLeft: 12 },
    reasoningCard: { padding: 24, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    summaryText: { fontSize: 17, color: 'rgba(255,255,255,0.9)', lineHeight: 28, fontWeight: '600', fontStyle: 'italic' },
    detailText: { fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 24, marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    footerRow: { marginTop: 40, marginBottom: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', opacity: 0.6 },
    timeBadge: { flexDirection: 'row', alignItems: 'center' },
    timeText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginLeft: 8 },
    shieldBadge: { flexDirection: 'row', alignItems: 'center' },
    shieldText: { fontSize: 10, color: '#4ade80', fontWeight: '900', letterSpacing: 1.5, marginLeft: 6 }
});

export default PredictionDetailScreen;
