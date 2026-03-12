import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
    StyleSheet, Modal, ViewStyle, TextStyle
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import {
    TrendingUp, TrendingDown, Info, RefreshCw,
    ArrowDown, ArrowUp, ChevronRight, BarChart2, Zap, X
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface SubAsset { name: string; value?: number; change: number; symbol?: string; }
interface Asset { id: string; name: string; value: number; change: number; flowAmount?: number; color: string; unit: string; subAssets?: SubAsset[]; }
interface MarketData { assets: Asset[]; indicators: { vix: { price: number; change: number }; dxy: { price: number; change: number }; }; }

const API_BASE = 'http://192.168.1.7:5000/api/market/flow';

const TIMEFRAMES = [
    { id: '1S', label: '1S' }, { id: '4S', label: '4S' }, { id: '1G', label: '1G' },
    { id: '1H', label: '1H' }, { id: '1A', label: '1A' }, { id: '1Y', label: '1Y' },
    { id: '5Y', label: '5Y' }, { id: '10Y', label: '10Y' },
];

const formatFlow = (amount?: number) => {
    if (!amount || amount === 0) return '$0M';
    if (amount < 0.1) return `$${(amount * 1000).toFixed(0)}M`;
    return `$${amount.toFixed(1)}B`;
};

const getAIRecommendation = (vix: number, dxyCh: number) => {
    if (dxyCh > 0 && vix > 20) return { title: 'Güvenli Liman Odaklı', text: 'Doların güçlendiği ve korkunun arttığı bu evrede Altın ve kısa vadeli Tahviller önceliklendirilmelidir. Kripto varlıklarda nakit oranını artırmak rasyoneldir.', color: '#f59e0b' };
    if (dxyCh < 0 && vix < 20) return { title: 'Agresif Risk Alımı', text: 'Zayıf Dolar ve düşük volatilite ortamı, riskli varlıklar için ideal penceredir. Bitcoin ve Nasdaq\'ta pozisyon artırmak mantıklı olabilir.', color: '#4ade80' };
    if (dxyCh > 0) return { title: 'Defansif ve Nakit', text: 'DXY güçlü seyrediyor. Sabit getirili varlıklar ve Dolar bazlı likit fonlar en stabil getiriyi sunacaktır.', color: '#22d3ee' };
    return { title: 'Seçici Büyüme', text: 'Piyasada yön arayışı hakim. Majör hisse senetlerinde kalırken ufak miktarda dijital varlık eklemek dengeli bir strateji olacaktır.', color: '#a78bfa' };
};

const getAccentColor = (color: string): string => {
    const map: Record<string, string> = { orange: '#f97316', cyan: '#22d3ee', green: '#4ade80', indigo: '#6366f1' };
    return map[color] || '#22d3ee';
};

const legendDotStyle = (isGreen: boolean): ViewStyle => ({
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: isGreen ? '#4ade80' : '#f87171',
    marginTop: 4,
});

const MoneyFlowScreen = () => {
    const [data, setData] = useState<MarketData | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState('1G');
    const [expandedAsset, setExpandedAsset] = useState<string | null>(null);
    const [showGuide, setShowGuide] = useState(false);
    const router = useRouter();

    const getMockData = (tf: string): MarketData => {
        const mult = tf === '1S' ? 0.1 : tf === '4S' ? 0.3 : tf === '1G' ? 1 : tf === '1H' ? 2.5 : tf === '1A' ? 6 : tf === '1Y' ? 24 : tf === '5Y' ? 60 : 100;
        return {
            assets: [
                { id: 'commodities', name: 'EMTİA', value: 18.0, change: -0.15 * mult, flowAmount: 0.85 * mult, color: 'orange', unit: 'T$', subAssets: [{ name: 'Altın', value: 14.5, change: 0.2 * mult }, { name: 'Petrol', value: 2.1, change: -0.4 * mult }, { name: 'Gümüş', value: 1.4, change: 1.1 * mult }, { name: 'Bakır', value: 0.8, change: -0.5 * mult }] },
                { id: 'crypto', name: 'KRİPTO', value: 2.6, change: 1.2 * mult, flowAmount: 2.4 * mult, color: 'cyan', unit: 'T$', subAssets: [{ name: 'Bitcoin', value: 1.3, change: 1.5 * mult }, { name: 'Ethereum', value: 0.4, change: 0.8 * mult }, { name: 'Solana', value: 0.15, change: 2.4 * mult }, { name: 'BTC Dominans', change: 0.1 * mult }] },
                { id: 'stocks', name: 'BORSALAR', value: 110.0, change: 0.8 * mult, flowAmount: 8.2 * mult, color: 'green', unit: 'T$', subAssets: [{ name: 'S&P500', value: 45.0, change: 0.8 * mult }, { name: 'Nasdaq', value: 20.0, change: 1.2 * mult }, { name: 'BIST100', value: 0.35, change: -0.3 * mult }] },
                { id: 'bonds', name: 'TAHVİLLER', value: 130.0, change: -0.2 * mult, flowAmount: 4.1 * mult, color: 'indigo', unit: 'T$', subAssets: [{ name: 'ABD 10Y', value: 130.0, change: -0.2 * mult }, { name: 'ABD 2Y', value: 85.0, change: 0.1 * mult }, { name: 'Almanya 10Y', value: 30.0, change: -0.4 * mult }, { name: 'Türkiye 10Y', value: 0.15, change: 0.5 * mult }] }
            ],
            indicators: { vix: { price: 15.2, change: -2.1 }, dxy: { price: 104.1, change: 0.1 } }
        };
    };

    const fetchData = async (tf = timeframe) => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}?timeframe=${tf}`);
            if (!response.ok) throw new Error('bad response');
            const result = await response.json();
            if (!result?.assets) throw new Error('bad data');
            setData(result);
        } catch {
            setData(getMockData(tf));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(timeframe); }, [timeframe]);

    if (loading || !data) {
        return (
            <View style={s.fallback}>
                <ActivityIndicator size="large" color="#22d3ee" />
                <Text style={s.loadingText}>Yükleniyor...</Text>
            </View>
        );
    }

    const ai = getAIRecommendation(data.indicators.vix.price, data.indicators.dxy.change);
    const tfLabel = TIMEFRAMES.find(t => t.id === timeframe)?.label ?? timeframe;

    return (
        <View style={s.root}>
            <SafeAreaView style={s.safe}>
                <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

                    {/* Header */}
                    <View style={s.header}>
                        <View>
                            <Text style={s.headerTitle}>Para Akışı</Text>
                            <Text style={s.headerSub}>Global Likidite Hareketi</Text>
                        </View>
                        <View style={s.headerActions}>
                            <TouchableOpacity onPress={() => setShowGuide(true)} style={s.iconBtn}>
                                <Info size={20} color="#22d3ee" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => fetchData(timeframe)} style={s.iconBtn}>
                                <RefreshCw size={20} color="rgba(255,255,255,0.5)" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Timeframe Selector */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tfRow} contentContainerStyle={s.tfContent}>
                        {TIMEFRAMES.map(tf => (
                            <TouchableOpacity
                                key={tf.id}
                                onPress={() => setTimeframe(tf.id)}
                                style={[s.tfBtn, timeframe === tf.id ? s.tfBtnActive : null]}
                            >
                                <Text style={[s.tfText, timeframe === tf.id ? s.tfTextActive : null]}>{tf.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* VIX / DXY */}
                    <View style={s.indicatorsRow}>
                        <View style={s.indicatorCard}>
                            <Text style={s.indicatorLabel}>VIX</Text>
                            <Text style={[s.indicatorValue, { color: data.indicators.vix.change > 0 ? '#f87171' : '#4ade80' }]}>
                                {data.indicators.vix.price.toFixed(1)}
                            </Text>
                            <Text style={[s.indicatorChange, { color: data.indicators.vix.change > 0 ? '#f87171' : '#4ade80' }]}>
                                {data.indicators.vix.change > 0 ? '▲' : '▼'} {Math.abs(data.indicators.vix.change).toFixed(2)}
                            </Text>
                        </View>
                        <View style={[s.indicatorCard, s.indicatorCardRight]}>
                            <Text style={s.indicatorLabel}>DXY</Text>
                            <Text style={[s.indicatorValue, { color: data.indicators.dxy.change > 0 ? '#4ade80' : '#f87171' }]}>
                                {data.indicators.dxy.price.toFixed(1)}
                            </Text>
                            <Text style={[s.indicatorChange, { color: data.indicators.dxy.change > 0 ? '#4ade80' : '#f87171' }]}>
                                {data.indicators.dxy.change > 0 ? '▲' : '▼'} {Math.abs(data.indicators.dxy.change).toFixed(2)}
                            </Text>
                        </View>
                    </View>

                    {/* Assets */}
                    {data.assets.map((asset: Asset, index: number) => {
                        const accent = getAccentColor(asset.color);
                        const topSubs = asset.subAssets?.slice(0, 2) || [];
                        const hasMore = (asset.subAssets?.length || 0) > 2;
                        return (
                            <React.Fragment key={asset.id}>
                                <Animated.View
                                    entering={FadeInDown.delay(index * 80)}
                                    style={[s.assetCard, { borderColor: `${accent}30`, backgroundColor: `${accent}0A` }]}
                                >
                                    <View style={s.assetHead}>
                                        <Text style={s.assetName}>{asset.name}</Text>
                                        <View style={s.assetHeadRight}>
                                            <TouchableOpacity
                                                onPress={() => router.push({ pathname: '/market-chart' as any, params: { name: asset.name, symbol: asset.id } })}
                                                style={s.miniBtn}
                                            >
                                                <BarChart2 size={16} color="rgba(255,255,255,0.5)" />
                                            </TouchableOpacity>
                                            <View style={[s.trendBadge, { backgroundColor: asset.change > 0 ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)' }]}>
                                                {asset.change > 0 ? <TrendingUp size={14} color="#4ade80" /> : <TrendingDown size={14} color="#f87171" />}
                                            </View>
                                        </View>
                                    </View>

                                    <View style={s.valueRow}>
                                        <Text style={s.valueText}>{asset.value.toFixed(1)}</Text>
                                        <Text style={s.unitText}>{asset.unit}</Text>
                                        <View style={s.flowBadge}>
                                            <Text style={[s.flowBadgeText, { color: accent }]}>{formatFlow(asset.flowAmount)}</Text>
                                        </View>
                                    </View>
                                    <Text style={[s.changeText, { color: asset.change > 0 ? '#4ade80' : '#f87171' }]}>
                                        {asset.change > 0 ? '+' : ''}{asset.change.toFixed(2)}% · {tfLabel} Değişim
                                    </Text>

                                    <View style={s.pillsRow}>
                                        {topSubs.map((sub: SubAsset) => (
                                            <TouchableOpacity
                                                key={sub.name}
                                                style={s.pill}
                                                onPress={() => router.push({ pathname: '/market-chart' as any, params: { name: sub.name, symbol: sub.symbol || sub.name } })}
                                            >
                                                <Text style={s.pillText}>{sub.name}</Text>
                                                <Text style={[s.pillArrow, { color: sub.change > 0 ? '#4ade80' : '#f87171' }]}>
                                                    {sub.change > 0 ? '↑' : '↓'}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                        {hasMore && (
                                            <TouchableOpacity
                                                style={s.expandToggle}
                                                onPress={() => setExpandedAsset(expandedAsset === asset.id ? null : asset.id)}
                                            >
                                                <Text style={s.expandText}>{expandedAsset === asset.id ? 'Kapat' : 'Tümü'}</Text>
                                                <ChevronRight size={12} color="#22d3ee" />
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {expandedAsset === asset.id && asset.subAssets && (
                                        <Animated.View entering={FadeIn} style={s.expanded}>
                                            {asset.subAssets.map((sub: SubAsset) => (
                                                <TouchableOpacity
                                                    key={sub.name}
                                                    style={s.subRow}
                                                    onPress={() => router.push({ pathname: '/market-chart' as any, params: { name: sub.name, symbol: sub.symbol || sub.name } })}
                                                >
                                                    <View>
                                                        <Text style={s.subName}>{sub.name}</Text>
                                                        {sub.value != null && (
                                                            <Text style={s.subValue}>${sub.value.toFixed(2)}{asset.unit}</Text>
                                                        )}
                                                    </View>
                                                    <View style={s.subRight}>
                                                        <Text style={[s.subChange, { color: sub.change > 0 ? '#4ade80' : '#f87171' }]}>
                                                            {sub.change > 0 ? '+' : ''}{sub.change.toFixed(2)}%
                                                        </Text>
                                                        <ChevronRight size={13} color="rgba(255,255,255,0.2)" />
                                                    </View>
                                                </TouchableOpacity>
                                            ))}
                                        </Animated.View>
                                    )}
                                </Animated.View>

                                {index < data.assets.length - 1 && (
                                    <FlowArrow
                                        direction={data.assets[index + 1].change - asset.change}
                                        amount={asset.flowAmount}
                                        percentage={Math.abs(data.assets[index + 1].change - asset.change)}
                                    />
                                )}
                            </React.Fragment>
                        );
                    })}

                    {/* Analysis + AI */}
                    <Animated.View entering={FadeInDown.delay(400)} style={s.analysisCard}>
                        <View style={s.analysisHead}>
                            <View style={s.zapBadge}><Zap size={16} color="#22d3ee" /></View>
                            <Text style={s.analysisTitle}>Piyasa Akış Analizi</Text>
                            <Text style={s.analysisTf}>[{timeframe}]</Text>
                        </View>
                        <Text style={s.analysisDesc}>
                            "{data.indicators.dxy.change > 0 ? 'Dolar endeksinde güçlenme' : 'Dolar\'da zayıflama'} gösteriyor. {data.indicators.vix.price > 20 ? 'Yüksek volatilite' : 'Stabilite'} ile birleştiğinde piyasalarda {data.indicators.dxy.change > 0 ? 'riskten kaçış' : 'riske giriş'} iştahı tetiklenebilir."
                        </Text>

                        <View style={[s.aiBox, { borderColor: `${ai.color}40` }]}>
                            <View style={s.aiHead}>
                                <View style={s.aiDots}>
                                    <View style={[s.aiDot, { backgroundColor: ai.color }]} />
                                    <View style={[s.aiDot, { backgroundColor: ai.color, opacity: 0.6 }]} />
                                    <View style={[s.aiDot, { backgroundColor: ai.color, opacity: 0.3 }]} />
                                </View>
                                <Text style={[s.aiLabel, { color: ai.color }]}>AI Yatırım Stratejisi</Text>
                            </View>
                            <Text style={s.aiTitle}>{ai.title}</Text>
                            <Text style={s.aiText}>{ai.text}</Text>
                        </View>

                        <View style={s.miniCards}>
                            <View style={s.miniCard}>
                                <Text style={s.miniCardLabel}>Risk İştahı</Text>
                                <View style={s.miniCardRow}>
                                    <View style={[s.dot, { backgroundColor: data.indicators.vix.price < 20 ? '#4ade80' : '#f59e0b' }]} />
                                    <Text style={[s.miniCardVal, { color: data.indicators.vix.price < 20 ? '#4ade80' : '#f59e0b' }]}>
                                        {data.indicators.vix.price < 20 ? 'YÜKSEK' : 'NORMAL'}
                                    </Text>
                                </View>
                            </View>
                            <View style={[s.miniCard, s.miniCardRight]}>
                                <Text style={s.miniCardLabel}>Rotasyon</Text>
                                <View style={s.miniCardRow}>
                                    <View style={[s.dot, { backgroundColor: '#22d3ee' }]} />
                                    <Text style={[s.miniCardVal, { color: '#22d3ee' }]}>AKTİF</Text>
                                </View>
                            </View>
                        </View>
                    </Animated.View>

                    <View style={s.bottomPad} />
                </ScrollView>
            </SafeAreaView>

            {/* Guide Modal */}
            <Modal visible={showGuide} transparent animationType="fade" onRequestClose={() => setShowGuide(false)}>
                <View style={s.modalOverlay}>
                    <View style={s.modalBox}>
                        <View style={s.modalHead}>
                            <Info size={22} color="#22d3ee" />
                            <Text style={s.modalTitle}>Analiz Rehberi</Text>
                            <TouchableOpacity onPress={() => setShowGuide(false)} style={s.closeBtn}>
                                <X size={18} color="rgba(255,255,255,0.5)" />
                            </TouchableOpacity>
                        </View>
                        <Text style={s.guideTitle}>Okların Yönü</Text>
                        <Text style={s.guideText}>
                            Oklar, piyasadaki likidite rotasyonunu temsil eder. Ok sağa/sola hareket ediyorsa, para o yöndeki varlık sınıfına doğru kayıyor demektir.
                        </Text>
                        <View style={s.legendRow}>
                            <View style={legendDotStyle(true)} />
                            <View style={s.legendContent}>
                                <Text style={[s.legendTitle, { color: '#4ade80' }]}>Yeşil (Giriş)</Text>
                                <Text style={s.legendDesc}>Varlığa güçlü nakit girişi var, performans yükseliyor.</Text>
                            </View>
                        </View>
                        <View style={s.legendRow}>
                            <View style={legendDotStyle(false)} />
                            <View style={s.legendContent}>
                                <Text style={[s.legendTitle, { color: '#f87171' }]}>Kırmızı (Çıkış)</Text>
                                <Text style={s.legendDesc}>Varlıktan kar satışı yapılıyor veya para başka sınıfa geçiyor.</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={() => setShowGuide(false)} style={s.modalBtn}>
                            <Text style={s.modalBtnText}>Anladım</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const FlowArrow = ({ direction, amount, percentage }: { direction: number; amount?: number; percentage?: number }) => {
    const isUp = direction > 0;
    const color = isUp ? '#4ade80' : '#f87171';
    return (
        <View style={s.arrow}>
            {isUp ? <ArrowUp size={22} color={color} /> : <ArrowDown size={22} color={color} />}
            <Text style={[s.arrowAmt, { color }]}>{formatFlow(amount)}</Text>
            <Text style={s.arrowPct}>{(percentage || 0).toFixed(2)}% Rotasyon</Text>
        </View>
    );
};

// Typed style sheets split by domain to avoid ViewStyle/TextStyle conflicts
const s = StyleSheet.create({
    // Layout
    root: { flex: 1, backgroundColor: '#060d1a' } as ViewStyle,
    safe: { flex: 1 } as ViewStyle,
    scroll: { flex: 1, paddingHorizontal: 16 } as ViewStyle,
    fallback: { flex: 1, backgroundColor: '#060d1a', alignItems: 'center', justifyContent: 'center', gap: 16 } as ViewStyle,
    loadingText: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '600' } as TextStyle,
    bottomPad: { height: 60 } as ViewStyle,

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 16 } as ViewStyle,
    headerTitle: { fontSize: 26, fontWeight: '900', color: 'white', letterSpacing: -0.8 } as TextStyle,
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: '600', marginTop: 2 } as TextStyle,
    headerActions: { flexDirection: 'row', gap: 10 } as ViewStyle,
    iconBtn: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' } as ViewStyle,

    // Timeframe
    tfRow: { marginBottom: 20 } as ViewStyle,
    tfContent: { paddingRight: 20 } as ViewStyle,
    tfBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginRight: 8 } as ViewStyle,
    tfBtnActive: { backgroundColor: 'rgba(34,211,238,0.15)', borderColor: 'rgba(34,211,238,0.3)' } as ViewStyle,
    tfText: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.5 } as TextStyle,
    tfTextActive: { color: '#22d3ee' } as TextStyle,

    // Indicators
    indicatorsRow: { flexDirection: 'row', marginBottom: 24 } as ViewStyle,
    indicatorCard: { flex: 1, padding: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' } as ViewStyle,
    indicatorCardRight: { marginLeft: 10 } as ViewStyle,
    indicatorLabel: { fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 } as TextStyle,
    indicatorValue: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 } as TextStyle,
    indicatorChange: { fontSize: 11, fontWeight: '700', marginTop: 2 } as TextStyle,

    // Asset Card
    assetCard: { borderRadius: 28, borderWidth: 1.5, marginBottom: 8, padding: 20 } as ViewStyle,
    assetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 } as ViewStyle,
    assetName: { fontSize: 18, fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: 0.3 } as TextStyle,
    assetHeadRight: { flexDirection: 'row', gap: 8, alignItems: 'center' } as ViewStyle,
    miniBtn: { width: 32, height: 32, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
    trendBadge: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
    valueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 4 } as ViewStyle,
    valueText: { fontSize: 34, fontWeight: '900', color: 'white', letterSpacing: -1 } as TextStyle,
    unitText: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.2)', marginBottom: 6 } as TextStyle,
    flowBadge: { flex: 1, alignItems: 'flex-end' } as ViewStyle,
    flowBadgeText: { fontSize: 13, fontWeight: '800' } as TextStyle,
    changeText: { fontSize: 12, fontWeight: '700', marginBottom: 16, letterSpacing: 0.2 } as TextStyle,
    pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' } as ViewStyle,
    pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 10, gap: 5 } as ViewStyle,
    pillText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' } as TextStyle,
    pillArrow: { fontSize: 12, fontWeight: '900' } as TextStyle,
    expandToggle: { flexDirection: 'row', alignItems: 'center', gap: 3 } as ViewStyle,
    expandText: { color: '#22d3ee', fontSize: 12, fontWeight: '700' } as TextStyle,
    expanded: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', gap: 6 } as ViewStyle,
    subRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)' } as ViewStyle,
    subRight: { flexDirection: 'row', alignItems: 'center', gap: 8 } as ViewStyle,
    subName: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.8)' } as TextStyle,
    subValue: { fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: '600', marginTop: 2 } as TextStyle,
    subChange: { fontSize: 13, fontWeight: '800' } as TextStyle,

    // Flow Arrow
    arrow: { alignItems: 'center', justifyContent: 'center', paddingVertical: 10 } as ViewStyle,
    arrowAmt: { fontSize: 15, fontWeight: '900', marginTop: 2 } as TextStyle,
    arrowPct: { fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 } as TextStyle,

    // Analysis Card
    analysisCard: { marginTop: 20, padding: 20, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' } as ViewStyle,
    analysisHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 } as ViewStyle,
    zapBadge: { width: 34, height: 34, backgroundColor: 'rgba(34,211,238,0.1)', borderRadius: 10, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
    analysisTitle: { fontSize: 16, fontWeight: '900', color: 'white', flex: 1 } as TextStyle,
    analysisTf: { fontSize: 11, color: 'rgba(255,255,255,0.2)', fontWeight: '700' } as TextStyle,
    analysisDesc: { fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 22, fontStyle: 'italic', marginBottom: 18 } as TextStyle,

    // AI Box
    aiBox: { borderWidth: 1, borderRadius: 20, padding: 18, marginBottom: 18, backgroundColor: 'rgba(34,211,238,0.05)' } as ViewStyle,
    aiHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 } as ViewStyle,
    aiDots: { flexDirection: 'row', gap: 3 } as ViewStyle,
    aiDot: { width: 5, height: 5, borderRadius: 3 } as ViewStyle,
    aiLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5 } as TextStyle,
    aiTitle: { fontSize: 18, fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: -0.3, marginBottom: 8 } as TextStyle,
    aiText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 21, fontWeight: '500' } as TextStyle,

    // Mini Cards
    miniCards: { flexDirection: 'row' } as ViewStyle,
    miniCard: { flex: 1, padding: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' } as ViewStyle,
    miniCardRight: { marginLeft: 10 } as ViewStyle,
    miniCardLabel: { fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 } as TextStyle,
    miniCardRow: { flexDirection: 'row', alignItems: 'center', gap: 6 } as ViewStyle,
    dot: { width: 8, height: 8, borderRadius: 4 } as ViewStyle,
    miniCardVal: { fontSize: 14, fontWeight: '900', textTransform: 'uppercase' } as TextStyle,

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 } as ViewStyle,
    modalBox: { backgroundColor: '#0f1f35', borderRadius: 28, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' } as ViewStyle,
    modalHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 } as ViewStyle,
    modalTitle: { fontSize: 20, fontWeight: '900', color: 'white', flex: 1 } as TextStyle,
    closeBtn: { width: 32, height: 32, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
    guideTitle: { fontSize: 14, fontWeight: '800', color: '#22d3ee', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 } as TextStyle,
    guideText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 22, marginBottom: 20 } as TextStyle,
    legendRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 16 } as ViewStyle,
    legendContent: { flex: 1 } as ViewStyle,
    legendTitle: { fontSize: 13, fontWeight: '800', marginBottom: 3 } as TextStyle,
    legendDesc: { fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 18 } as TextStyle,
    modalBtn: { marginTop: 20, backgroundColor: '#22d3ee', borderRadius: 16, padding: 16, alignItems: 'center' } as ViewStyle,
    modalBtnText: { color: '#0f172a', fontWeight: '900', fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5 } as TextStyle,
});

export default MoneyFlowScreen;
