import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/theme/ThemeProvider';
import { useApi } from '@/src/auth/AuthProvider';
import { spacing, radius } from '@/src/theme/tokens';

type Item = { id: string; name: string; category: string; quantity: number; price?: number; priority: 'low'|'medium'|'high'; bought: boolean };
const CATEGORIES = ['Todas', 'Mercado', 'Farmácia', 'Construção', 'Pets', 'Eletrônicos', 'Outros'];

export default function Mercado() {
  const { theme } = useTheme();
  const api = useApi();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Item[]>([]);
  const [category, setCategory] = useState('Todas');
  const [refreshing, setRefreshing] = useState(false);
  const [show, setShow] = useState(false);

  const load = useCallback(async () => {
    try { setItems(await api('/shopping')); } catch {}
  }, [api]);
  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const toggle = async (it: Item) => {
    const updated = { ...it, bought: !it.bought };
    setItems(prev => prev.map(p => p.id === it.id ? updated : p));
    try { await api(`/shopping/${it.id}`, { method: 'PATCH', body: JSON.stringify({ ...updated }) }); } catch { load(); }
  };
  const remove = async (id: string) => {
    setItems(prev => prev.filter(p => p.id !== id));
    try { await api(`/shopping/${id}`, { method: 'DELETE' }); } catch { load(); }
  };

  const filtered = category === 'Todas' ? items : items.filter(i => i.category === category);
  const grouped = filtered.reduce((acc: Record<string, Item[]>, it) => {
    (acc[it.category] = acc[it.category] || []).push(it); return acc;
  }, {});
  const totalCost = items.filter(i => !i.bought).reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }} testID="shopping-screen">
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: theme.divider, backgroundColor: theme.surface }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: theme.onSurface }]}>Mercado</Text>
            <Text style={{ color: theme.onSurfaceTertiary, fontSize: 12 }}>Estimativa: R$ {totalCost.toFixed(2).replace('.', ',')}</Text>
          </View>
          <Pressable testID="add-item-btn" onPress={() => setShow(true)} style={[styles.addBtn, { backgroundColor: theme.brandPrimary }]}>
            <Ionicons name="add" size={22} color={theme.onBrandPrimary} />
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.xl, gap: spacing.sm, paddingBottom: spacing.md }}>
          {CATEGORIES.map(c => (
            <Pressable
              key={c}
              testID={`shop-cat-${c}`}
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
        {Object.keys(grouped).length === 0 && (
          <View style={{ alignItems: 'center', marginTop: spacing.xxl }}>
            <Ionicons name="cart-outline" size={48} color={theme.onSurfaceTertiary} />
            <Text style={{ color: theme.onSurfaceTertiary, marginTop: spacing.md, fontSize: 14 }}>Sua lista está vazia.</Text>
          </View>
        )}
        {Object.entries(grouped).map(([cat, list]) => (
          <View key={cat} style={{ marginBottom: spacing.lg }}>
            <Text style={[styles.laneTitle, { color: theme.onSurfaceTertiary }]}>{cat.toUpperCase()}</Text>
            {list.map(it => (
              <View key={it.id} style={[styles.row, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                <Pressable testID={`shop-toggle-${it.id}`} onPress={() => toggle(it)} hitSlop={8}>
                  <Ionicons name={it.bought ? 'checkbox' : 'square-outline'} size={26} color={it.bought ? theme.brandPrimary : theme.onSurfaceTertiary} />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.onSurface, fontSize: 15, fontWeight: '600', textDecorationLine: it.bought ? 'line-through' : 'none', opacity: it.bought ? 0.5 : 1 }}>{it.name}</Text>
                  <Text style={{ color: theme.onSurfaceTertiary, fontSize: 11 }}>{it.quantity} un {it.price ? `• R$ ${it.price.toFixed(2)}` : ''}</Text>
                </View>
                <View style={[styles.priorityDot, { backgroundColor: it.priority === 'high' ? theme.error : it.priority === 'medium' ? theme.warning : theme.success }]} />
                <Pressable testID={`shop-del-${it.id}`} onPress={() => remove(it.id)} hitSlop={10}>
                  <Ionicons name="trash-outline" size={18} color={theme.onSurfaceTertiary} />
                </Pressable>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      <AddItemModal visible={show} onClose={() => setShow(false)} onCreated={load} />
    </View>
  );
}

function AddItemModal({ visible, onClose, onCreated }: any) {
  const { theme } = useTheme();
  const api = useApi();
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');
  const [cat, setCat] = useState('Mercado');
  const [priority, setPriority] = useState<'low'|'medium'|'high'>('medium');
  const [loading, setLoading] = useState(false);
  const cats = CATEGORIES.filter(c => c !== 'Todas');
  const save = async () => {
    if (!name) return;
    setLoading(true);
    try {
      await api('/shopping', { method: 'POST', body: JSON.stringify({ name, quantity: parseFloat(qty || '1'), price: price ? parseFloat(price) : null, category: cat, priority, bought: false }) });
      setName(''); setQty('1'); setPrice(''); onCreated(); onClose();
    } finally { setLoading(false); }
  };
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: theme.onSurface }}>Novo Item</Text>
              <Pressable onPress={onClose}><Ionicons name="close" size={26} color={theme.onSurfaceSecondary} /></Pressable>
            </View>
            <TextInput
              testID="shop-name-input"
              placeholder="Nome do item"
              placeholderTextColor={theme.onSurfaceTertiary}
              value={name}
              onChangeText={setName}
              style={{ height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 16, color: theme.onSurface, fontSize: 15, marginBottom: spacing.md, backgroundColor: theme.surfaceSecondary }}
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
              <TextInput
                testID="shop-qty-input"
                placeholder="Qtd"
                placeholderTextColor={theme.onSurfaceTertiary}
                value={qty}
                onChangeText={setQty}
                keyboardType="decimal-pad"
                style={{ flex: 1, height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 16, color: theme.onSurface, fontSize: 15, backgroundColor: theme.surfaceSecondary }}
              />
              <TextInput
                testID="shop-price-input"
                placeholder="Preço R$"
                placeholderTextColor={theme.onSurfaceTertiary}
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
                style={{ flex: 2, height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 16, color: theme.onSurface, fontSize: 15, backgroundColor: theme.surfaceSecondary }}
              />
            </View>
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
            <Pressable testID="shop-save-btn" onPress={save} disabled={loading} style={{ backgroundColor: theme.brandPrimary, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' }}>
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
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  title: { fontSize: 32, fontWeight: '700', letterSpacing: -0.6 },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  chip: { height: 36, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  laneTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: 8 },
  priorityDot: { width: 10, height: 10, borderRadius: 5 },
});
