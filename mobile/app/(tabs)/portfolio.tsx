import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wallet, Plus, X, Trash2, ArrowUpRight, ArrowDownLeft, Activity, Search, Bot } from 'lucide-react-native';
import { Config } from '@/constants/Config';

const PortfolioScreen = () => {
    const [holdings, setHoldings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [displayCurrency, setDisplayCurrency] = useState('USD');
    
    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<any>(null);
    
    // Form state
    const [amount, setAmount] = useState('');
    const [avgPrice, setAvgPrice] = useState('');
    const [purchaseCurrency, setPurchaseCurrency] = useState('USD');
    const [isSaving, setIsSaving] = useState(false);
    const [analysis, setAnalysis] = useState<any>(null);
    const [analysisLoading, setAnalysisLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${Config.API_BASE}/portfolio`);
            const data = await response.json();
            setHoldings(Array.isArray(data) ? data : []);
            
            // Trigger AI analysis
            fetchAnalysis();
        } catch (error) {
            console.error('Error fetching portfolio:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAnalysis = async () => {
        setAnalysisLoading(true);
        try {
            const res = await fetch(`${Config.API_BASE}/portfolio/analysis`);
            const data = await res.json();
            setAnalysis(data);
        } catch (e) {
            console.warn('AI Analysis failed');
        } finally {
            setAnalysisLoading(false);
        }
    };

    // Debounced search
    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await fetch(`${Config.API_BASE}/market/search?q=${encodeURIComponent(searchQuery)}`);
                const data = await res.json();
                setSearchResults(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error(error);
            } finally {
                setIsSearching(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleAddAsset = async () => {
        if (!selectedAsset || !amount || !avgPrice) {
            Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
            return;
        }

        setIsSaving(true);
        try {
            const body = {
                symbol: selectedAsset.symbol,
                amount: parseFloat(amount),
                avgPrice: parseFloat(avgPrice),
                market: selectedAsset.market || 'STOCK',
                purchaseCurrency,
            };

            const res = await fetch(`${Config.API_BASE}/portfolio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            
            if (res.ok) {
                setShowAddModal(false);
                resetForm();
                fetchData();
            } else {
                Alert.alert('Hata', 'Varlık eklenemedi.');
            }
        } catch (error) {
            console.error('Add asset error:', error);
            Alert.alert('Hata', 'Bağlantı sorunu.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, symbol: string) => {
        Alert.alert('Onay', `${symbol} varlığını silmek istediğinize emin misiniz?`, [
            { text: 'İptal', style: 'cancel' },
            { 
                text: 'Sil', 
                style: 'destructive',
                onPress: async () => {
                    try {
                        const res = await fetch(`${Config.API_BASE}/portfolio/${id}`, { method: 'DELETE' });
                        if (res.ok) {
                            fetchData();
                        }
                    } catch (error) {
                        console.error('Delete error', error);
                    }
                }
            }
        ]);
    };

    const resetForm = () => {
        setSearchQuery('');
        setSelectedAsset(null);
        setAmount('');
        setAvgPrice('');
        setPurchaseCurrency('USD');
    };

    const getVal = (valInNC: any, nc: string, h: any) => {
        let v = parseFloat(valInNC);
        if (isNaN(v)) v = parseFloat(h?.value);
        if (isNaN(v)) v = (parseFloat(h?.amount || 0) * parseFloat(h?.currentPrice || 0));
        if (isNaN(v)) return 0;
        
        const rawUsdTry = holdings.find(x => x.usdtry)?.usdtry;
        const usdtry = parseFloat(rawUsdTry) || 32.5;
        if (!nc) nc = (h?.symbol?.endsWith('.IS') ? 'TRY' : 'USD');
        
        if (displayCurrency === nc) return v;
        if (displayCurrency === 'TRY' && nc === 'USD') return v * usdtry;
        if (displayCurrency === 'USD' && nc === 'TRY') return v / usdtry;
        return v;
    };

    const getValFromPC = (valInPC: any, pc: string) => {
        const v = parseFloat(valInPC || 0);
        if (isNaN(v)) return 0;
        const rawUsdTry = holdings.find(h => h.usdtry)?.usdtry;
        const usdtry = parseFloat(rawUsdTry) || 32.5;
        if (displayCurrency === pc) return v;
        if (displayCurrency === 'TRY' && pc === 'USD') return v * usdtry;
        if (displayCurrency === 'USD' && pc === 'TRY') return v / usdtry;
        return v;
    };

    const totalValue = holdings.reduce((sum, h) => sum + getVal(h.valueInNC, h.naturalCurrency, h), 0);
    const totalInvested = holdings.reduce((sum, h) => sum + getValFromPC(h.totalInvested, h.purchaseCurrency), 0);
    const totalPL = totalValue - totalInvested;
    const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

    const renderAssetItem = ({ item }: { item: any }) => (
        <View style={styles.assetCard}>
            <View style={styles.assetHeader}>
                <View style={styles.assetTitleInfo}>
                    <View style={styles.assetIcon}>
                        <Text style={styles.assetIconText}>{item.symbol?.[0]}</Text>
                    </View>
                    <View>
                        <Text style={styles.assetSymbol}>{item.symbol}</Text>
                        <Text style={styles.assetAmount}>{Number(item.amount).toLocaleString()} {item.market}</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id, item.symbol)} style={styles.deleteBtn}>
                    <Trash2 size={16} color="rgba(248, 113, 113, 0.6)" />
                </TouchableOpacity>
            </View>

            <View style={styles.assetDetails}>
                <View style={styles.detailCol}>
                    <Text style={styles.detailLabel}>Maliyet</Text>
                    <Text style={styles.detailValue}>
                        {displayCurrency === 'TRY' ? '₺' : '$'}
                        {getValFromPC(item.totalInvested, item.purchaseCurrency).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits:2})}
                    </Text>
                </View>
                <View style={styles.detailCol}>
                    <Text style={styles.detailLabel}>Güncel Değer</Text>
                    <Text style={styles.detailValue}>
                        {displayCurrency === 'TRY' ? '₺' : '$'}
                        {getVal(item.valueInNC, item.naturalCurrency, item).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits:2})}
                    </Text>
                </View>
                <View style={[styles.detailCol, { alignItems: 'flex-end' }]}>
                    <Text style={styles.detailLabel}>Kâr / Zarar</Text>
                    <View style={styles.plWrapper}>
                        <Text style={[styles.plText, item.pl >= 0 ? styles.textGreen : styles.textRed]}>
                            {item.pl >= 0 ? '+' : ''}
                            {getValFromPC(item.pl, item.purchaseCurrency).toLocaleString(undefined, {maximumFractionDigits: 2})}
                        </Text>
                        <Text style={[styles.plPercentText, item.pl >= 0 ? styles.textGreen : styles.textRed]}>
                            {item.plPercent >= 0 ? '▲' : '▼'} {Math.abs(item.plPercent).toFixed(1)}%
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );

    if (loading && holdings.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#22d3ee" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <View style={styles.titleRow}>
                                <Wallet color="#22d3ee" size={24} />
                                <Text style={styles.title}>Portföy</Text>
                            </View>
                            <Text style={styles.subtitle}>Gerçek zamanlı varlık analizi</Text>
                        </View>
                        
                        <View style={styles.currencyToggle}>
                            <TouchableOpacity 
                                style={[styles.currencyBtn, displayCurrency === 'USD' && styles.currencyBtnActive]}
                                onPress={() => setDisplayCurrency('USD')}
                            >
                                <Text style={[styles.currencyBtnText, displayCurrency === 'USD' && styles.currencyBtnTextActive]}>USD</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.currencyBtn, displayCurrency === 'TRY' && styles.currencyBtnActive]}
                                onPress={() => setDisplayCurrency('TRY')}
                            >
                                <Text style={[styles.currencyBtnText, displayCurrency === 'TRY' && styles.currencyBtnTextActive]}>TRY</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Stats Overview */}
                    <View style={styles.statsCard}>
                        {/* AI ANALYSIS SECTION */}
                        { (analysis || analysisLoading) && (
                            <View style={styles.aiAnalysisCard}>
                                <View style={styles.aiHeader}>
                                    <Bot size={16} color="#8b5cf6" />
                                    <Text style={styles.aiTitle}>AI PORTFÖY ANALİZİ</Text>
                                </View>
                                {analysisLoading ? (
                                    <ActivityIndicator size="small" color="#8b5cf6" style={{ marginVertical: 10 }} />
                                ) : (
                                    <Text style={styles.aiSummary}>{analysis?.aiSummary}</Text>
                                )}
                            </View>
                        )}

                        <Text style={styles.statsLabel}>Toplam Değer</Text>
                        <Text style={styles.statsMainValue}>
                            {displayCurrency === 'USD' ? '$' : '₺'}
                            {totalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </Text>

                        <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                                <Text style={styles.statBoxLabel}>Toplam Yatırım</Text>
                                <Text style={styles.statBoxValue}>
                                    {displayCurrency === 'USD' ? '$' : '₺'}
                                    {totalInvested.toLocaleString(undefined, {maximumFractionDigits: 0})}
                                </Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statBoxLabel}>Net Getiri</Text>
                                <View style={styles.plStatsWrapper}>
                                    <Text style={[styles.statBoxValue, totalPL >= 0 ? styles.textGreen : styles.textRed]}>
                                        {totalPL >= 0 ? '+' : ''}{totalPL.toLocaleString(undefined, {maximumFractionDigits: 0})}
                                    </Text>
                                    <View style={styles.plInline}>
                                        {totalPLPercent >= 0 ? <ArrowUpRight size={12} color="#4ade80" /> : <ArrowDownLeft size={12} color="#f87171" />}
                                        <Text style={[styles.plInlineText, totalPLPercent >= 0 ? styles.textGreen : styles.textRed]}>
                                            {totalPLPercent.toFixed(2)}%
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Holdings List */}
                    <View style={styles.listHeader}>
                        <Text style={styles.sectionTitle}>Varlıklarım ({holdings.length})</Text>
                        <TouchableOpacity style={styles.addBtn} onPress={() => { resetForm(); setShowAddModal(true); }}>
                            <Plus size={16} color="#0f172a" />
                            <Text style={styles.addBtnText}>Varlık Ekle</Text>
                        </TouchableOpacity>
                    </View>

                    {holdings.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Activity color="rgba(255,255,255,0.2)" size={48} />
                            <Text style={styles.emptyText}>Henüz varlık bulunmuyor.</Text>
                            <Text style={styles.emptySubtext}>Takip etmek için yukarıdan "Varlık Ekle" butonunu kullanın.</Text>
                        </View>
                    ) : (
                        holdings.map(h => <React.Fragment key={h.id}>{renderAssetItem({ item: h })}</React.Fragment>)
                    )}

                </ScrollView>
            </SafeAreaView>

            {/* Add Asset Modal */}
            <Modal visible={showAddModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Varlık Ekle</Text>
                            <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.closeBtn}>
                                <X size={20} color="white" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Sembol Ara</Text>
                                <View style={styles.searchWrap}>
                                    <Search size={16} color="rgba(255,255,255,0.4)" style={styles.searchIcon} />
                                    <TextInput 
                                        style={styles.input}
                                        placeholder="Hisse, Kripto (örn: AAPL)"
                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                        value={selectedAsset ? selectedAsset.symbol : searchQuery}
                                        onChangeText={val => {
                                            setSearchQuery(val);
                                            if (selectedAsset) setSelectedAsset(null);
                                        }}
                                        autoCapitalize="characters"
                                    />
                                    {isSearching && <ActivityIndicator style={{ position: 'absolute', right: 12, top: 14 }} color="#22d3ee" size="small" />}
                                </View>
                                
                                {!selectedAsset && searchResults.length > 0 && (
                                    <View style={styles.searchResults}>
                                        {searchResults.map((res: any, idx: number) => (
                                            <TouchableOpacity 
                                                key={idx} 
                                                style={styles.searchResultItem}
                                                onPress={() => {
                                                    setSelectedAsset(res);
                                                    setSearchQuery(res.symbol);
                                                    setSearchResults([]);
                                                    // Auto set currency
                                                    if (res.market === 'BIST' || res.symbol.endsWith('.IS')) setPurchaseCurrency('TRY');
                                                    else setPurchaseCurrency('USD');
                                                }}
                                            >
                                                <View>
                                                    <Text style={styles.resultSymbol}>{res.symbol}</Text>
                                                    <Text style={styles.resultName}>{res.name}</Text>
                                                </View>
                                                <Text style={styles.resultMarket}>{res.market}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                    <Text style={styles.inputLabel}>Miktar</Text>
                                    <TextInput 
                                        style={styles.input}
                                        placeholder="Örn: 1.5"
                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                        keyboardType="decimal-pad"
                                        value={amount}
                                        onChangeText={setAmount}
                                    />
                                </View>
                                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                                    <Text style={styles.inputLabel}>Maliyet ({purchaseCurrency})</Text>
                                    <TextInput 
                                        style={styles.input}
                                        placeholder="Birim fiyat"
                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                        keyboardType="decimal-pad"
                                        value={avgPrice}
                                        onChangeText={setAvgPrice}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Satın Alma Para Birimi</Text>
                                <View style={styles.tabRow}>
                                    {['USD', 'TRY'].map(curr => (
                                        <TouchableOpacity 
                                            key={curr} 
                                            style={[styles.modalTabBtn, purchaseCurrency === curr && styles.modalTabBtnActive]}
                                            onPress={() => setPurchaseCurrency(curr)}
                                        >
                                            <Text style={[styles.modalTabText, purchaseCurrency === curr && styles.modalTabTextActive]}>{curr}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <TouchableOpacity 
                                style={[styles.saveButton, (!selectedAsset || !amount || !avgPrice || isSaving) && styles.saveButtonDisabled]}
                                onPress={handleAddAsset}
                                disabled={!selectedAsset || !amount || !avgPrice || isSaving}
                            >
                                {isSaving ? <ActivityIndicator size="small" color="#0f172a" /> : <Text style={styles.saveButtonText}>PORTFÖYE EKLE</Text>}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    loadingContainer: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
    safeArea: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 40 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, marginTop: 10 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { fontSize: 28, fontWeight: '900', color: 'white', letterSpacing: -0.5 },
    subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4, fontWeight: '600' },
    
    currencyToggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    currencyBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    currencyBtnActive: { backgroundColor: '#22d3ee' },
    currencyBtnText: { fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.4)' },
    currencyBtnTextActive: { color: '#0f172a' },

    statsCard: { backgroundColor: 'rgba(34, 211, 238, 0.05)', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(34, 211, 238, 0.2)', marginBottom: 24 },
    statsLabel: { fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    statsMainValue: { fontSize: 40, fontWeight: '900', color: 'white', letterSpacing: -1, fontStyle: 'italic', marginBottom: 20 },
    statsRow: { flexDirection: 'row', gap: 12 },
    statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    statBoxLabel: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 4 },
    statBoxValue: { fontSize: 16, fontWeight: '900', color: 'white' },
    plStatsWrapper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    plInline: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 6 },
    plInlineText: { fontSize: 9, fontWeight: '800', marginLeft: 2 },
    
    textGreen: { color: '#4ade80' },
    textRed: { color: '#f87171' },

    listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '900', color: 'white', textTransform: 'uppercase', fontStyle: 'italic' },
    addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#22d3ee', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 4 },
    addBtnText: { color: '#0f172a', fontSize: 10, fontWeight: '900' },

    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    emptyText: { color: 'white', fontSize: 16, fontWeight: '800', marginTop: 16, marginBottom: 8 },
    emptySubtext: { color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', paddingHorizontal: 40 },

    assetCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    assetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    assetTitleInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    assetIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    assetIconText: { color: '#22d3ee', fontSize: 16, fontWeight: '900' },
    assetSymbol: { fontSize: 16, fontWeight: '900', color: 'white' },
    assetAmount: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginTop: 2 },
    deleteBtn: { padding: 8, backgroundColor: 'rgba(248, 113, 113, 0.1)', borderRadius: 8 },
    
    assetDetails: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12 },
    detailCol: { flex: 1 },
    detailLabel: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 4 },
    detailValue: { fontSize: 13, fontWeight: '800', color: 'white' },
    plWrapper: { alignItems: 'flex-end' },
    plText: { fontSize: 13, fontWeight: '900' },
    plPercentText: { fontSize: 9, fontWeight: '800', opacity: 0.8 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#1e293b', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(34, 211, 238, 0.2)' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '900', color: 'white', letterSpacing: -0.5 },
    closeBtn: { padding: 4 },
    
    inputGroup: { marginBottom: 16, position: 'relative' },
    inputLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 6, marginLeft: 4 },
    searchWrap: { position: 'relative', justifyContent: 'center' },
    searchIcon: { position: 'absolute', left: 16, zIndex: 10 },
    input: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 14, paddingLeft: 40, color: 'white', fontSize: 14, fontWeight: '600' },
    
    searchResults: { position: 'absolute', top: 70, left: 0, right: 0, backgroundColor: '#0f172a', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(34, 211, 238, 0.3)', zIndex: 100, maxHeight: 180, overflow: 'hidden' },
    searchResultItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    resultSymbol: { fontSize: 14, fontWeight: '800', color: 'white' },
    resultName: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2, maxWidth: 150 },
    resultMarket: { fontSize: 9, fontWeight: '900', color: '#22d3ee', textTransform: 'uppercase' },

    row: { flexDirection: 'row' },
    tabRow: { flexDirection: 'row', gap: 8 },
    modalTabBtn: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    modalTabBtnActive: { backgroundColor: 'rgba(34, 211, 238, 0.1)', borderColor: 'rgba(34, 211, 238, 0.5)' },
    modalTabText: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.5)' },
    modalTabTextActive: { color: '#22d3ee' },

    saveButton: { backgroundColor: '#22d3ee', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 },
    saveButtonDisabled: { opacity: 0.5 },
    saveButtonText: { color: '#0f172a', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
    
    // AI Analysis Styles
    aiAnalysisCard: { backgroundColor: 'rgba(139,92,246,0.1)', borderRadius: 18, padding: 16, borderLeftWidth: 4, borderLeftColor: '#8b5cf6', marginBottom: 20 },
    aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    aiTitle: { fontSize: 10, fontWeight: '900', color: '#8b5cf6', letterSpacing: 1 },
    aiSummary: { fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 18, fontStyle: 'italic' },
});

export default PortfolioScreen;
