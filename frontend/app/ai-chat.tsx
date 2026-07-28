import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/theme/ThemeProvider';
import { useApi } from '@/src/auth/AuthProvider';
import { spacing, radius } from '@/src/theme/tokens';

type Msg = { role: 'user'|'assistant'; text: string; id: string };

const SUGGESTIONS = [
  'Quanto gastei esse mês?',
  'Sugira formas de economizar',
  'Quanto falta para minha meta?',
  'Monte uma lista de compras semanal',
];

export default function AiChat() {
  const { theme } = useTheme();
  const api = useApi();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: 'welcome', role: 'assistant', text: 'Olá! Sou a IA do HomeFlow. Posso te ajudar a entender suas finanças, sugerir economias, organizar tarefas e muito mais. O que você quer saber?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || loading) return;
    const userMsg: Msg = { id: `u-${Date.now()}`, role: 'user', text: message };
    setMsgs(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    try {
      const res = await api('/ai/chat', { method: 'POST', body: JSON.stringify({ message }) });
      const bot: Msg = { id: `a-${Date.now()}`, role: 'assistant', text: res.reply || '...' };
      setMsgs(prev => [...prev, bot]);
    } catch (e: any) {
      setMsgs(prev => [...prev, { id: `e-${Date.now()}`, role: 'assistant', text: `Erro: ${e.message || 'não consegui responder agora.'}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.surface }} testID="ai-chat-screen">
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: spacing.xl, paddingBottom: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 0.5, borderBottomColor: theme.divider }}>
        <Pressable testID="chat-close" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={theme.onSurface} />
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={[styles.aiDot, { backgroundColor: theme.brandPrimary }]}>
            <Ionicons name="sparkles" size={13} color={theme.onBrandPrimary} />
          </View>
          <Text style={{ color: theme.onSurface, fontSize: 16, fontWeight: '700' }}>Assistente IA</Text>
        </View>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
        {msgs.map(m => (
          <View key={m.id} style={{ marginBottom: spacing.md, flexDirection: 'row', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <View style={[styles.bubble, m.role === 'user'
              ? { backgroundColor: theme.brandPrimary, borderBottomRightRadius: 4 }
              : { backgroundColor: theme.surfaceSecondary, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: theme.border }]}>
              <Text style={{ color: m.role === 'user' ? theme.onBrandPrimary : theme.onSurface, fontSize: 15, lineHeight: 21 }}>{m.text}</Text>
            </View>
          </View>
        ))}
        {loading && (
          <View style={{ flexDirection: 'row' }}>
            <View style={[styles.bubble, { backgroundColor: theme.surfaceSecondary, borderWidth: 1, borderColor: theme.border }]}>
              <ActivityIndicator size="small" color={theme.brandPrimary} />
            </View>
          </View>
        )}
      </ScrollView>

      {msgs.length <= 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 8, paddingBottom: spacing.md }}>
          {SUGGESTIONS.map(s => (
            <Pressable key={s} testID={`suggestion-${s}`} onPress={() => send(s)} style={[styles.suggestion, { borderColor: theme.border, backgroundColor: theme.surfaceSecondary }]}>
              <Text style={{ color: theme.onSurfaceSecondary, fontSize: 13 }}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <View style={{ flexDirection: 'row', gap: 8, padding: spacing.md, paddingBottom: Math.max(insets.bottom, spacing.md), borderTopWidth: 0.5, borderTopColor: theme.divider, backgroundColor: theme.surface }}>
        <TextInput
          testID="chat-input"
          value={input}
          onChangeText={setInput}
          placeholder="Pergunte algo..."
          placeholderTextColor={theme.onSurfaceTertiary}
          style={{ flex: 1, minHeight: 46, maxHeight: 100, borderRadius: 23, paddingHorizontal: 18, color: theme.onSurface, fontSize: 15, backgroundColor: theme.surfaceSecondary, borderWidth: 1, borderColor: theme.border }}
          multiline
        />
        <Pressable testID="chat-send" onPress={() => send()} disabled={loading || !input.trim()} style={[styles.sendBtn, { backgroundColor: theme.brandPrimary, opacity: loading || !input.trim() ? 0.5 : 1 }]}>
          <Ionicons name="arrow-up" size={20} color={theme.onBrandPrimary} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  aiDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  suggestion: { flexShrink: 0, paddingHorizontal: 14, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sendBtn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
});
