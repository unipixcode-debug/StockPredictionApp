import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, BrainCircuit, User, Bot, Trash2, Coins, AlertTriangle, Sparkles } from 'lucide-react-native';
import { Config } from '@/constants/Config';
import { useAuth } from '../_layout';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const ChatbotScreen = () => {
  const { user, updateCredits } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Merhaba! Ben PredictPro AI. Finansal piyasalar, kripto paralar veya hisse senetleri hakkında merak ettiğin her şeyi bana sorabilirsin.',
      timestamp: new Date(),
    }
  ]);

  // Load history from AsyncStorage
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const saved = await AsyncStorage.getItem('chat_history');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Convert strings back to Date objects
            const formatted = parsed.map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp)
            }));
            setMessages(formatted);
          }
        }
      } catch (e) {
        console.error("Failed to load chat history", e);
      }
    };
    loadHistory();
  }, []);

  // Save history to AsyncStorage
  useEffect(() => {
    const saveHistory = async () => {
      try {
        if (messages.length > 0) {
          await AsyncStorage.setItem('chat_history', JSON.stringify(messages));
        }
      } catch (e) {
        console.error("Failed to save chat history", e);
      }
    };
    saveHistory();
  }, [messages]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<any>(null);

  const quickActions = [
    "BTC Tahmini",
    "Market Durumu",
    "Analiz Yap",
    "En Çok Artanlar"
  ];

  const scrollToEnd = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSend = async (text: string = input) => {
    if (!text.trim() || loading) return;
    if (!user || user.credits <= 0) {
      alert('Yetersiz kredi! Lütfen kredi yükleyin.');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    scrollToEnd();

    try {
      const response = await fetch(`${Config.API_BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });

      const data = await response.json();

      if (data.success && data.reply) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);
        
        if (data.newCredits !== undefined) {
          updateCredits(data.newCredits);
        }
      } else {
        throw new Error(data.error || 'Bağlantı hatası');
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Üzgünüm, şu an bağlantı sorunu yaşıyorum. Lütfen biraz sonra tekrar deneyin.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  };

  const clearChat = () => {
    setMessages([{
      id: '1',
      role: 'assistant',
      content: 'Sohbet temizlendi. Nasıl yardımcı olabilirim?',
      timestamp: new Date(),
    }]);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <View style={styles.logoBadge}>
              <BrainCircuit color="#22d3ee" size={24} />
            </View>
            <View>
              <Text style={styles.headerTitle}>PredictPro AI</Text>
              <View style={styles.statusContainer}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Aktif (Gemini 2.5 Flash)</Text>
              </View>
            </View>
          </View>
          <View style={styles.headerActions}>
            <View style={styles.creditBadge}>
              <Coins size={14} color="#f59e0b" />
              <Text style={styles.creditText}>{user?.credits || 0}</Text>
            </View>
            <TouchableOpacity onPress={clearChat} style={styles.headerButton}>
              <Trash2 size={20} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </View>
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView 
            ref={scrollViewRef}
            style={styles.chatContainer}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((msg) => (
              <View key={msg.id} style={[
                styles.messageWrapper,
                msg.role === 'user' ? styles.userWrapper : styles.aiWrapper
              ]}>
                <View style={[
                  styles.messageBubble,
                  msg.role === 'user' ? styles.userBubble : styles.aiBubble
                ]}>
                  {msg.role === 'assistant' && (
                    <View style={styles.aiIconBadge}>
                      <Sparkles size={12} color="#0f172a" />
                    </View>
                  )}
                  <Text style={[
                      styles.messageText,
                      msg.role === 'user' ? styles.userText : styles.aiText
                  ]}>
                    {msg.content}
                  </Text>
                  
                  {msg.role === 'assistant' && msg.content.includes(" yatırım tavsiyesi değildir") && (
                    <View style={styles.disclaimerBox}>
                      <AlertTriangle size={12} color="#f59e0b" />
                      <Text style={styles.disclaimerText}>Yasal Uyarı Aktif</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.timestampText}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ))}
            
            {loading && (
              <View style={[styles.messageWrapper, styles.aiWrapper]}>
                <View style={[styles.messageBubble, styles.aiBubble, styles.loadingBubble]}>
                  <ActivityIndicator size="small" color="#22d3ee" />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input Area */}
          <View style={styles.inputSection}>
            {messages.length < 3 && !loading && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActions}>
                    {quickActions.map((action, i) => (
                        <TouchableOpacity 
                            key={i} 
                            style={styles.quickActionButton}
                            onPress={() => handleSend(action)}
                        >
                            <Text style={styles.quickActionText}>{action}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Bir mesaj yazın..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={500}
              />
              <TouchableOpacity 
                style={[styles.sendButton, (!input.trim() || loading) && styles.sendButtonDisabled]}
                onPress={() => handleSend()}
                disabled={!input.trim() || loading}
              >
                <Send size={20} color={!input.trim() || loading ? "rgba(15, 23, 42, 0.4)" : "#0f172a"} />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  safeArea: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBadge: { 
    width: 44, 
    height: 44, 
    backgroundColor: 'rgba(34, 211, 238, 0.1)', 
    borderRadius: 14, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: 'white' },
  statusContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80' },
  statusText: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10 },
  creditBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: 'rgba(245, 158, 11, 0.1)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)'
  },
  creditText: { color: '#f59e0b', fontWeight: '800', fontSize: 13 },
  chatContainer: { flex: 1 },
  chatContent: { padding: 20, paddingBottom: 30 },
  messageWrapper: { marginBottom: 20, maxWidth: '85%' },
  userWrapper: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  aiWrapper: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  messageBubble: { 
    padding: 16, 
    borderRadius: 22, 
    position: 'relative',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userBubble: { 
    backgroundColor: '#22d3ee', 
    borderBottomRightRadius: 4,
  },
  aiBubble: { 
    backgroundColor: 'rgba(255,255,255,0.03)', 
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  loadingBubble: { paddingVertical: 12, paddingHorizontal: 20 },
  messageText: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
  userText: { color: '#0f172a', fontWeight: '700' },
  aiText: { color: 'rgba(255,255,255,0.9)' },
  timestampText: { fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 6, fontWeight: '600' },
  aiIconBadge: { 
    position: 'absolute', 
    top: -8, 
    left: -8, 
    width: 20, 
    height: 20, 
    backgroundColor: '#22d3ee', 
    borderRadius: 10, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0f172a'
  },
  disclaimerBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    marginTop: 12, 
    paddingTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: 'rgba(255,255,255,0.05)' 
  },
  disclaimerText: { fontSize: 11, color: '#f59e0b', fontWeight: '700', fontStyle: 'italic' },
  inputSection: { 
    padding: 20, 
    paddingTop: 10, 
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  quickActions: { flexDirection: 'row', marginBottom: 16 },
  quickActionButton: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    backgroundColor: 'rgba(255,255,255,0.03)', 
    borderRadius: 12, 
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  quickActionText: { color: 'rgba(34, 211, 238, 0.8)', fontSize: 12, fontWeight: '700' },
  inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    gap: 12, 
    backgroundColor: 'rgba(255,255,255,0.03)', 
    borderRadius: 20, 
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  input: { 
    flex: 1, 
    color: 'white', 
    fontSize: 15, 
    paddingHorizontal: 12, 
    paddingTop: 10, 
    paddingBottom: 10,
    maxHeight: 100,
  },
  sendButton: { 
    width: 44, 
    height: 44, 
    backgroundColor: '#22d3ee', 
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  sendButtonDisabled: { backgroundColor: 'rgba(255,255,255,0.05)' },
});

export default ChatbotScreen;
