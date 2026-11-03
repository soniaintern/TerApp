import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { terApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import { palette, radius, shadows } from '../../theme/tokens';
import ScreenBackHeader from '../../components/ScreenBackHeader';
import { claimStartDay, boundsFromEndMonth, periodLabel } from '../../utils/claimPeriod';
import type { ExpenseLimitItem } from '../../types/api';

/**
 * Review-and-submit screen ("View Draft" on the TER screen).
 *
 * Replaces the old confirmation popup: the employee sees the period, the totals and a
 * category-wise breakdown of every invoice going out, can drill into any category to see
 * the individual invoices, and submits from here.
 */
export default function ClaimDraftScreen({ navigation, route }: any) {
  const { month, year, limits = [], totalClaimed = 0 } = route.params || {};
  const user = useAuthStore((s) => s.user);
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [bills, setBills] = useState<Record<string, any[]>>({});
  const [loadingCat, setLoadingCat] = useState<string | null>(null);

  const getDateRange = useCallback((m: number, y: number) => {
    const b = boundsFromEndMonth(claimStartDay(user), m, y);
    const f = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { from: f(b.from), to: f(b.to) };
  }, [user]);

  const { from, to } = getDateRange(month, year);
  const period = periodLabel(claimStartDay(user), month, year);

  // Only categories that actually carry invoices go into the draft.
  const categories = useMemo(
    () => (limits as ExpenseLimitItem[]).filter(
      (l: any) => (l.bill_count || 0) > 0 || (l.claimed_amount || 0) > 0,
    ),
    [limits],
  );

  const invoiceCount = categories.reduce((s, l: any) => s + (l.bill_count || 0), 0);

  const toggle = async (cat: any) => {
    const key = String(cat.category_id);
    if (expanded === key) { setExpanded(null); return; }
    setExpanded(key);
    if (bills[key]) return;                       // already fetched
    setLoadingCat(key);
    try {
      const res = await terApi.fetchBills(from, to, key);
      setBills((prev) => ({ ...prev, [key]: res.data.status === 'success' ? (res.data.data || []) : [] }));
    } catch {
      setBills((prev) => ({ ...prev, [key]: [] }));
    } finally {
      setLoadingCat(null);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await terApi.submitForApproval(from, to);
      if (res.data.status === 'success') {
        Alert.alert(
          'Submitted',
          res.data.message || `TER for ${period} submitted to supervisor for approval.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      } else {
        Alert.alert('Error', res.data.message);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit TER.');
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (v: any) => '\u20B9' + Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const shortDate = (d?: string) => {
    if (!d) return '';
    const [y, m, day] = String(d).slice(0, 10).split('-');
    return `${day}/${m}`;
  };

  // Final "are you sure?" step. Submitting locks the invoices, so the employee should
  // see the total going out — and what it covers — before committing.
  const confirmSubmit = () => {
    Alert.alert(
      'Submit claim?',
      `Total to claim: ${fmt(totalClaimed)}\n` +
        `${invoiceCount} ${invoiceCount === 1 ? 'invoice' : 'invoices'} · ` +
        `${categories.length} ${categories.length === 1 ? 'category' : 'categories'}\n` +
        `${period}\n\n` +
        'Once submitted, your invoices lock and go to your supervisor for approval.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Submit', onPress: submit },
      ],
    );
  };

  const bg = isDark ? palette.darkBg : palette.background;
  const surface = isDark ? palette.darkSurface : palette.surface;
  const textPrimary = isDark ? palette.darkTextPrimary : palette.textPrimary;
  const textSecondary = isDark ? palette.darkTextSecondary : palette.textSecondary;
  const border = isDark ? palette.darkBorder : palette.border;

  return (
    <View style={[styles.root, { backgroundColor: bg, paddingTop: insets.top }]}>
      <ScreenBackHeader title="Claim Draft" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Period + draft state */}
        <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
          <View style={styles.rowBetween}>
            <Text style={[styles.label, { color: textSecondary }]}>PERIOD</Text>
            <View style={[styles.chip, { backgroundColor: isDark ? 'rgba(19,199,168,0.16)' : palette.primarySoft }]}>
              <MaterialCommunityIcons name="pencil-outline" size={12} color={palette.primary} />
              <Text style={[styles.chipText, { color: palette.primary }]}>Draft</Text>
            </View>
          </View>
          <Text style={[styles.periodText, { color: textPrimary }]}>{period}</Text>
          <Text style={[styles.subtle, { color: textSecondary }]}>{from} → {to}</Text>
        </View>

        {/* Totals */}
        <LinearGradient
          colors={['#186E93', '#13C7A8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroLabel}>TOTAL TO CLAIM</Text>
          <Text style={styles.heroAmount}>{fmt(totalClaimed)}</Text>
          <Text style={styles.heroMeta}>
            {invoiceCount} {invoiceCount === 1 ? 'invoice' : 'invoices'} · {categories.length}{' '}
            {categories.length === 1 ? 'category' : 'categories'}
          </Text>
        </LinearGradient>

        <Text style={[styles.sectionTitle, { color: textPrimary }]}>Category-wise summary</Text>
        <Text style={[styles.sectionHint, { color: textSecondary }]}>
          Tap a category to see its invoices.
        </Text>

        {categories.length === 0 ? (
          <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
            <Text style={[styles.subtle, { color: textSecondary }]}>No invoices in this period.</Text>
          </View>
        ) : (
          categories.map((cat: any) => {
            const key = String(cat.category_id);
            const isOpen = expanded === key;
            return (
              <View key={key} style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
                <TouchableOpacity style={styles.catHead} onPress={() => toggle(cat)} activeOpacity={0.7}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.catName, { color: textPrimary }]} numberOfLines={1}>
                      {cat.head_name}
                    </Text>
                    <Text style={[styles.subtle, { color: textSecondary }]}>
                      {cat.bill_count || 0} {(cat.bill_count || 0) === 1 ? 'invoice' : 'invoices'}
                    </Text>
                  </View>
                  <Text style={[styles.catAmount, { color: textPrimary }]}>{fmt(cat.claimed_amount)}</Text>
                  <MaterialCommunityIcons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={textSecondary}
                  />
                </TouchableOpacity>

                {isOpen && (
                  <View style={[styles.billList, { borderTopColor: border }]}>
                    {loadingCat === key ? (
                      <ActivityIndicator color={palette.primary} style={{ marginVertical: 10 }} />
                    ) : (bills[key] || []).length === 0 ? (
                      <Text style={[styles.subtle, { color: textSecondary, marginTop: 8 }]}>
                        No invoices found.
                      </Text>
                    ) : (
                      (bills[key] || []).map((b: any, i: number) => (
                        <View key={String(b.id ?? i)} style={styles.billRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.billNo, { color: textPrimary }]} numberOfLines={1}>
                              {b.bill_no || `#${b.id}`}
                            </Text>
                            <Text style={[styles.subtle, { color: textSecondary }]} numberOfLines={1}>
                              {[b.vendor_name, `${shortDate(b.from_date)}${b.to_date && b.to_date !== b.from_date ? ` → ${shortDate(b.to_date)}` : ''}`]
                                .filter(Boolean).join(' · ')}
                            </Text>
                          </View>
                          <Text style={[styles.billAmount, { color: palette.primary }]}>
                            {fmt(b.claimed_amount)}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Submit */}
      <View style={[styles.footer, { backgroundColor: surface, borderTopColor: border, paddingBottom: 14 + insets.bottom }]}>
        <TouchableOpacity
          style={styles.submitWrap}
          disabled={submitting || categories.length === 0}
          onPress={confirmSubmit}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={categories.length === 0 ? ['#D1D5DB', '#D1D5DB'] : ['#186E93', '#13C7A8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitBtn}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="send-check-outline"
                  size={20}
                  color={categories.length === 0 ? '#9CA3AF' : '#FFFFFF'}
                />
                <Text style={[styles.submitText, { color: categories.length === 0 ? '#9CA3AF' : '#FFFFFF' }]}>
                  Submit Claim
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
        <Text style={[styles.footerHint, { color: textSecondary }]}>
          This goes to your supervisor for approval. Invoices cannot be edited while the claim is pending.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 28 },
  card: {
    borderRadius: radius.lg, borderWidth: 1, padding: 14, marginBottom: 12,
    ...(shadows?.sm ?? {}),
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  chipText: { fontSize: 11, fontWeight: '700' },
  periodText: { fontSize: 18, fontWeight: '800', marginTop: 6 },
  subtle: { fontSize: 12, marginTop: 3 },
  hero: { borderRadius: radius.lg, padding: 18, marginBottom: 16 },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  heroAmount: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', marginTop: 4 },
  heroMeta: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  sectionHint: { fontSize: 12, marginBottom: 10 },
  catHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catName: { fontSize: 15, fontWeight: '700' },
  catAmount: { fontSize: 15, fontWeight: '800' },
  billList: { marginTop: 10, paddingTop: 8, borderTopWidth: 1 },
  billRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  billNo: { fontSize: 13.5, fontWeight: '700' },
  billAmount: { fontSize: 13.5, fontWeight: '800' },
  footer: { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 12 },
  submitWrap: { borderRadius: radius.md, overflow: 'hidden' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50 },
  submitText: { fontSize: 16, fontWeight: '800' },
  footerHint: { fontSize: 11, textAlign: 'center', marginTop: 8, lineHeight: 15 },
});
