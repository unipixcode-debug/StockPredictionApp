import "../global.css";
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState, createContext, useContext } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sparkles } from 'lucide-react-native';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might cause this to error */
});

// Simple Auth Context
const AuthContext = createContext<any>(null);
export const useAuth = () => useContext(AuthContext);

export default function RootLayout() {
  const segments = useSegments();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [appIsReady, setAppIsReady] = useState(false);

  // Check initial login status
  useEffect(() => {
    async function prepare() {
      try {
        const userData = await AsyncStorage.getItem('user_data');
        if (userData) {
          setUser(JSON.parse(userData));
        }
        // Tell the application to render
        setAppIsReady(true);
      } catch (e) {
        console.error('Failed to load user data', e);
        setAppIsReady(true); // Still proceed
      }
    }
    prepare();
  }, []);

  // Hide splash screen when app is ready
  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync().catch(console.error);
    }
  }, [appIsReady]);

  // Auth Redirect Logic
  useEffect(() => {
    // Wait for segments to be populated (router is ready)
    if (!segments) return;

    const inAuthGroup = segments[0] === '(tabs)';
    const isAuthPath = segments[0] === 'login';
    const pathName = segments[0] as string;
    const isDetailPath = pathName === 'prediction-detail' || pathName === 'market-chart' || pathName === 'money-flow' || pathName === 'analysis' || pathName === 'market-360';
    
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
    login: async () => {
        console.log('AuthContext: Logging in...');
        const newUserData = { 
          name: 'Geliştirici', 
          email: 'admin@predictpro.com',
          credits: 1000 
        };
        setUser(newUserData);
        await AsyncStorage.setItem('user_data', JSON.stringify(newUserData));
    },
    logout: async () => {
      await AsyncStorage.removeItem('chat_history');
      await AsyncStorage.removeItem('user_data');
      setUser(null);
    },
    updateCredits: async (newCredits: number) => {
      setUser((prev: any) => {
        if (!prev) return prev;
        const updated = { ...prev, credits: newCredits };
        AsyncStorage.setItem('user_data', JSON.stringify(updated)).catch(console.error);
        return updated;
      });
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
