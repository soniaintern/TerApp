import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import StatusChip from '../../components/StatusChip';
import ScreenBackHeader from '../../components/ScreenBackHeader';
import { useTheme } from '../../theme/ThemeContext';
import { palette, typography, radius, shadows } from '../../theme/tokens';
import { AttachmentTile, AttachmentPreviewModal } from '../../components/Attachment';
import { categoryMeta } from '../../utils/categoryMeta';
import { S3_BASE } from '../../utils/constants';
import type { BillItem, ExpenseLimitItem } from '../../types/api';
import { formatDateDisplay } from '../../utils/dateFormat';
import { TER_STATUS_MAP } from '../../utils/constants';
import { claimStartDay, periodLabel } from '../../utils/claimPeriod';
import { useAuthStore } from '../../store/authStore';
import type { TrackDataItem } from '../../types/api';

// Payment pipeline stages (in order)
const STAGES = [
  { key: 'unid', label: 'UNID generated', desc: 'Approved by supervisor', icon: 'file-document-check-outline', color: '#0D9488' },
  { key: 'received', label: 'Received', desc: 'Claim received by finance', icon: 'inbox-arrow-down-outline', color: '#D97706' },
  { key: 'handover', label: 'Processing', desc: 'Claim received — being processed', icon: 'account-switch-outline', color: '#7C3AED' },
  { key: 'finfect', label: 'Sent to Accounts', desc: 'Forwarded to Accounts', icon: 'send-outline', color: '#0284C7' },
  { key: 'paid', label: 'Paid', desc: 'Payment credited', icon: 'check-decagram', color: '#059669' },
];
const ORDER = ['14', '1', '2', '3', '5'];

type StageState = 'done' | 'current' | 'todo' | 'failed';

const approvedAmountOf = (b: BillItem) => {
  const raw = b.approved_amount;
  const has = raw !== null && raw !== undefined && String(raw).trim() !== '';
  return has ? Number(raw) : null;
};
const isApprovedBill = (b: BillItem) => approvedAmountOf(b) !== null || Number(b.status) === 3;

