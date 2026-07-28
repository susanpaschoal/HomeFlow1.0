import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/theme/ThemeProvider';
import { useApi } from '@/src/auth/AuthProvider';
import { spacing, radius } from '@/src/theme/tokens';

type Event = { id: string; title: string; date: string; time?: string; category: string; notes?: string };
const CATS = ['Evento', 'Consulta', 'Viagem', 'Reunião', 'Aniversário', 'Pagamento', 'Lembrete'];

export default function Agenda() {
  const { theme } = useTheme();
  const api = useApi();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<Event[]>([]);
  const [show, setShow] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setEvents(await api('/events')); } catch {}
  }, [api]);
  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const remove = async (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    try { await api(`/events/${id}`, { method: 'DELETE' }); } catch { load(); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }} testID="agenda-screen">
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: spacing.xl, paddingBottom: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 0.5, borderBottomColor: theme.divider }}>
        <Pressable testID="agenda-close" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={theme.onSurface} />
        </Pressable>
        <Text style={{ color: theme.onSurface, fontSize: 17, fontWeight: '700' }}>Agenda</Text>
        <Pressable testID="agenda-add-btn" onPress={() => setShow(true)} hitSlop={10}>
          <Ionicons name="add-circle" size={28} color={theme.brandPrimary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.brandPrimary} />}
      >
        {events.length === 0 && (
          <View style={{ alignItems: 'center', marginTop: spacing.xxl }}>
            <Ionicons name="calendar-outline" size={48} color={theme.onSurfaceTertiary} />
            <Text style={{ color: theme.onSurfaceTertiary, marginTop: spacing.md, fontSize: 14 }}>Nenhum evento agendado.</Text>
          </View>
        )}
        {events.map(ev => (
          <View key={ev.id} style={[styles.card, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
            <View style={[styles.dateBox, { backgroundColor: theme.brandTertiary }]}>
              <Text style={{ color: theme.brandPrimary, fontSize: 11, fontWeight: '700' }}>{ev.date.slice(8, 10)}/{ev.date.slice(5, 7)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.onSurface, fontSize: 15, fontWeight: '600' }}>{ev.title}</Text>
              <Text style={{ color: theme.onSurfaceTertiary, fontSize: 12 }}>{ev.category}{ev.time ? ` • ${ev.time}` : ''}</Text>
            </View>
            <Pressable testID={`event-del-${ev.id}`} onPress={() => remove(ev.id)} hitSlop={10}>
              <Ionicons name="trash-outline" size={18} color={theme.onSurfaceTertiary} />
            </Pressable>
          </View>
        ))}
      </ScrollView>

      <EventModal visible={show} onClose={() => setShow(false)} onCreated={load} />
    </View>
  );
}

function EventModal({ visible, onClose, onCreated }: any) {
  const { theme } = useTheme();
  const api = useApi();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [time, setTime] = useState('');
  const [cat, setCat] = useState('Evento');
  const [loading, setLoading] = useState(false);
  const save = async () => {
    if (!title || !date) return;
    setLoading(true);
    try {
      await api('/events', { method: 'POST', body: JSON.stringify({ title, date, time, category: cat }) });
      setTitle(''); setTime(''); onCreated(); onClose();
    } finally { setLoading(false); }
  };
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: theme.onSurface }}>Novo Evento</Text>
              <Pressable onPress={onClose}><Ionicons name="close" size={26} color={theme.onSurfaceSecondary} /></Pressable>
            </View>
            <TextInput testID="event-title-input" placeholder="Título" placeholderTextColor={theme.onSurfaceTertiary} value={title} onChangeText={setTitle}
              style={{ height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 16, color: theme.onSurface, fontSize: 15, marginBottom: spacing.md, backgroundColor: theme.surfaceSecondary }} />
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
              <TextInput testID="event-date-input" placeholder="Data (AAAA-MM-DD)" placeholderTextColor={theme.onSurfaceTertiary} value={date} onChangeText={setDate}
                style={{ flex: 2, height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 16, color: theme.onSurface, fontSize: 15, backgroundColor: theme.surfaceSecondary }} />
              <TextInput testID="event-time-input" placeholder="Hora" placeholderTextColor={theme.onSurfaceTertiary} value={time} onChangeText={setTime}
                style={{ flex: 1, height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 16, color: theme.onSurface, fontSize: 15, backgroundColor: theme.surfaceSecondary }} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: spacing.md }}>
              {CATS.map(c => (
                <Pressable key={c} onPress={() => setCat(c)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: cat === c ? theme.brandPrimary : theme.border, backgroundColor: cat === c ? theme.brandPrimary : 'transparent' }}>
                  <Text style={{ color: cat === c ? theme.onBrandPrimary : theme.onSurfaceSecondary, fontSize: 13, fontWeight: '600' }}>{c}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable testID="event-save-btn" onPress={save} disabled={loading} style={{ backgroundColor: theme.brandPrimary, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' }}>
              {loading ? <ActivityIndicator color={theme.onBrandPrimary} /> : <Text style={{ color: theme.onBrandPrimary, fontWeight: '700', fontSize: 15 }}>Salvar</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: 8 },
  dateBox: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
