import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/theme/ThemeProvider';
import { useApi } from '@/src/auth/AuthProvider';
import { spacing, radius } from '@/src/theme/tokens';

type Task = { id: string; title: string; category: string; status: 'todo'|'doing'|'done'; priority: 'low'|'medium'|'high'; notes?: string };
const CATEGORIES = ['Todas', 'Casa', 'Limpeza', 'Pets', 'Filhos', 'Mercado', 'Documentos', 'Outros'];
const STATUSES: {k: Task['status']; l: string; icon: any}[] = [
  { k: 'todo', l: 'A fazer', icon: 'ellipse-outline' },
  { k: 'doing', l: 'Em andamento', icon: 'time-outline' },
  { k: 'done', l: 'Concluído', icon: 'checkmark-circle' },
];

export default function Tarefas() {
  const { theme } = useTheme();
  const api = useApi();
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [category, setCategory] = useState('Todas');
  const [showModal, setShowModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setTasks(await api('/tasks')); } catch {}
  }, [api]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = category === 'Todas' ? tasks : tasks.filter(t => t.category === category);

  const toggleStatus = async (t: Task) => {
    const next = t.status === 'done' ? 'todo' : (t.status === 'todo' ? 'doing' : 'done');
    const updated = { ...t, status: next };
    setTasks(prev => prev.map(p => p.id === t.id ? updated : p));
    try {
      await api(`/tasks/${t.id}`, { method: 'PATCH', body: JSON.stringify({ title: t.title, category: t.category, status: next, priority: t.priority, notes: t.notes }) });
    } catch { load(); }
  };

  const removeTask = async (id: string) => {
    setTasks(prev => prev.filter(p => p.id !== id));
    try { await api(`/tasks/${id}`, { method: 'DELETE' }); } catch { load(); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }} testID="tasks-screen">
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: theme.divider, backgroundColor: theme.surface }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.onSurface }]}>Tarefas</Text>
          <Pressable testID="add-task-btn" onPress={() => setShowModal(true)} style={[styles.addBtn, { backgroundColor: theme.brandPrimary }]}>
            <Ionicons name="add" size={22} color={theme.onBrandPrimary} />
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.xl, gap: spacing.sm, paddingBottom: spacing.md }}>
          {CATEGORIES.map(c => (
            <Pressable
              key={c}
              testID={`task-cat-${c}`}
              onPress={() => setCategory(c)}
              style={[styles.chip, { flexShrink: 0, borderColor: category === c ? theme.brandPrimary : theme.border, backgroundColor: category === c ? theme.brandPrimary : 'transparent' }]}
            >
              <Text style={{ color: category === c ? theme.onBrandPrimary : theme.onSurfaceSecondary, fontWeight: '600', fontSize: 13 }}>{c}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.brandPrimary} />}
        showsVerticalScrollIndicator={false}
      >
        {STATUSES.map(s => {
          const list = filtered.filter(t => t.status === s.k);
          if (list.length === 0) return null;
          return (
            <View key={s.k} style={{ marginBottom: spacing.lg }}>
              <Text style={[styles.laneTitle, { color: theme.onSurfaceTertiary }]}>{s.l.toUpperCase()} • {list.length}</Text>
              {list.map(t => (
                <View key={t.id} style={[styles.taskRow, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                  <Pressable testID={`task-toggle-${t.id}`} onPress={() => toggleStatus(t)} hitSlop={8}>
                    <Ionicons name={t.status === 'done' ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={t.status === 'done' ? theme.brandPrimary : theme.onSurfaceTertiary} />
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.taskTitle, { color: theme.onSurface, textDecorationLine: t.status === 'done' ? 'line-through' : 'none', opacity: t.status === 'done' ? 0.5 : 1 }]}>{t.title}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                      <Text style={{ fontSize: 11, color: theme.onSurfaceTertiary }}>{t.category}</Text>
                      <View style={[styles.priorityDot, { backgroundColor: t.priority === 'high' ? theme.error : t.priority === 'medium' ? theme.warning : theme.success }]} />
                    </View>
                  </View>
                  <Pressable testID={`task-del-${t.id}`} onPress={() => removeTask(t.id)} hitSlop={10}>
                    <Ionicons name="trash-outline" size={18} color={theme.onSurfaceTertiary} />
                  </Pressable>
                </View>
              ))}
            </View>
          );
        })}
        {filtered.length === 0 && (
          <View style={{ alignItems: 'center', marginTop: spacing.xxl }}>
            <Ionicons name="checkbox-outline" size={48} color={theme.onSurfaceTertiary} />
            <Text style={{ color: theme.onSurfaceTertiary, marginTop: spacing.md, fontSize: 14 }}>Nenhuma tarefa. Aproveite o tempo livre!</Text>
          </View>
        )}
      </ScrollView>

      <TaskModal visible={showModal} onClose={() => setShowModal(false)} onCreated={load} />
    </View>
  );
}

function TaskModal({ visible, onClose, onCreated }: any) {
  const { theme } = useTheme();
  const api = useApi();
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState('Casa');
  const [priority, setPriority] = useState<'low'|'medium'|'high'>('medium');
  const [loading, setLoading] = useState(false);
  const cats = CATEGORIES.filter(c => c !== 'Todas');
  const save = async () => {
    if (!title) return;
    setLoading(true);
    try {
      await api('/tasks', { method: 'POST', body: JSON.stringify({ title, category: cat, priority, status: 'todo' }) });
      setTitle(''); onCreated(); onClose();
    } finally { setLoading(false); }
  };
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: theme.onSurface }}>Nova Tarefa</Text>
              <Pressable onPress={onClose}><Ionicons name="close" size={26} color={theme.onSurfaceSecondary} /></Pressable>
            </View>
            <TextInput
              testID="task-title-input"
              placeholder="O que precisa ser feito?"
              placeholderTextColor={theme.onSurfaceTertiary}
              value={title}
              onChangeText={setTitle}
              style={{ height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 16, color: theme.onSurface, fontSize: 15, marginBottom: spacing.md, backgroundColor: theme.surfaceSecondary }}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: spacing.md }}>
              {cats.map(c => (
                <Pressable key={c} onPress={() => setCat(c)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: cat === c ? theme.brandPrimary : theme.border, backgroundColor: cat === c ? theme.brandPrimary : 'transparent' }}>
                  <Text style={{ color: cat === c ? theme.onBrandPrimary : theme.onSurfaceSecondary, fontSize: 13, fontWeight: '600' }}>{c}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.md }}>
              {[{k:'low',l:'Baixa'},{k:'medium',l:'Média'},{k:'high',l:'Alta'}].map(p => (
                <Pressable key={p.k} onPress={() => setPriority(p.k as any)} style={{ flex: 1, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: priority === p.k ? theme.brandPrimary : theme.border, backgroundColor: priority === p.k ? theme.brandPrimary : 'transparent' }}>
                  <Text style={{ color: priority === p.k ? theme.onBrandPrimary : theme.onSurfaceSecondary, fontWeight: '600', fontSize: 13 }}>{p.l}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable testID="task-save-btn" onPress={save} disabled={loading} style={{ backgroundColor: theme.brandPrimary, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' }}>
              {loading ? <ActivityIndicator color={theme.onBrandPrimary} /> : <Text style={{ color: theme.onBrandPrimary, fontWeight: '700', fontSize: 15 }}>Adicionar</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { borderBottomWidth: 0.5 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  title: { fontSize: 32, fontWeight: '700', letterSpacing: -0.6 },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  chip: { height: 36, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  laneTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: 8 },
  taskTitle: { fontSize: 15, fontWeight: '600' },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
});
