import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    ActivityIndicator, Switch, TextInput, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Zap, Coins, Lock, Users, RefreshCw, CheckCircle, Gift } from 'lucide-react-native';
import { Config } from '@/constants/Config';

const API_BASE = Config.API_BASE;

interface UserCredit {
    id: string;
    name: string;
    email: string;
    credits: number;
    tier: string;
    role: string;
}

const AdminScreen = () => {
    const [featureToggles, setFeatureToggles] = useState({
        news_enabled: true,
        auto_prediction_enabled: true,
        money_flow_ai_enabled: true,
    });
    const [pricing, setPricing] = useState([
        { key: 'price_per_100_tokens', value: '9.99', description: '100 Token Paketi (USD)' },
        { key: 'price_per_500_tokens', value: '39.99', description: '500 Token Paketi - Pro (USD)' },
        { key: 'price_per_1000_tokens', value: '69.99', description: '1000 Token Paketi - Premium (USD)' },
    ]);
    const [creditLogs, setCreditLogs] = useState<UserCredit[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingKey, setSavingKey] = useState<string | null>(null);
    const [savedKey, setSavedKey] = useState<string | null>(null);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [settingsRes, usersRes] = await Promise.allSettled([
                fetch(`${API_BASE}/admin/settings`),
                fetch(`${API_BASE}/admin/users`),
            ]);

            if (settingsRes.status === 'fulfilled') {
                const settings = await settingsRes.value.json();
                if (Array.isArray(settings)) {
                    const toggleMap: Record<string, boolean> = {};
                    const priceMap: Record<string, string> = {};
                    settings.forEach((s: any) => {
                        if (s.key.endsWith('_enabled')) toggleMap[s.key] = s.value === 'true';
                        if (s.key.startsWith('price_')) priceMap[s.key] = s.value;
                    });
                    if (Object.keys(toggleMap).length) {
                        setFeatureToggles(prev => ({ ...prev, ...toggleMap }));
                    }
                    if (Object.keys(priceMap).length) {
                        setPricing(prev => prev.map(p => ({ ...p, value: priceMap[p.key] || p.value })));
                    }
                }
            }

            if (usersRes.status === 'fulfilled') {
                const users = await usersRes.value.json();
                if (Array.isArray(users)) setCreditLogs(users);
            }
        } catch (e) {
            console.error('Admin fetch error:', e);
        } finally {
            setLoading(false);
        }
    };

    const toggleFeature = async (key: string) => {
        const newVal = !featureToggles[key as keyof typeof featureToggles];
        setFeatureToggles(prev => ({ ...prev, [key]: newVal }));
        try {
            await fetch(`${API_BASE}/admin/settings/${key}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value: String(newVal) }),
            });
        } catch (e) {
            console.error('Toggle save failed:', e);
        }
    };

    const savePrice = async (key: string, value: string) => {
        setSavingKey(key);
        try {
            await fetch(`${API_BASE}/admin/settings/${key}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value }),
            });
            setSavedKey(key);
            setTimeout(() => setSavedKey(null), 2000);
        } catch (e) {
            Alert.alert('Hata', 'Kaydetme başarısız');
        } finally {
            setSavingKey(null);
        }
    };

    const grantCredits = async (userId: string, userName: string) => {
        Alert.prompt(
            'Kredi Ver',
            `${userName} kullanıcısına kaç kredi vermek istersiniz?`,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Ver',
                    onPress: async (amount: string | undefined) => {
                        if (!amount || isNaN(Number(amount))) return;
                        try {
                            await fetch(`${API_BASE}/admin/users/${userId}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ credits: Number(amount) }),
                            });
                            fetchAll();
                        } catch (e) {
                            Alert.alert('Hata', 'Kredi verilemedi');
                        }
                    }
                }
            ],
            'plain-text',
            '100'
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#22d3ee" />
            </View>
        );
    }

    const featureLabels: Record<string, { label: string; desc: string }> = {
        news_enabled: { label: 'Haber Akışı', desc: 'Aylık 20 Token' },
        auto_prediction_enabled: { label: 'Otomatik Tahmin', desc: 'AI periyodik tahmin' },
        money_flow_ai_enabled: { label: 'Money Flow AI', desc: 'Para akışı AI analizi' },
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerIcon}>
                            <Settings color="#22d3ee" size={20} />
                        </View>
                        <Text style={styles.headerTitle}>Admin Paneli</Text>
                        <TouchableOpacity onPress={fetchAll} style={styles.refreshBtn}>
                            <RefreshCw color="white" size={18} />
                        </TouchableOpacity>
                    </View>

                    {/* Feature Toggles */}
                    <View style={styles.card}>
                        <View style={styles.sectionHeader}>
                            <Zap color="#22d3ee" size={18} />
                            <Text style={styles.sectionTitle}>Özellik Kontrolü</Text>
                        </View>
                        {Object.keys(featureToggles).map(key => (
                            <View key={key} style={styles.toggleRow}>
                                <View style={styles.toggleInfo}>
                                    <Text style={styles.toggleLabel}>{featureLabels[key]?.label || key}</Text>
                                    <Text style={styles.toggleDesc}>{featureLabels[key]?.desc}</Text>
                                </View>
                                <Switch
                                    value={featureToggles[key as keyof typeof featureToggles]}
                                    onValueChange={() => toggleFeature(key)}
                                    trackColor={{ false: 'rgba(255,255,255,0.1)', true: '#22d3ee' }}
                                    thumbColor="white"
                                />
                            </View>
                        ))}
                    </View>

                    {/* Credit Usage */}
                    <View style={styles.card}>
                        <View style={styles.sectionHeader}>
                            <Coins color="#4ade80" size={18} />
                            <Text style={styles.sectionTitle}>Kredi Kullanım Dökümü</Text>
                        </View>
                        {creditLogs.length === 0 ? (
                            <Text style={styles.emptyText}>Henüz kullanıcı yok</Text>
                        ) : (
                            creditLogs.map(u => (
                                <View key={u.id} style={styles.userRow}>
                                    <View style={styles.userInfo}>
                                        <Text style={styles.userName}>{u.name || u.email}</Text>
                                        <View style={styles.badgeRow}>
                                            <View style={[styles.badge, u.tier === 'PREMIUM' ? styles.badgePremium : u.tier === 'PRO' ? styles.badgePro : styles.badgeFree]}>
                                                <Text style={styles.badgeText}>{u.tier || 'FREE'}</Text>
                                            </View>
                                            <View style={[styles.badge, u.role === 'developer' ? styles.badgeDev : u.role === 'admin' ? styles.badgeAdmin : styles.badgeFree]}>
                                                <Text style={styles.badgeText}>{u.role || 'user'}</Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity 
                                            onPress={() => grantCredits(u.id, u.name || u.email)}
                                            style={styles.giftBtn}
                                        >
                                            <Gift size={10} color="#4ade80" />
                                            <Text style={styles.giftBtnText}>Bedava Kredi Ver</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <Text style={[styles.creditValue,
                                        u.role === 'developer' ? { color: '#f59e0b' } :
                                        (u.credits ?? 100) < 20 ? { color: '#f87171' } : { color: '#4ade80' }
                                    ]}>
                                        {u.role === 'developer' ? '∞' : (u.credits ?? 100)}
                                    </Text>
                                </View>
                            ))
                        )}
                    </View>

                    {/* Developer Pricing */}
                    <View style={[styles.card, styles.devCard]}>
                        <View style={styles.sectionHeader}>
                            <Lock color="#f59e0b" size={18} />
                            <Text style={[styles.sectionTitle, { color: '#f59e0b' }]}>Geliştirici: Token Fiyatları</Text>
                        </View>
                        {pricing.map(p => (
                            <View key={p.key} style={styles.priceRow}>
                                <Text style={styles.priceLabel}>{p.description}</Text>
                                <View style={styles.priceInputRow}>
                                    <Text style={styles.dollarSign}>$</Text>
                                    <TextInput
                                        value={pricing.find(x => x.key === p.key)?.value}
                                        onChangeText={(val) => setPricing(prev => prev.map(x => x.key === p.key ? { ...x, value: val } : x))}
                                        keyboardType="decimal-pad"
                                        style={styles.priceInput}
                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                    />
                                    <TouchableOpacity
                                        onPress={() => savePrice(p.key, pricing.find(x => x.key === p.key)?.value || '')}
                                        disabled={savingKey === p.key}
                                        style={styles.saveBtn}
                                    >
                                        {savingKey === p.key ? (
                                            <ActivityIndicator size="small" color="#f59e0b" />
                                        ) : savedKey === p.key ? (
                                            <CheckCircle color="#4ade80" size={16} />
                                        ) : (
                                            <Text style={styles.saveBtnText}>Kaydet</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    loadingContainer: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
    safeArea: { flex: 1 },
    scroll: { flex: 1, padding: 20 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, marginTop: 10 },
    headerIcon: { width: 40, height: 40, backgroundColor: 'rgba(34,211,238,0.1)', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    headerTitle: { flex: 1, fontSize: 24, fontWeight: '800', color: 'white', letterSpacing: -0.5 },
    refreshBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 99 },
    card: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: 20, marginBottom: 16 },
    devCard: { borderColor: 'rgba(245,158,11,0.3)', backgroundColor: 'rgba(245,158,11,0.03)' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '900', color: 'white', marginLeft: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    toggleInfo: { flex: 1 },
    toggleLabel: { fontSize: 14, fontWeight: '700', color: 'white' },
    toggleDesc: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
    emptyText: { color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', paddingVertical: 12 },
    userRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    userInfo: { flex: 1 },
    userName: { fontSize: 14, fontWeight: '700', color: 'white', marginBottom: 6 },
    badgeRow: { flexDirection: 'row', gap: 6 },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
    badgePremium: { backgroundColor: 'rgba(245,158,11,0.15)' },
    badgePro: { backgroundColor: 'rgba(34,211,238,0.15)' },
    badgeFree: { backgroundColor: 'rgba(255,255,255,0.05)' },
    badgeDev: { backgroundColor: 'rgba(245,158,11,0.15)' },
    badgeAdmin: { backgroundColor: 'rgba(248,113,113,0.15)' },
    badgeText: { fontSize: 9, fontWeight: '900', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' },
    creditValue: { fontSize: 22, fontWeight: '900' },
    priceRow: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    priceLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '700', marginBottom: 8 },
    priceInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dollarSign: { color: 'rgba(255,255,255,0.4)', fontWeight: '900', fontSize: 16 },
    priceInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: '700', fontSize: 16, paddingHorizontal: 12, paddingVertical: 8 },
    saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', minWidth: 64, alignItems: 'center' },
    saveBtnText: { color: '#f59e0b', fontWeight: '900', fontSize: 12 },
    giftBtn: { marginTop: 10, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(74, 222, 128, 0.1)', borderWidth: 1, borderColor: 'rgba(74, 222, 128, 0.2)', flexDirection: 'row', alignItems: 'center', gap: 6 },
    giftBtnText: { color: '#4ade80', fontSize: 10, fontWeight: '800' },
});

export default AdminScreen;
