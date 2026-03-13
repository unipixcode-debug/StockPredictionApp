import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Newspaper, ExternalLink, Calendar, Zap } from 'lucide-react-native';
import { Config } from '@/constants/Config';

interface NewsItem {
    title: string;
    link: string;
    pubDate: string;
    contentSnippet?: string;
    sourceName?: string;
    importanceScore?: number;
}

const NewsScreen = () => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNews = async () => {
        try {
            const response = await fetch(`${Config.API_BASE}${Config.ENDPOINTS.MARKET_NEWS}?lang=TR`);
            const data = await response.json();
            setNews(data);
        } catch (error) {
            console.error('Fetch error:', error);
            // Fallback
            setNews([
                {
                    title: "Küresel Piyasalar Enflasyon Verisine Odaklandı",
                    contentSnippet: "Yatırımcılar, kritik enflasyon verisi öncesinde temkinli bekleyişini sürdürüyor.",
                    pubDate: new Date().toISOString(),
                    link: "https://www.google.com",
                    sourceName: 'System',
                    importanceScore: 85
                }
            ]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchNews();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchNews();
    };

    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch {
            return dateStr;
        }
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
                    <Text style={styles.headerTitle}>Haberler</Text>
                    <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
                        <Zap size={20} color="#22d3ee" />
                    </TouchableOpacity>
                </View>

                <ScrollView 
                    style={styles.scrollView}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22d3ee" />}
                >
                    {news.map((item, index) => (
                        <TouchableOpacity 
                            key={index} 
                            style={styles.newsCard}
                            onPress={() => Linking.openURL(item.link)}
                        >
                            <View style={styles.cardHeader}>
                                <View style={styles.sourceContainer}>
                                    <View style={styles.sourceBadge}>
                                        <Text style={styles.sourceText}>{item.sourceName || 'Piyasa'}</Text>
                                    </View>
                                    <View style={styles.dateRow}>
                                        <Calendar size={10} color="rgba(255,255,255,0.4)" />
                                        <Text style={styles.dateText}>{formatDate(item.pubDate)}</Text>
                                    </View>
                                </View>
                                
                                {item.importanceScore && (
                                    <View style={[
                                        styles.scoreBadge,
                                        { backgroundColor: item.importanceScore >= 80 ? 'rgba(244, 63, 94, 0.1)' : 'rgba(34, 211, 238, 0.1)' },
                                        { borderColor: item.importanceScore >= 80 ? 'rgba(244, 63, 94, 0.3)' : 'rgba(34, 211, 238, 0.3)' }
                                    ]}>
                                        <View style={[
                                            styles.scoreDot,
                                            { backgroundColor: item.importanceScore >= 80 ? '#f43f5e' : '#22d3ee' }
                                        ]} />
                                        <Text style={[
                                            styles.scoreText,
                                            { color: item.importanceScore >= 80 ? '#f43f5e' : '#22d3ee' }
                                        ]}>ÖNEM: {item.importanceScore}</Text>
                                    </View>
                                )}
                            </View>

                            <Text style={styles.newsTitle}>{item.title}</Text>
                            {item.contentSnippet && (
                                <Text style={styles.newsSnippet} numberOfLines={2}>{item.contentSnippet}</Text>
                            )}

                            <View style={styles.cardFooter}>
                                <Text style={styles.readMore}>Haberin Devamı</Text>
                                <ExternalLink size={14} color="#22d3ee" />
                            </View>
                        </TouchableOpacity>
                    ))}
                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#060d1a' },
    safeArea: { flex: 1 },
    loadingContainer: { flex: 1, backgroundColor: '#060d1a', justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
    headerTitle: { fontSize: 28, fontWeight: '900', color: 'white', letterSpacing: -0.5 },
    refreshBtn: { width: 44, height: 44, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    scrollView: { flex: 1, paddingHorizontal: 16 },
    newsCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    sourceContainer: { gap: 6 },
    sourceBadge: { backgroundColor: 'rgba(34, 211, 238, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
    sourceText: { color: '#22d3ee', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dateText: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '600' },
    scoreBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed' },
    scoreDot: { width: 6, height: 6, borderRadius: 3 },
    scoreText: { fontSize: 10, fontWeight: '900' },
    newsTitle: { fontSize: 18, fontWeight: '800', color: 'white', lineHeight: 24, marginBottom: 8 },
    newsSnippet: { fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 20, marginBottom: 14 },
    cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    readMore: { fontSize: 11, fontWeight: '800', color: '#22d3ee', textTransform: 'uppercase', letterSpacing: 0.5 },
});

export default NewsScreen;
