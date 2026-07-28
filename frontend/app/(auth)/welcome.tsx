import React from 'react';
import { View, Text, StyleSheet, Pressable, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/theme/ThemeProvider';
import { spacing, radius } from '@/src/theme/tokens';

export default function Welcome() {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]} testID="welcome-screen">
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1628744876497-eb30460be9f6?w=1200' }}
        style={styles.hero}
        imageStyle={{ opacity: theme.mode === 'dark' ? 0.55 : 0.9 }}
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)', theme.surface]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.brandRow}>
          <View style={[styles.brandDot, { backgroundColor: theme.brandPrimary }]}>
            <Ionicons name="home" size={22} color={theme.onBrandPrimary} />
          </View>
          <Text style={[styles.brandText, { color: '#fff' }]}>HomeFlow</Text>
        </View>
      </ImageBackground>

      <View style={styles.bottom}>
        <Text style={[styles.title, { color: theme.onSurface }]} testID="welcome-title">
          Sua casa, {'\n'}suas finanças, {'\n'}sua rotina.
        </Text>
        <Text style={[styles.subtitle, { color: theme.onSurfaceTertiary }]}>
          O app premium para casais e famílias organizarem tudo em um só lugar.
        </Text>

        <Pressable
          testID="get-started-button"
          onPress={() => router.push('/(auth)/register')}
          style={[styles.primaryBtn, { backgroundColor: theme.brandPrimary }]}
        >
          <Text style={[styles.primaryBtnText, { color: theme.onBrandPrimary }]}>
            Começar agora
          </Text>
        </Pressable>

        <Pressable testID="go-to-login-button" onPress={() => router.push('/(auth)/login')} style={styles.linkBtn}>
          <Text style={[styles.linkText, { color: theme.onSurfaceSecondary }]}>
            Já tenho conta • <Text style={{ color: theme.brandPrimary, fontWeight: '700' }}>Entrar</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { height: '55%', justifyContent: 'flex-start', paddingTop: 80, paddingHorizontal: spacing.xl },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandDot: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  brandText: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  bottom: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontSize: 34, fontWeight: '700', letterSpacing: -1, lineHeight: 40 },
  subtitle: { fontSize: 16, marginTop: spacing.md, lineHeight: 22 },
  primaryBtn: { marginTop: 'auto', height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { fontSize: 16, fontWeight: '700' },
  linkBtn: { marginTop: spacing.lg, alignItems: 'center' },
  linkText: { fontSize: 15 },
});
