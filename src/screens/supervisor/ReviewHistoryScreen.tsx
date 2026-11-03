import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, Modal, TextInput,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { claimStartDay, periodOf } from '../../utils/claimPeriod';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { palette, radius, shadows, typography } from '../../theme/tokens';
import ScreenBackHeader from '../../components/ScreenBackHeader';
import { terApi } from '../../api/ter';
import type { SupervisorReviewItem, ClaimReviewBill } from '../../types/api';

type HistoryAction = 'all' | 'approve' | 'reject';

/**
 * Review history (MIS) — the supervisor's own approvals / rejections, lifted out of
 * SupervisorScreen so the queue screen stays focused on pending work.
 */
export default function ReviewHistoryScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const surface = isDark ? palette.darkSurfaceMuted : '#FFFFFF';
  const bg = isDark ? palette.darkBg : palette.background;
  const border = isDark ? palette.darkBorder : palette.border;
  const textPrimary = isDark ? palette.darkTextPrimary : palette.textPrimary;
  const textSecondary = isDark ? palette.darkTextSecondary : palette.textSecondary;
  const textTertiary = isDark ? palette.darkTextTertiary : palette.textTertiary;

  const [data, setData] = useState<{
    kpis: { approved: number; rejected: number; resubmitted: number; total: number };
    reviews: SupervisorReviewItem[];
  }>({
    kpis: { approved: 0, rejected: 0, resubmitted: 0, total: 0 },
    reviews: [],
  });
  const [action, setAction] = useState<HistoryAction>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Drill-down: the invoices behind one review, fetched on demand. claim-detail is
  // not gated on a pending status, so it works for already-decided claims too.
  const [detail, setDetail] = useState<{ review: SupervisorReviewItem; bills: ClaimReviewBill[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = async (r: SupervisorReviewItem) => {
    setDetail({ review: r, bills: [] });
    setDetailLoading(true);
    try {
      const res = await terApi.supervisorClaimDetail(r.sender_details_id, r.period[0], r.period[1]);
      if (res.data.status === 'success') {
        setDetail({ review: r, bills: res.data.data.bills || [] });
      }
    } catch {
      // Leave the sheet open with its empty state rather than failing silently.
    } finally {
      setDetailLoading(false);
    }
  };

  // --- filters ----------------------------------------------------------------
  // Employee code: debounced so we don't hit the API on every keystroke.
  const [employeeCode, setEmployeeCode] = useState('');
  const [typedCode, setTypedCode] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setTypedCode(employeeCode), 450);
    return () => clearTimeout(t);
  }, [employeeCode]);

  // Period filter. The claim period ends in a specific month, so "this period" is
  // resolved through the user's claim_start_day rather than the calendar.
  const { user } = useAuthStore();
  const startDay = claimStartDay(user);
  const [period, setPeriod] = useState<'all' | 'current' | 'last'>('all');

  const periodFilter = useMemo(() => {
    if (period === 'all') return { month: undefined as number | undefined, year: undefined as number | undefined };
    const now = new Date();
    if (period === 'current') {
      const b = periodOf(startDay, now);
      return { month: b.to.getMonth() + 1, year: b.to.getFullYear() };
    }
    // "Last" = the period that ended in the month before the current one.
    const b = periodOf(startDay, now);
    const prev = new Date(b.to.getFullYear(), b.to.getMonth() - 1, 1);
    return { month: prev.getMonth() + 1, year: prev.getFullYear() };
  }, [period, startDay]);

  const [filterEcho, setFilterEcho] = useState<{ employee_name: string | null } | null>(null);

  const fetchHistory = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await terApi.supervisorReviews(
        action === 'all' ? undefined : action,
        typedCode,
        periodFilter.month,
        periodFilter.year,
      );
      if (res.data.status === 'success') {
        setData(res.data.data);
        setFilterEcho(res.data.data.filter ?? null);
      }
    } catch {
      // Silent — the empty state covers it.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [action, typedCode, periodFilter.month, periodFilter.year]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <ScreenBackHeader title="Review History" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchHistory(true)}
            tintColor={palette.primary}
            colors={[palette.primary]}
          />
        }
      >
        {/* KPIs — totals across all actions, independent of the filter below */}
        <View style={styles.kpis}>
          <View style={[styles.kpi, { backgroundColor: surface, borderColor: border }]}>
            <Text style={[styles.kpiValue, { color: '#0E9F6E' }]}>{data.kpis.approved}</Text>
            <Text style={[styles.kpiLabel, { color: textSecondary }]}>Approved</Text>
          </View>
          <View style={[styles.kpi, { backgroundColor: surface, borderColor: border }]}>
            <Text style={[styles.kpiValue, { color: palette.error }]}>{data.kpis.rejected}</Text>
            <Text style={[styles.kpiLabel, { color: textSecondary }]}>Rejected</Text>
          </View>
          <View style={[styles.kpi, { backgroundColor: surface, borderColor: border }]}>
            <Text style={[styles.kpiValue, { color: '#0284C7' }]}>{data.kpis.resubmitted}</Text>
            <Text style={[styles.kpiLabel, { color: textSecondary }]}>Resubmitted</Text>
          </View>
        </View>

        {/* Employee code search — resolved against sender_details by the server, and
            scoped to this supervisor's own reviews so it can't reach other teams. */}
        <View style={[styles.searchBox, { backgroundColor: surface, borderColor: border }]}>
          <MaterialCommunityIcons name="account-search-outline" size={18} color={textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: textPrimary }]}
            value={employeeCode}
            onChangeText={setEmployeeCode}
            placeholder="Search by employee code"
            placeholderTextColor={textTertiary}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
          />
          {employeeCode.length > 0 && (
            <TouchableOpacity onPress={() => setEmployeeCode('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="close-circle" size={17} color={textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* A typed code that matched nobody — distinguish from "no actions yet". */}
        {typedCode.trim() !== '' && filterEcho && !filterEcho.employee_name ? (
          <Text style={[styles.filterNote, { color: palette.warning }]}>
            No employee found with code “{typedCode.trim()}”.
          </Text>
        ) : typedCode.trim() !== '' && filterEcho?.employee_name ? (
          <Text style={[styles.filterNote, { color: textSecondary }]}>
            Showing {filterEcho.employee_name}
          </Text>
        ) : null}

        {/* Period filter */}
        <View style={styles.chips}>
          {([
            ['all', 'All time'],
            ['current', 'This period'],
            ['last', 'Last period'],
          ] as const).map(([key, label]) => {
            const on = period === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.chip, { borderColor: border }, on && styles.chipActive]}
                onPress={() => setPeriod(key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, { color: textSecondary }, on && styles.chipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Action filter chips */}
        <View style={styles.chips}>
          {(['all', 'approve', 'reject'] as const).map((a) => {
            const on = action === a;
            return (
              <TouchableOpacity
                key={a}
                style={[styles.chip, { borderColor: border }, on && styles.chipActive]}
                onPress={() => setAction(a)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, { color: textSecondary }, on && styles.chipTextActive]}>
                  {a === 'all' ? 'All' : a === 'approve' ? 'Approved' : 'Rejected'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading && data.reviews.length === 0 ? (
          <View style={styles.emptyBox}>
            <ActivityIndicator color={palette.primary} />
          </View>
        ) : data.reviews.length > 0 ? (
          data.reviews.map((r) => {
            const badge = r.action === 'approve'
              ? { bg: '#D1FAE5', fg: '#065F46', label: 'Approved' }
              : r.action === 'reject'
                ? { bg: '#FEE2E2', fg: '#991B1B', label: 'Rejected' }
                : { bg: '#E0F2FE', fg: '#075985', label: 'Resubmitted' };
            return (
              <TouchableOpacity
                key={r.id}
                style={[styles.card, { backgroundColor: surface, borderColor: border }]}
                activeOpacity={0.75}
                onPress={() => openDetail(r)}
              >
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardEmp, { color: textPrimary }]} numberOfLines={1}>
                      {r.employee_name || 'Employee'}
                    </Text>
                    <Text style={[styles.cardSub, { color: textSecondary }]}>
                      {r.period && r.period[0] && r.period[1] ? `${r.period[0]} – ${r.period[1]}` : ''}
                      {` · ₹${Number(r.approved_amount ?? r.amount ?? 0).toLocaleString('en-IN')}`}
                    </Text>
                    {/* Flag a reduction so the card total isn't mistaken for the claim */}
                    {r.approved_amount != null && Number(r.approved_amount) !== Number(r.amount) ? (
                      <Text style={[styles.reduced, { color: palette.warning }]}>
                        claimed ₹{Number(r.amount || 0).toLocaleString('en-IN')}
                      </Text>
                    ) : null}
                  </View>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.label}</Text>
                  </View>
                </View>
                {r.reason ? (
                  <Text style={[styles.reason, { color: textSecondary }]} numberOfLines={2}>
                    {r.reason}
                  </Text>
                ) : null}
                {r.acted_at ? (
                  <Text style={[styles.when, { color: textTertiary }]}>
                    {new Date(r.acted_at.replace(' ', 'T')).toLocaleString('en-IN', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                ) : null}

                <View style={styles.cardFoot}>
                  <Text style={[styles.viewDetail, { color: palette.primary }]}>View invoices</Text>
                  <MaterialCommunityIcons name="chevron-right" size={16} color={palette.primary} />
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="history" size={44} color={textSecondary} />
            <Text style={[styles.emptyTitle, { color: textPrimary }]}>No review actions found</Text>
            <Text style={[styles.emptySub, { color: textSecondary }]}>
              Approvals and rejections you make will appear here.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Invoice breakdown for one review — read-only, so nothing can be re-decided
          from here. Amounts show the approved figure where a supervisor reduced it. */}
      <Modal visible={!!detail} transparent animationType="slide" onRequestClose={() => setDetail(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: surface }]}>
            <View style={styles.modalHandle} />
            {detail ? (
              <>
                <Text style={[styles.modalTitle, { color: textPrimary }]} numberOfLines={1}>
                  {detail.review.employee_name || 'Employee'}
                </Text>
                <Text style={[styles.modalSub, { color: textSecondary }]}>
                  {detail.review.period[0]} – {detail.review.period[1]}
                  {' · '}
                  {detail.review.action === 'approve' ? 'Approved'
                    : detail.review.action === 'reject' ? 'Rejected' : 'Resubmitted'}
                  {detail.review.level ? ` · ${detail.review.level.toUpperCase()}` : ''}
                </Text>

                {detailLoading ? (
                  <View style={styles.detailLoading}>
                    <ActivityIndicator color={palette.primary} />
                  </View>
                ) : detail.bills.length > 0 ? (
                  <ScrollView style={styles.detailList}>
                    {detail.bills.map((b) => {
                      const claimed = Number(b.claimed_amount || 0);
                      const approved = b.approved_amount != null && b.approved_amount !== ''
                        ? Number(b.approved_amount)
                        : claimed;
                      const cut = approved !== claimed;
                      return (
                        <View key={b.id} style={[styles.detailRow, { borderBottomColor: border }]}>
                          <View style={styles.detailInfo}>
                            <Text style={[styles.detailName, { color: textPrimary }]} numberOfLines={1}>
                              {b.bill_no || b.category_name}
                            </Text>
                            <Text style={[styles.detailMeta, { color: textSecondary }]} numberOfLines={1}>
                              {b.category_name} · {String(b.to_date).slice(0, 10)}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.detailAmt, { color: cut ? palette.warning : textPrimary }]}>
                              ₹{approved.toLocaleString('en-IN')}
                            </Text>
                            {cut ? (
                              <Text style={[styles.detailCut, { color: textTertiary }]}>
                                of ₹{claimed.toLocaleString('en-IN')}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                ) : (
                  <View style={styles.detailLoading}>
                    <Text style={[styles.emptySub, { color: textSecondary }]}>
                      No invoices found for this period.
                    </Text>
                  </View>
                )}

                <View style={[styles.detailTotals, { borderTopColor: border }]}>
                  <Text style={[styles.detailTotalsLabel, { color: textSecondary }]}>Total approved</Text>
                  <Text style={[styles.detailTotalsValue, { color: textPrimary }]}>
                    ₹{(detail.review.approved_amount ?? detail.review.amount ?? 0).toLocaleString('en-IN')}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.detailClose, { borderColor: border }]}
                  onPress={() => setDetail(null)}
                >
                  <Text style={[styles.detailCloseText, { color: textSecondary }]}>Close</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40 },
  kpis: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  kpi: { flex: 1, borderRadius: radius.lg, borderWidth: 1, paddingVertical: 12, alignItems: 'center' },
  kpiValue: { fontSize: 20, fontWeight: '800' },
  kpiLabel: { fontSize: 11, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: { borderRadius: radius.pill, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 7 },
  chipActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  chipText: { fontSize: 12.5, fontWeight: '700' },
  chipTextActive: { color: '#FFFFFF' },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: 12, marginBottom: 10, ...shadows.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  cardEmp: { fontSize: 14.5, fontWeight: '700' },
  cardSub: { fontSize: 12, marginTop: 2 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  reason: { fontSize: 12, marginTop: 8, lineHeight: 16 },
  when: { fontSize: 11, marginTop: 6 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: radius.lg,
    paddingHorizontal: 12, height: 44, marginBottom: 10,
  },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, padding: 0 },
  filterNote: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  reduced: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  cardFoot: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    gap: 2, marginTop: 8,
  },
  viewDetail: { fontSize: 12, fontWeight: '700' },
  // --- invoice breakdown sheet (mirrors the approve/reject sheets) ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl,
    padding: 20, paddingBottom: 40,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { ...typography.h3, textAlign: 'center' },
  modalSub: { fontSize: 13, textAlign: 'center', marginTop: 6, marginBottom: 14, lineHeight: 18 },
  detailLoading: { paddingVertical: 40, alignItems: 'center' },
  detailList: { maxHeight: 340 },
  detailRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, paddingVertical: 10, borderBottomWidth: 1,
  },
  detailInfo: { flex: 1, minWidth: 0 },
  detailName: { fontSize: 13.5, fontWeight: '700' },
  detailMeta: { fontSize: 11.5, marginTop: 2 },
  detailAmt: { fontSize: 14, fontWeight: '800' },
  detailCut: { fontSize: 11, marginTop: 1 },
  detailTotals: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, marginTop: 6, paddingTop: 12,
  },
  detailTotalsLabel: { fontSize: 13, fontWeight: '600' },
  detailTotalsValue: { fontSize: 18, fontWeight: '800' },
  detailClose: {
    alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.pill, paddingVertical: 12, borderWidth: 1.5, marginTop: 14,
  },
  detailCloseText: { fontSize: 14, fontWeight: '700' },
  emptyBox: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { ...typography.h3, marginTop: 12 },
  emptySub: { fontSize: 12.5, textAlign: 'center', marginTop: 6, lineHeight: 18 },
});
