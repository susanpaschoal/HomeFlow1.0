import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/theme/ThemeProvider';
import { useApi } from '@/src/auth/AuthProvider';
import { spacing, radius, shadow } from '@/src/theme/tokens';

type Tab = 'overview' | 'goals' | 'cards';
type Wallet = { id: string; name: string; type: string; balance: number };
type Tx = { id: string; wallet_id: string; type: 'income'|'expense'; amount: number; category: string; description?: string; date?: string };
type Goal = { id: string; name: string; target: number; saved: number };
type CardT = { id: string; name: string; limit: number; used: number; closing_day: number; due_day: number };

function currency(n: number) {
  return `R$ ${(n || 0).toFixed(2).replace('.', ',')}`;
}

const WALLET_TYPES = [
  { key: 'checking', label: 'Corrente', icon: 'card-outline' },
  { key: 'savings', label: 'Poupança', icon: 'save-outline' },
  { key: 'cash', label: 'Dinheiro', icon: 'cash-outline' },
  { key: 'pix', label: 'PIX', icon: 'flash-outline' },
  { key: 'investment', label: 'Investimentos', icon: 'trending-up-outline' },
  { key: 'shared', label: 'Compartilhada', icon: 'people-outline' },
];

const CATEGORIES = ['Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Saúde', 'Educação', 'Salário', 'Outros'];

