import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
    StyleSheet, Alert, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import {
    Bot, RefreshCw, Trash2, TrendingUp, TrendingDown,
    Activity, Zap, ShieldCheck, ChevronRight, AlertTriangle
} from 'lucide-react-native';
import { Config } from '@/constants/Config';

const API_BASE = `${Config.API_BASE}${Config.ENDPOINTS.AI_PORTFOLIO}`;

interface Asset {
    symbol: string;
    allocation: number;
    aiScore: number;
    entryPrice: number;
    targetPrice: number;
    stopLoss: number;
    quantity: number;
}

interface Portfolio {
    id: string;
    initialValue: number;
    rationale: string;
    assets: Asset[] | string;
    createdAt: string;
}

const AIPortfolioScreen = () => {
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const [activePortfolio, setActivePortfolio] = useState<Portfolio | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await fetch(API_BASE);
            const data = await response.json();
            setPortfolios(data);
            if (data.length > 0) {
                let active = data[0];
                if (typeof active.assets === 'string') {
                    try { active.assets = JSON.parse(active.assets); } catch (e) { active.assets = []; }
                }
                setActivePortfolio(active);
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const response = await fetch(API_BASE, { method: 'POST' });
            if (!response.ok) throw new Error('Generation failed');
            await fetchData();
        } catch (error) {
            Alert.alert('Hata', 'Portföy oluşturulamadı.');
        } finally {
            setGenerating(false);
        }
    };

    const handleDelete = async (id: string) => {
        Alert.alert(
            'Onay',
            'Bu portföyü silmek istediğinize emin misiniz?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
                            setActivePortfolio(null);
                            fetchData();
                        } catch (error) {
                            Alert.alert('Hata', 'Silme işlemi başarısız.');
                        }
                    }
                }
            ]
        );
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) {
        return (
            <View style={s.fallback}>
                <ActivityIndicator size="large" color="#22d3ee" />
                <Text style={s.loadingText}>Analizler Hazırlanıyor...</Text>
            </View>
        );
    }

    return (
        <View style={s.root}>
            <SafeAreaView style={s.safe}>
                <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View style={s.header}>
                        <View>
                            <View style={s.headerTitleRow}>
                                <Zap size={24} color="#22d3ee" fill="#22d3ee" />
                                <Text style={s.headerTitle}>AI PORTFÖY</Text>
                            </View>
                            <Text style={s.headerSub}>Global Veriyle Optimize Strateji</Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleGenerate}
                            disabled={generating}
                            style={[s.genBtn, generating && { opacity: 0.6 }]}
                        >
                            <RefreshCw size={18} color="#0f172a" strokeWidth={3} className={generating ? 'animate-spin' : ''} />
                        </TouchableOpacity>
                    </View>

                    {!activePortfolio ? (
                        <View style={s.emptyBox}>
                            <Bot size={64} color="rgba(255,255,255,0.1)" />
                            <Text style={s.emptyTitle}>Strateji Mevcut Değil</Text>
                            <Text style={s.emptyText}>Yapay zekanın sizin için en yüksek puanlı varlıkları seçmesi için yeni analiz başlatın.</Text>
                            <TouchableOpacity onPress={handleGenerate} style={s.emptyBtn}>
                                <Text style={s.emptyBtnText}>ANALİZE BAŞLA</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={s.content}>
                            {/* Summary Card */}
                            <Animated.View entering={FadeInDown} style={s.summaryCard}>
                                <View style={s.summaryTop}>
                                    <View>
                                        <Text style={s.summaryLabel}>Mevcut Değer</Text>
                                        <Text style={s.summaryValue}>$100.00</Text>
                                    </View>
                                    <View style={s.pnlBadge}>
                                        <TrendingUp size={16} color="#4ade80" />
                                        <Text style={s.pnlText}>+0.00%</Text>
                                    </View>
                                </View>
                                <View style={s.rationaleBox}>
                                    <View style={s.rationaleHeader}>
                                        <Bot size={14} color="#22d3ee" />
                                        <Text style={s.rationaleTitle}>AI STRATEJİ ÖZETİ</Text>
                                        <TouchableOpacity onPress={() => handleDelete(activePortfolio.id)}>
                                            <Trash2 size={14} color="#f87171" />
                                        </TouchableOpacity>
                                    </View>
                                    <Text style={s.rationaleText}>"{activePortfolio.rationale}"</Text>
                                </View>
                            </Animated.View>

                            {/* Assets List */}
                            <Text style={s.sectionTitle}>VARLIK DAĞILIMI</Text>
                            {(activePortfolio.assets as Asset[]).map((asset, i) => (
                                <Animated.View
                                    key={asset.symbol}
                                    entering={FadeInDown.delay(100 + i * 50)}
                                    style={s.assetCard}
                                >
                                    <View style={s.assetHead}>
                                        <View style={s.assetSymbolBox}>
                                            <Text style={s.assetSymbol}>{asset.symbol}</Text>
                                            <Text style={s.assetAllocation}>%{asset.allocation} Pay</Text>
                                        </View>
                                        <View style={s.scoreBox}>
                                            <Text style={s.scoreLabel}>AI SCORE</Text>
                                            <Text style={s.scoreValue}>{Math.round(asset.aiScore)}</Text>
                                        </View>
                                    </View>

                                    <View style={s.priceGrid}>
                                        <View style={s.priceItem}>
                                            <Text style={s.priceLabel}>GİRİŞ</Text>
                                            <Text style={s.priceValueText}>
                                                ${asset.entryPrice > 1 ? asset.entryPrice.toFixed(2) : asset.entryPrice.toFixed(4)}
                                            </Text>
                                        </View>
                                        <View style={[s.priceItem, { borderColor: 'rgba(74,222,128,0.2)' }]}>
                                            <Text style={[s.priceLabel, { color: '#4ade80' }]}>HEDEF</Text>
                                            <Text style={[s.priceValueText, { color: '#4ade80' }]}>
                                                ${asset.targetPrice > 1 ? asset.targetPrice.toFixed(2) : asset.targetPrice.toFixed(4)}
                                            </Text>
                                        </View>
                                        <View style={[s.priceItem, { borderColor: 'rgba(248,113,113,0.2)' }]}>
                                            <Text style={[s.priceLabel, { color: '#f87171' }]}>STOP</Text>
                                            <Text style={[s.priceValueText, { color: '#f87171' }]}>
                                                ${asset.stopLoss > 1 ? asset.stopLoss.toFixed(2) : asset.stopLoss.toFixed(4)}
                                            </Text>
                                        </View>
                                    </View>
                                </Animated.View>
                            ))}

                            {/* Disclaimer */}
                            <View style={s.disclaimer}>
                                <AlertTriangle size={16} color="rgba(255,255,255,0.2)" />
                                <Text style={s.disclaimerText}>
                                    YASAL UYARI: AI Portföy verileri yatırım tavsiyesi değildir. Simüle edilmiş değerlerdir.
                                </Text>
                            </View>
                        </View>
                    )}
                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#060d1a' },
    safe: { flex: 1 },
    scroll: { flex: 1, paddingHorizontal: 20 },
    fallback: { flex: 1, backgroundColor: '#060d1a', alignItems: 'center', justifyContent: 'center', gap: 16 },
    loadingText: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '800', textTransform: 'uppercase' },
    
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 24 },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerTitle: { fontSize: 24, fontWeight: '900', color: 'white', letterSpacing: -1, fontStyle: 'italic' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginTop: 4 },
    genBtn: { width: 44, height: 44, backgroundColor: '#22d3ee', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

    emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60, padding: 40, borderStyle: 'dotted', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 32 },
    emptyTitle: { fontSize: 18, fontWeight: '900', color: 'white', marginTop: 20, fontStyle: 'italic' },
    emptyText: { fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 12, lineHeight: 22 },
    emptyBtn: { backgroundColor: '#22d3ee', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 16, marginTop: 30 },
    emptyBtnText: { color: '#0f172a', fontWeight: '900', fontSize: 12, letterSpacing: 1 },

    content: { gap: 24 },
    summaryCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 28, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    summaryLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 },
    summaryValue: { fontSize: 32, fontWeight: '900', color: 'white', letterSpacing: -1, fontStyle: 'italic' },
    pnlBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(74,222,128,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    pnlText: { color: '#4ade80', fontSize: 13, fontWeight: '900' },
    
    rationaleBox: { backgroundColor: 'rgba(34,211,238,0.05)', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(34,211,238,0.1)' },
    rationaleHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    rationaleTitle: { fontSize: 10, fontWeight: '900', color: '#22d3ee', flex: 1 },
    rationaleText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 20, fontStyle: 'italic' },

    sectionTitle: { fontSize: 14, fontWeight: '900', color: 'white', opacity: 0.3, letterSpacing: 2 },
    assetCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    assetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    assetSymbolBox: { gap: 2 },
    assetSymbol: { fontSize: 18, fontWeight: '900', color: 'white' },
    assetAllocation: { fontSize: 10, fontWeight: '800', color: '#22d3ee' },
    scoreBox: { alignItems: 'flex-end', gap: 2 },
    scoreLabel: { fontSize: 8, fontWeight: '800', color: 'rgba(255,255,255,0.3)' },
    scoreValue: { fontSize: 16, fontWeight: '900', color: '#4ade80' },

    priceGrid: { flexDirection: 'row', gap: 10 },
    priceItem: { flex: 1, padding: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    priceLabel: { fontSize: 8, fontWeight: '900', color: 'rgba(255,255,255,0.3)', marginBottom: 4 },
    priceValueText: { fontSize: 11, fontWeight: '800', color: 'white' },

    disclaimer: { flexDirection: 'row', alignItems: 'center', gap: 10, opacity: 0.3, marginTop: 20 },
    disclaimerText: { fontSize: 10, color: 'white', flex: 1, fontWeight: '600' },
});

export default AIPortfolioScreen;
