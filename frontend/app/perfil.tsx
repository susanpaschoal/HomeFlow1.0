import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/theme/ThemeProvider';
import { useAuth } from '@/src/auth/AuthProvider';
import { spacing, radius } from '@/src/theme/tokens';

export default function Perfil() {
  const { theme, mode, setMode } = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/welcome');
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }} testID="profile-screen">
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: spacing.xl, paddingBottom: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable testID="profile-close" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={theme.onSurface} />
        </Pressable>
        <Text style={{ color: theme.onSurface, fontSize: 17, fontWeight: '700' }}>Perfil</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', marginVertical: spacing.xl }}>
          <View style={[styles.avatarLg, { backgroundColor: theme.brandPrimary }]}>
            <Text style={{ color: theme.onBrandPrimary, fontSize: 30, fontWeight: '700' }}>{user?.name?.[0]?.toUpperCase() || 'U'}</Text>
          </View>
          <Text style={{ color: theme.onSurface, fontSize: 22, fontWeight: '700', marginTop: spacing.md }}>{user?.name}</Text>
          <Text style={{ color: theme.onSurfaceTertiary, fontSize: 14 }}>{user?.email}</Text>
          {user?.is_founder && (
            <View style={styles.founderPill} testID="founder-pill">
              <Ionicons name="diamond" size={13} color="#F5D67A" />
              <Text style={{ color: '#F5D67A', fontWeight: '700', fontSize: 12 }}>Premium Founder ✔</Text>
            </View>
          )}
          {!user?.is_founder && user?.is_premium && (
            <View style={[styles.founderPill, { backgroundColor: theme.brandTertiary, borderColor: theme.brandPrimary }]}>
              <Ionicons name="star" size={13} color={theme.brandPrimary} />
              <Text style={{ color: theme.brandPrimary, fontWeight: '700', fontSize: 12 }}>Premium</Text>
            </View>
          )}
        </View>

        <SectionTitle text="Assinatura" />
        <View style={[styles.card, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
          <Pressable testID="go-to-plans" onPress={() => router.push('/assinatura')} style={[styles.row, { borderBottomColor: theme.divider, borderBottomWidth: user?.is_founder ? 0.5 : 0 }]}>
            <Ionicons name="star-outline" size={20} color={theme.onSurfaceSecondary} />
            <Text style={{ flex: 1, color: theme.onSurface, fontSize: 15 }}>Planos e assinaturas</Text>
            {user?.is_founder ? (
              <Text style={{ color: '#B08A2A', fontSize: 12, fontWeight: '700' }}>Founder ✔</Text>
            ) : user?.is_premium ? (
              <Text style={{ color: theme.brandPrimary, fontSize: 12, fontWeight: '700' }}>{user?.plano || 'Premium'}</Text>
            ) : (
              <Text style={{ color: theme.onSurfaceTertiary, fontSize: 12 }}>Gratuito ›</Text>
            )}
          </Pressable>
          {user?.is_founder && (
            <Pressable testID="go-to-admin" onPress={() => router.push('/admin')} style={styles.row}>
              <Ionicons name="settings-outline" size={20} color={theme.onSurfaceSecondary} />
              <Text style={{ flex: 1, color: theme.onSurface, fontSize: 15 }}>Painel Admin</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.onSurfaceTertiary} />
            </Pressable>
          )}
        </View>

        <SectionTitle text="Aparência" />
        <View style={[styles.card, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
          {[{k:'light',l:'Claro',i:'sunny-outline'},{k:'dark',l:'Escuro',i:'moon-outline'},{k:'system',l:'Sistema',i:'phone-portrait-outline'}].map((o, i, arr) => (
            <Pressable key={o.k} testID={`theme-${o.k}`} onPress={() => setMode(o.k as any)} style={[styles.row, i < arr.length - 1 && { borderBottomColor: theme.divider, borderBottomWidth: 0.5 }]}>
              <Ionicons name={o.i as any} size={20} color={theme.onSurfaceSecondary} />
              <Text style={{ flex: 1, color: theme.onSurface, fontSize: 15 }}>{o.l}</Text>
              {mode === o.k && <Ionicons name="checkmark" size={20} color={theme.brandPrimary} />}
            </Pressable>
          ))}
        </View>

        <SectionTitle text="Conta" />
        <View style={[styles.card, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
          <View style={[styles.row, { borderBottomColor: theme.divider, borderBottomWidth: 0.5 }]}>
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.onSurfaceSecondary} />
            <Text style={{ flex: 1, color: theme.onSurface, fontSize: 15 }}>Papel</Text>
            <Text style={{ color: theme.onSurfaceTertiary }}>{user?.role || 'admin'}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="calendar-outline" size={20} color={theme.onSurfaceSecondary} />
            <Text style={{ flex: 1, color: theme.onSurface, fontSize: 15 }}>Membro desde</Text>
            <Text style={{ color: theme.onSurfaceTertiary }}>{user?.created_at?.slice(0,10)}</Text>
          </View>
        </View>

        <SectionTitle text="Sobre" />
        <View style={[styles.card, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
          <View style={styles.row}>
            <Ionicons name="home-outline" size={20} color={theme.onSurfaceSecondary} />
            <Text style={{ flex: 1, color: theme.onSurface, fontSize: 15 }}>HomeFlow</Text>
            <Text style={{ color: theme.onSurfaceTertiary }}>v1.0.0</Text>
          </View>
        </View>

        <Pressable testID="logout-btn" onPress={handleLogout} style={[styles.logoutBtn, { backgroundColor: theme.error + '20', borderColor: theme.error }]}>
          <Ionicons name="log-out-outline" size={20} color={theme.error} />
          <Text style={{ color: theme.error, fontWeight: '700', fontSize: 15 }}>Sair da Conta</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function SectionTitle({ text }: { text: string }) {
  const { theme } = useTheme();
  return <Text style={{ color: theme.onSurfaceTertiary, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginTop: spacing.lg, marginBottom: spacing.sm, textTransform: 'uppercase' }}>{text}</Text>;
}

const styles = StyleSheet.create({
  avatarLg: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  founderPill: { marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(20,10,0,0.85)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 0.5, borderColor: 'rgba(245,214,122,0.5)' },
  card: { borderRadius: radius.md, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 52 },
  logoutBtn: { marginTop: spacing.xl, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: radius.md, borderWidth: 1 },
});
