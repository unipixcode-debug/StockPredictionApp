import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
    StyleSheet, RefreshControl, Dimensions, Modal, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    Zap, Activity, Globe, Search, RefreshCw, Bot, X,
    TrendingUp, TrendingDown, Info, ArrowLeft
} from 'lucide-react-native';
import { Config } from '@/constants/Config';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInRight, SlideInUp } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const AIScanner = () => {
    const router = useRouter();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [activeMarket, setActiveMarket] = useState('crypto');
    const [selectedAsset, setSelectedAsset] = useState<any>(null);
    const [analysis, setAnalysis] = useState('');
    const [analyzing, setAnalyzing] = useState(false);

    const markets = [
        { id: 'crypto', label: 'KRİPTO', icon: <Activity size={14} color="white" /> },
        { id: 'nasdaq', label: 'NASDAQ', icon: <Zap size={14} color="white" /> },
        { id: 'bist', label: 'BIST 100', icon: <Globe size={14} color="white" /> }
    ];

    const fetchScanner = async () => {
        try {
            const res = await fetch(`${Config.API_BASE}${Config.ENDPOINTS.SCANNER_TOP || '/scanner/top'}?market=${activeMarket}&limit=40`);
            const data = await res.json();
            setData(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchScanner();
    }, [activeMarket]);

    const handleAnalyze = async (asset: any) => {
        setSelectedAsset(asset);
        setAnalysis('');
        setAnalyzing(true);
        try {
            const res = await fetch(`${Config.API_BASE}${Config.ENDPOINTS.SCANNER_ANALYZE || '/scanner/analyze'}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: asset.symbol,
                    rsi: asset.rsi,
                    macd: asset.macd,
                    price: asset.price,
                    market: activeMarket
                })
            });
            const result = await res.json();
            setAnalysis(result.analysis);
        } catch (e) {
            setAnalysis("Analiz sırasında hata oluştu.");
        } finally {
            setAnalyzing(false);
        }
    };

    const filteredData = data.filter(item =>
        item.symbol.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <View style={s.container}>
            <SafeAreaView style={s.safeArea} edges={['top']}>
                <View style={s.header}>
                    <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                        <ArrowLeft size={20} color="white" />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={s.title}>GLOBAL TARAYICI</Text>
                        <Text style={s.subTitle}>Yapay Zeka Destekli Teknik Tarama</Text>
                    </View>
                    <TouchableOpacity onPress={fetchScanner} style={s.refreshBtn}>
                        <RefreshCw size={18} color="#22d3ee" />
                    </TouchableOpacity>
                </View>

                {/* Market Tabs */}
                <View style={s.tabsContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsScroll}>
                        {markets.map(m => (
                            <TouchableOpacity
                                key={m.id}
                                onPress={() => setActiveMarket(m.id)}
                                style={[s.tab, activeMarket === m.id && s.activeTab]}
                            >
                                {m.icon}
                                <Text style={[s.tabText, activeMarket === m.id && s.activeTabText]}>{m.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={s.searchBar}>
                    <Search size={16} color="rgba(255,255,255,0.4)" />
                    <TextInput
                        placeholder="Sembol ara..."
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        style={s.searchInput}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>

                {loading && !refreshing ? (
                    <View style={s.loadingBox}>
                        <ActivityIndicator size="large" color="#22d3ee" />
                        <Text style={s.loadingText}>PİYASALAR TARANIYOR...</Text>
                    </View>
                ) : (
                    <ScrollView
                        style={s.list}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchScanner(); }} tintColor="#22d3ee" />}
                        showsVerticalScrollIndicator={false}
                    >
                        {filteredData.map((item, i) => (
                            <TouchableOpacity key={i} style={s.row} onPress={() => handleAnalyze(item)}>
                                <View style={s.symbolInfo}>
                                    <Text style={s.symbolText}>{item.symbol.replace('.IS', '')}</Text>
                                    <Text style={s.marketLabel}>{activeMarket.toUpperCase()}</Text>
                                </View>

                                <View style={s.priceInfo}>
                                    <Text style={s.priceText}>
                                        {activeMarket === 'bist' ? '₺' : '$'}{item.price > 1 ? item.price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : item.price.toFixed(5)}
                                    </Text>
                                    <View style={[s.changeBadge, { backgroundColor: item.change >= 0 ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)' }]}>
                                        <Text style={[s.changeText, { color: item.change >= 0 ? '#34d399' : '#f87171' }]}>
                                            {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                                        </Text>
                                    </View>
                                </View>

                                <View style={s.scoreBox}>
                                    <View style={[s.scoreCirc, { borderColor: item.aiScore > 70 ? '#34d399' : item.aiScore > 50 ? '#22d3ee' : 'rgba(255,255,255,0.1)' }]}>
                                        <Text style={[s.scoreVal, { color: item.aiScore > 70 ? '#34d399' : item.aiScore > 50 ? '#22d3ee' : 'white' }]}>
                                            {Math.round(item.aiScore)}
                                        </Text>
                                    </View>
                                    <View style={[s.signalBadge, { backgroundColor: item.tag === 'buy' ? 'rgba(52,211,153,0.1)' : item.tag === 'sell' ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.05)' }]}>
                                        <Text style={[s.signalText, { color: item.tag === 'buy' ? '#34d399' : item.tag === 'sell' ? '#f87171' : 'rgba(255,255,255,0.4)' }]}>
                                            {item.signal}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                {/* Analysis Modal */}
                <Modal visible={!!selectedAsset} transparent animationType="fade">
                    <View style={s.modalOverlay}>
                        <Animated.View entering={SlideInUp} style={s.modalContent}>
                            <View style={s.modalHeader}>
                                <View style={s.modalTitleWrap}>
                                    <Bot size={20} color="#22d3ee" />
                                    <View>
                                        <Text style={s.modalSymbol}>{selectedAsset?.symbol}</Text>
                                        <Text style={s.modalSub}>AI Sinyal Analizi</Text>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={() => setSelectedAsset(null)} style={s.modalClose}>
                                    <X size={24} color="white" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
                                {analyzing ? (
                                    <View style={s.modalLoading}>
                                        <ActivityIndicator size="large" color="#22d3ee" />
                                        <Text style={s.loadingText}>Analiz Hazırlanıyor...</Text>
                                    </View>
                                ) : (
                                    <View>
                                        <View style={s.statsGrid}>
                                            <View style={s.statItem}>
                                                <Text style={s.statLabel}>RSI</Text>
                                                <Text style={s.statVal}>{selectedAsset?.rsi.toFixed(1)}</Text>
                                            </View>
                                            <View style={s.statItem}>
                                                <Text style={s.statLabel}>SKOR</Text>
                                                <Text style={[s.statVal, { color: '#22d3ee' }]}>{Math.round(selectedAsset?.aiScore)}</Text>
                                            </View>
                                            <View style={s.statItem}>
                                                <Text style={s.statLabel}>FİYAT</Text>
                                                <Text style={s.statVal}>${selectedAsset?.price}</Text>
                                            </View>
                                            <View style={s.statItem}>
                                                <Text style={s.statLabel}>MACD</Text>
                                                <Text style={s.statVal}>{selectedAsset?.macd?.toFixed(3) || '—'}</Text>
                                            </View>
                                        </View>

                                        <View style={s.analysisCard}>
                                            {analysis.split('\n').filter(l => l.trim()).map((line, i) => (
                                                <View key={i} style={s.analysisLine}>
                                                    <Text style={s.analysisText}>{line}</Text>
                                                </View>
                                            ))}
                                        </View>

                                        <View style={s.disclaimer}>
                                            <Info size={12} color="rgba(244,63,94,0.5)" />
                                            <Text style={s.disclaimerText}>Yatırım tavsiyesi içermez. AI tarafından üretilmiştir.</Text>
                                        </View>
                                    </View>
                                )}
                            </ScrollView>
                        </Animated.View>
                    </View>
                </Modal>
            </SafeAreaView>
        </View>
    );
};

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#060d1a' },
    safeArea: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16 },
    backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 24, fontWeight: '900', color: 'white', letterSpacing: -1, fontStyle: 'italic' },
    subTitle: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' },
    refreshBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(34,211,238,0.1)', alignItems: 'center', justifyContent: 'center' },

    tabsContainer: { marginBottom: 16 },
    tabsScroll: { paddingHorizontal: 20, gap: 12 },
    tab: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    activeTab: { backgroundColor: '#22d3ee' },
    tabText: { fontSize: 11, fontWeight: '900', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' },
    activeTabText: { color: '#060d1a' },

    searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', gap: 12, marginBottom: 16 },
    searchInput: { flex: 1, color: 'white', fontSize: 14, fontWeight: '700' },

    loadingBox: { paddingVertical: 100, alignItems: 'center' },
    loadingText: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '900', marginTop: 16, letterSpacing: 2 },

    list: { flex: 1, paddingHorizontal: 16 },
    row: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 24, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', gap: 16 },
    symbolInfo: { flex: 1.2 },
    symbolText: { fontSize: 16, fontWeight: '900', color: 'white' },
    marketLabel: { fontSize: 9, fontWeight: '900', color: 'rgba(255,255,255,0.3)', marginTop: 2 },
    priceInfo: { flex: 1.5, alignItems: 'flex-end' },
    priceText: { fontSize: 14, fontWeight: '800', color: 'white' },
    changeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
    changeText: { fontSize: 10, fontWeight: '900' },
    scoreBox: { flex: 1, alignItems: 'center', gap: 6 },
    scoreCirc: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    scoreVal: { fontSize: 11, fontWeight: '900' },
    signalBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    signalText: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
    modalContent: { height: height * 0.8, backgroundColor: '#060d1a', borderTopLeftRadius: 32, borderTopRightRadius: 32, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    modalTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    modalSymbol: { fontSize: 20, fontWeight: '900', color: 'white' },
    modalSub: { fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' },
    modalClose: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    modalBody: { flex: 1, padding: 24 },
    modalLoading: { paddingVertical: 100, alignItems: 'center' },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
    statItem: { flex: 1, minWidth: '45%', backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    statLabel: { fontSize: 9, fontWeight: '900', color: 'rgba(255,255,255,0.3)', marginBottom: 4 },
    statVal: { fontSize: 18, fontWeight: '900', color: 'white', fontStyle: 'italic' },
    analysisCard: { backgroundColor: 'rgba(34,211,238,0.05)', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(34,211,238,0.1)', marginBottom: 24 },
    analysisLine: { marginBottom: 12 },
    analysisText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 22 },
    disclaimer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: 0.5 },
    disclaimerText: { fontSize: 10, color: '#f43f5e', fontWeight: '800' }
});

export default AIScanner;
