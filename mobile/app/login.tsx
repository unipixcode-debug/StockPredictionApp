import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Activity, ShieldCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './_layout';

const { width } = Dimensions.get('window');

const LoginScreen = () => {
    const auth = useAuth();
    const router = useRouter();

    const handleLogin = () => {
        console.log('Login: Action triggered');
        auth.login();
        
        // Use the auth state to determine if we should redirect
        // Since login() updates state, the global useEffect in _layout.tsx 
        // should handle the redirect automatically.
        // This setTimeout is only a fallback for very slow renders.
        setTimeout(() => {
            console.log('Login: Fallback check - User:', !!auth.user);
            if (auth.user) {
                router.replace('/(tabs)');
            }
        }, 800);
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.content}>
                    <View style={styles.logoContainer}>
                        <Activity size={48} color="#22d3ee" />
                    </View>

                    <Text style={styles.title}>PredictPro</Text>
                    <Text style={styles.subtitle}>
                        Gelişmiş piyasa analizi ve tahmin platformu.{"\n"}Akıllı yatırım kararları için yanındayız.
                    </Text>

                    <TouchableOpacity 
                        onPress={handleLogin}
                        activeOpacity={0.9}
                        style={styles.loginButton}
                    >
                        <Image 
                            source={{ uri: 'https://www.google.com/favicon.ico' }} 
                            style={{ width: 22, height: 22 }} 
                        />
                        <Text style={styles.loginButtonText}>Google ile Giriş Yap</Text>
                    </TouchableOpacity>

                    <View style={styles.badge}>
                        <ShieldCheck size={14} color="#22d3ee" />
                        <Text style={styles.badgeText}>SECURE AI ANALYSIS</Text>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>POWERED BY ADVANCED MARKET ENGINE</Text>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    safeArea: {
        flex: 1,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    logoContainer: {
        width: 96,
        height: 96,
        backgroundColor: 'rgba(34, 211, 238, 0.1)',
        borderRadius: 35,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
        borderWidth: 1,
        borderColor: 'rgba(34, 211, 238, 0.2)',
    },
    title: {
        fontSize: 48,
        fontWeight: '900',
        color: '#ffffff',
        marginBottom: 12,
        letterSpacing: -2,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.5)',
        textAlign: 'center',
        lineHeight: 24,
        fontWeight: '500',
        marginBottom: 64,
    },
    loginButton: {
        width: '100%',
        backgroundColor: '#ffffff',
        height: 64,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        shadowColor: "#ffffff",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 30,
        elevation: 10,
    },
    loginButtonText: {
        color: '#0f172a',
        fontWeight: '700',
        fontSize: 18,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 40,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 99,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    badgeText: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.4)',
        fontWeight: '700',
        letterSpacing: 2,
    },
    footer: {
        position: 'absolute',
        bottom: 48,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.2)',
        fontWeight: '700',
        letterSpacing: 3,
    },
});

export default LoginScreen;
