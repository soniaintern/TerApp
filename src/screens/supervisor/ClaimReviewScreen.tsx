import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
  Image, Modal, TextInput, KeyboardAvoidingView, Platform, StyleSheet, Linking,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { terApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import ScreenBackHeader from '../../components/ScreenBackHeader';
import { useTheme } from '../../theme/ThemeContext';
import { palette, typography, radius, shadows } from '../../theme/tokens';
import type { ClaimReviewBill } from '../../types/api';

export default function ClaimReviewScreen({ navigation, route }: any) {
  const { sender_id, from_date, to_date, employee_name, month, level } = route.params || {};
  const { isDark } = useTheme();
  const reviewLevel: 'l1' | 'l2' = level === 'l2' ? 'l2' : 'l1';

  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  // Partial reject: category ids whose bills should be returned (default all)
  const [rejectCats, setRejectCats] = useState<Set<number>>(new Set());
  const [preview, setPreview] = useState<string | null>(null);
  // Per-invoice approved amounts, held as draft STRINGS so typing isn't fought by
  // re-renders. An absent id means "approved at the full claimed amount", so the
  // payload only carries the invoices the supervisor actually changed.
  const [amts, setAmts] = useState<Record<number, string>>({});
  const [showApproveModal, setShowApproveModal] = useState(false);

  const bg = isDark ? palette.darkBg : palette.background;
  const surface = isDark ? palette.darkSurface : palette.surface;
  const textPrimary = isDark ? palette.darkTextPrimary : palette.textPrimary;
  const textSecondary = isDark ? palette.darkTextSecondary : palette.textSecondary;
  const border = isDark ? palette.darkBorder : palette.border;

  const fmt = (v: any) => '\u20B9' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await terApi.supervisorClaimDetail(sender_id, from_date, to_date);
      if (res.data.status === 'success') {
        setDetail(res.data.data);
      } else {
        setDetail(null);
      }
    } catch (err: any) {
      if (err.response?.status === 401) useAuthStore.getState().logout();
      else setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [sender_id, from_date, to_date]);

  useFocusEffect(
    useCallback(() => {
      fetchDetail();
    }, [fetchDetail])
  );

  // PDFs (merged DA bills) open in the device browser; images preview inline
  const openAttachment = (url: string) => {
    if (/\.pdf$/i.test(url)) {
      Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open the PDF.'));
    } else {
      setPreview(url);
    }
  };

  // Shared error handler: 422 = already processed by another supervisor
  const handleActionError = (err: any) => {
    if (err.response?.status === 422) {
      Alert.alert('Already Processed', err.response?.data?.message || 'This claim was already reviewed.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      return;
    }
    Alert.alert('Error', err.response?.data?.message || 'Something went wrong.');
  };

  // Manual forward: L1 can send a claim to L2 for an extra review even when
  // no special-approval category is present (auto-routed claims hide this).
  // Some claims must be finalised at L2 regardless (special-approval category, or the
  // claimant is a supervisor). Surfaced in the approve sheet so "Approve" there isn't
  // misread as the last word.
  const requiresL2 = !!detail?.requires_l2;

  // L1's alternative to approving: hand the claim to L2. No second confirmation —
  // this sheet is already the review step, and the amounts shown are what get saved.
  const submitForward = async () => {
    setActing(true);
    try {
      // Send the adjustments too — L1's figures persist so L2 inherits them.
      const fwdPayload: Record<number, number> = {};
      changedBills.forEach((b) => { fwdPayload[b.id] = approvedFor(b); });

      const res = await terApi.supervisorApprove(
        sender_id, from_date, to_date, '', true,
        Object.keys(fwdPayload).length ? fwdPayload : undefined,
      );
      if (res.data.status === 'success') {
        setShowApproveModal(false);
        Alert.alert('Sent to L2', res.data.message || 'Claim sent to L2 for final approval.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', res.data.message);
      }
    } catch (err: any) {
      handleActionError(err);
    } finally {
      setActing(false);
    }
  };

  // Approving always opens the amount sheet — the supervisor is asked bill-wise
  // every time, even when they intend to approve everything in full.
  const openApprove = () => {
    setAmts({});
    setShowApproveModal(true);
  };

  const submitApproval = async () => {
    setActing(true);
    try {
      // Only the invoices actually changed here — the server caps each at its own
      // claimed amount, and an empty payload leaves every bill as it stands.
      const payload: Record<number, number> = {};
      changedBills.forEach((b) => { payload[b.id] = approvedFor(b); });

      const res = await terApi.supervisorApprove(
        sender_id, from_date, to_date, undefined, false,
        Object.keys(payload).length ? payload : undefined,
      );
      if (res.data.status === 'success') {
        setShowApproveModal(false);
        Alert.alert('Approved', res.data.message || 'Claim approved. UNID generated.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', res.data.message);
      }
    } catch (err: any) {
      handleActionError(err);
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setActing(true);
    try {
      // Partial reject: ONLY the chosen categories are returned — the
      // supervisor must explicitly pick them.
      const res = await terApi.supervisorReject(sender_id, from_date, to_date, rejectReason.trim(), [...rejectCats]);
      if (res.data.status === 'success') {
        setShowRejectModal(false);
        setRejectReason('');
        Alert.alert('Returned', 'Claim returned to the employee for rectification.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', res.data.message);
      }
    } catch (err: any) {
      handleActionError(err);
    } finally {
      setActing(false);
    }
  };

  const emp = detail?.employee;
  const bills: ClaimReviewBill[] = detail?.bills || [];

  // --- per-invoice approved amounts -------------------------------------------
  const claimedOf = (b: ClaimReviewBill) => Number(b.claimed_amount || 0);

  // What the bill already carries. L1 writes approved_amount, so when L2 reviews the
  // same claim this is L1's figure rather than the claimed one — L2 opens the claim
  // seeing what was approved and can adjust from there.
  const baseOf = (b: ClaimReviewBill) => {
    const a = b.approved_amount;
    return a !== null && a !== undefined && a !== '' ? Number(a) : claimedOf(b);
  };

  // Draft text for the input: whatever the supervisor typed, else the inherited value.
  const amtText = (b: ClaimReviewBill) => amts[b.id] ?? String(baseOf(b));

  // What will actually be sent — clamped to [0, claimed]. The server enforces the
  // same ceiling; this only stops the UI displaying an impossible number.
  const approvedFor = (b: ClaimReviewBill) => {
    const raw = amts[b.id];
    if (raw === undefined) return baseOf(b);
    const n = Number(String(raw).replace(/[^0-9.]/g, ''));
    if (!isFinite(n)) return baseOf(b);
    return Math.max(0, Math.min(claimedOf(b), Math.round(n * 100) / 100));
  };

  const clampAmount = (b: ClaimReviewBill) =>
    setAmts((p) => ({ ...p, [b.id]: String(approvedFor(b)) }));

  // Adjustments worth sending: differs from what the bill already carries, so an
  // untouched L2 review sends nothing and leaves L1's figures intact.
  const changedBills = bills.filter((b) => approvedFor(b) !== baseOf(b));
  // Anything below the claimed amount, inherited or not — drives the warning display.
  const reducedBills = bills.filter((b) => approvedFor(b) !== claimedOf(b));
  const approveTotal = bills.reduce((s, b) => s + approvedFor(b), 0);

  // Unique categories present in this claim (for the reject picker)
  const billCats = bills.reduce<{ id: number; name: string }[]>((acc, b) => {
    if (b.expense_categories_id && !acc.find((c) => c.id === Number(b.expense_categories_id))) {
      acc.push({ id: Number(b.expense_categories_id), name: b.category_name || `Category ${b.expense_categories_id}` });
    }
    return acc;
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <ScreenBackHeader title="Review Claim" onBack={() => navigation.goBack()} />
      {(
        <>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
            {/* Employee + claim summary */}
            <View style={[styles.summaryCard, { backgroundColor: surface, borderColor: border }]}>
              <View style={styles.summaryHeader}>
                <View style={[styles.avatar, { backgroundColor: palette.primarySoft }]}>
                  <Text style={[styles.avatarText, { color: palette.primary }]}>
                    {(emp?.name || employee_name || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.summaryName, { color: textPrimary }]}>{emp?.name || employee_name}</Text>
                  <Text style={[styles.summaryMeta, { color: textSecondary }]}>
                    {emp?.employee_id} · {emp?.designation || '—'} · {emp?.pfu || '—'}
                  </Text>
                </View>
                <View style={[styles.monthBadge, { backgroundColor: reviewLevel === 'l2' ? palette.primarySoft : palette.warningLight }]}>
                  <Text style={[styles.monthBadgeText, { color: reviewLevel === 'l2' ? palette.primary : palette.warning }]}>
                    {reviewLevel === 'l2' ? `L2 · ${month}` : month}
                  </Text>
                </View>
              </View>

              <View style={[styles.summaryRow, { borderTopColor: border }]}>
                <View>
                  <Text style={[styles.summaryLabel, { color: textSecondary }]}>Total Claimed</Text>
                  <Text style={[styles.summaryAmount, { color: textPrimary }]}>{fmt(detail?.total_claimed_amount)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.summaryLabel, { color: textSecondary }]}>Period</Text>
                  <Text style={[styles.summaryPeriod, { color: textPrimary }]}>
                    {from_date} → {to_date}
                  </Text>
                </View>
              </View>

              {detail?.last_review && (
                <View style={[styles.lastReview, { borderTopColor: border }]}>
                  <Text style={[styles.lastReviewText, { color: textSecondary }]}>
                    Last action: {detail.last_review.action === 'approve' ? 'Approved' : 'Returned'}
                    {detail.last_review.reason ? ` — ${detail.last_review.reason}` : ''}
                  </Text>
                </View>
              )}
            </View>

            {/* Invoices */}
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>
              Invoices ({bills.length})
            </Text>

            {bills.length > 0 ? (
              bills.map((bill) => (
                <View key={bill.id} style={[styles.billCard, { backgroundColor: surface, borderColor: border }]}>
                  <View style={styles.billHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.billNoRow}>
                        <Text style={[styles.billNo, { color: textPrimary }]}>#{bill.bill_no}</Text>
                        {bill.category_name ? (
                          <View style={[styles.catChip, { backgroundColor: palette.primarySoft }]}>
                            <Text style={[styles.catChipText, { color: palette.primary }]}>{bill.category_name}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={[styles.billVendor, { color: textSecondary }]}>{bill.vendor_name}</Text>
                      <Text style={[styles.billDate, { color: textSecondary }]}>{bill.from_date} → {bill.to_date}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.billClaimed, { color: textPrimary }]}>{fmt(bill.claimed_amount)}</Text>
                      <Text style={[styles.billBillAmt, { color: textSecondary }]}>Bill: {fmt(bill.bill_amount)}</Text>
                    </View>
                  </View>

                  {/* Already reduced by an earlier level (or approved less than claimed) —
                      surfaced here so the reviewer spots it without opening the sheet. */}
                  {baseOf(bill) !== claimedOf(bill) && (
                    <Text style={[styles.approvedNote, { color: palette.warning }]}>
                      Approved {fmt(baseOf(bill))}
                      {reviewLevel === 'l2' ? ' by L1' : ''}
                    </Text>
                  )}

                  {bill.attachment_url ? (
                    <TouchableOpacity
                      style={[styles.attachRow, { borderTopColor: border }]}
                      onPress={() => openAttachment(bill.attachment_url!)}
                    >
                      <Image source={{ uri: bill.attachment_url }} style={styles.attachThumb} resizeMode="cover" />
                      <View style={styles.attachInfo}>
                        <Text style={[styles.attachLabel, { color: textPrimary }]}>View attachment</Text>
                        <Text style={[styles.attachHint, { color: textSecondary }]}>Tap to preview</Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={20} color={textSecondary} />
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.noAttachRow, { borderTopColor: border }]}>
                      <MaterialCommunityIcons name="file-remove-outline" size={16} color={textSecondary} />
                      <Text style={[styles.noAttachText, { color: textSecondary }]}>No attachment</Text>
                    </View>
                  )}
                </View>
              ))
            ) : !loading ? (
              <View style={styles.emptyBox}>
                <Text style={[styles.emptyText, { color: textSecondary }]}>No invoices found for this claim.</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Approve / Reject actions — sending to L2 now lives inside the approve
              sheet, so L1 makes that choice while looking at the amounts. */}
          <View style={[styles.actionBar, { backgroundColor: surface, borderTopColor: border }]}>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.rejectBtn, { borderColor: palette.error }]}
                disabled={acting}
                onPress={() => {
                  setRejectCats(new Set());
                  setRejectReason('');
                  setShowRejectModal(true);
                }}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="close" size={18} color={palette.error} />
                <Text style={[styles.rejectBtnText, { color: palette.error }]}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.approveBtn}
                disabled={acting}
                onPress={openApprove}
                activeOpacity={0.8}
              >
                {acting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                    <Text style={styles.approveBtnText}>Approve</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Approve sheet — bill-wise approved amounts, asked on every approval.
              Amounts are capped at each invoice's claimed amount (server enforces
              the same ceiling). Leaving a field alone approves it in full. */}
          <Modal visible={showApproveModal} transparent animationType="slide">
            <KeyboardAvoidingView
              style={styles.modalOverlay}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <View style={[styles.modalSheet, { backgroundColor: surface }]}>
                <View style={styles.modalHandle} />
                <Text style={[styles.modalTitle, { color: textPrimary }]}>Approve Claim</Text>
                <Text style={[styles.modalSub, { color: textSecondary }]}>
                  Approve the {month} TER of {employee_name}. Reduce any invoice below its
                  claimed amount if needed — you cannot approve more than was claimed.
                  {requiresL2
                    ? '\n\nThis claim must go to L2 for final approval.'
                    : ''}
                </Text>

                <ScrollView style={styles.amountList} keyboardShouldPersistTaps="handled">
                  {bills.map((bill) => {
                    const over = approvedFor(bill) !== claimedOf(bill);
                    return (
                      <View key={bill.id} style={[styles.amountRow, { borderBottomColor: border }]}>
                        <View style={styles.amountInfo}>
                          <Text style={[styles.amountName, { color: textPrimary }]} numberOfLines={1}>
                            {bill.bill_no || bill.category_name}
                          </Text>
                          <Text style={[styles.amountMeta, { color: textSecondary }]} numberOfLines={1}>
                            {bill.category_name} · claimed {fmt(bill.claimed_amount)}
                          </Text>
                        </View>
                        <View style={[styles.approveInputWrap, {
                          borderColor: over ? palette.warning : border,
                          backgroundColor: bg,
                        }]}>
                          <Text style={[styles.approveRupee, { color: textSecondary }]}>₹</Text>
                          <TextInput
                            style={[styles.approveInput, { color: textPrimary }]}
                            value={amtText(bill)}
                            onChangeText={(t) => setAmts((p) => ({ ...p, [bill.id]: t }))}
                            onBlur={() => clampAmount(bill)}
                            keyboardType="decimal-pad"
                            selectTextOnFocus
                            placeholderTextColor={textSecondary}
                          />
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>

                <View style={[styles.amountTotals, { borderTopColor: border }]}>
                  <Text style={[styles.amountTotalsLabel, { color: textSecondary }]}>Total approving</Text>
                  <Text style={[styles.amountTotalsValue, { color: reducedBills.length ? palette.warning : palette.success }]}>
                    {fmt(approveTotal)}
                  </Text>
                </View>
                <Text style={[styles.amountTotalsSub, { color: textSecondary }]}>
                  of {fmt(detail?.total_claimed_amount)} claimed
                  {reducedBills.length > 0
                    ? ` · ${reducedBills.length} invoice${reducedBills.length === 1 ? '' : 's'} reduced`
                    : ''}
                </Text>

                {/* Three permanent choices for L1: approve, hand to L2, or cancel.
                    L2 is the final level, so it only gets Cancel / Approve. */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalCancelBtn, { borderColor: border }]}
                    onPress={() => setShowApproveModal(false)}
                    disabled={acting}
                  >
                    <Text style={[styles.modalCancelText, { color: textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>

                  {reviewLevel === 'l1' && (
                    <TouchableOpacity
                      style={[styles.modalAltBtn, acting && { opacity: 0.5 }]}
                      onPress={submitForward}
                      disabled={acting}
                    >
                      <Text style={styles.modalAltText}>Send to L2</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.approveConfirmBtn, acting && { opacity: 0.5 }]}
                    disabled={acting}
                    onPress={submitApproval}
                  >
                    {acting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalConfirmText}>Approve</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>

          {/* Reject reason modal */}
          <Modal visible={showRejectModal} transparent animationType="slide">
            <KeyboardAvoidingView
              style={styles.modalOverlay}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <View style={[styles.modalSheet, { backgroundColor: surface }]}>
                <View style={styles.modalHandle} />
                <Text style={[styles.modalTitle, { color: textPrimary }]}>Reject Claim</Text>
                <Text style={[styles.modalSub, { color: textSecondary }]}>
                  Choose the categories that need changes, then add a reason — shown to {employee_name} for rectification.
                </Text>
                {billCats.length > 0 && (
                  <View style={styles.rejectCatRow}>
                    <TouchableOpacity
                      style={[
                        styles.rejectCatChip,
                        { borderColor: border },
                        rejectCats.size === billCats.length && { backgroundColor: palette.error, borderColor: palette.error },
                      ]}
                      onPress={() => setRejectCats(new Set(billCats.map((c) => c.id)))}
                    >
                      <Text style={[styles.rejectCatText, { color: rejectCats.size === billCats.length ? '#FFFFFF' : textSecondary }]}>
                        Reject all
                      </Text>
                    </TouchableOpacity>
                    {billCats.map((c) => {
                      const on = rejectCats.has(c.id);
                      return (
                        <TouchableOpacity
                          key={c.id}
                          style={[
                            styles.rejectCatChip,
                            { borderColor: border },
                            on && { backgroundColor: palette.error, borderColor: palette.error },
                          ]}
                          onPress={() => setRejectCats((prev) => {
                            const next = new Set(prev);
                            next.has(c.id) ? next.delete(c.id) : next.add(c.id);
                            return next;
                          })}
                        >
                          <Text style={[styles.rejectCatText, { color: on ? '#FFFFFF' : textSecondary }]}>{c.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                <TextInput
                  style={[styles.reasonInput, { backgroundColor: bg, color: textPrimary, borderColor: border }]}
                  placeholder="Enter reason…"
                  placeholderTextColor={palette.textTertiary}
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  multiline
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalCancelBtn, { borderColor: border }]}
                    onPress={() => { setShowRejectModal(false); setRejectReason(''); }}
                  >
                    <Text style={[styles.modalCancelText, { color: textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalConfirmBtn, (!rejectReason.trim() || rejectCats.size === 0) && { opacity: 0.5 }]}
                    disabled={!rejectReason.trim() || rejectCats.size === 0 || acting}
                    onPress={handleReject}
                  >
                    {acting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalConfirmText}>Reject & Return</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>

          {/* Attachment preview */}
          <Modal visible={!!preview} transparent animationType="fade">
            <TouchableOpacity style={styles.previewOverlay} activeOpacity={1} onPress={() => setPreview(null)}>
              {preview && <Image source={{ uri: preview }} style={styles.previewImage} resizeMode="contain" />}
              <TouchableOpacity style={styles.closeBtn} onPress={() => setPreview(null)}>
                <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summaryCard: { borderRadius: radius.lg, padding: 16, borderWidth: 1, ...shadows.sm },
  summaryHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700' },
  summaryName: { fontSize: 16, fontWeight: '700' },
  summaryMeta: { fontSize: 12, marginTop: 2 },
  monthBadge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  monthBadgeText: { fontSize: 12, fontWeight: '700' },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    borderTopWidth: 1, marginTop: 12, paddingTop: 12,
  },
  summaryLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryAmount: { fontSize: 22, fontWeight: '700', marginTop: 2 },
  summaryPeriod: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  lastReview: { borderTopWidth: 1, marginTop: 12, paddingTop: 10 },
  lastReviewText: { fontSize: 12, lineHeight: 17 },
  sectionTitle: { ...typography.h3, marginTop: 18, marginBottom: 10 },
  // Read-only marker on the bill list when a bill is approved below its claim.
  approvedNote: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  // --- approve sheet ---
  amountList: { maxHeight: 320 },
  amountRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, paddingVertical: 10, borderBottomWidth: 1,
  },
  amountInfo: { flex: 1, minWidth: 0 },
  amountName: { fontSize: 13.5, fontWeight: '700' },
  amountMeta: { fontSize: 11.5, marginTop: 2 },
  approveInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 8, height: 38, width: 118,
  },
  approveRupee: { fontSize: 14, fontWeight: '700', marginRight: 3 },
  // minWidth 0 keeps the input from refusing to shrink inside the row.
  approveInput: { flex: 1, minWidth: 0, fontSize: 15, padding: 0 },
  amountTotals: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, marginTop: 6, paddingTop: 12,
  },
  amountTotalsLabel: { fontSize: 13, fontWeight: '600' },
  amountTotalsValue: { fontSize: 18, fontWeight: '800' },
  amountTotalsSub: { fontSize: 11.5, marginTop: 2, textAlign: 'right' },
  billCard: { borderRadius: radius.lg, padding: 14, marginBottom: 12, borderWidth: 1, ...shadows.sm },
  billHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  billNoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  billNo: { fontSize: 15, fontWeight: '700' },
  catChip: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  catChipText: { fontSize: 11, fontWeight: '600' },
  billVendor: { fontSize: 13, marginTop: 3 },
  billDate: { fontSize: 12, marginTop: 2 },
  billClaimed: { fontSize: 16, fontWeight: '700', color: palette.primary },
  billBillAmt: { fontSize: 12, marginTop: 2 },
  attachRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, borderTopWidth: 1, paddingTop: 10 },
  attachThumb: { width: 48, height: 48, borderRadius: 8 },
  attachInfo: { flex: 1, marginLeft: 10 },
  attachLabel: { fontSize: 13, fontWeight: '600' },
  attachHint: { fontSize: 12, marginTop: 1 },
  noAttachRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, borderTopWidth: 1, paddingTop: 10 },
  noAttachText: { fontSize: 12 },
  emptyBox: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { fontSize: 13 },
  actionBar: {
    padding: 14, paddingBottom: 26,
    borderTopWidth: 1, ...shadows.lg,
  },
  actionRow: { flexDirection: 'row', gap: 12 },
  // "Send to L2" — amber outline, matching the old forward button's colour.
  modalAltBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.pill, paddingVertical: 12, borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  modalAltText: { color: '#B45309', fontSize: 14, fontWeight: '700' },
  // Approve stays green (palette.error on modalConfirmBtn is the reject sheet's).
  approveConfirmBtn: {
    flex: 1.2, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.pill, paddingVertical: 12, backgroundColor: palette.success,
  },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: radius.pill, paddingVertical: 12, borderWidth: 1.5,
  },
  rejectBtnText: { fontSize: 15, fontWeight: '700' },
  approveBtn: {
    flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: radius.pill, paddingVertical: 12, backgroundColor: palette.success,
  },
  approveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl,
    padding: 20, paddingBottom: 40,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { ...typography.h3, textAlign: 'center' },
  modalSub: { fontSize: 13, textAlign: 'center', marginTop: 6, marginBottom: 14, lineHeight: 18 },
  rejectCatRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12, justifyContent: 'center' },
  rejectCatChip: {
    borderRadius: radius.pill, borderWidth: 1.5,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  rejectCatText: { fontSize: 12.5, fontWeight: '700' },
  reasonInput: {
    minHeight: 90, borderRadius: radius.md, borderWidth: 1,
    padding: 12, fontSize: 14, textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  modalCancelBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.pill, paddingVertical: 12, borderWidth: 1,
  },
  modalCancelText: { fontSize: 14, fontWeight: '600' },
  modalConfirmBtn: {
    flex: 1.4, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.pill, paddingVertical: 12, backgroundColor: palette.error,
  },
  modalConfirmText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  previewImage: { width: '100%', height: '80%' },
  closeBtn: {
    position: 'absolute', top: 50, right: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
});
