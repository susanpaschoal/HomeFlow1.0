import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ImageBackground, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/theme/ThemeProvider';
import { useAuth, useApi } from '@/src/auth/AuthProvider';
import { spacing, radius, shadow } from '@/src/theme/tokens';

function currency(n: number) {
  return `R$ ${n.toFixed(2).replace('.', ',')}`;
}

const AI_QUOTES = [
  'Pequenos passos hoje constroem a casa dos seus sonhos amanhã.',
  'Organização é o primeiro passo para tranquilidade financeira.',
  'Um lar bem cuidado é um lar feliz.',
  'Economizar não é abrir mão, é planejar melhor.',
];

export default function Home() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const api = useApi();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [summary, setSummary] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const quote = AI_QUOTES[new Date().getDate() % AI_QUOTES.length];

  const load = useCallback(async () => {
    try {
      const data = await api('/dashboard/summary');
      setSummary(data);
    } catch {}
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const total = summary?.total_balance || 0;
  const income = summary?.month_income || 0;
  const expense = summary?.month_expense || 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }} testID="home-screen">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.brandPrimary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO */}
        <ImageBackground
          source={{ uri: theme.mode === 'dark'
            ? 'https://images.pexels.com/photos/14875811/pexels-photo-14875811.jpeg?w=1200'
            : 'https://images.unsplash.com/photo-1628744876497-eb30460be9f6?w=1200' }}
          style={[styles.hero, { paddingTop: insets.top + 12 }]}
          imageStyle={{ opacity: theme.mode === 'dark' ? 0.5 : 0.85 }}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.85)']}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Header row */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.helloSmall}>Olá,</Text>
              <Text style={styles.helloBig} numberOfLines={1}>{user?.name?.split(' ')[0]} 👋</Text>
            </View>
            <Pressable testID="agenda-btn" onPress={() => router.push('/agenda')} style={styles.iconBtn}>
              <Ionicons name="calendar-outline" size={22} color="#fff" />
            </Pressable>
            <Pressable testID="ai-fab-header" onPress={() => router.push('/ai-chat')} style={styles.iconBtn}>
              <Ionicons name="sparkles-outline" size={22} color="#fff" />
            </Pressable>
            <Pressable testID="profile-btn" onPress={() => router.push('/perfil')} style={[styles.avatar, { backgroundColor: theme.brandPrimary }]}>
              <Text style={{ color: theme.onBrandPrimary, fontWeight: '700' }}>{user?.name?.[0]?.toUpperCase() || 'U'}</Text>
            </Pressable>
          </View>

          {user?.is_founder && (
            <View style={styles.founderBadge} testID="founder-badge">
              <Ionicons name="diamond" size={12} color="#F5D67A" />
              <Text style={styles.founderText}>Premium Founder</Text>
            </View>
          )}

          {/* Financial hero card */}
          <BlurView tint="dark" intensity={40} style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Saldo total</Text>
            <Text style={styles.balanceValue} testID="total-balance">{currency(total)}</Text>
            <View style={styles.balanceRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.pillRow}>
                  <Ionicons name="arrow-up-circle" size={14} color="#7FE0B0" />
                  <Text style={styles.pillLabel}>Receitas</Text>
                </View>
                <Text style={styles.pillValue}>{currency(income)}</Text>
              </View>
              <View style={{ width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' }} />
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <View style={styles.pillRow}>
                  <Ionicons name="arrow-down-circle" size={14} color="#F5B190" />
                  <Text style={styles.pillLabel}>Despesas</Text>
                </View>
                <Text style={styles.pillValue}>{currency(expense)}</Text>
              </View>
            </View>
          </BlurView>
        </ImageBackground>

        {/* AI Quote */}
        <View style={[styles.aiQuote, { backgroundColor: theme.brandTertiary, borderColor: theme.border }]}>
          <View style={[styles.aiIcon, { backgroundColor: theme.brandPrimary }]}>
            <Ionicons name="sparkles" size={16} color={theme.onBrandPrimary} />
          </View>
          <Text style={[styles.aiQuoteText, { color: theme.onBrandTertiary }]}>{quote}</Text>
        </View>

        {/* Grid cards */}
        <View style={styles.grid}>
          <SmartCard
            testID="card-bills"
            icon="receipt-outline"
            title="Contas"
            value={`${summary?.wallets_count || 0}`}
            subtitle="carteiras"
            onPress={() => router.push('/(tabs)/financas')}
          />
          <SmartCard
            testID="card-tasks"
            icon="checkmark-done-outline"
            title="Tarefas"
            value={`${summary?.tasks_pending || 0}`}
            subtitle="pendentes"
            onPress={() => router.push('/(tabs)/tarefas')}
          />
          <SmartCard
            testID="card-shopping"
            icon="cart-outline"
            title="Compras"
            value={`${summary?.shopping_pending || 0}`}
            subtitle="itens"
            onPress={() => router.push('/(tabs)/mercado')}
          />
          <SmartCard
            testID="card-events"
            icon="calendar-outline"
            title="Agenda"
            value={`${summary?.next_events?.length || 0}`}
            subtitle="eventos"
            onPress={() => router.push('/agenda')}
          />
        </View>

        {/* Upcoming */}
        {summary?.upcoming_tasks?.length > 0 && (
          <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.lg }}>
            <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>Próximas tarefas</Text>
            {summary.upcoming_tasks.slice(0, 3).map((t: any) => (
              <View key={t.id} style={[styles.row, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                <View style={[styles.dot, { backgroundColor: t.priority === 'high' ? theme.error : t.priority === 'medium' ? theme.warning : theme.brandPrimary }]} />
                <Text style={[styles.rowTitle, { color: theme.onSurface }]} numberOfLines={1}>{t.title}</Text>
                <Text style={{ color: theme.onSurfaceTertiary, fontSize: 12 }}>{t.category}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Goals */}
        {summary?.goals?.length > 0 && (
          <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.lg }}>
            <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>Metas</Text>
            {summary.goals.slice(0, 3).map((g: any) => {
              const pct = Math.min(100, (g.saved / g.target) * 100);
              return (
                <View key={g.id} style={[styles.goal, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[styles.rowTitle, { color: theme.onSurface }]}>{g.name}</Text>
                    <Text style={{ color: theme.onSurfaceTertiary, fontSize: 12 }}>{pct.toFixed(0)}%</Text>
                  </View>
                  <View style={[styles.progressBg, { backgroundColor: theme.surfaceTertiary }]}>
                    <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: theme.brandPrimary }]} />
                  </View>
                  <Text style={{ color: theme.onSurfaceTertiary, fontSize: 12, marginTop: 4 }}>
                    {currency(g.saved)} de {currency(g.target)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SmartCard({ testID, icon, title, value, subtitle, onPress }: any) {
  const { theme } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} style={[styles.smartCard, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }, shadow(theme.mode)]}>
      <View style={[styles.smartIcon, { backgroundColor: theme.brandTertiary }]}>
        <Ionicons name={icon} size={18} color={theme.brandPrimary} />
      </View>
      <Text style={[styles.smartValue, { color: theme.onSurface }]}>{value}</Text>
      <Text style={[styles.smartTitle, { color: theme.onSurface }]}>{title}</Text>
      <Text style={[styles.smartSub, { color: theme.onSurfaceTertiary }]}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { height: 340, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, justifyContent: 'space-between' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  helloSmall: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  helloBig: { color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  iconBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  founderBadge: { position: 'absolute', top: Platform.OS === 'ios' ? 70 : 55, right: spacing.xl, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 0.5, borderColor: 'rgba(245,214,122,0.4)' },
  founderText: { color: '#F5D67A', fontSize: 10, fontWeight: '700' },
  balanceCard: { borderRadius: radius.lg, padding: spacing.lg, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.25)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)' },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  balanceValue: { color: '#fff', fontSize: 32, fontWeight: '700', letterSpacing: -1, marginTop: 4 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.md },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pillLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  pillValue: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 2 },
  aiQuote: { marginHorizontal: spacing.xl, marginTop: spacing.lg, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1 },
  aiIcon: { width: 32, height: 32, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  aiQuoteText: { flex: 1, fontSize: 13, lineHeight: 18, fontStyle: 'italic' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.xl, marginTop: spacing.lg, gap: spacing.md },
  smartCard: { width: '48%', borderRadius: radius.md, padding: spacing.lg, borderWidth: 1 },
  smartIcon: { width: 32, height: 32, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  smartValue: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  smartTitle: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  smartSub: { fontSize: 11, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.4, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowTitle: { flex: 1, fontSize: 14, fontWeight: '600' },
  goal: { borderRadius: radius.md, padding: spacing.md, borderWidth: 1, marginBottom: spacing.sm },
  progressBg: { height: 6, borderRadius: 999, marginTop: spacing.sm, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
});
