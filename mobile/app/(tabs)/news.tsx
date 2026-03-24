import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
    RefreshControl, StyleSheet, Linking, Modal, Dimensions,
    TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    Newspaper, ExternalLink, Calendar, Zap, Clock,
    TrendingUp, TrendingDown, ArrowRight, X, Sparkles
} from 'lucide-react-native';
import { Config } from '@/constants/Config';
import Animated, { FadeIn, FadeInDown, SlideInUp } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface ImpactItem {
    asset: string;
    score: number;
    direction: 'POSITIVE' | 'NEGATIVE';
}

interface NewsItem {
    title: string;
    link: string;
    pubDate: string;
    contentSnippet?: string;
    sourceName?: string;
    importanceScore?: number;
    impacts?: ImpactItem[];
}

const NewsScreen = () => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [sentimentData, setSentimentData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [timeframe, setTimeframe] = useState(7);
    const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
    const [activeSource, setActiveSource] = useState('Tümü');
    const [sources, setSources] = useState(['Tümü']);

    // Article Reader State
    const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);
    const [articleContent, setArticleContent] = useState('');
    const [articleLoading, setArticleLoading] = useState(false);

    const timeframes = [
        { label: 'Bugün', value: 1 },
        { label: '3 Gün', value: 3 },
        { label: '7 Gün', value: 7 },
        { label: '1 Ay', value: 30 }
    ];

    const fetchAll = async () => {
        try {
            const [newsRes, sentimentRes] = await Promise.allSettled([
                fetch(`${Config.API_BASE}${Config.ENDPOINTS.MARKET_NEWS}?lang=TR&days=${timeframe}`),
                fetch(`${Config.API_BASE}${Config.ENDPOINTS.NEWS_SENTIMENT}?days=${timeframe}`)
            ]);

            if (newsRes.status === 'fulfilled') {
                const data = await newsRes.value.json();
                setNews(Array.isArray(data) ? data : []);
                const uniqueSources = ['Tümü', ...new Set(data.map((item: any) => item.sourceName || 'Diğer'))];
                setSources(uniqueSources as string[]);
            }

            if (sentimentRes.status === 'fulfilled') {
                const data = await sentimentRes.value.json();
                setSentimentData(Array.isArray(data) ? data.sort((a, b) => b.averageScore - a.averageScore) : []);
            }
        } catch (error) {
            console.error('News fetch error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, [timeframe]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchAll();
    };

    const handleReadArticle = async (item: NewsItem) => {
        setSelectedArticle(item);
        setArticleContent('');
        setArticleLoading(true);
        try {
            const params = new URLSearchParams({
                url: item.link,
                lang: 'TR',
                title: item.title || '',
                snippet: item.contentSnippet || ''
            });
            const res = await fetch(`${Config.API_BASE}${Config.ENDPOINTS.READ_ARTICLE}?${params.toString()}`);
            const data = await res.json();
            setArticleContent(data.content || 'İçerik okunamadı.');
        } catch (e) {
            setArticleContent('Makale içeriği şu an yüklenemiyor.');
        } finally {
            setArticleLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        } catch {
            return dateStr;
        }
    };

    let filteredNews = activeSource === 'Tümü' ? news : news.filter(n => (n.sourceName || 'Diğer') === activeSource);
    if (selectedSymbol) {
        filteredNews = filteredNews.filter(n => n.impacts?.some(imp => imp.asset === selectedSymbol));
    }

    const getColor = (score: number) => {
        if (score >= 40) return { bg: 'rgba(52,211,153,0.1)', text: '#34d399', border: 'rgba(52,211,153,0.2)' };
        if (score >= 10) return { bg: 'rgba(52,211,153,0.05)', text: '#34d399aa', border: 'rgba(52,211,153,0.1)' };
        if (score <= -40) return { bg: 'rgba(248,113,113,0.1)', text: '#f87171', border: 'rgba(248,113,113,0.2)' };
        if (score <= -10) return { bg: 'rgba(248,113,113,0.05)', text: '#f87171aa', border: 'rgba(248,113,113,0.1)' };
        return { bg: 'rgba(245,158,11,0.1)', text: '#f59e0b', border: 'rgba(245,158,11,0.2)' };
    };

    return (
        <View style={s.container}>
            <SafeAreaView style={s.safeArea} edges={['top']}>
                <View style={s.header}>
                    <View>
                        <Text style={s.headerTitle}>HABERLER</Text>
                        <Text style={s.subTitle}>Yapay Zeka Destekli Bülten</Text>
                    </View>
                    <TouchableOpacity onPress={onRefresh} style={s.refreshBtn}>
                        <Zap size={20} color="#22d3ee" className={refreshing ? 'animate-spin' : ''} />
                    </TouchableOpacity>
                </View>

                {/* Sentiment Heatmap Chips */}
                <View style={s.heatmapContainer}>
                    <View style={s.sectionLabel}>
                        <TrendingUp size={12} color="rgba(255,255,255,0.4)" />
                        <Text style={s.sectionLabelText}>DUYARLILIK ISI HARİTASI</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.heatmapScroll}>
                        {sentimentData.map((item, i) => {
                            const c = getColor(item.averageScore);
                            const isActive = selectedSymbol === item.asset;
                            return (
                                <TouchableOpacity
                                    key={i}
                                    onPress={() => setSelectedSymbol(isActive ? null : item.asset)}
                                    style={[
                                        s.heatmapChip,
                                        { backgroundColor: c.bg, borderColor: isActive ? '#22d3ee' : c.border },
                                        isActive && s.activeChip
                                    ]}
                                >
                                    <Text style={[s.chipAsset, { color: c.text }]}>{item.asset}</Text>
                                    <Text style={[s.chipScore, { color: c.text }]}>{item.averageScore > 0 ? '+' : ''}{item.averageScore}%</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Filters */}
                <View style={s.filterContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
                        {timeframes.map((tf) => (
                            <TouchableOpacity
                                key={tf.value}
                                onPress={() => { setTimeframe(tf.value); setLoading(true); }}
                                style={[s.filterBtn, timeframe === tf.value && s.activeFilterBtn]}
                            >
                                <Text style={[s.filterText, timeframe === tf.value && s.activeFilterText]}>{tf.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
                        {sources.map((src) => (
                            <TouchableOpacity
                                key={src}
                                onPress={() => setActiveSource(src)}
                                style={[s.sourceBtn, activeSource === src && s.activeSourceBtn]}
                            >
                                <Text style={[s.sourceText, activeSource === src && s.activeSourceText]}>{src}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {loading && !refreshing ? (
                    <View style={s.loadingBox}>
                        <ActivityIndicator size="large" color="#22d3ee" />
                        <Text style={s.loadingText}>HABERLER YÜKLENİYOR...</Text>
                    </View>
                ) : (
                    <ScrollView
                        style={s.scrollView}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22d3ee" />}
                        showsVerticalScrollIndicator={false}
                    >
                        {selectedSymbol && (
                            <View style={s.filterAlert}>
                                <Zap size={14} color="#22d3ee" />
                                <Text style={s.filterAlertText}>{selectedSymbol.toUpperCase()} Analizi Filtrelendi</Text>
                                <TouchableOpacity onPress={() => setSelectedSymbol(null)} style={s.clearBtn}>
                                    <Text style={s.clearBtnText}>X</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {filteredNews.length === 0 ? (
                            <View style={s.emptyBox}>
                                <Newspaper size={48} color="rgba(255,255,255,0.05)" />
                                <Text style={s.emptyText}>Haber bulunamadı.</Text>
                            </View>
                        ) : (
                            filteredNews.map((item, index) => (
                                <NewsCard key={index} item={item} onRead={handleReadArticle} formatDate={formatDate} />
                            ))
                        )}
                        <View style={{ height: 100 }} />
                    </ScrollView>
                )}

                {/* Article Reader Modal */}
                <Modal visible={!!selectedArticle} transparent animationType="fade">
                    <View style={s.modalOverlay}>
                        <Animated.View entering={SlideInUp} style={s.modalContent}>
                            <View style={s.modalHeader}>
                                <View style={s.modalHeaderLeft}>
                                    <Sparkles size={20} color="#22d3ee" />
                                    <View>
                                        <Text style={s.modalSource}>{selectedArticle?.sourceName}</Text>
                                        <Text style={s.modalStatus}>{articleLoading ? 'AI Analiz Ediyor...' : 'Özet Hazır'}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={() => setSelectedArticle(null)} style={s.modalClose}>
                                    <X size={24} color="white" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
                                <Text style={s.modalTitle}>{selectedArticle?.title}</Text>
                                {articleLoading ? (
                                    <View style={s.modalLoading}>
                                        <ActivityIndicator size="large" color="#22d3ee" />
                                        <Text style={s.modalLoadingText}>Yapay zeka makaleyi okuyor ve analiz ediyor...</Text>
                                    </View>
                                ) : (
                                    <Text style={s.modalText}>{articleContent}</Text>
                                )}
                            </ScrollView>

                            <View style={s.modalFooter}>
                                <TouchableOpacity
                                    style={s.sourceLink}
                                    onPress={() => selectedArticle?.link && Linking.openURL(selectedArticle.link)}
                                >
                                    <Text style={s.sourceLinkText}>Kaynağa Git</Text>
                                    <ExternalLink size={14} color="#22d3ee" />
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    </View>
                </Modal>
            </SafeAreaView>
        </View>
    );
};

const NewsCard = ({ item, onRead, formatDate }: any) => (
    <TouchableOpacity onPress={() => onRead(item)} style={s.newsCard}>
        <View style={s.cardTop}>
            <View style={s.cardSourceWrap}>
                <View style={s.cardSourceBadge}>
                    <Text style={s.cardSource}>{item.sourceName || 'Piyasa'}</Text>
                </View>
                <View style={s.cardDateWrap}>
                    <Calendar size={10} color="rgba(255,255,255,0.4)" />
                    <Text style={s.cardDate}>{formatDate(item.pubDate)}</Text>
                </View>
            </View>
            <View style={[s.impBadge, { borderColor: item.importanceScore >= 80 ? '#f43f5e33' : '#22d3ee33' }]}>
                <View style={[s.impDot, { backgroundColor: item.importanceScore >= 80 ? '#f43f5e' : '#22d3ee' }]} />
                <Text style={[s.impText, { color: item.importanceScore >= 80 ? '#f43f5e' : '#22d3ee' }]}>ÖNEM: {item.importanceScore}</Text>
            </View>
        </View>

        <Text style={s.newsTitleText}>{item.title}</Text>
        <Text style={s.newsSnippetText} numberOfLines={2}>{item.contentSnippet}</Text>

        {item.impacts && item.impacts.length > 0 && (
            <View style={s.impactWrap}>
                {item.impacts.map((imp: any, i: number) => (
                    <View key={i} style={[s.impactBadge, { backgroundColor: imp.direction === 'POSITIVE' ? 'rgba(52,211,153,0.1)' : 'rgba(244,63,94,0.1)' }]}>
                        <Text style={[s.impactAsset, { color: imp.direction === 'POSITIVE' ? '#34d399' : '#f43f5e' }]}>{imp.asset}</Text>
                        <Text style={[s.impactScore, { color: imp.direction === 'POSITIVE' ? '#34d399' : '#f43f5e' }]}>{imp.direction === 'POSITIVE' ? '+' : '-'}{imp.score}</Text>
                    </View>
                ))}
            </View>
        )}

        <View style={s.cardBottom}>
            <Text style={s.aiReaderText}>YAPAY ZEKA OKUYUCU</Text>
            <ArrowRight size={14} color="#22d3ee" />
        </View>
    </TouchableOpacity>
);

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#060d1a' },
    safeArea: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    headerTitle: { fontSize: 28, fontWeight: '900', color: 'white', letterSpacing: -1, fontStyle: 'italic' },
    subTitle: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' },
    refreshBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(34,211,238,0.1)', alignItems: 'center', justifyContent: 'center' },

    heatmapContainer: { marginBottom: 20, paddingLeft: 20 },
    sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    sectionLabelText: { fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.3)', letterSpacing: 1 },
    heatmapScroll: { paddingRight: 20, gap: 10 },
    heatmapChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1, gap: 8 },
    activeChip: { backgroundColor: 'rgba(34,211,238,0.15)' },
    chipAsset: { fontSize: 13, fontWeight: '900' },
    chipScore: { fontSize: 11, fontWeight: '700' },

    filterContainer: { marginBottom: 16, gap: 12 },
    filterScroll: { paddingHorizontal: 16, gap: 10 },
    filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    activeFilterBtn: { backgroundColor: '#22d3ee', borderColor: '#22d3ee' },
    filterText: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
    activeFilterText: { color: '#060d1a' },

    sourceBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    activeSourceBtn: { borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)' },
    sourceText: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800' },
    activeSourceText: { color: '#f59e0b' },

    loadingBox: { paddingVertical: 100, alignItems: 'center' },
    loadingText: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '900', marginTop: 16, letterSpacing: 2 },
    scrollView: { flex: 1, paddingHorizontal: 16 },

    filterAlert: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(34,211,238,0.1)', padding: 12, borderRadius: 16, marginBottom: 16, gap: 10 },
    filterAlertText: { flex: 1, color: '#22d3ee', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
    clearBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(34,211,238,0.2)', alignItems: 'center', justifyContent: 'center' },
    clearBtnText: { color: '#22d3ee', fontSize: 10, fontWeight: '900' },

    newsCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 28, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
    cardSourceWrap: { gap: 4 },
    cardSourceBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(34,211,238,0.1)' },
    cardSource: { color: '#22d3ee', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
    cardDateWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    cardDate: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700' },
    impBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', gap: 6 },
    impDot: { width: 6, height: 6, borderRadius: 3 },
    impText: { fontSize: 9, fontWeight: '900' },

    newsTitleText: { fontSize: 17, fontWeight: '800', color: 'white', lineHeight: 24, marginBottom: 10 },
    newsSnippetText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 20, marginBottom: 16 },

    impactWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    impactBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
    impactAsset: { fontSize: 11, fontWeight: '900' },
    impactScore: { fontSize: 11, fontWeight: '700' },

    cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    aiReaderText: { fontSize: 10, fontWeight: '900', color: '#22d3ee', letterSpacing: 1 },

    emptyBox: { alignItems: 'center', paddingTop: 100, opacity: 0.5 },
    emptyText: { color: 'white', fontSize: 14, fontWeight: '700', marginTop: 16 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
    modalContent: { height: height * 0.85, backgroundColor: '#060d1a', borderTopLeftRadius: 32, borderTopRightRadius: 32, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    modalSource: { fontSize: 10, fontWeight: '900', color: '#22d3ee', textTransform: 'uppercase', letterSpacing: 1 },
    modalStatus: { fontSize: 16, fontWeight: '800', color: 'white' },
    modalClose: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    modalBody: { flex: 1, padding: 24 },
    modalTitle: { fontSize: 24, fontWeight: '900', color: 'white', marginBottom: 24, fontStyle: 'italic' },
    modalLoading: { paddingVertical: 100, alignItems: 'center' },
    modalLoadingText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', marginTop: 16 },
    modalText: { fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 26 },
    modalFooter: { padding: 24, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    sourceLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 16, backgroundColor: 'rgba(34,211,238,0.1)' },
    sourceLinkText: { color: '#22d3ee', fontSize: 14, fontWeight: '900', textTransform: 'uppercase' }
});

export default NewsScreen;
