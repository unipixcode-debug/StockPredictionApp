import "../global.css";
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState, createContext, useContext } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sparkles } from 'lucide-react-native';

// Simple Auth Context
const AuthContext = createContext<any>(null);
export const useAuth = () => useContext(AuthContext);

export default function RootLayout() {
  const segments = useSegments();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // Auth Redirect Logic
  useEffect(() => {
    // Wait for segments to be populated (router is ready)
    if (!segments) return;

    const inAuthGroup = segments[0] === '(tabs)';
    const isAuthPath = segments[0] === 'login';
    const isDetailPath = segments[0] === 'prediction-detail' || segments[0] === 'market-chart';
    
    console.log('Auth Check Logic:', { user: !!user, segments: segments[0], inAuthGroup, isAuthPath, isDetailPath });

    if (!user && (inAuthGroup || isDetailPath)) {
      console.log('Redirecting to /login because user is not authenticated');
      router.replace('/login');
    } else if (user && isAuthPath) {
      console.log('Redirecting to dashboard because user is authenticated');
      // Navigate to the root of the tabs group
      router.replace('/' as any);
    }
  }, [user, segments]);

  const authContextValue = {
    user,
    login: () => {
        console.log('AuthContext: Logging in...');
        setUser({ 
          name: 'Geliştirici', 
          email: 'admin@predictpro.com',
          credits: 1000 
        });
    },
    logout: async () => {
      await AsyncStorage.removeItem('chat_history');
      setUser(null);
    },
    updateCredits: (newCredits: number) => {
      setUser((prev: any) => prev ? { ...prev, credits: newCredits } : prev);
    }
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      <ThemeProvider value={DarkTheme}>
        <View style={styles.container}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0f172a' } }}>
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="prediction-detail" options={{ presentation: 'modal' }} />
            <Stack.Screen name="market-chart" options={{ presentation: 'card' }} />
          </Stack>
          
          {user && <GlobalCreditBadge credits={user.credits} />}
        </View>
        <StatusBar style="light" />
      </ThemeProvider>
    </AuthContext.Provider>
  );
}

function GlobalCreditBadge({ credits }: { credits: number }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <TouchableOpacity 
      activeOpacity={0.8}
      onPress={() => router.push('/credits' as any)}
      style={[
        styles.badgeContainer, 
        { top: Math.max(insets.top, 10), right: 20 }
      ]}
    >
      <View style={styles.badgeContent}>
        <View style={styles.badgeIcon}>
          <Sparkles color="#22d3ee" size={14} />
        </View>
        <Text style={styles.badgeText}>{credits}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  badgeContainer: {
    position: 'absolute',
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 9999,
  },
  badgeContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeIcon: {
    width: 24,
    height: 24,
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#22d3ee',
    fontSize: 14,
    fontWeight: '900',
  }
});
