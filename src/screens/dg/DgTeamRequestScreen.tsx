import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet, ActivityIndicator, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { palette, radius, shadows } from '../../theme/tokens';
import ScreenBackHeader from '../../components/ScreenBackHeader';
import PrimaryButton from '../../components/PrimaryButton';
import { dgApi, DgInvoice, DgTeamRequest, DG_REQUEST_COLOR, DG_STATE_COLOR, fmtInr, dgStatusText } from '../../api/dg';
import DgInvoiceItem, { fmtDgDate } from './DgInvoiceItem';

/**
 * Supervisor view of one DG request raised in their name: each employee's
 * advance, payment and the bills they uploaded. The supervisor does the L1
 * check of each bill (verify / reject); the maker then verifies it on the portal.
 */
export default function DgTeamRequestScreen({ navigation, route }: any) {
  const id: number = route.params?.id;
  const { isDark } = useTheme();

  const [req, setReq] = useState<DgTeamRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState<DgInvoice | null>(null);
  const [reason, setReason] = useState('');

  const bg = isDark ? palette.darkBg : palette.background;
  const surface = isDark ? palette.darkSurface : palette.surface;
  const textPrimary = isDark ? palette.darkTextPrimary : palette.textPrimary;
  const textSecondary = isDark ? palette.darkTextSecondary : palette.textSecondary;
  const textTertiary = isDark ? palette.darkTextTertiary : palette.textTertiary;
  const border = isDark ? palette.darkBorder : palette.border;

  const load = useCallback(async () => {
    try {
      const r = await dgApi.raisedByMeDetail(id);
      setReq(r);
      setError('');
      // Open the employees with bills waiting for verification the first time.
      setOpen((prev) => (Object.keys(prev).length ? prev
        : Object.fromEntries((r.lines || []).filter((l) => l.invoice_counts.pending > 0).map((l) => [l.id, true]))));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not load this request. Pull down to retry.');
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const afterAction = (res: any) => {
    if (res?.status === 'success') {
      if (res.data) setReq(res.data);
      Alert.alert('Done', res.message);
      return true;
    }
    Alert.alert('Error', res?.message || 'Action failed.');
    return false;
  };

  const verify = (inv: DgInvoice) => {
    Alert.alert('Verify invoice', `${inv.invoice_no} · ${fmtInr(inv.amount)}\n\nYou have checked this bill. It goes to the maker for final verification.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Verify',
        onPress: async () => {
          setBusy(true);
          try { afterAction(await dgApi.l1VerifyInvoice(id, inv.id)); }
          catch (err: any) { Alert.alert('Error', err.response?.data?.message || 'Could not verify. Try again.'); }
          finally { setBusy(false); }
        },
      },
    ]);
  };

  const submitReject = async () => {
    if (!rejecting) return;
    if (!reason.trim()) return Alert.alert('Required', 'Enter the reason — the employee will see it.');
    setBusy(true);
    try {
      if (afterAction(await dgApi.l1RejectInvoice(id, rejecting.id, reason.trim()))) {
        setRejecting(null);
        setReason('');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Could not reject. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const Stat = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: textTertiary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: color || textPrimary }]}>{value}</Text>
    </View>
  );

  const reqColor = req ? DG_REQUEST_COLOR[req.status] || '#64748B' : palette.primary;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <ScreenBackHeader title={req?.req_no || 'DG Request'} onBack={() => navigation.goBack()} />
      {loading ? (
        <ActivityIndicator color={palette.primary} style={{ marginTop: 40 }} />
      ) : !req ? (
        <View style={styles.centerBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={textTertiary} />
          <Text style={[styles.emptySub, { color: textSecondary }]}>{error || 'Request not found.'}</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />}
        >
          <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
            <View style={styles.rowTop}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: textPrimary }]}>{req.activity_name}</Text>
                <Text style={[styles.sub, { color: textSecondary }]}>
                  {req.activity_type} · {fmtDgDate(req.request_date)}{req.po_no ? ` · PO ${req.po_no}` : ''}
                </Text>
              </View>
              <View style={[styles.pill, { backgroundColor: reqColor + '1A' }]}>
                <Text style={[styles.pillText, { color: reqColor }]}>{req.status_label}</Text>
              </View>
            </View>
            {req.reject_reason ? <Text style={[styles.sub, { color: '#991B1B', marginTop: 8 }]}>Rejected: {req.reject_reason}</Text> : null}
            <View style={styles.stats}>
              <Stat label="Total" value={fmtInr(req.total)} />
              <Stat label="Paid" value={`${req.paid_employees}/${req.employees}`} />
              <Stat label="To knock off" value={fmtInr(req.to_knock_off)} color={req.to_knock_off > 0 ? palette.error : undefined} />
            </View>
            {req.invoice_counts.pending > 0 && (
              <View style={styles.pendingNote}>
                <MaterialCommunityIcons name="clock-outline" size={14} color="#92400E" />
                <Text style={styles.pendingText}>
                  {req.invoice_counts.pending} bill{req.invoice_counts.pending > 1 ? 's' : ''} waiting for your check
                  {req.invoice_counts.l1_verified ? ` · ${req.invoice_counts.l1_verified} with maker` : ''}
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.section, { color: textTertiary }]}>Employees ({req.lines?.length ?? 0})</Text>
          {(req.lines || []).map((l) => {
            const paid = l.payment.status === 'paid';
            const color = paid ? DG_STATE_COLOR[l.knock_off.state] : '#4338CA';
            const isOpen = !!open[l.id];
            const invCount = l.invoices?.length ?? 0;
            return (
              <View key={l.id} style={[styles.card, { backgroundColor: surface, borderColor: l.invoice_counts.pending ? '#FDBA74' : border }]}>
                <TouchableOpacity activeOpacity={0.7} onPress={() => setOpen((p) => ({ ...p, [l.id]: !p[l.id] }))}>
                  <View style={styles.rowTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.empName, { color: textPrimary }]}>{l.emp_name}</Text>
                      <Text style={[styles.sub, { color: textSecondary }]}>{l.emp_code}{l.state ? ` · ${l.state}` : ''}</Text>
                    </View>
                    <View style={[styles.pill, { backgroundColor: color + '1A' }]}>
                      <Text style={[styles.pillText, { color }]}>{paid ? l.knock_off.label : l.payment.label}</Text>
                    </View>
                  </View>
                  <View style={styles.stats}>
                    <Stat label="Advance" value={fmtInr(l.amount)} />
                    <Stat label="Verified bills" value={fmtInr(l.knock_off.verified)} />
                    <Stat label="Balance" value={paid ? fmtInr(Math.abs(l.knock_off.balance)) : '—'} color={paid && l.knock_off.balance > 0 && l.knock_off.state !== 'carry' ? palette.error : undefined} />
                  </View>
                  <View style={[styles.footer, { borderTopColor: border }]}>
                    <Text style={[styles.footerText, { color: textSecondary }]} numberOfLines={2}>
                      {dgStatusText(l)}
                      {l.knock_off.awaiting_verification > 0 ? ` · ${fmtInr(l.knock_off.awaiting_verification)} awaiting verification` : ''}
                    </Text>
                    <Text style={[styles.billCount, { color: palette.primary }]}>{invCount} bill{invCount === 1 ? '' : 's'}</Text>
                    <MaterialCommunityIcons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={textTertiary} />
                  </View>
                </TouchableOpacity>

                {isOpen && (
                  <View>
                    {paid && l.payment.utr ? (
                      <Text style={[styles.sub, { color: textTertiary, marginTop: 8 }]}>
                        Paid {fmtInr(l.payment.amount_paid)} on {fmtDgDate(l.payment.paid_on)} · UTR {l.payment.utr}
                      </Text>
                    ) : null}
                    {invCount === 0 ? (
                      <Text style={[styles.sub, { color: textSecondary, marginTop: 10 }]}>
                        {paid ? 'No bills uploaded yet.' : 'Bills can be uploaded once the advance is paid.'}
                      </Text>
                    ) : (
                      l.invoices!.map((inv) => (
                        <DgInvoiceItem key={inv.id} inv={inv} busy={busy} onVerify={verify} onReject={(i) => { setRejecting(i); setReason(''); }} />
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* L1 reject — reason is shown to the employee */}
      <Modal visible={rejecting !== null} transparent animationType="slide" onRequestClose={() => setRejecting(null)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.sheet, { backgroundColor: surface }]}>
            <Text style={[styles.sheetTitle, { color: textPrimary }]}>Reject invoice</Text>
            {rejecting && <Text style={[styles.sub, { color: textSecondary, textAlign: 'center' }]}>{rejecting.invoice_no} · {fmtInr(rejecting.amount)}</Text>}
            <TextInput
              style={[styles.reasonInput, { borderColor: border, color: textPrimary }]}
              value={reason}
              onChangeText={setReason}
              multiline
              maxLength={500}
              placeholder="Reason (the employee will see this)"
              placeholderTextColor={textTertiary}
            />
            <PrimaryButton title="Reject invoice" onPress={submitReject} loading={busy} style={{ marginTop: 14 }} />
            <TouchableOpacity style={{ marginTop: 10, alignItems: 'center', padding: 6 }} onPress={() => setRejecting(null)}>
              <Text style={{ color: textTertiary, fontSize: 13 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptySub: { fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 30 },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: 16, marginBottom: 12, ...shadows.sm },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  title: { fontSize: 16, fontWeight: '700' },
  empName: { fontSize: 15, fontWeight: '700' },
  sub: { fontSize: 12.5, marginTop: 2, lineHeight: 18 },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, maxWidth: 150 },
  pillText: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  stats: { flexDirection: 'row', gap: 12, marginTop: 12 },
  stat: { flex: 1 },
  statLabel: { fontSize: 10.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  statValue: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  pendingNote: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', borderRadius: 8, padding: 8, marginTop: 12 },
  pendingText: { flex: 1, color: '#92400E', fontSize: 12.5, fontWeight: '600' },
  section: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 10, borderTopWidth: 1 },
  footerText: { flex: 1, fontSize: 12.5, fontWeight: '600' },
  billCount: { fontSize: 12, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  sheetTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  reasonInput: { borderWidth: 1, borderRadius: radius.md, padding: 12, minHeight: 90, textAlignVertical: 'top', marginTop: 14, fontSize: 14 },
});
