import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, RefreshControl, ActivityIndicator, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/theme/ThemeProvider';
import { useAuth, useApi } from '@/src/auth/AuthProvider';
import { spacing, radius } from '@/src/theme/tokens';

const PLANOS = ['gratuito', 'individual_mensal', 'individual_anual', 'casal_mensal', 'casal_anual', 'familia_mensal', 'familia_anual'];

export default function Admin() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const api = useApi();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'users' | 'requests'>('requests');
  const [users, setUsers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const [u, r] = await Promise.all([api('/admin/users'), api('/admin/subscription-requests')]);
      setUsers(u); setRequests(r);
    } catch {}
  }, [api]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (!user?.is_founder) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
        <Ionicons name="lock-closed" size={40} color={theme.onSurfaceTertiary} />
        <Text style={{ color: theme.onSurfaceTertiary, marginTop: spacing.md, textAlign: 'center' }}>
          Área restrita. Apenas contas Founder podem acessar o painel administrativo.
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: spacing.lg }}>
          <Text style={{ color: theme.brandPrimary, fontWeight: '700' }}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }} testID="admin-screen">
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: spacing.xl, paddingBottom: spacing.md, borderBottomWidth: 0.5, borderBottomColor: theme.divider }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable testID="admin-back" onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={theme.onSurface} />
          </Pressable>
          <Text style={{ color: theme.onSurface, fontSize: 17, fontWeight: '700' }}>Painel Admin</Text>
          <View style={{ width: 26 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.md }}>
          {(['requests', 'users'] as const).map(t => (
            <Pressable
              key={t}
              testID={`admin-tab-${t}`}
              onPress={() => setTab(t)}
              style={{ flex: 1, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: tab === t ? theme.brandPrimary : theme.border, backgroundColor: tab === t ? theme.brandPrimary : 'transparent' }}
            >
              <Text style={{ color: tab === t ? theme.onBrandPrimary : theme.onSurfaceSecondary, fontWeight: '700', fontSize: 13 }}>
                {t === 'requests' ? `Solicitações (${requests.length})` : `Usuários (${users.length})`}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.brandPrimary} />}
      >
        {tab === 'requests' && (
          requests.length === 0 ? (
            <Text style={{ color: theme.onSurfaceTertiary, textAlign: 'center', marginTop: spacing.xl }}>Nenhuma solicitação pendente.</Text>
          ) : requests.map(r => (
            <View key={r.id} style={[styles.card, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
              <Text style={{ color: theme.onSurface, fontWeight: '700', fontSize: 15 }}>{r.user_name} <Text style={{ color: theme.onSurfaceTertiary, fontWeight: '400' }}>({r.user_email})</Text></Text>
              <Text style={{ color: theme.onSurface, fontSize: 14, marginTop: 4 }}>Plano: {r.plan_name} · R$ {r.price?.toFixed(2)}</Text>
              <Text style={{ color: theme.onSurfaceTertiary, fontSize: 11, marginTop: 4 }}>{r.created_at?.slice(0, 16).replace('T', ' ')}</Text>
              <Pressable
                testID={`activate-request-${r.id}`}
                onPress={() => setSelectedUser({ email: r.user_email, plano: r.plan_key })}
                style={{ marginTop: 10, backgroundColor: theme.brandPrimary, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: theme.onBrandPrimary, fontWeight: '700' }}>Ativar Premium</Text>
              </Pressable>
            </View>
          ))
        )}

        {tab === 'users' && users.map(u => (
          <Pressable key={u.id} testID={`user-${u.email}`} onPress={() => setSelectedUser(u)} style={[styles.card, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.onSurface, fontWeight: '700', fontSize: 15 }}>{u.name}</Text>
                <Text style={{ color: theme.onSurfaceTertiary, fontSize: 12 }}>{u.email}</Text>
              </View>
              {u.is_founder ? (
                <View style={styles.founderPill}>
                  <Ionicons name="diamond" size={12} color="#F5D67A" />
                  <Text style={{ color: '#F5D67A', fontSize: 10, fontWeight: '700' }}>Founder</Text>
                </View>
              ) : u.is_premium ? (
                <View style={[styles.premiumPill, { backgroundColor: theme.brandTertiary }]}>
                  <Text style={{ color: theme.brandPrimary, fontSize: 10, fontWeight: '700' }}>{u.plano || 'Premium'}</Text>
                </View>
              ) : (
                <View style={[styles.premiumPill, { backgroundColor: theme.surfaceTertiary }]}>
                  <Text style={{ color: theme.onSurfaceTertiary, fontSize: 10, fontWeight: '700' }}>Gratuito</Text>
                </View>
              )}
            </View>
            {u.premium_until && (
              <Text style={{ color: theme.onSurfaceTertiary, fontSize: 11, marginTop: 4 }}>Válido até: {u.premium_until.slice(0,10)}</Text>
            )}
          </Pressable>
        ))}
      </ScrollView>

      <EditUserModal visible={!!selectedUser} user={selectedUser} onClose={() => setSelectedUser(null)} onSaved={load} />
    </View>
  );
}

function EditUserModal({ visible, user, onClose, onSaved }: any) {
  const { theme } = useTheme();
  const api = useApi();
  const [premium, setPremium] = useState(true);
  const [plano, setPlano] = useState('casal_mensal');
  const [until, setUntil] = useState('');
  const [dataPag, setDataPag] = useState('');
  const [obs, setObs] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (user) {
      setPremium(user.premium ?? true);
      setPlano(user.plano || 'casal_mensal');
      setUntil(user.premium_until?.slice(0,10) || '');
      setDataPag(user.data_pagamento?.slice(0,10) || new Date().toISOString().slice(0,10));
      setObs(user.observacoes || '');
      setErr('');
    }
  }, [user]);

  const save = async () => {
    if (!user?.email) return;
    setLoading(true); setErr('');
    try {
      await api('/admin/premium/update', {
        method: 'POST',
        body: JSON.stringify({
          email: user.email,
          premium,
          plano,
          premium_until: until ? `${until}T23:59:59+00:00` : null,
          data_pagamento: dataPag ? `${dataPag}T00:00:00+00:00` : null,
          observacoes: obs,
        }),
      });
      onSaved(); onClose();
    } catch (e: any) {
      setErr(e.message || 'Erro ao atualizar');
    } finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={{ backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' }} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: theme.onSurface }}>Ativar Premium</Text>
              <Pressable onPress={onClose}><Ionicons name="close" size={26} color={theme.onSurfaceSecondary} /></Pressable>
            </View>
            <Text style={{ color: theme.onSurfaceTertiary, fontSize: 12, marginBottom: 4 }}>Usuário</Text>
            <Text style={{ color: theme.onSurface, fontSize: 15, fontWeight: '600', marginBottom: spacing.md }}>{user?.email}</Text>

            <Text style={{ color: theme.onSurfaceTertiary, fontSize: 12, marginBottom: 4 }}>Plano</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: spacing.md }}>
              {PLANOS.map(p => (
                <Pressable key={p} onPress={() => setPlano(p)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: plano === p ? theme.brandPrimary : theme.border, backgroundColor: plano === p ? theme.brandPrimary : 'transparent' }}>
                  <Text style={{ color: plano === p ? theme.onBrandPrimary : theme.onSurfaceSecondary, fontSize: 12, fontWeight: '600' }}>{p}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={{ color: theme.onSurfaceTertiary, fontSize: 12, marginBottom: 4 }}>Premium até (AAAA-MM-DD)</Text>
            <TextInput testID="admin-until-input" value={until} onChangeText={setUntil} placeholder="2027-07-27" placeholderTextColor={theme.onSurfaceTertiary}
              style={{ height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 16, color: theme.onSurface, fontSize: 15, marginBottom: spacing.md, backgroundColor: theme.surfaceSecondary }} />

            <Text style={{ color: theme.onSurfaceTertiary, fontSize: 12, marginBottom: 4 }}>Data de pagamento</Text>
            <TextInput testID="admin-datapag-input" value={dataPag} onChangeText={setDataPag} placeholder="AAAA-MM-DD" placeholderTextColor={theme.onSurfaceTertiary}
              style={{ height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 16, color: theme.onSurface, fontSize: 15, marginBottom: spacing.md, backgroundColor: theme.surfaceSecondary }} />

            <Text style={{ color: theme.onSurfaceTertiary, fontSize: 12, marginBottom: 4 }}>Observações</Text>
            <TextInput testID="admin-obs-input" value={obs} onChangeText={setObs} placeholder="ID do pagamento, etc." placeholderTextColor={theme.onSurfaceTertiary} multiline
              style={{ minHeight: 64, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, padding: 14, color: theme.onSurface, fontSize: 14, marginBottom: spacing.md, backgroundColor: theme.surfaceSecondary }} />

            <Pressable testID="admin-toggle-premium" onPress={() => setPremium(!premium)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.lg }}>
              <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: theme.brandPrimary, backgroundColor: premium ? theme.brandPrimary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {premium && <Ionicons name="checkmark" size={16} color={theme.onBrandPrimary} />}
              </View>
              <Text style={{ color: theme.onSurface, fontSize: 15 }}>Ativar Premium</Text>
            </Pressable>

            {err ? <Text style={{ color: theme.error, marginBottom: spacing.md }}>{err}</Text> : null}

            <Pressable testID="admin-save-btn" onPress={save} disabled={loading} style={{ backgroundColor: theme.brandPrimary, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' }}>
              {loading ? <ActivityIndicator color={theme.onBrandPrimary} /> : <Text style={{ color: theme.onBrandPrimary, fontWeight: '700', fontSize: 15 }}>Salvar alterações</Text>}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md },
  founderPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(20,10,0,0.85)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  premiumPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
});
