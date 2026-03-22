import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, LogOut, Settings, Moon, Globe, ChevronRight } from 'lucide-react-native';
import { useAuth } from '../_layout';
import { useRouter } from 'expo-router';

const ProfileScreen = () => {
    const { user, logout } = useAuth();
    const router = useRouter();

    if (!user) {
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
                        <Text style={styles.title}>Profil</Text>
                    </View>

                    {/* Profile Card */}
                    <View style={styles.profileCard}>
                        <View style={styles.avatarContainer}>
                            <User color="#22d3ee" size={40} />
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={styles.userName}>{user.name || user.email}</Text>
                            <Text style={styles.userEmail}>{user.email}</Text>
                            <View style={styles.badges}>
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{user.credits > 999 ? 'PRO' : 'FREE'}</Text>
                                </View>
                                {user.email?.includes('admin') && (
                                    <View style={[styles.badge, styles.adminBadge]}>
                                        <Text style={styles.badgeText}>ADMIN</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Settings Sections */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Uygulama Ayarları</Text>
                        
                        <View style={styles.menuCard}>
                            <TouchableOpacity style={styles.menuItem}>
                                <View style={styles.menuItemLeft}>
                                    <Globe color="rgba(255,255,255,0.5)" size={20} />
                                    <Text style={styles.menuItemText}>Dil</Text>
                                </View>
                                <View style={styles.menuItemRight}>
                                    <Text style={styles.menuItemValue}>Türkçe</Text>
                                    <ChevronRight color="rgba(255,255,255,0.2)" size={16} />
                                </View>
                            </TouchableOpacity>
                            <View style={styles.divider} />
                            
                            <TouchableOpacity style={styles.menuItem}>
                                <View style={styles.menuItemLeft}>
                                    <Moon color="rgba(255,255,255,0.5)" size={20} />
                                    <Text style={styles.menuItemText}>Görünüm</Text>
                                </View>
                                <View style={styles.menuItemRight}>
                                    <Text style={styles.menuItemValue}>Karanlık Mod</Text>
                                    <ChevronRight color="rgba(255,255,255,0.2)" size={16} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {user.email?.includes('admin') && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Yönetim</Text>
                            <View style={styles.menuCard}>
                                <TouchableOpacity 
                                    style={styles.menuItem} 
                                    onPress={() => router.push('/admin' as any)}
                                >
                                    <View style={styles.menuItemLeft}>
                                        <Settings color="#f59e0b" size={20} />
                                        <Text style={[styles.menuItemText, { color: '#f59e0b' }]}>Geliştirici Paneli</Text>
                                    </View>
                                    <ChevronRight color="rgba(245, 158, 11, 0.5)" size={16} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Actions */}
                    <View style={styles.section}>
                        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                            <LogOut color="#f87171" size={20} />
                            <Text style={styles.logoutBtnText}>Çıkış Yap</Text>
                        </TouchableOpacity>
                        <Text style={styles.versionText}>v1.0.0 (Build 42)</Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    loadingContainer: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
    safeArea: { flex: 1 },
    scrollContent: { padding: 20 },
    header: { marginBottom: 24, marginTop: 10 },
    title: { fontSize: 28, fontWeight: '900', color: 'white', letterSpacing: -0.5 },
    
    profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 32 },
    avatarContainer: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(34, 211, 238, 0.1)', borderWidth: 1, borderColor: 'rgba(34, 211, 238, 0.3)', alignItems: 'center', justifyContent: 'center', marginRight: 20 },
    profileInfo: { flex: 1 },
    userName: { fontSize: 20, fontWeight: '900', color: 'white', marginBottom: 4 },
    userEmail: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginBottom: 12 },
    badges: { flexDirection: 'row', gap: 8 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(34, 211, 238, 0.15)', borderWidth: 1, borderColor: 'rgba(34, 211, 238, 0.2)' },
    adminBadge: { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.2)' },
    badgeText: { fontSize: 10, fontWeight: '900', color: 'white', textTransform: 'uppercase' },

    section: { marginBottom: 32 },
    sectionTitle: { fontSize: 12, fontWeight: '900', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, paddingLeft: 8 },
    menuCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
    menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    menuItemText: { fontSize: 15, fontWeight: '700', color: 'white' },
    menuItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    menuItemValue: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginLeft: 48 },

    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(248, 113, 113, 0.1)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(248, 113, 113, 0.2)', gap: 8 },
    logoutBtnText: { color: '#f87171', fontSize: 15, fontWeight: '900' },
    versionText: { textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '700', marginTop: 24 }
});

export default ProfileScreen;
