import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState, createContext, useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import 'react-native-reanimated';

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
    if (!segments || segments.length === 0) return;

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
      router.replace('/(tabs)');
    }
  }, [user, segments]);

  const authContextValue = {
    user,
    login: () => {
        console.log('AuthContext: Logging in...');
        setUser({ name: 'User' });
    },
    logout: () => setUser(null),
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
        </View>
        <StatusBar style="light" />
      </ThemeProvider>
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
});
