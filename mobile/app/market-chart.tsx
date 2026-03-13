import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, DollarSign, Repeat } from 'lucide-react-native';

const MarketChartScreen = () => {
    const params = useLocalSearchParams();
    const symbol = Array.isArray(params.symbol) ? params.symbol[0] : params.symbol;
    const name = Array.isArray(params.name) ? params.name[0] : params.name;
    
    const router = useRouter();
    const [currency, setCurrency] = useState<'USD' | 'TRY'>('USD');

    // Map common names to TradingView symbols with currency support
    const getTVSymbol = (s: string, cur: 'USD' | 'TRY') => {
        const mapping: Record<string, string> = {
            'BTC': cur === 'USD' ? 'BINANCE:BTCUSDT' : 'BINANCE:BTCTRY',
            'ETH': cur === 'USD' ? 'BINANCE:ETHUSDT' : 'BINANCE:ETHTRY',
            'Altın': cur === 'USD' ? 'TVC:GOLD' : 'OANDA:XAUTRY',
            'Gümüş': cur === 'USD' ? 'TVC:SILVER' : 'OANDA:XAGTRY',
            'Petrol': 'TVC:USOIL',
            'Bakır': 'TVC:COPPER',
            'Platin': 'NYMEX:PL1!',
            'Palladyum': 'NYMEX:PA1!',
            'Doğalgaz': 'NYMEX:NG1!',
            'Buğday': 'CBOT:ZW1!',
            'Mısır': 'CBOT:ZC1!',
            'Kahve': 'ICEUS:KC1!',
            'S&P500': 'FOREXCOM:SPXUSD',
            'Nasdaq': 'CURRENCYCOM:NAS100',
            'BIST100': 'BIST:XU100',
            'ABD 10Y': 'TVC:US10Y',
            'ABD 2Y': 'TVC:US02Y',
            'Almanya 10Y': 'TVC:DE10Y',
            'Japonya 10Y': 'TVC:JP10Y',
            'İngiltere 10Y': 'TVC:GB10Y',
            'Türkiye 10Y': 'TVC:TR10Y',
            'BTC Dominans': 'CRYPTOCAP:BTC.D',
            'Kripto Toplam': 'CRYPTOCAP:TOTAL',
            'Kripto Altcoin Toplam': 'CRYPTOCAP:TOTAL2',
            'Bitcoin': cur === 'USD' ? 'BINANCE:BTCUSDT' : 'BINANCE:BTCTRY',
            'Ethereum': cur === 'USD' ? 'BINANCE:ETHUSDT' : 'BINANCE:ETHTRY',
            'Solana': cur === 'USD' ? 'BINANCE:SOLUSDT' : 'BINANCE:SOLTRY',
            // Category Mappings
            'commodities': 'TVC:GOLD',
            'stocks': 'FOREXCOM:SPXUSD',
            'crypto': 'BINANCE:BTCUSDT',
            'bonds': 'TVC:US10Y'
        };
        
        // If it's a BIST stock like THYAO.IS, TV symbol is BIST:THYAO
        if (s.endsWith('.IS')) {
            return `BIST:${s.replace('.IS', '')}`;
        }

        return mapping[s] || s;
    };

    const tvSymbol = getTVSymbol(String(symbol || name), currency);

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
                body { margin: 0; padding: 0; background-color: #0f172a; }
                #chart-container { height: 100vh; width: 100vw; }
            </style>
        </head>
        <body>
            <div id="chart-container"></div>
            <script type="text/javascript" src="https://s3.tradingview.com/tv.js"></script>
            <script type="text/javascript">
                new TradingView.widget({
                    "autosize": true,
                    "symbol": "${tvSymbol}",
                    "interval": "D",
                    "timezone": "Etc/UTC",
                    "theme": "dark",
                    "style": "1",
                    "locale": "tr",
                    "toolbar_bg": "#0f172a",
                    "enable_publishing": false,
                    "hide_top_toolbar": false,
                    "hide_legend": false,
                    "save_image": false,
                    "container_id": "chart-container"
                });
            </script>
        </body>
        </html>
    `;

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ChevronLeft color="white" size={28} />
                    </TouchableOpacity>
                    
                    <View style={styles.titleContainer}>
                        <Text style={styles.headerTitle}>{name || symbol}</Text>
                        <Text style={styles.headerSubtitle}>{tvSymbol}</Text>
                    </View>

                    <TouchableOpacity 
                        onPress={() => setCurrency(currency === 'USD' ? 'TRY' : 'USD')}
                        style={styles.currencyToggle}
                    >
                        <Repeat size={16} color="#22d3ee" />
                        <Text style={styles.currencyText}>{currency}</Text>
                    </TouchableOpacity>
                </View>

                <WebView 
                    key={tvSymbol + currency} // Force reload on symbol/currency change
                    originWhitelist={['*']}
                    source={{ html: htmlContent }}
                    style={styles.webview}
                    startInLoadingState={true}
                    renderLoading={() => (
                        <View style={styles.loading}>
                            <ActivityIndicator color="#22d3ee" size="large" />
                        </View>
                    )}
                />
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    safeArea: { flex: 1 },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 20, 
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'space-between'
    },
    backButton: { padding: 5 },
    titleContainer: { flex: 1, marginLeft: 15 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: 'white' },
    headerSubtitle: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
    currencyToggle: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: 'rgba(34, 211, 238, 0.1)', 
        paddingVertical: 8, 
        paddingHorizontal: 12, 
        borderRadius: 12 
    },
    currencyText: { color: '#22d3ee', fontWeight: '800', fontSize: 14, marginLeft: 6 },
    webview: { flex: 1, backgroundColor: '#0f172a' },
    loading: { 
        position: 'absolute', 
        top: 0, left: 0, right: 0, bottom: 0, 
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#0f172a'
    }
});

export default MarketChartScreen;
