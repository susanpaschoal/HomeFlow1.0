import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Linking, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/theme/ThemeProvider';
import { useAuth, useApi } from '@/src/auth/AuthProvider';
import { spacing, radius } from '@/src/theme/tokens';

type Cycle = 'mensal' | 'anual';

interface PlanDef {
  key: string;
  title: string;
  price: number;
  cycle: Cycle;
  featured?: boolean;
  description: string;
  features: string[];
  mp_link: string;
}

const PLANS: Record<string, { title: string; featured?: boolean; description: string; features: string[]; mensal: { key: string; price: number; link: string }; anual: { key: string; price: number; link: string } }> = {
  individual: {
    title: 'Premium Individual',
    description: 'Todos os recursos para 1 usuário.',
    features: ['1 usuário', 'Carteiras ilimitadas', 'Metas ilimitadas', 'IA ilimitada', 'Gráficos completos'],
    mensal: { key: 'individual_mensal', price: 19.90, link: 'https://mpago.la/11kaLFt' },
    anual: { key: 'individual_anual', price: 199.90, link: 'https://mpago.la/1azKh3g' },
  },
  casal: {
    title: 'Premium Casal',
    featured: true,
    description: 'Até 2 usuários, sincronização completa, IA ilimitada.',
    features: ['Até 2 usuários', 'Sincronização em tempo real', 'IA ilimitada', 'Carteira compartilhada', 'Todas as features'],
    mensal: { key: 'casal_mensal', price: 29.90, link: 'https://mpago.la/1HWw2mE' },
    anual: { key: 'casal_anual', price: 299.90, link: 'https://mpago.la/2chT6rL' },
  },
  familia: {
    title: 'Premium Família',
    description: 'Até 6 membros, recursos completos.',
    features: ['Até 6 membros', 'Papéis (Admin, Parceiro, Filho, Convidado)', 'IA ilimitada', 'Todas as features Premium'],
    mensal: { key: 'familia_mensal', price: 39.90, link: 'https://mpago.la/1nFyCDR' },
    anual: { key: 'familia_anual', price: 399.90, link: 'https://mpago.la/1H7nfXb' },
  },
};

function money(n: number) {
  return `R$ ${n.toFixed(2).replace('.', ',')}`;
}

