import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
  Image, Modal, StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { terApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import StatusChip from '../../components/StatusChip';
import ScreenBackHeader from '../../components/ScreenBackHeader';
import { useTheme } from '../../theme/ThemeContext';
import { palette, typography, radius, shadows } from '../../theme/tokens';
import { S3_BASE } from '../../utils/constants';
import { formatDateDisplay } from '../../utils/dateFormat';
import { billStatus } from '../../utils/billStatus';
import { categoryMeta } from '../../utils/categoryMeta';
import { AttachmentTile } from '../../components/Attachment';
import { claimStartDay, periodOf, boundsFromEndMonth, parseJoiningDate } from '../../utils/claimPeriod';
import type { BillItem } from '../../types/api';

export default function TerDetailScreen({ navigation, route }: any) {
  const { data, categoryId, categoryName, from: passFrom, to: passTo } = route.params || {};
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<BillItem[]>([]);
  const [selectedCat, setSelectedCat] = useState(categoryId || 'All');
  const [preview, setPreview] = useState<string | null>(null);

  const bg = isDark ? palette.darkBg : palette.background;
  const surface = isDark ? palette.darkSurface : palette.surface;
  const textPrimary = isDark ? palette.darkTextPrimary : palette.textPrimary;
  const textSecondary = isDark ? palette.darkTextSecondary : palette.textSecondary;
  const border = isDark ? palette.darkBorder : palette.border;

  const fmt = (v: any) => '\u20B9' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

  // Exact period passed from the TER screen (selected month); fall back to the
  // period containing the TER's terto_date (period-aware for 21st-cycle companies).
  const getDateRange = () => {
    if (passFrom && passTo) return { from: passFrom, to: passTo };
    const d = data?.date ? new Date(data.date) : new Date();
    const b = boundsFromEndMonth(claimStartDay(useAuthStore.getState().user), d.getMonth() + 1, d.getFullYear());
    const f = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    return { from: f(b.from), to: f(b.to) };
  };

  const fetchBills = useCallback(async (cat: number | string) => {
    setLoading(true);
    try {
      // Use the exact period passed from the TER screen (matches the selected month),
      // fall back to deriving from the TER's terto_date.
      const { from, to } = getDateRange();
      const res = await terApi.fetchBills(from, to, cat === 'All' ? '' : String(cat));
      if (res.data.status === 'success') {
        setBills(res.data.data || []);
      } else {
        setBills([]);
      }
    } catch (err: any) {
      if (err.response?.status === 401) useAuthStore.getState().logout();
      else setBills([]);
    } finally {
      setLoading(false);
    }
  }, [data?.date]);

  useEffect(() => { fetchBills(selectedCat); }, [selectedCat]);

  useFocusEffect(
    useCallback(() => {
      fetchBills(selectedCat);
    }, [selectedCat, fetchBills])
  );

  const handleDelete = (bill: BillItem) => {
    Alert.alert('Delete Bill', `Delete bill "${bill.bill_no}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            const res = await terApi.deleteBill(bill.id);
            if (res.data.status === 'success') {
              setBills((prev) => prev.filter((b) => b.id !== bill.id));
              Alert.alert('Deleted', 'Invoice deleted successfully.');
            }
          } catch { Alert.alert('Error', 'Failed to delete invoice.'); }
        },
      },
    ]);
  };

  const categories = [
    { id: 'All', name: 'All' },
    ...(data?.expense_limit_data?.map((l: any) => ({
      ...l,
      id: String(l.category_id),
      name: l.head_name,
      is_da: Number(l.is_da ?? 0),
    })) || []),
  ];

  // Category name for a bill card (important under the "All" filter, where a
  // card could belong to any category).
  const catNameFor = (bill: BillItem) => {
    const found = categories.find((c) => c.id === String(bill.expense_categories_id));
    return found ? found.name : '';
  };

  // Pre-UNID submission state (P4)
  const submissionStatus = data?.submission_status ?? 'none';
  const isPending = submissionStatus === 'pending_l1' || submissionStatus === 'pending_l2';
  const isReturned = submissionStatus === 'returned';

  // DA categories allow ONE bill per period — when one exists, the button
  // becomes "Edit DA" instead of "Add New".
  const isDaSelected = Number(categories.find((c) => c.id === String(selectedCat))?.is_da) === 1;
  const existingDaBill = isDaSelected
    ? bills.find((b) => String(b.expense_categories_id) === String(selectedCat))
    : null;

  // Once-per-period categories (Phone): one bill per period, edit-only.
  // (isClaimable is enforced at the button render site below.)
  const ONCE_PER_PERIOD = ['Phone'];
  const oncePerPeriodWithBill =
    String(selectedCat) !== 'All'
    && ONCE_PER_PERIOD.includes(categoryName || '')
    && bills.length > 0;

  // Claim window: current period + previous 3 periods (period-aware).
  const windowStart = (() => {
    const sd = claimStartDay(useAuthStore.getState().user);
    const cur = periodOf(sd, new Date());
    const backEnd = new Date(cur.endYear, cur.endMonth - 1 - 3, 1); // end month 3 periods back
    const b = boundsFromEndMonth(sd, backEnd.getMonth() + 1, backEnd.getFullYear());
    const f = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    return f(b.from); // yyyy-mm-dd
  })();
  const { from: periodFrom, to: periodTo } = getDateRange();
  // Window: month must have started (periodFrom <= today) and not be older
  // than 3 months (periodFrom >= windowStart). Using periodTo here is WRONG —
  // the current month's end is always in the future, which would hide Add New.
  const inClaimWindow = periodFrom >= windowStart && periodFrom <= new Date().toISOString().slice(0, 10);

  // A period that ended before the employee joined isn't theirs to claim. Keeps this
  // screen consistent with the TER tile grid, which no longer offers those periods.
  const beforeJoining = (() => {
    const doj = parseJoiningDate(useAuthStore.getState().user?.date_of_joining);
    if (!doj) return false;
    const f = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    return periodTo < f(doj);
  })();

  // Claimable when the period is inside the claim window AND no UNID exists yet
  // (unid presence is the reliable signal — status can be 0 for real claims)
  // AND not pending approval — shows the Add New button. Older months never show it.
  // EXCEPTION: a returned claim (rejected by supervisor) must ALWAYS be rectifiable —
  // the employee needs to add/edit bills and resubmit regardless of the claim window.
  const isClaimable = (isReturned || (inClaimWindow && !beforeJoining))
    ? data
      ? !data.unid && !isPending
      : true
    : false;
  const activeMeta = categoryMeta(Number(categoryId || 0), categoryName);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <ScreenBackHeader title="Expense Details" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* TER context — slim strip: which claim this screen belongs to */}
        <View style={[styles.terStrip, { backgroundColor: surface, borderColor: border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.terStripLabel, { color: textSecondary }]}>
              TER · period ending {data?.date ? formatDateDisplay(data.date) : '—'}
            </Text>
            <Text style={[styles.terStripAmount, { color: textPrimary }]}>{fmt(data?.claimed_amount)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            {data?.status !== undefined && <StatusChip status={data.status} />}
            <Text style={[styles.terStripUnid, { color: isDark ? palette.darkTextTertiary : palette.textTertiary }]}>
              UNID #{data?.unid ?? '—'}
            </Text>
            {data?.paid_date && (
              <Text style={[styles.terStripUnid, { color: isDark ? palette.darkTextTertiary : palette.textTertiary }]}>
                Paid {formatDateDisplay(data.paid_date)}{data?.utr_no ? ` · UTR ${data.utr_no}` : ''}
              </Text>
            )}
          </View>
        </View>

        {/* Pending / returned banners (P4) */}
        {isPending && (
          <View style={[styles.lockBanner, { backgroundColor: palette.warningLight }]}>
            <MaterialCommunityIcons name="clock-outline" size={18} color={palette.warning} />
            <Text style={[styles.lockBannerText, { color: palette.warning }]}>
              {submissionStatus === 'pending_l2'
                ? 'Awaiting L2 approval — invoices are locked.'
                : 'Submitted to supervisor — invoices are locked while pending approval.'}
            </Text>
          </View>
        )}
        {isReturned && data?.reject_reason && (
          <View style={[styles.lockBanner, { backgroundColor: palette.errorLight }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color={palette.error} />
            <Text style={[styles.lockBannerText, { color: palette.error }]}>
              Returned by supervisor: {data.reject_reason}
            </Text>
          </View>
        )}

        {/* FOCUSED category section — hero card for the current category + Add New */}
        <LinearGradient
          colors={[activeMeta.color, `${activeMeta.color}B3`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.focusCard}
        >
          <View pointerEvents="none" style={styles.focusBlob} />
          <View style={styles.focusRow}>
            <View style={styles.focusIconWrap}>
              <MaterialCommunityIcons name={activeMeta.icon as any} size={26} color={activeMeta.color} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.focusLabel}>CATEGORY</Text>
              <Text style={styles.focusTitle}>
                {categoryName || (categories.find((c: any) => c.id === selectedCat)?.name ?? 'Expenses')}
              </Text>
              <Text style={styles.focusSub}>
                {getDateRange().from && getDateRange().to
                  ? `${formatDateDisplay(getDateRange().from)} – ${formatDateDisplay(getDateRange().to)}`
                  : ''}
                {' · '}{bills.length} invoice{bills.length === 1 ? '' : 's'} · {fmt(bills.reduce((s, b) => s + (Number(b.claimed_amount) || 0), 0))}
              </Text>
            </View>
          </View>
          {isClaimable && (
            existingDaBill ? (
              <TouchableOpacity
                style={styles.focusAdd}
                onPress={() => navigation.navigate('EditBill', {
                  bill: existingDaBill,
                  categories: categories.filter((c) => c.id !== 'All').map((c) => ({ ...c, id: Number(c.id) })),
                  monthFrom: getDateRange().from,
                  monthTo: getDateRange().to,
                })}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="pencil-outline" size={15} color={activeMeta.color} />
                <Text style={[styles.focusAddText, { color: activeMeta.color }]}>Edit DA</Text>
              </TouchableOpacity>
            ) : oncePerPeriodWithBill ? (
              <TouchableOpacity
                style={styles.focusAdd}
                onPress={() => navigation.navigate('EditBill', {
                  bill: bills[0],
                  categories: categories.filter((c) => c.id !== 'All').map((c) => ({ ...c, id: Number(c.id) })),
                  monthFrom: getDateRange().from,
                  monthTo: getDateRange().to,
                })}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="pencil-outline" size={15} color={activeMeta.color} />
                <Text style={[styles.focusAddText, { color: activeMeta.color }]}>Edit Expense</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.focusAdd}
                onPress={() => navigation.navigate('AddBill', {
                  // Keep the full limit payload — AddBill needs limit_amount /
                  // claimed_amount / limit_period to cap the claimable amount.
                  categories: (data?.expense_limit_data || []).map((l: any) => ({
                    ...l,
                    id: Number(l.category_id),
                    name: l.head_name,
                  })),
                  preselected: Number(categoryId || categories[1]?.id) || undefined,
                  // lock the bill dates to the selected month bracket
                  monthFrom: getDateRange().from,
                  monthTo: getDateRange().to,
                })}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="plus" size={16} color={activeMeta.color} />
                <Text style={[styles.focusAddText, { color: activeMeta.color }]}>Add New</Text>
              </TouchableOpacity>
            )
          )}
        </LinearGradient>

        {/* Category scroller — switch between categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          {categories.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, { borderColor: border }, selectedCat === c.id && styles.chipActive]}
              onPress={() => setSelectedCat(c.id)}
            >
              <Text style={[styles.chipText, selectedCat === c.id && styles.chipTextActive]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Bills */}
        {bills.length > 0 ? (
          bills.map((bill) => (
            <View key={bill.id} style={[styles.billCard, { backgroundColor: surface, borderColor: border }]}>
              <View style={styles.billHeader}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  {catNameFor(bill) ? (
                    <View style={styles.billCatRow}>
                      <View style={styles.billCatDot} />
                      <Text style={[styles.billCat, { color: textSecondary }]} numberOfLines={1}>{catNameFor(bill)}</Text>
                    </View>
                  ) : null}
                  <View style={styles.billNoRow}>
                    <Text style={[styles.billNo, { color: textPrimary }]}>#{bill.bill_no}</Text>
                    {(() => { const st = billStatus(bill.status); return st ? (
                      <View style={[styles.billStatusChip, { backgroundColor: st.bg }]}>
                        <Text style={[styles.billStatusText, { color: st.fg }]}>{st.label}</Text>
                      </View>
                    ) : null; })()}
                  </View>
                  <Text style={[styles.billVendor, { color: textSecondary }]} numberOfLines={1}>{bill.vendor_name}</Text>
                  <Text style={[styles.billDate, { color: isDark ? palette.darkTextTertiary : palette.textTertiary }]}>
                    {formatDateDisplay(bill.from_date)} — {formatDateDisplay(bill.to_date)}
                  </Text>
                </View>
                <View style={styles.billAmounts}>
                  <Text style={styles.billClaimed}>{fmt(bill.claimed_amount)}</Text>
                  <Text style={[styles.billBillAmt, { color: textSecondary }]}>Bill: {fmt(bill.bill_amount)}</Text>
                </View>
              </View>

              {/* Attachment */}
              {bill.attachment ? (
                <TouchableOpacity
                  style={styles.attachRow}
                  onPress={() => setPreview(S3_BASE + bill.attachment)}
                >
                  <AttachmentTile />
                  <View style={styles.attachInfo}>
                    <Text style={[styles.attachLabel, { color: textPrimary }]}>View attachment</Text>
                    <Text style={[styles.attachHint, { color: textSecondary }]}>Tap to preview</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={textSecondary} />
                </TouchableOpacity>
              ) : (
                <View style={styles.noAttachRow}>
                  <MaterialCommunityIcons name="file-remove-outline" size={16} color={textSecondary} />
                  <Text style={[styles.noAttachText, { color: textSecondary }]}>No attachment</Text>
                </View>
              )}

              {/* Actions — hidden for bills pending supervisor approval (status 5/6) */}
              {(data?.status === '14' || !data?.unid) && bill.status !== 5 && bill.status !== 6 ? (
                <View style={styles.billActions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate('EditBill', {
                      bill,
                      categories: categories.filter((c) => c.id !== 'All').map((c) => ({ ...c, id: Number(c.id) })),
                      monthFrom: getDateRange().from,
                      monthTo: getDateRange().to,
                    })}
                  >
                    <MaterialCommunityIcons name="pencil-outline" size={15} color={palette.primary} />
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(bill)}>
                    <MaterialCommunityIcons name="trash-can-outline" size={15} color={palette.error} />
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ))
        ) : !loading ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="receipt-outline" size={40} color={textSecondary} />
            <Text style={[styles.emptyTitle, { color: textPrimary }]}>No invoices found</Text>
            <Text style={[styles.emptySub, { color: textSecondary }]}>
              No bills in this category for the TER period.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Image preview modal */}
      <Modal visible={!!preview} transparent animationType="fade">
        <TouchableOpacity style={styles.previewOverlay} activeOpacity={1} onPress={() => setPreview(null)}>
          {preview && (
            <Image source={{ uri: preview }} style={styles.previewImage} resizeMode="contain" />
          )}
          <TouchableOpacity style={styles.closeBtn} onPress={() => setPreview(null)}>
            <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Slim TER context strip — replaced the heavy hero so the category is the focus
  terStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: radius.lg, borderWidth: 1, padding: 14, marginBottom: 12, ...shadows.sm,
  },
  terStripLabel: { fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: .4 },
  terStripAmount: { fontSize: 19, fontWeight: '800', marginTop: 4 },
  terStripUnid: { fontSize: 12, marginTop: 4 },
  // Focused category hero card — current category + Add New
  focusCard: {
    borderRadius: radius.xl, padding: 16, marginVertical: 14,
    position: 'relative', overflow: 'hidden', ...shadows.md,
  },
  focusBlob: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    top: -46, right: -34, backgroundColor: 'rgba(255,255,255,0.18)',
  },
  focusRow: { flexDirection: 'row', alignItems: 'center' },
  focusIconWrap: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  focusLabel: {
    fontSize: 10.5, fontWeight: '800', color: 'rgba(255,255,255,0.9)',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  focusTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  focusSub: { fontSize: 12, color: 'rgba(255,255,255,0.92)', marginTop: 3 },
  focusAdd: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: '#FFFFFF', borderRadius: radius.pill,
    paddingVertical: 9, marginTop: 14, alignSelf: 'stretch',
  },
  focusAddText: { fontSize: 13.5, fontWeight: '800' },
  addNewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: palette.primary, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  addNewText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, marginRight: 8, borderWidth: 1 },
  chipActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  chipText: { fontSize: 13, color: palette.textSecondary, fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },
  loadingBox: { alignItems: 'center', paddingVertical: 40 },
  billCard: { borderRadius: radius.lg, padding: 14, marginBottom: 12, borderWidth: 1, ...shadows.sm },
  billHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  billCatRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  billCatDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.primary },
  billCat: { fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: .3 },
  billNoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  billNo: { fontSize: 15, fontWeight: '700' },
  billStatusChip: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  billStatusText: { fontSize: 10.5, fontWeight: '700' },
  lockBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: radius.lg, padding: 12, marginBottom: 10,
  },
  lockBannerText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  billVendor: { fontSize: 13, marginTop: 2 },
  billDate: { fontSize: 12, marginTop: 2 },
  billAmounts: { alignItems: 'flex-end' },
  billClaimed: { fontSize: 16, fontWeight: '700', color: palette.primary },
  billBillAmt: { fontSize: 12, marginTop: 2 },
  attachRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 10 },
  attachInfo: { flex: 1, marginLeft: 10 },
  attachLabel: { fontSize: 13, fontWeight: '600' },
  attachHint: { fontSize: 12, marginTop: 1 },
  noAttachRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 10 },
  noAttachText: { fontSize: 12 },
  billActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  editText: { color: palette.primary, fontWeight: '600', fontSize: 13 },
  deleteText: { color: palette.error, fontWeight: '600', fontSize: 13 },
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 10 },
  emptySub: { fontSize: 13, marginTop: 4, textAlign: 'center' },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  previewImage: { width: '100%', height: '80%' },
  closeBtn: { position: 'absolute', top: 50, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
});
