import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    ActivityIndicator, Dimensions, RefreshControl, Alert,
    Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    TrendingUp, TrendingDown, Activity, BarChart3, Globe,
    Bitcoin, RefreshCw, Zap, ArrowLeft, ShieldCheck,
    AlertTriangle, LineChart, Cpu, DollarSign, Flame,
    ArrowUpRight, ChevronRight
} from 'lucide-react-native';
import { Config } from '@/constants/Config';
import { useRouter } from 'expo-router';
import { useAuth } from './_layout';
import Animated, { FadeInDown } from 'react-native-reanimated';

const AnalysisScreen = () => {
    const { user } = useAuth(); // Assume it returns toggling info as well or we fetch it
    const [predictions, setPredictions] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [tradeIdeas, setTradeIdeas] = useState<any[]>([]);
    const [marketAnalysis, setMarketAnalysis] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [predsRes, statsRes, ideasRes, analysisRes] = await Promise.allSettled([
                fetch(`${Config.API_BASE}${Config.ENDPOINTS.PREDICTIONS}`),
                fetch(`${Config.API_BASE}${Config.ENDPOINTS.MARKET_STATS}`),
                fetch(`${Config.API_BASE}${Config.ENDPOINTS.MARKET_IDEAS}`),
                fetch(`${Config.API_BASE}${Config.ENDPOINTS.MARKET_ANALYSIS}`)
            ]);

            if (predsRes.status === 'fulfilled') {
                const data = await predsRes.value.json();
                setPredictions(Array.isArray(data) ? data : []);
            }
            if (statsRes.status === 'fulfilled') {
                const data = await statsRes.value.json();
                setStats(data);
            }
            if (ideasRes.status === 'fulfilled') {
                const data = await ideasRes.value.json();
                setTradeIdeas(Array.isArray(data) ? data : []);
            }
            if (analysisRes.status === 'fulfilled') {
                const data = await analysisRes.value.json();
                setMarketAnalysis(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Analysis fetch error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchAll();
    };

    const getAIRec = () => {
        if (!stats) return null;
        const { vix, dxy } = stats.raw || {};
        const vixPrice = vix?.price ?? 18;
        const dxyChange = dxy?.change ?? 0;
        if (dxyChange > 0 && vixPrice > 20) return { title: 'Güvenli Liman', color: '#f59e0b', icon: <ShieldCheck size={24} color="#f59e0b" />, text: 'Altın ve kısa vadeli tahvil önceliklendir.' };
        if (dxyChange < 0 && vixPrice < 20) return { title: 'Agresif Risk Alımı', color: '#4ade80', icon: <Flame size={24} color="#4ade80" />, text: 'BTC ve Nasdaq\'ta pozisyon arttır.' };
        if (dxyChange > 0) return { title: 'Defansif', color: '#22d3ee', icon: <ShieldCheck size={24} color="#22d3ee" />, text: 'Nakit ve sabit getiri odaklı kal.' };
        return { title: 'Seçici Büyüme', color: '#a78bfa', icon: <LineChart size={24} color="#a78bfa" />, text: 'Majör hisseler ve küçük kripto ekleme dengeli.' };
    };

    const rec = getAIRec();

    const fmtChange = (v: any) => v != null ? `${v >= 0 ? '+' : ''}${parseFloat(v).toFixed(2)}%` : '–';
    const fmtPrice = (v: any) => v != null ? parseFloat(v).toFixed(2) : '–';

    if (loading && !refreshing) {
        return (
            <View style={s.loadingContainer}>
                <ActivityIndicator size="large" color="#22d3ee" />
                <Text style={s.loadingText}>PİYASA ANALİZ EDİLİYOR...</Text>
            </View>
        );
    }

    return (
        <View style={s.container}>
            <SafeAreaView style={s.safeArea} edges={['top']}>
                <View style={s.header}>
                    <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                        <ArrowLeft size={24} color="white" />
                    </TouchableOpacity>
                    <View style={s.headerTitleContainer}>
                        <Text style={s.headerTitle}>PİYASA ANALİZİ</Text>
                        <Text style={s.headerSubtitle}>Gerçek Zamanlı AI Verileri</Text>
                    </View>
                    <TouchableOpacity onPress={onRefresh} style={s.refreshBtn}>
                        <RefreshCw size={20} color="#22d3ee" className={refreshing ? 'animate-spin' : ''} />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={s.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22d3ee" />}
                >
                    {/* Indicators Grid */}
                    <View style={s.grid}>
                        <IndicatorCard
                            label="VIX KORKU"
                            value={fmtPrice(stats?.raw?.vix?.price)}
                            change={fmtChange(stats?.raw?.vix?.change)}
                            up={(stats?.raw?.vix?.change ?? 0) >= 0}
                            icon={<Activity size={20} color="#22d3ee" />}
                        />
                        <IndicatorCard
                            label="DXY DOLAR"
                            value={fmtPrice(stats?.raw?.dxy?.price)}
                            change={fmtChange(stats?.raw?.dxy?.change)}
                            up={(stats?.raw?.dxy?.change ?? 0) >= 0}
                            icon={<Globe size={20} color="#60a5fa" />}
                        />
                        <IndicatorCard
                            label="BITCOIN"
                            value={stats?.raw?.btc?.price != null ? `$${stats.raw.btc.price.toLocaleString()}` : '–'}
                            change={fmtChange(stats?.raw?.btc?.change)}
                            up={(stats?.raw?.btc?.change ?? 0) >= 0}
                            icon={<Bitcoin size={20} color="#f59e0b" />}
                        />
                        <IndicatorCard
                            label="S&P 500"
                            value={fmtPrice(stats?.raw?.sp500?.price)}
                            change={fmtChange(stats?.raw?.sp500?.change)}
                            up={(stats?.raw?.sp500?.change ?? 0) >= 0}
                            icon={<BarChart3 size={20} color="#34d399" />}
                        />
                    </View>

                    {/* AI Recommendation */}
                    {rec && (
                        <Animated.View entering={FadeInDown.delay(100)} style={s.recCard}>
                            <View style={s.recHeader}>
                                <View style={[s.recIconWrap, { backgroundColor: `${rec.color}20`, borderColor: `${rec.color}40` }]}>
                                    {rec.icon}
                                </View>
                                <View style={s.recTitleWrap}>
                                    <Text style={s.recLabel}>AI STRATEJİSİ</Text>
                                    <Text style={s.recTitle}>{rec.title}</Text>
                                </View>
                                <View style={[s.recBadge, { backgroundColor: `${rec.color}15`, borderColor: `${rec.color}40` }]}>
                                    <Text style={[s.recBadgeText, { color: rec.color }]}>{stats?.sentiment?.trend || 'STABİL'}</Text>
                                </View>
                            </View>
                            <Text style={s.recText}>"{rec.text}"</Text>
                        </Animated.View>
                    )}

                    {/* Trade Ideas */}
                    <View style={s.sectionHeader}>
                        <Cpu size={18} color="#f59e0b" />
                        <Text style={s.sectionTitle}>AI TRADE IDEAS</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.ideasScroll}>
                        {tradeIdeas.length > 0 ? tradeIdeas.map((idea, i) => (
                            <TradeIdeaCard key={i} data={idea} />
                        )) : (
                            <View style={s.emptyBox}>
                                <Text style={s.emptyText}>Henüz fikir üretilmedi.</Text>
                            </View>
                        )}
                    </ScrollView>

                    {/* Market Analysis / News */}
                    <View style={s.sectionHeader}>
                        <Globe size={18} color="#60a5fa" />
                        <Text style={s.sectionTitle}>KÜRESEL ANALİZLER</Text>
                    </View>
                    <View style={s.analysisList}>
                        {marketAnalysis.map((item, i) => (
                            <TouchableOpacity
                                key={i}
                                style={s.analysisCard}
                                onPress={() => item.link && Linking.openURL(item.link)}
                            >
                                <View style={s.analysisTop}>
                                    <Text style={s.analysisSource}>{item.source}</Text>
                                    <ArrowUpRight size={14} color="#60a5fa" />
                                </View>
                                <Text style={{ color: 'white', fontSize: 16, fontWeight: '700', marginBottom: 12 }}>{item.title}</Text>
                                <View style={s.analysisBottom}>
                                    <Text style={s.analysisAuthor}>By {item.author}</Text>
                                    <View style={s.analysisTag}>
                                        <Text style={s.analysisTagText}>RAPOR</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const IndicatorCard = ({ label, value, change, up, icon }: any) => (
    <View style={s.indicatorCard}>
        <View style={s.indicatorTop}>
            <View style={s.indicatorIcon}>{icon}</View>
            <View style={[s.trendBadge, { backgroundColor: up ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)' }]}>
                <Text style={[s.trendText, { color: up ? '#34d399' : '#f87171' }]}>{change}</Text>
            </View>
        </View>
        <Text style={s.indicatorLabel}>{label}</Text>
        <Text style={s.indicatorValue}>{value}</Text>
    </View>
);

const TradeIdeaCard = ({ data }: any) => {
    const isBull = data.sentiment !== 'Bearish';
    return (
        <View style={s.ideaCard}>
            <View style={s.ideaHead}>
                <Text style={s.ideaSymbol}>{data.symbol}</Text>
                <View style={[s.ideaBadge, { backgroundColor: isBull ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)' }]}>
                    <Text style={[s.ideaBadgeText, { color: isBull ? '#34d399' : '#f87171' }]}>{isBull ? 'AL' : 'SAT'}</Text>
                </View>
            </View>
            <Text style={s.ideaReturn}>{data.return >= 0 ? '+' : ''}{data.return}% Beklenti</Text>
            <View style={s.ideaPrices}>
                <View>
                    <Text style={s.priceLabel}>GİRİŞ</Text>
                    <Text style={s.priceVal}>${data.entry}</Text>
                </View>
                <View>
                    <Text style={s.priceLabel}>HEDEF</Text>
                    <Text style={s.priceVal}>${data.exitPrice}</Text>
                </View>
            </View>
        </View>
    );
};

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#060d1a' },
    loadingContainer: { flex: 1, backgroundColor: '#060d1a', justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '900', marginTop: 16, letterSpacing: 2 },
    safeArea: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    headerTitleContainer: { flex: 1 },
    headerTitle: { fontSize: 24, fontWeight: '900', color: 'white', letterSpacing: -1, fontStyle: 'italic' },
    headerSubtitle: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' },
    refreshBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(34,211,238,0.1)', alignItems: 'center', justifyContent: 'center' },

    scrollContent: { padding: 20 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
    indicatorCard: { width: '48%', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    indicatorTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    indicatorIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    trendBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    trendText: { fontSize: 10, fontWeight: '900' },
    indicatorLabel: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' },
    indicatorValue: { fontSize: 18, fontWeight: '900', color: 'white', marginTop: 2 },

    recCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 28, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 32 },
    recHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    recIconWrap: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    recTitleWrap: { flex: 1 },
    recLabel: { fontSize: 8, fontWeight: '900', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 2 },
    recTitle: { fontSize: 20, fontWeight: '900', color: 'white', fontStyle: 'italic' },
    recBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
    recBadgeText: { fontSize: 9, fontWeight: '900' },
    recText: { fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 22, fontStyle: 'italic' },

    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    sectionTitle: { fontSize: 14, fontWeight: '900', color: 'white', opacity: 0.3, letterSpacing: 2 },
    ideasScroll: { marginBottom: 32, marginHorizontal: -20, paddingHorizontal: 20 },
    ideaCard: { width: 180, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 16, borderLeftWidth: 3, borderLeftColor: '#f59e0b', marginRight: 16 },
    ideaHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    ideaSymbol: { fontSize: 16, fontWeight: '900', color: 'white' },
    ideaBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    ideaBadgeText: { fontSize: 10, fontWeight: '900' },
    ideaReturn: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginBottom: 12 },
    ideaPrices: { flexDirection: 'row', justifyContent: 'space-between' },
    priceLabel: { fontSize: 8, fontWeight: '800', color: 'rgba(255,255,255,0.3)' },
    priceVal: { fontSize: 11, fontWeight: '700', color: 'white' },

    analysisList: { gap: 16 },
    analysisCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    analysisTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    analysisSource: { fontSize: 10, fontWeight: '900', color: '#60a5fa', textTransform: 'uppercase' },
    analysisBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    analysisAuthor: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
    analysisTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    analysisTagText: { fontSize: 8, fontWeight: '900', color: 'rgba(255,255,255,0.3)' },

    emptyBox: { width: 200, padding: 20, alignItems: 'center' },
    emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 12, fontStyle: 'italic' }
});

export default AnalysisScreen;
