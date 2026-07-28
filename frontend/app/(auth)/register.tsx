import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/theme/ThemeProvider';
import { useAuth } from '@/src/auth/AuthProvider';
import { spacing, radius } from '@/src/theme/tokens';

export default function Register() {
  const { theme } = useTheme();
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [founderCode, setFounderCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handle = async () => {
    setErr('');
    if (!name || !email || !password) return setErr('Preencha todos os campos');
    if (password.length < 8) return setErr('A senha deve ter pelo menos 8 caracteres');
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password, founderCode.trim() || undefined);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      setErr(e.message || 'Erro ao criar conta');
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

        <Text style={[styles.title, { color: theme.onSurface }]}>Criar sua{'\n'}conta HomeFlow</Text>
        <Text style={[styles.sub, { color: theme.onSurfaceTertiary }]}>Comece grátis. Cancele quando quiser.</Text>

        <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
          <View style={[styles.input, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
            <Ionicons name="person-outline" size={20} color={theme.onSurfaceTertiary} />
            <TextInput testID="register-name-input" placeholder="Nome completo" placeholderTextColor={theme.onSurfaceTertiary} value={name} onChangeText={setName} style={[styles.inputField, { color: theme.onSurface }]} />
          </View>
          <View style={[styles.input, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
            <Ionicons name="mail-outline" size={20} color={theme.onSurfaceTertiary} />
            <TextInput testID="register-email-input" placeholder="Email" placeholderTextColor={theme.onSurfaceTertiary} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={[styles.inputField, { color: theme.onSurface }]} />
          </View>
          <View style={[styles.input, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
            <Ionicons name="lock-closed-outline" size={20} color={theme.onSurfaceTertiary} />
            <TextInput testID="register-password-input" placeholder="Senha (mín. 8)" placeholderTextColor={theme.onSurfaceTertiary} value={password} onChangeText={setPassword} secureTextEntry style={[styles.inputField, { color: theme.onSurface }]} />
          </View>
          <View style={[styles.input, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, opacity: 0.85 }]}>
            <Ionicons name="key-outline" size={20} color={theme.onSurfaceTertiary} />
            <TextInput testID="register-founder-code-input" placeholder="Código Founder (opcional)" placeholderTextColor={theme.onSurfaceTertiary} value={founderCode} onChangeText={setFounderCode} autoCapitalize="none" style={[styles.inputField, { color: theme.onSurface }]} />
          </View>
        </View>

        {err ? <Text testID="register-error" style={[styles.err, { color: theme.error }]}>{err}</Text> : null}

        <Pressable testID="register-submit-button" onPress={handle} disabled={loading} style={[styles.primary, { backgroundColor: theme.brandPrimary, opacity: loading ? 0.7 : 1 }]}>
          {loading ? <ActivityIndicator color={theme.onBrandPrimary} /> : (
            <Text style={[styles.primaryText, { color: theme.onBrandPrimary }]}>Criar conta</Text>
          )}
        </Pressable>

        <Pressable testID="go-to-login" onPress={() => router.push('/(auth)/login')} style={styles.footer}>
          <Text style={{ color: theme.onSurfaceTertiary }}>Já tenho conta? <Text style={{ color: theme.brandPrimary, fontWeight: '700' }}>Entrar</Text></Text>
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