export default function ViewTrackScreen({ navigation, route }: any) {
  const data: TrackDataItem = route.params?.data;
  const [preview, setPreview] = useState<string | null>(null);
  const { isDark } = useTheme();
  const { user } = useAuthStore();
  // "21 Jul – 20 Aug 2026" for period-wise units · "Aug 2026" for calendar months
  const claimPeriodLabel = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const d = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(d.getTime())) return formatDateDisplay(dateStr);
    return periodLabel(claimStartDay(user), d.getMonth() + 1, d.getFullYear());
  };

  // an amount counts as present only when it is non-empty and non-zero
  const hasAmount = (v: any) => v !== null && v !== undefined && String(v).trim() !== '' && Number(v) > 0;

  const fmt = (v: any) => '\u20B9' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

  const bg = isDark ? palette.darkBg : palette.background;
  const surface = isDark ? palette.darkSurface : palette.surface;
  const textPrimary = isDark ? palette.darkTextPrimary : palette.textPrimary;
  const textSecondary = isDark ? palette.darkTextSecondary : palette.textSecondary;
  const border = isDark ? palette.darkBorder : palette.border;

  // ---- Invoice breakdown (grouped by category) ----
  // Finance sets approved_amount per invoice on approval; until then the invoice
  // only has a claimed amount. Mirrors the old Flutter Track page: claimed is
  // struck through and the approved amount takes its place.
  const invoiceGroups = useMemo(() => {
    const bills: BillItem[] = (data as any)?.bill_item || [];
    const names = new Map<number, string>();
    ((data as any)?.expense_limit_data || []).forEach((c: ExpenseLimitItem) => {
      names.set(Number(c.category_id), c.head_name);
    });
    const groups = new Map<number, BillItem[]>();
    bills.forEach((b) => {
      const key = Number(b.expense_categories_id);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(b);
    });
    return Array.from(groups.entries()).map(([id, items]) => ({
      id,
      name: names.get(id) || `Category ${id}`,
      items,
      claimed: items.reduce((t, b) => t + (Number(b.claimed_amount) || 0), 0),
      approved: items.reduce((t, b) => t + (approvedAmountOf(b) || 0), 0),
      anyApproved: items.some(isApprovedBill),
    }));
  }, [data]);

  // ---- Timeline state ----
  const status = String(data?.status ?? '');
  const failureAtPaid = ['0', '13'].includes(status);
  const rejectedEarly = status === '8';
  const partial = status === '7';
  // UNID generated (14) is automatically treated as Received → its timeline
  // shows "UNID generated" as done and "Received" as the current stage.
  const orderStatus = status === '14' ? '1' : status;
  const normalIdx = ORDER.indexOf(orderStatus);
  const paid = status === '5';

  const stageState = (i: number): StageState => {
    if (failureAtPaid) return i < 4 ? 'done' : i === 4 ? 'failed' : 'todo';
    if (rejectedEarly) return i === 0 ? 'failed' : 'todo';
    if (partial) return i < 4 ? 'done' : i === 4 ? 'current' : 'todo';
    if (normalIdx < 0) return 'todo';
    if (i < normalIdx) return 'done';
    if (i === normalIdx) return 'current';
    return 'todo';
  };

  const stageIcon = (s: StageState, stage: (typeof STAGES)[number]) => {
    if (s === 'done') return <MaterialCommunityIcons name="check" size={13} color="#FFFFFF" />;
    if (s === 'failed') return <MaterialCommunityIcons name="close" size={13} color="#FFFFFF" />;
    return <MaterialCommunityIcons name={stage.icon as any} size={13} color="#FFFFFF" />;
  };

  const stageColors = (s: StageState, stage: (typeof STAGES)[number]): string => {
    if (s === 'done') return palette.primary;
    if (s === 'failed') return palette.error;
    if (s === 'current') return stage.color;
    return isDark ? palette.darkBorder : '#CBD5E1';
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
    <ScreenBackHeader title="Track Details" onBack={() => navigation.goBack()} />
    <ScrollView style={[styles.container, { backgroundColor: bg }]} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* Hero */}
      <LinearGradient
        colors={isDark ? ['#0D2B3A', '#186E93'] : ['#186E93', '#13C7A8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View pointerEvents="none" style={styles.heroBlob1} />
        <View pointerEvents="none" style={styles.heroBlob2} />
        <View style={styles.heroTop}>
          <Text style={styles.heroLabel}>UNID #{data?.unid ?? '--'}</Text>
          {data?.status !== undefined && <StatusChip status={data.status} />}
        </View>
        <Text style={styles.heroAmount}>{fmt(data?.claimed_amount)}</Text>
        {data?.date && <Text style={styles.heroDate}>Period: {claimPeriodLabel(data.date)}</Text>}
      </LinearGradient>

      {/* Status timeline */}
      <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
        <View style={styles.sectionRow}>
          <View style={[styles.sectionIcon, { backgroundColor: palette.primarySoft }]}>
            <MaterialCommunityIcons name="map-marker-path" size={16} color={palette.primary} />
          </View>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Payment progress</Text>
        </View>
        {STAGES.map((stage, i) => {
          const s = stageState(i);
          const dotColor = stageColors(s, stage);
          return (
            <View key={stage.key} style={styles.stageRow}>
              <View style={styles.stageRail}>
                <View style={[styles.stageDot, { backgroundColor: dotColor, borderColor: dotColor }]}>
                  {stageIcon(s, stage)}
                </View>
                {i < STAGES.length - 1 && (
                  <View
                    style={[
                      styles.stageLine,
                      { backgroundColor: s === 'todo' && stageState(i + 1) === 'todo' ? (isDark ? palette.darkBorder : '#E2E8F0') : dotColor },
                    ]}
                  />
                )}
              </View>
              <View style={styles.stageBody}>
                <View style={styles.stageLabelRow}>
                  <Text style={[styles.stageLabel, { color: s === 'todo' ? textSecondary : textPrimary }]}>
                    {stage.label}
                  </Text>
                  <Text style={[styles.stageStateText, { color: s === 'failed' ? palette.error : s === 'current' ? stage.color : textSecondary }]}>
                    {s === 'done' ? 'Done' : s === 'current' ? 'Current' : s === 'failed' ? TER_STATUS_MAP[status] || 'Failed' : 'Pending'}
                  </Text>
                </View>
                {s !== 'todo' && <Text style={[styles.stageDesc, { color: textSecondary }]}>{stage.desc}</Text>}
              </View>
            </View>
          );
        })}
        {paid && data?.utr_no && (
          <View style={[styles.utrPill, { backgroundColor: palette.successLight }]}>
            <MaterialCommunityIcons name="ticket-confirmation-outline" size={16} color={palette.success} />
            <Text style={[styles.utrPillText, { color: palette.success }]}>UTR: {data.utr_no}</Text>
          </View>
        )}
      </View>

      {/* Amount summary */}
      <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
        <View style={styles.sectionRow}>
          <View style={[styles.sectionIcon, { backgroundColor: palette.primarySoft }]}>
            <MaterialCommunityIcons name="cash-multiple" size={16} color={palette.primary} />
          </View>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Amounts</Text>
        </View>
        <View style={styles.statRow}>
          <View style={styles.statCol}>
            <Text style={[styles.statLabel, { color: textSecondary }]}>Claimed</Text>
            <Text style={[styles.statValue, { color: textPrimary }]}>{fmt(data?.claimed_amount)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={[styles.statLabel, { color: textSecondary }]}>Approved</Text>
            <Text style={[styles.statValue, { color: textPrimary }]}>{hasAmount(data?.approved_amount) ? fmt(data?.approved_amount) : 'NA'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={[styles.statLabel, { color: textSecondary }]}>Paid</Text>
            <Text style={[styles.statValue, { color: palette.primary, fontWeight: '800' }]}>{hasAmount(data?.final_payable_amount) ? fmt(data?.final_payable_amount) : 'NA'}</Text>
          </View>
        </View>
      </View>

      {/* Invoice breakdown, grouped by category */}
      {invoiceGroups.length > 0 && (
        <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
          <View style={styles.sectionRow}>
            <View style={[styles.sectionIcon, { backgroundColor: palette.primarySoft }]}>
              <MaterialCommunityIcons name="file-document-multiple-outline" size={16} color={palette.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Invoices</Text>
            <Text style={[styles.invCount, { color: textSecondary }]}>
              {invoiceGroups.reduce((t, g) => t + g.items.length, 0)}
            </Text>
          </View>

          {invoiceGroups.map((g) => {
            const meta = categoryMeta(g.id, g.name);
            // stronger tints on dark surfaces, where a 12% tint all but disappears
            const chipBg = `${meta.color}${isDark ? '33' : '1F'}`;
            const chipBorder = `${meta.color}${isDark ? '73' : '3D'}`;
            const chipCountBg = `${meta.color}${isDark ? '4D' : '2E'}`;
            return (
            <View key={g.id} style={styles.invGroup}>
              {/* category header with its own claimed / approved subtotal */}
              <View style={styles.invGroupHead}>
                <View style={[styles.catChip, { backgroundColor: chipBg, borderColor: chipBorder }]}>
                  <MaterialCommunityIcons name={meta.icon as any} size={12} color={meta.color} />
                  <Text style={[styles.catChipText, { color: meta.color }]} numberOfLines={1}>{g.name}</Text>
                  <View style={[styles.catChipCount, { backgroundColor: chipCountBg }]}>
                    <Text style={[styles.catChipCountText, { color: meta.color }]}>{g.items.length}</Text>
                  </View>
                </View>
                <View style={styles.invGroupMoney}>
                  <Text style={[styles.invGroupClaimed, { color: g.anyApproved ? textSecondary : palette.warning }]}>
                    {fmt(g.claimed)}
                  </Text>
                  {g.anyApproved && (
                    <>
                      <MaterialCommunityIcons name="arrow-right" size={12} color={textSecondary} />
                      <Text style={[styles.invGroupApproved, { color: palette.primary }]}>{fmt(g.approved)}</Text>
                    </>
                  )}
                </View>
              </View>

              {g.items.map((b, bi) => {
                const approvedAmt = approvedAmountOf(b);
                const approved = isApprovedBill(b);
                return (
                  <View
                    key={b.id}
                    style={[styles.invRow, bi < g.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: border }]}
                  >
                    <View style={styles.invLeft}>
                      <Text style={[styles.invNo, { color: textPrimary }]}>#{b.bill_no}</Text>
                      {!!b.vendor_name && (
                        <Text style={[styles.invVendor, { color: textSecondary }]} numberOfLines={1}>{b.vendor_name}</Text>
                      )}
                      <Text style={[styles.invDate, { color: textSecondary }]}>
                        {formatDateDisplay(b.from_date)}
                        {b.to_date && b.to_date !== b.from_date ? ` – ${formatDateDisplay(b.to_date)}` : ''}
                      </Text>
                      {!!b.remarks && (
                        <Text style={[styles.invRemarks, { color: textSecondary }]} numberOfLines={2}>
                          Remarks: {b.remarks}
                        </Text>
                      )}
                      {b.attachment ? (
                        <TouchableOpacity
                          style={styles.invAttachRow}
                          activeOpacity={0.8}
                          onPress={() => setPreview(S3_BASE + b.attachment)}
                        >
                          <AttachmentTile />
                          <View style={styles.invAttachInfo}>
                            <Text style={[styles.invAttachLabel, { color: textPrimary }]}>View attachment</Text>
                            <Text style={[styles.invAttachHint, { color: textSecondary }]}>Tap to preview</Text>
                          </View>
                          <MaterialCommunityIcons name="chevron-right" size={18} color={textSecondary} />
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.invNoAttachRow}>
                          <MaterialCommunityIcons name="paperclip" size={13} color={textSecondary} />
                          <Text style={[styles.invNoAttachText, { color: textSecondary }]}>No attachment</Text>
                        </View>
                      )}
                    </View>

                    {/* claimed struck through + approved, once finance approves */}
                    <View style={styles.invRight}>
                      <Text
                        style={[
                          styles.invClaimed,
                          { color: palette.warning },
                          approved && { textDecorationLine: 'line-through', opacity: 0.55 },
                        ]}
                      >
                        {fmt(b.claimed_amount)}
                      </Text>
                      {approved && (
                        <Text style={[styles.invApproved, { color: palette.primary }]}>
                          {approvedAmt === null ? '--' : fmt(approvedAmt)}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
            );
          })}
        </View>
      )}

      {/* Payment details */}
      <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
        <View style={styles.sectionRow}>
          <View style={[styles.sectionIcon, { backgroundColor: palette.primarySoft }]}>
            <MaterialCommunityIcons name="bank-outline" size={16} color={palette.primary} />
          </View>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Payment Details</Text>
        </View>
        {[
          { icon: 'ticket-confirmation-outline', label: 'UTR Number', value: data?.utr_no || '--' },
          { icon: 'calendar-check-outline', label: 'Paid On', value: data?.paid_date ? formatDateDisplay(data.paid_date) : '--' },
          { icon: 'alert-circle-outline', label: 'Deductions', value: data?.late_fine_deductions || '--' },
        ].map((row, i) => (
          <View key={row.label} style={[styles.row, i < 2 && { borderBottomWidth: 1, borderBottomColor: border }]}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name={row.icon as any} size={18} color={palette.primary} />
              <Text style={[styles.rowLabel, { color: textSecondary }]}>{row.label}</Text>
            </View>
            <Text style={[styles.rowValue, { color: textPrimary }]}>{row.value}</Text>
          </View>
        ))}
      </View>

      {/* Paid to */}
      {data?.paid_to && (
        <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
          <View style={styles.sectionRow}>
            <View style={[styles.sectionIcon, { backgroundColor: palette.primarySoft }]}>
              <MaterialCommunityIcons name="account-cash-outline" size={16} color={palette.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Paid To</Text>
          </View>
          {[
            ['Account Holder', data.paid_to.account_holder],
            ['Account No', data.paid_to.acc_no],
            ['Bank', data.paid_to.bank_name],
            ['IFSC', data.paid_to.ifsc_code],
          ].map(([label, value], i) => (
            <View key={label} style={[styles.row, i < 3 && { borderBottomWidth: 1, borderBottomColor: border }]}>
              <Text style={[styles.rowLabel, { color: textSecondary }]}>{label}</Text>
              <Text style={[styles.rowValue, { color: textPrimary }]}>{value}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
      <AttachmentPreviewModal uri={preview} onClose={() => setPreview(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    borderRadius: radius.xl,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.lg,
  },
  heroBlob1: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    top: -50, right: -40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  heroBlob2: {
    position: 'absolute', width: 70, height: 70, borderRadius: 35,
    bottom: -28, left: 30,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', position: 'relative' },
  heroLabel: { ...typography.label, color: '#BFDBFE', textTransform: 'uppercase', letterSpacing: 1 },
  heroAmount: { ...typography.amount, color: '#FFFFFF', marginTop: 10, position: 'relative' },
  heroDate: { color: '#BFDBFE', fontSize: 13, marginTop: 6, position: 'relative' },

  card: { borderRadius: radius.xl, padding: 18, marginTop: 16, borderWidth: 1, ...shadows.sm },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  invCount: { fontSize: 12.5, fontWeight: '700' },
  invGroup: { marginTop: 12 },
  invGroupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: radius.pill, borderWidth: 1,
    paddingLeft: 8, paddingRight: 4, paddingVertical: 3, flexShrink: 1,
  },
  catChipText: { fontSize: 12, fontWeight: '800', flexShrink: 1 },
  catChipCount: { borderRadius: radius.pill, minWidth: 17, height: 17, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  catChipCountText: { fontSize: 10, fontWeight: '800' },
  invGroupMoney: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  invGroupClaimed: { fontSize: 12.5, fontWeight: '700' },
  invGroupApproved: { fontSize: 12.5, fontWeight: '800' },
  invRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 9 },
  invLeft: { flex: 1, marginRight: 10 },
  invNo: { fontSize: 13.5, fontWeight: '800' },
  invVendor: { fontSize: 12, marginTop: 1 },
  invDate: { fontSize: 11.5, marginTop: 2 },
  invRemarks: { fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  invRight: { alignItems: 'flex-end', minWidth: 92 },
  invClaimed: { fontSize: 13.5, fontWeight: '700' },
  invApproved: { fontSize: 13.5, fontWeight: '800', marginTop: 1 },
  invAttachRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  invAttachInfo: { flex: 1, marginLeft: 10 },
  invAttachLabel: { fontSize: 12.5, fontWeight: '700' },
  invAttachHint: { fontSize: 11, marginTop: 1 },
  invNoAttachRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  invNoAttachText: { fontSize: 11.5 },

  // Timeline
  stageRow: { flexDirection: 'row' },
  stageRail: { alignItems: 'center', width: 26, marginRight: 10 },
  stageDot: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: palette.surface,
  },
  stageLine: { width: 2, flex: 1, minHeight: 30, marginVertical: 2 },
  stageBody: { flex: 1, paddingBottom: 18 },
  stageLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stageLabel: { fontSize: 14.5, fontWeight: '700' },
  stageStateText: { fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  stageDesc: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  utrPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 9,
  },
  utrPillText: { fontSize: 13, fontWeight: '700' },

  // Stats
  statRow: { flexDirection: 'row', alignItems: 'flex-start' },
  statCol: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  statDivider: { width: 1, alignSelf: 'stretch', marginHorizontal: 8, backgroundColor: palette.border },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowLabel: { fontSize: 14, marginLeft: 10 },
  rowValue: { fontSize: 14, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
});
