import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/theme/ThemeProvider';
import { useAuth } from '@/src/auth/AuthProvider';
import { spacing, radius } from '@/src/theme/tokens';

export default function Login() {
  const { theme } = useTheme();
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleLogin = async () => {
    setErr('');
    if (!email || !password) return setErr('Preencha email e senha');
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      setErr(e.message || 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: theme.surface }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: 80, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        <Pressable testID="back-button" onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={26} color={theme.onSurface} />
        </Pressable>

        <Text style={[styles.title, { color: theme.onSurface }]}>Bem-vindo{'\n'}de volta</Text>
        <Text style={[styles.sub, { color: theme.onSurfaceTertiary }]}>Entre para continuar organizando sua casa.</Text>

        <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
          <View style={[styles.input, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
            <Ionicons name="mail-outline" size={20} color={theme.onSurfaceTertiary} />
            <TextInput
              testID="login-email-input"
              placeholder="Email"
              placeholderTextColor={theme.onSurfaceTertiary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[styles.inputField, { color: theme.onSurface }]}
            />
          </View>
          <View style={[styles.input, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
            <Ionicons name="lock-closed-outline" size={20} color={theme.onSurfaceTertiary} />
            <TextInput
              testID="login-password-input"
              placeholder="Senha"
              placeholderTextColor={theme.onSurfaceTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={[styles.inputField, { color: theme.onSurface }]}
            />
          </View>
        </View>

        {err ? <Text testID="login-error" style={[styles.err, { color: theme.error }]}>{err}</Text> : null}

        <Pressable
          testID="login-submit-button"
          onPress={handleLogin}
          disabled={loading}
          style={[styles.primary, { backgroundColor: theme.brandPrimary, opacity: loading ? 0.7 : 1 }]}
        >
          {loading ? <ActivityIndicator color={theme.onBrandPrimary} /> : (
            <Text style={[styles.primaryText, { color: theme.onBrandPrimary }]}>Entrar</Text>
          )}
        </Pressable>

        <Pressable testID="go-to-register" onPress={() => router.push('/(auth)/register')} style={styles.footer}>
          <Text style={{ color: theme.onSurfaceTertiary }}>
            Não tem conta? <Text style={{ color: theme.brandPrimary, fontWeight: '700' }}>Cadastre-se</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  back: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center', marginBottom: spacing.lg },
  title: { fontSize: 32, fontWeight: '700', letterSpacing: -1, lineHeight: 38 },
  sub: { fontSize: 15, marginTop: spacing.sm },
  input: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, paddingHorizontal: spacing.lg, height: 56, borderWidth: 1, gap: 10 },
  inputField: { flex: 1, fontSize: 16 },
  err: { marginTop: spacing.md, fontSize: 14 },
  primary: { marginTop: spacing.xl, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 16, fontWeight: '700' },
  footer: { marginTop: spacing.lg, alignItems: 'center' },
});