export default function Assinatura() {
  const { theme } = useTheme();
  const { user, refresh } = useAuth();
  const api = useApi();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [cycle, setCycle] = useState<Cycle>('mensal');
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState('');
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  useEffect(() => { refresh().catch(() => {}); }, [refresh]);

  const isFounder = !!user?.is_founder;
  const isPremium = !!user?.is_premium && !isFounder;
  const currentPlan = user?.plano || 'gratuito';

  const openPlan = useCallback(async (planKey: string, mpLink: string) => {
    setLoadingKey(planKey);
    try {
      await api('/subscriptions/request', { method: 'POST', body: JSON.stringify({ plan_key: planKey }) });
      const supported = await Linking.canOpenURL(mpLink);
      if (supported) {
        await Linking.openURL(mpLink);
      }
      setConfirmMsg('Recebemos sua solicitação de assinatura. Após a confirmação do pagamento, seu plano Premium será ativado manualmente. Você receberá o acesso em até 24 horas.');
      setShowConfirm(true);
    } catch (e: any) {
      setConfirmMsg(`Não foi possível abrir o link: ${e.message || 'erro desconhecido'}`);
      setShowConfirm(true);
    } finally {
      setLoadingKey(null);
    }
  }, [api]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }} testID="subscription-screen">
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: spacing.xl, paddingBottom: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 0.5, borderBottomColor: theme.divider }}>
        <Pressable testID="sub-close" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={theme.onSurface} />
        </Pressable>
        <Text style={{ color: theme.onSurface, fontSize: 17, fontWeight: '700' }}>Planos</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {isFounder ? (
          <View style={[styles.founderCard, { backgroundColor: theme.surfaceInverse }]}>
            <Ionicons name="diamond" size={40} color="#F5D67A" />
            <Text style={{ color: '#F5D67A', fontSize: 22, fontWeight: '800', marginTop: spacing.md }}>Premium Founder ✔</Text>
            <Text style={{ color: theme.onSurfaceInverse, textAlign: 'center', marginTop: spacing.sm, fontSize: 14, opacity: 0.8 }}>
              Você tem acesso vitalício a todos os recursos do HomeFlow. Obrigado por acreditar no projeto.
            </Text>
          </View>
        ) : (
          <>
            <Text style={{ color: theme.onSurface, fontSize: 28, fontWeight: '800', letterSpacing: -0.6, marginBottom: 4 }}>Escolha seu plano</Text>
            <Text style={{ color: theme.onSurfaceTertiary, fontSize: 14, marginBottom: spacing.lg }}>
              {isPremium
                ? `Você é Premium (${user?.plano || 'ativo'}). Você pode fazer upgrade a qualquer momento.`
                : 'Desbloqueie recursos ilimitados e a IA avançada.'}
            </Text>

            {/* Cycle toggle */}
            <View style={[styles.cycleWrap, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
              {(['mensal', 'anual'] as Cycle[]).map(c => (
                <Pressable
                  key={c}
                  testID={`cycle-${c}`}
                  onPress={() => setCycle(c)}
                  style={[styles.cycleBtn, cycle === c && { backgroundColor: theme.brandPrimary }]}
                >
                  <Text style={{ color: cycle === c ? theme.onBrandPrimary : theme.onSurfaceSecondary, fontWeight: '700', fontSize: 13 }}>
                    {c === 'mensal' ? 'Mensal' : 'Anual'}
                  </Text>
                  {c === 'anual' && (
                    <View style={[styles.saveBadge, { backgroundColor: cycle === c ? 'rgba(255,255,255,0.2)' : theme.brandTertiary }]}>
                      <Text style={{ color: cycle === c ? '#fff' : theme.brandPrimary, fontSize: 10, fontWeight: '700' }}>−17%</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>

            {/* Free plan */}
            <View style={[styles.card, { borderColor: currentPlan === 'gratuito' ? theme.brandPrimary : theme.border, backgroundColor: theme.surfaceSecondary }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planTitle, { color: theme.onSurface }]}>Gratuito</Text>
                  <Text style={{ color: theme.onSurfaceTertiary, fontSize: 13, marginTop: 2 }}>Perfeito para começar</Text>
                </View>
                <View>
                  <Text style={[styles.planPrice, { color: theme.onSurface }]}>R$ 0</Text>
                  <Text style={{ color: theme.onSurfaceTertiary, fontSize: 11, textAlign: 'right' }}>para sempre</Text>
                </View>
              </View>
              <Feature text="Até 2 carteiras" />
              <Feature text="Até 2 metas financeiras" />
              <Feature text="3 mensagens de IA por dia" />
              <Feature text="Tarefas, compras e agenda ilimitados" />
              <Feature text="Sem IA avançada" negative />
              {currentPlan === 'gratuito' && (
                <View style={[styles.currentTag, { backgroundColor: theme.brandTertiary }]}>
                  <Text style={{ color: theme.brandPrimary, fontWeight: '700', fontSize: 12 }}>Plano atual</Text>
                </View>
              )}
            </View>

            {/* Paid plans */}
            {(['individual', 'casal', 'familia'] as const).map(pkey => {
              const p = PLANS[pkey];
              const variant = p[cycle];
              const isLoading = loadingKey === variant.key;
              return (
                <View key={pkey} style={[styles.card, p.featured && { borderColor: theme.brandPrimary, borderWidth: 2 }, { backgroundColor: theme.surfaceSecondary }]}>
                  {p.featured && (
                    <View style={[styles.featuredTag, { backgroundColor: theme.brandPrimary }]}>
                      <Ionicons name="star" size={11} color={theme.onBrandPrimary} />
                      <Text style={{ color: theme.onBrandPrimary, fontSize: 10, fontWeight: '800' }}>MAIS ESCOLHIDO</Text>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.planTitle, { color: theme.onSurface }]}>{p.title}</Text>
                      <Text style={{ color: theme.onSurfaceTertiary, fontSize: 13, marginTop: 2 }}>{p.description}</Text>
                    </View>
                    <View>
                      <Text style={[styles.planPrice, { color: theme.onSurface }]}>{money(variant.price)}</Text>
                      <Text style={{ color: theme.onSurfaceTertiary, fontSize: 11, textAlign: 'right' }}>/{cycle === 'mensal' ? 'mês' : 'ano'}</Text>
                    </View>
                  </View>
                  {p.features.map(f => <Feature key={f} text={f} />)}
                  <Pressable
                    testID={`plan-btn-${variant.key}`}
                    onPress={() => openPlan(variant.key, variant.link)}
                    disabled={isLoading}
                    style={[styles.subscribeBtn, { backgroundColor: p.featured ? theme.brandPrimary : theme.onSurface, opacity: isLoading ? 0.6 : 1 }]}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={p.featured ? theme.onBrandPrimary : theme.surface} />
                    ) : (
                      <Text style={{ color: p.featured ? theme.onBrandPrimary : theme.surface, fontWeight: '700', fontSize: 15 }}>
                        Assinar {p.title.replace('Premium ', '')}
                      </Text>
                    )}
                  </Pressable>
                </View>
              );
            })}

            <Text style={{ color: theme.onSurfaceTertiary, fontSize: 12, textAlign: 'center', marginTop: spacing.lg, lineHeight: 18 }}>
              Pagamento processado pelo Mercado Pago. Após a confirmação, o Premium é ativado manualmente em até 24h. Sem renovação automática nesta versão.
            </Text>
          </>
        )}
      </ScrollView>

      <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
          <View style={{ backgroundColor: theme.surface, borderRadius: radius.lg, padding: spacing.xl, width: '100%', maxWidth: 380, alignItems: 'center' }}>
            <View style={[styles.checkCircle, { backgroundColor: theme.brandTertiary }]}>
              <Ionicons name="checkmark" size={30} color={theme.brandPrimary} />
            </View>
            <Text style={{ color: theme.onSurface, fontSize: 20, fontWeight: '700', marginTop: spacing.md, textAlign: 'center' }}>Solicitação recebida</Text>
            <Text style={{ color: theme.onSurfaceSecondary, fontSize: 14, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 }} testID="confirm-message">{confirmMsg}</Text>
            <Pressable testID="confirm-close" onPress={() => setShowConfirm(false)} style={{ marginTop: spacing.lg, backgroundColor: theme.brandPrimary, height: 48, paddingHorizontal: spacing.xl, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: theme.onBrandPrimary, fontWeight: '700' }}>Entendi</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Feature({ text, negative }: { text: string; negative?: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
      <Ionicons name={negative ? 'close-circle' : 'checkmark-circle'} size={16} color={negative ? theme.onSurfaceTertiary : theme.brandPrimary} />
      <Text style={{ color: negative ? theme.onSurfaceTertiary : theme.onSurfaceSecondary, fontSize: 13, flex: 1 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  founderCard: { alignItems: 'center', padding: spacing.xl, borderRadius: radius.lg, marginTop: spacing.xl },
  cycleWrap: { flexDirection: 'row', height: 48, borderRadius: radius.pill, padding: 4, marginBottom: spacing.lg, borderWidth: 1 },
  cycleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 999, gap: 8 },
  saveBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, position: 'relative' },
  planTitle: { fontSize: 18, fontWeight: '700' },
  planPrice: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  subscribeBtn: { marginTop: spacing.md, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  currentTag: { alignSelf: 'flex-start', marginTop: spacing.md, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  featuredTag: { position: 'absolute', top: -10, left: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  checkCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