export default function Financas() {
  const { theme } = useTheme();
  const api = useApi();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>('overview');
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [cards, setCards] = useState<CardT[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);

  const load = useCallback(async () => {
    try {
      const [w, t, g, c] = await Promise.all([
        api('/wallets'),
        api('/transactions'),
        api('/goals'),
        api('/cards'),
      ]);
      setWallets(w); setTxs(t); setGoals(g); setCards(c);
    } catch {}
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  const total = wallets.reduce((s, w) => s + (w.balance || 0), 0);
  const monthIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }} testID="finances-screen">
      {/* Sticky Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, paddingTop: insets.top + 8, borderBottomColor: theme.divider }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: theme.onSurface }]}>Finanças</Text>
          <Pressable testID="ai-fab-finances" onPress={() => router.push('/ai-chat')} style={[styles.aiFab, { backgroundColor: theme.brandPrimary }]}>
            <Ionicons name="sparkles" size={16} color={theme.onBrandPrimary} />
            <Text style={{ color: theme.onBrandPrimary, fontWeight: '700', fontSize: 13 }}>IA</Text>
          </Pressable>
        </View>
        {/* Segmented (chip row) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.xl, gap: spacing.sm, paddingBottom: spacing.md }}>
          {[
            { k: 'overview', label: 'Visão Geral' },
            { k: 'goals', label: 'Metas' },
            { k: 'cards', label: 'Cartões' },
          ].map(c => (
            <Pressable
              key={c.k}
              testID={`tab-${c.k}`}
              onPress={() => setTab(c.k as Tab)}
              style={[styles.chip, { borderColor: tab === c.k ? theme.brandPrimary : theme.border, backgroundColor: tab === c.k ? theme.brandPrimary : 'transparent' }]}
            >
              <Text style={{ color: tab === c.k ? theme.onBrandPrimary : theme.onSurfaceSecondary, fontWeight: '600', fontSize: 13 }}>{c.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.brandPrimary} />}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'overview' && (
          <View>
            <View style={[styles.totalCard, { backgroundColor: theme.brandPrimary }]}>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600' }}>Saldo total</Text>
              <Text style={{ color: theme.onBrandPrimary, fontSize: 34, fontWeight: '700', letterSpacing: -1, marginTop: 4 }} testID="finances-total">{currency(total)}</Text>
              <View style={{ flexDirection: 'row', marginTop: spacing.md, gap: spacing.lg }}>
                <View><Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>Receitas</Text><Text style={{ color: '#B8ECD0', fontSize: 16, fontWeight: '700' }}>{currency(monthIncome)}</Text></View>
                <View><Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>Despesas</Text><Text style={{ color: '#FDD0BE', fontSize: 16, fontWeight: '700' }}>{currency(monthExpense)}</Text></View>
              </View>
            </View>

            {/* Wallets */}
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>Carteiras</Text>
              <Pressable testID="add-wallet-btn" onPress={() => setShowWalletModal(true)}>
                <Ionicons name="add-circle" size={26} color={theme.brandPrimary} />
              </Pressable>
            </View>
            {wallets.length === 0 ? (
              <Empty text="Nenhuma carteira. Adicione a primeira!" />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.xl, gap: spacing.md }}>
                {wallets.map(w => {
                  const typeInfo = WALLET_TYPES.find(t => t.key === w.type);
                  return (
                    <View key={w.id} style={[styles.walletCard, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }, shadow(theme.mode)]}>
                      <View style={[styles.walletIcon, { backgroundColor: theme.brandTertiary }]}>
                        <Ionicons name={(typeInfo?.icon || 'wallet-outline') as any} size={18} color={theme.brandPrimary} />
                      </View>
                      <Text style={[styles.walletName, { color: theme.onSurface }]} numberOfLines={1}>{w.name}</Text>
                      <Text style={{ color: theme.onSurfaceTertiary, fontSize: 11 }}>{typeInfo?.label}</Text>
                      <Text style={[styles.walletBal, { color: theme.onSurface }]}>{currency(w.balance)}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            {/* Transactions */}
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>Transações</Text>
              <Pressable testID="add-tx-btn" onPress={() => { if (wallets.length === 0) { setShowWalletModal(true); } else { setShowTxModal(true); } }}>
                <Ionicons name="add-circle" size={26} color={theme.brandPrimary} />
              </Pressable>
            </View>
            {txs.length === 0 ? (
              <Empty text="Nenhuma transação ainda." />
            ) : (
              <View style={{ paddingHorizontal: spacing.xl }}>
                {txs.slice(0, 10).map(t => (
                  <View key={t.id} style={[styles.txRow, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                    <View style={[styles.txIcon, { backgroundColor: t.type === 'income' ? '#D3F0DF' : '#FCE0D0' }]}>
                      <Ionicons name={t.type === 'income' ? 'arrow-up' : 'arrow-down'} size={14} color={t.type === 'income' ? '#1F7A4D' : '#B0652D'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.txCat, { color: theme.onSurface }]} numberOfLines={1}>{t.description || t.category}</Text>
                      <Text style={{ color: theme.onSurfaceTertiary, fontSize: 11 }}>{t.category}</Text>
                    </View>
                    <Text style={{ color: t.type === 'income' ? theme.success : theme.error, fontWeight: '700' }}>{t.type === 'income' ? '+' : '-'}{currency(t.amount)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {tab === 'goals' && (
          <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg }}>
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>Objetivos</Text>
              <Pressable testID="add-goal-btn" onPress={() => setShowGoalModal(true)}>
                <Ionicons name="add-circle" size={26} color={theme.brandPrimary} />
              </Pressable>
            </View>
            {goals.length === 0 ? <Empty text="Crie sua primeira meta 🏆" /> : goals.map(g => {
              const pct = Math.min(100, (g.saved / g.target) * 100);
              return (
                <View key={g.id} style={[styles.goalCard, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[styles.goalName, { color: theme.onSurface }]}>{g.name}</Text>
                    <Text style={{ color: theme.brandPrimary, fontWeight: '700' }}>{pct.toFixed(0)}%</Text>
                  </View>
                  <View style={[styles.progressBg, { backgroundColor: theme.surfaceTertiary }]}>
                    <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: theme.brandPrimary }]} />
                  </View>
                  <Text style={{ color: theme.onSurfaceTertiary, fontSize: 12, marginTop: 6 }}>{currency(g.saved)} / {currency(g.target)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {tab === 'cards' && (
          <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg }}>
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>Cartões</Text>
              <Pressable testID="add-card-btn" onPress={() => setShowCardModal(true)}>
                <Ionicons name="add-circle" size={26} color={theme.brandPrimary} />
              </Pressable>
            </View>
            {cards.length === 0 ? <Empty text="Adicione seus cartões de crédito" /> : cards.map(c => (
              <View key={c.id} style={[styles.creditCard, { backgroundColor: theme.onSurface }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: theme.surface, fontWeight: '700', fontSize: 16 }}>{c.name}</Text>
                  <Ionicons name="card" size={22} color={theme.surface} />
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: spacing.lg }}>Limite disponível</Text>
                <Text style={{ color: theme.surface, fontSize: 24, fontWeight: '700', marginTop: 2 }}>{currency(c.limit - (c.used || 0))}</Text>
                <View style={{ flexDirection: 'row', marginTop: spacing.md, gap: spacing.lg }}>
                  <View><Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>Fechamento</Text><Text style={{ color: theme.surface, fontWeight: '600' }}>Dia {c.closing_day}</Text></View>
                  <View><Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>Vencimento</Text><Text style={{ color: theme.surface, fontWeight: '600' }}>Dia {c.due_day}</Text></View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <WalletModal visible={showWalletModal} onClose={() => setShowWalletModal(false)} onCreated={load} />
      <TxModal visible={showTxModal} onClose={() => setShowTxModal(false)} onCreated={load} wallets={wallets} />
      <GoalModal visible={showGoalModal} onClose={() => setShowGoalModal(false)} onCreated={load} />
      <CardModal visible={showCardModal} onClose={() => setShowCardModal(false)} onCreated={load} />
    </View>
  );
}

function Empty({ text }: { text: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ paddingHorizontal: spacing.xl, paddingVertical: spacing.xl, alignItems: 'center' }}>
      <Text style={{ color: theme.onSurfaceTertiary, fontSize: 14 }}>{text}</Text>
    </View>
  );
}

/* ---------- MODALS ---------- */
function ModalWrap({ visible, onClose, title, children }: any) {
  const { theme } = useTheme();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: theme.onSurface }}>{title}</Text>
              <Pressable testID="modal-close" onPress={onClose}><Ionicons name="close" size={26} color={theme.onSurfaceSecondary} /></Pressable>
            </View>
            {children}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Input({ value, onChangeText, placeholder, keyboardType, testID }: any) {
  const { theme } = useTheme();
  return (
    <TextInput
      testID={testID}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.onSurfaceTertiary}
      keyboardType={keyboardType}
      style={{ height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 16, color: theme.onSurface, fontSize: 15, marginBottom: spacing.md, backgroundColor: theme.surfaceSecondary }}
    />
  );
}

function PrimaryBtn({ onPress, label, loading, testID }: any) {
  const { theme } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} disabled={loading} style={{ backgroundColor: theme.brandPrimary, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm }}>
      {loading ? <ActivityIndicator color={theme.onBrandPrimary} /> : <Text style={{ color: theme.onBrandPrimary, fontWeight: '700', fontSize: 15 }}>{label}</Text>}
    </Pressable>
  );
}

function WalletModal({ visible, onClose, onCreated }: any) {
  const { theme } = useTheme();
  const api = useApi();
  const [name, setName] = useState('');
  const [type, setType] = useState('checking');
  const [balance, setBalance] = useState('');
  const [loading, setLoading] = useState(false);
  const save = async () => {
    if (!name) return;
    setLoading(true);
    try {
      await api('/wallets', { method: 'POST', body: JSON.stringify({ name, type, balance: parseFloat(balance || '0') }) });
      setName(''); setBalance(''); setType('checking');
      onCreated(); onClose();
    } finally { setLoading(false); }
  };
  return (
    <ModalWrap visible={visible} onClose={onClose} title="Nova Carteira">
      <Input testID="wallet-name-input" value={name} onChangeText={setName} placeholder="Nome (Ex: Nubank)" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: spacing.md }}>
        {WALLET_TYPES.map(t => (
          <Pressable key={t.key} onPress={() => setType(t.key)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: type === t.key ? theme.brandPrimary : theme.border, backgroundColor: type === t.key ? theme.brandPrimary : 'transparent' }}>
            <Text style={{ color: type === t.key ? theme.onBrandPrimary : theme.onSurfaceSecondary, fontSize: 13, fontWeight: '600' }}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Input testID="wallet-balance-input" value={balance} onChangeText={setBalance} placeholder="Saldo inicial (R$)" keyboardType="decimal-pad" />
      <PrimaryBtn testID="wallet-save-btn" onPress={save} loading={loading} label="Criar Carteira" />
    </ModalWrap>
  );
}

function TxModal({ visible, onClose, onCreated, wallets }: any) {
  const { theme } = useTheme();
  const api = useApi();
  const [type, setType] = useState<'income'|'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [walletId, setWalletId] = useState(wallets?.[0]?.id || '');
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (wallets?.[0]?.id) setWalletId(wallets[0].id); }, [wallets]);
  const save = async () => {
    if (!walletId || !amount) return;
    setLoading(true);
    try {
      await api('/transactions', { method: 'POST', body: JSON.stringify({ wallet_id: walletId, type, amount: parseFloat(amount), category, description }) });
      setAmount(''); setDescription('');
      onCreated(); onClose();
    } finally { setLoading(false); }
  };
  return (
    <ModalWrap visible={visible} onClose={onClose} title="Nova Transação">
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        {[{k:'expense',l:'Despesa'},{k:'income',l:'Receita'}].map(o => (
          <Pressable key={o.k} testID={`tx-type-${o.k}`} onPress={() => setType(o.k as any)} style={{ flex: 1, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: type === o.k ? theme.brandPrimary : theme.surfaceSecondary, borderWidth: 1, borderColor: type === o.k ? theme.brandPrimary : theme.border }}>
            <Text style={{ color: type === o.k ? theme.onBrandPrimary : theme.onSurfaceSecondary, fontWeight: '700' }}>{o.l}</Text>
          </Pressable>
        ))}
      </View>
      <Input testID="tx-amount-input" value={amount} onChangeText={setAmount} placeholder="Valor (R$)" keyboardType="decimal-pad" />
      <Input testID="tx-desc-input" value={description} onChangeText={setDescription} placeholder="Descrição" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: spacing.md }}>
        {CATEGORIES.map(c => (
          <Pressable key={c} onPress={() => setCategory(c)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: category === c ? theme.brandPrimary : theme.border, backgroundColor: category === c ? theme.brandPrimary : 'transparent' }}>
            <Text style={{ color: category === c ? theme.onBrandPrimary : theme.onSurfaceSecondary, fontSize: 13, fontWeight: '600' }}>{c}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={{ color: theme.onSurfaceTertiary, fontSize: 12, marginBottom: 6 }}>Carteira:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: spacing.md }}>
        {wallets.map((w: any) => (
          <Pressable key={w.id} onPress={() => setWalletId(w.id)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: walletId === w.id ? theme.brandPrimary : theme.border, backgroundColor: walletId === w.id ? theme.brandPrimary : 'transparent' }}>
            <Text style={{ color: walletId === w.id ? theme.onBrandPrimary : theme.onSurfaceSecondary, fontSize: 13, fontWeight: '600' }}>{w.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <PrimaryBtn testID="tx-save-btn" onPress={save} loading={loading} label="Salvar Transação" />
    </ModalWrap>
  );
}

function GoalModal({ visible, onClose, onCreated }: any) {
  const api = useApi();
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [saved, setSaved] = useState('');
  const [loading, setLoading] = useState(false);
  const save = async () => {
    if (!name || !target) return;
    setLoading(true);
    try {
      await api('/goals', { method: 'POST', body: JSON.stringify({ name, target: parseFloat(target), saved: parseFloat(saved || '0') }) });
      setName(''); setTarget(''); setSaved(''); onCreated(); onClose();
    } finally { setLoading(false); }
  };
  return (
    <ModalWrap visible={visible} onClose={onClose} title="Nova Meta">
      <Input testID="goal-name-input" value={name} onChangeText={setName} placeholder="Ex: Casa Própria" />
      <Input testID="goal-target-input" value={target} onChangeText={setTarget} placeholder="Valor total (R$)" keyboardType="decimal-pad" />
      <Input testID="goal-saved-input" value={saved} onChangeText={setSaved} placeholder="Já economizado (R$)" keyboardType="decimal-pad" />
      <PrimaryBtn testID="goal-save-btn" onPress={save} loading={loading} label="Criar Meta" />
    </ModalWrap>
  );
}

function CardModal({ visible, onClose, onCreated }: any) {
  const api = useApi();
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [closing, setClosing] = useState('');
  const [due, setDue] = useState('');
  const [loading, setLoading] = useState(false);
  const save = async () => {
    if (!name || !limit) return;
    setLoading(true);
    try {
      await api('/cards', { method: 'POST', body: JSON.stringify({ name, limit: parseFloat(limit), closing_day: parseInt(closing || '1'), due_day: parseInt(due || '10') }) });
      setName(''); setLimit(''); setClosing(''); setDue(''); onCreated(); onClose();
    } finally { setLoading(false); }
  };
  return (
    <ModalWrap visible={visible} onClose={onClose} title="Novo Cartão">
      <Input testID="card-name-input" value={name} onChangeText={setName} placeholder="Nome do cartão" />
      <Input testID="card-limit-input" value={limit} onChangeText={setLimit} placeholder="Limite (R$)" keyboardType="decimal-pad" />
      <Input testID="card-closing-input" value={closing} onChangeText={setClosing} placeholder="Dia de fechamento (1-31)" keyboardType="number-pad" />
      <Input testID="card-due-input" value={due} onChangeText={setDue} placeholder="Dia de vencimento (1-31)" keyboardType="number-pad" />
      <PrimaryBtn testID="card-save-btn" onPress={save} loading={loading} label="Salvar Cartão" />
    </ModalWrap>
  );
}

const styles = StyleSheet.create({
  header: { borderBottomWidth: 0.5 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  headerTitle: { fontSize: 32, fontWeight: '700', letterSpacing: -0.6 },
  aiFab: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 14, height: 36, borderRadius: 999 },
  chip: { flexShrink: 0, height: 36, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  totalCard: { marginHorizontal: spacing.xl, marginTop: spacing.lg, borderRadius: radius.lg, padding: spacing.lg },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, marginTop: spacing.xl, marginBottom: spacing.md },
  sectionTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },
  walletCard: { width: 170, borderRadius: radius.md, padding: spacing.md, borderWidth: 1 },
  walletIcon: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  walletName: { fontSize: 15, fontWeight: '700', marginTop: 10 },
  walletBal: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: 8 },
  txIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  txCat: { fontSize: 14, fontWeight: '600' },
  goalCard: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md },
  goalName: { fontSize: 15, fontWeight: '700' },
  progressBg: { height: 8, borderRadius: 999, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%' },
  creditCard: { borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
});
