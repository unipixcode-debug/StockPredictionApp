import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Activity, TrendingUp, TrendingDown, Clock, Search, ChevronRight, BrainCircuit, Trash2, Play, RefreshCw, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Config } from '@/constants/Config';
import { TextInput } from 'react-native';

const API_BASE = `${Config.API_BASE}${Config.ENDPOINTS.PREDICTIONS}`;

// Simple module-level flag to track disclaimer acceptance per session
let disclaimerShown = false;

interface Prediction {
    id: string;
    symbol: string;
    market: string;
    prediction: string;
    sentiment_score: number;
    summary: string;
    createdAt: string;
}

const DashboardScreen = () => {
    const [predictions, setPredictions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);
    const [showNotification, setShowNotification] = useState(false);
    const [searchSymbol, setSearchSymbol] = useState('');
    const [filter, setFilter] = useState('HEPSİ');
    const [showDisclaimer, setShowDisclaimer] = useState(!disclaimerShown);
    const router = useRouter();

    const acceptDisclaimer = () => {
        disclaimerShown = true;
        setShowDisclaimer(false);
    };

    const fetchData = async () => {
        try {
            const response = await fetch(API_BASE);
            const data = await response.json();
            setPredictions(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Fetch error:', error);
            // Fallback mock predictions if API fails
            setPredictions([
                { id: '1', symbol: 'BTC-USD', market: 'CRYPTO', direction: 'BUY', score: 85, analysis_details: { summary: 'Güçlü hacim ve pozitif haber akışı.' }, createdAt: new Date().toISOString() },
                { id: '3', symbol: 'GOLD', market: 'COMMODITY', direction: 'BUY', score: 72, analysis_details: { summary: 'Enflasyon verisi sonrası talep artışı.' }, createdAt: new Date().toISOString() },
            ]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleAnalyze = async () => {
        if (!searchSymbol.trim()) return;
        setLoadingAnalysis(true);
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 5000);

        try {
            const response = await fetch(`${Config.API_BASE}/predictions/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol: searchSymbol.toUpperCase().trim() })
            });
            const result = await response.json();
            if (result.id) {
                setPredictions(prev => [result, ...prev]);
                setSearchSymbol('');
            }
        } catch (error) {
            console.error('Analysis error:', error);
        } finally {
            setLoadingAnalysis(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await fetch(`${Config.API_BASE}/predictions/${id}`, { method: 'DELETE' });
            setPredictions(prev => prev.filter(p => p.id !== id));
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
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
            {/* Legal Disclaimer Modal */}
            <Modal visible={showDisclaimer} transparent animationType="fade">
                <View style={styles.disclaimerOverlay}>
                    <View style={styles.disclaimerCard}>
                        <Text style={styles.disclaimerTitle}>⚠️ Yasal Uyarı</Text>
                        <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
                            <Text style={styles.disclaimerText}>
                                Bu sayfada yer alan tüm içerikler yalnızca yapay zeka tabanlı algoritmik analizden oluşmakta olup yatırım tavsiyesi, finansal danışmanlık veya alım-satım önerisi niteliği taşımaz. SPK lisanslı bir yatırım danışmanı hizmeti verilmemektedir. Sunulan tahminler ve analizler geçmiş verilere dayanır; gelecekteki sonuçları garanti etmez. Yatırım kararlarınızı vermeden önce yetkili bir finansal danışmana başvurmanız tavsiye edilir. Doğabilecek zararlardan uygulama geliştiricisi sorumlu tutulamaz.
                            </Text>
                        </ScrollView>
                        <TouchableOpacity onPress={acceptDisclaimer} style={styles.disclaimerButton}>
                            <Text style={styles.disclaimerButtonText}>Okudum, Anladım ve Kabul Ediyorum</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            <SafeAreaView style={styles.safeArea}>
                <ScrollView 
                    style={styles.scrollView}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22d3ee" />}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerTitleContainer}>
                            <View style={styles.logoBadge}>
                                <Activity color="#22d3ee" size={20} />
                            </View>
                            <Text style={styles.headerTitle}>PredictPro</Text>
                        </View>
                        <TouchableOpacity style={styles.iconButton} onPress={onRefresh}>
                            <RefreshCw size={22} color="white" className={refreshing ? 'animate-spin' : ''} />
                        </TouchableOpacity>
                    </View>

                    {/* AI Analysis Search Box */}
                    <View style={styles.searchSection}>
                        <View style={styles.searchInputWrapper}>
                            <TextInput
                                placeholder="Sembol ör: XRPUSD, BTC-USD"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                value={searchSymbol}
                                onChangeText={setSearchSymbol}
                                style={styles.searchInput}
                                autoCapitalize="characters"
                            />
                            {searchSymbol.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchSymbol('')} style={styles.clearButton}>
                                    <X size={16} color="rgba(255,255,255,0.4)" />
                                </TouchableOpacity>
                            )}
                        </View>
                        <TouchableOpacity 
                            onPress={handleAnalyze} 
                            disabled={loadingAnalysis || !searchSymbol.trim()}
                            style={[styles.analyzeButton, (loadingAnalysis || !searchSymbol.trim()) && { opacity: 0.5 }]}
                        >
                            {loadingAnalysis ? (
                                <ActivityIndicator size="small" color="#0f172a" />
                            ) : (
                                <Play size={20} color="#0f172a" fill="#0f172a" />
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Market Summary Cards */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsRow}>
                        <MarketStatCard label="Global Sent." value="Pozitif" score={72} color="green" />
                        <MarketStatCard label="Piyasa Korkusu" value="Düşük" score={15} color="cyan" />
                        <MarketStatCard label="İşlem Hacmi" value="Yüksek" score={88} color="indigo" />
                    </ScrollView>

                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Son Tahminler</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
                            <View style={styles.tabRow}>
                                {['HEPSİ', 'KRİPTO', 'BORSA', 'EMTİA'].map((tab) => (
                                    <TouchableOpacity 
                                        key={tab} 
                                        onPress={() => setFilter(tab)}
                                        style={[styles.tabButton, filter === tab && styles.tabButtonActive]}
                                    >
                                        <Text style={[styles.tabText, filter === tab && styles.tabTextActive]}>{tab}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </View>

                    {/* Notification Overlay */}
                    {showNotification && (
                        <View style={styles.notificationCard}>
                            <BrainCircuit color="#22d3ee" size={20} />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.notificationTitle}>Analiz Talebi Alındı</Text>
                                <Text style={styles.notificationDesc}>Yapay zeka çalışmaya başladı. Sonuç kısa süre içinde listeye eklenecektir.</Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.listContainer}>
                        {predictions
                            .filter(p => {
                                if (filter === 'HEPSİ') return true;
                                if (filter === 'KRİPTO') return p.market?.toLowerCase().includes('crypto');
                                if (filter === 'EMTİA') return p.market?.toLowerCase().includes('commodity');
                                return p.market?.toLowerCase().includes('stock') || p.market?.toLowerCase().includes('bist') || p.market?.toLowerCase().includes('us');
                            })
                            .map((item) => (
                            <TouchableOpacity 
                                key={item.id}
                                onPress={() => {
                                    router.push({ pathname: '/prediction-detail' as any, params: { id: item.id } });
                                }}
                                style={styles.predictionCard}
                            >
                                <View style={[styles.predictionIcon, { backgroundColor: item.direction === 'BUY' ? 'rgba(74, 222, 128, 0.1)' : item.direction === 'HOLD' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(248, 113, 113, 0.1)' }]}>
                                    {item.direction === 'BUY' ? <TrendingUp color="#4ade80" /> : item.direction === 'HOLD' ? <Activity color="#f59e0b" /> : <TrendingDown color="#f87171" />}
                                </View>
                                
                                <View style={styles.predictionContent}>
                                    <View style={styles.predictionCardTop}>
                                        <Text style={styles.symbolText}>{item.symbol}</Text>
                                        <Text style={[styles.predictionStatusText, { color: item.direction === 'BUY' ? '#4ade80' : item.direction === 'HOLD' ? '#f59e0b' : '#f87171' }]}>
                                            {item.direction || item.prediction}
                                        </Text>
                                        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
                                            <Trash2 size={16} color="rgba(248, 113, 113, 0.6)" />
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.priceRow}>
                                        <Text style={styles.priceLabel}>Fiyat:</Text>
                                        <Text style={styles.priceValue}>${item.currentPrice?.toLocaleString() || '---'}</Text>
                                    </View>
                                    <Text style={styles.summaryText} numberOfLines={2}>{item.analysis_details?.summary || item.summary}</Text>
                                    <View style={styles.cardFooter}>
                                        <View style={styles.timeContainer}>
                                            <Clock size={10} color="rgba(255,255,255,0.4)" />
                                            <Text style={styles.timeText}>{new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                                        </View>
                                        <Text style={styles.scoreText}>Skor: {item.score}</Text>
                                    </View>
                                </View>

                                <ChevronRight size={18} color="rgba(255,255,255,0.2)" />
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const MarketStatCard = ({ label, value, score, color }: { label: string, value: string, score: number, color: string }) => {
    const barColor = color === 'green' ? '#4ade80' : color === 'cyan' ? '#22d3ee' : '#6366f1';
    return (
        <View style={styles.statCard}>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={styles.statValue}>{value}</Text>
            <View style={styles.statBarBg}>
                <View style={[styles.statBarFill, { width: `${score}%`, backgroundColor: barColor }]} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    loadingContainer: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
    safeArea: { flex: 1 },
    scrollView: { flex: 1, padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 10 },
    headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
    logoBadge: { width: 40, height: 40, backgroundColor: 'rgba(34, 211, 238, 0.1)', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    headerTitle: { fontSize: 24, fontWeight: '800', color: 'white', letterSpacing: -0.5 },
    iconButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 99 },
    statsRow: { marginBottom: 32 },
    statCard: { width: 140, padding: 20, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginRight: 16 },
    statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
    statValue: { fontSize: 16, fontWeight: '800', color: 'white', marginBottom: 12 },
    statBarBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2 },
    statBarFill: { height: '100%', borderRadius: 2 },
    sectionHeader: { flexDirection: 'column', alignItems: 'flex-start', marginBottom: 20 },
    sectionTitle: { fontSize: 20, fontWeight: '900', color: 'white', marginBottom: 12, textTransform: 'uppercase', fontStyle: 'italic' },
    tabRow: { flexDirection: 'row', gap: 8 },
    tabScroll: { marginTop: 4 },
    tabButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    tabButtonActive: { backgroundColor: '#22d3ee', borderColor: '#22d3ee' },
    tabText: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.5)' },
    tabTextActive: { color: '#0f172a' },
    searchSection: { flexDirection: 'row', gap: 12, marginBottom: 32 },
    searchInputWrapper: { flex: 1, height: 50, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
    searchInput: { flex: 1, color: 'white', fontWeight: '700', fontSize: 14 },
    clearButton: { padding: 4 },
    analyzeButton: { width: 50, height: 50, backgroundColor: '#22d3ee', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    deleteButton: { padding: 4, marginLeft: 8 },
    notificationCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(34, 211, 238, 0.1)', padding: 16, borderRadius: 20, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#22d3ee' },
    notificationTitle: { fontSize: 14, fontWeight: '900', color: 'white', marginBottom: 2 },
    notificationDesc: { fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 16 },
    listContainer: { paddingBottom: 40 },
    predictionCard: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 24, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 16 },
    predictionIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    predictionContent: { flex: 1 },
    predictionCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    symbolText: { fontSize: 18, fontWeight: '900', color: 'white', letterSpacing: -0.5, flex: 1 },
    priceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
    priceLabel: { fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: '800', textTransform: 'uppercase' },
    priceValue: { fontSize: 12, fontWeight: '900', color: 'rgba(255,255,255,0.8)' },
    predictionStatusText: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
    summaryText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 12, lineHeight: 18 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12 },
    timeContainer: { flexDirection: 'row', alignItems: 'center' },
    timeText: { fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: '600', marginLeft: 6 },
    scoreText: { fontSize: 10, fontWeight: '900', color: 'rgba(34, 211, 238, 0.5)', textTransform: 'uppercase' },
    // Disclaimer styles
    disclaimerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    disclaimerCard: { backgroundColor: '#0f172a', borderRadius: 32, padding: 28, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', width: '100%' },
    disclaimerTitle: { fontSize: 22, fontWeight: '900', color: '#f59e0b', marginBottom: 16, textAlign: 'center' },
    disclaimerText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 22 },
    disclaimerButton: { backgroundColor: '#22d3ee', padding: 18, borderRadius: 20, marginTop: 20, alignItems: 'center' },
    disclaimerButtonText: { color: '#0f172a', fontWeight: '900', fontSize: 14 },
});

export default DashboardScreen;
