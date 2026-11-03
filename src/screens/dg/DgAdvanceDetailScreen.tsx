import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, RefreshControl, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { palette, radius, shadows } from '../../theme/tokens';
import ScreenBackHeader from '../../components/ScreenBackHeader';
import PrimaryButton from '../../components/PrimaryButton';
import { dgApi, DgAdvance, DG_STATE_COLOR, fmtInr, dgStatusText, getDgInvoiceAmounts } from '../../api/dg';
import DgInvoiceItem, { fmtDgDate as fmtDate } from './DgInvoiceItem';

/** One DG advance: payment, knock-off position and the invoices submitted against it. */
export default function DgAdvanceDetailScreen({ navigation, route }: any) {
  const id: number = route.params?.id;
  const { isDark } = useTheme();

  const [adv, setAdv] = useState<DgAdvance | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const bg = isDark ? palette.darkBg : palette.background;
  const surface = isDark ? palette.darkSurface : palette.surface;
  const textPrimary = isDark ? palette.darkTextPrimary : palette.textPrimary;
  const textSecondary = isDark ? palette.darkTextSecondary : palette.textSecondary;
  const textTertiary = isDark ? palette.darkTextTertiary : palette.textTertiary;
  const border = isDark ? palette.darkBorder : palette.border;

  const load = useCallback(async () => {
    try {
      setAdv(await dgApi.advance(id));
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not load this advance. Pull down to retry.');
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

  const Row = ({ label, value, strong, color }: { label: string; value: string; strong?: boolean; color?: string }) => (
    <View style={styles.kvRow}>
      <Text style={[styles.kvLabel, { color: textSecondary }]}>{label}</Text>
      <Text style={[styles.kvValue, { color: color || textPrimary }, strong && { fontWeight: '800' }]}>{value}</Text>
    </View>
  );

  const paid = adv?.payment.status === 'paid';
  const ko = adv?.knock_off;
  const stateColor = adv ? (paid ? DG_STATE_COLOR[adv.knock_off.state] : '#4338CA') : palette.primary;
  const invoiceAmounts = adv ? getDgInvoiceAmounts(adv) : null;
  const fullyUtilized = !!invoiceAmounts && invoiceAmounts.remainingCents === 0;
  const canShowUpload = !!adv && paid && (adv.can_upload || fullyUtilized);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <ScreenBackHeader title={adv?.req_no || 'DG Advance'} onBack={() => navigation.goBack()} />
      {loading ? (
        <ActivityIndicator color={palette.primary} style={{ marginTop: 40 }} />
      ) : !adv ? (
        <View style={styles.centerBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={textTertiary} />
          <Text style={[styles.emptySub, { color: textSecondary }]}>{error || 'Advance not found.'}</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: canShowUpload ? 110 : 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />}
        >
          {/* status banner */}
          <View style={[styles.banner, { backgroundColor: stateColor + '14', borderColor: stateColor + '40' }]}>
            <Text style={[styles.bannerLabel, { color: stateColor }]}>{paid ? ko!.label : adv.payment.label}</Text>
            <Text style={[styles.bannerText, { color: textPrimary }]}>{dgStatusText(adv)}</Text>
            {ko!.awaiting_verification > 0 && (
              <Text style={[styles.bannerSub, { color: textSecondary }]}>
                {fmtInr(ko!.awaiting_verification)} of invoices is being checked by your supervisor and the office — it counts once verified.
              </Text>
            )}
            {ko!.state === 'carry' && (
              <Text style={[styles.bannerSub, { color: textSecondary }]}>
                The office has carried this balance forward. It will be deducted from your next DG advance.
              </Text>
            )}
          </View>

          {/* activity */}
          <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
            <Text style={[styles.cardTitle, { color: textPrimary }]}>{adv.activity_name}</Text>
            <Text style={[styles.cardSub, { color: textSecondary }]}>{adv.activity_type}{adv.unid ? ` · ${adv.unid}` : ''}</Text>
            <View style={{ marginTop: 10 }}>
              {adv.po_no ? <Row label="PO No" value={adv.po_no} /> : null}
              <Row label="Request date" value={fmtDate(adv.request_date)} />
              {adv.requested_by ? <Row label="Requested by" value={adv.requested_by} /> : null}
            </View>
          </View>

          {/* payment */}
          <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
            <Text style={[styles.section, { color: textTertiary }]}>Payment</Text>
            <Row label="Advance" value={fmtInr(adv.amount)} strong />
            {adv.carried_in.map((c, i) => (
              <Row key={i} label={`Adjusted from ${c.req_no || 'earlier advance'}`} value={'− ' + fmtInr(c.amount)} />
            ))}
            {adv.carried_in.length > 0 && <Row label="Paid to bank" value={fmtInr(adv.payment.amount_paid)} />}
            <Row label="Status" value={adv.payment.label} color={paid ? palette.success : '#4338CA'} />
            {adv.payment.utr ? <Row label="UTR" value={adv.payment.utr} /> : null}
            {adv.payment.paid_on ? <Row label="Paid on" value={fmtDate(adv.payment.paid_on)} /> : null}
          </View>

          {/* knock-off */}
          {paid && (
            <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
              <Text style={[styles.section, { color: textTertiary }]}>Knock-off</Text>
              <Row label="Advance to account for" value={fmtInr(ko!.advance)} />
              <Row label="Total uploaded invoices" value={fmtInr((invoiceAmounts?.uploadedCents ?? 0) / 100)} />
              <Row label="Remaining amount" value={fmtInr((invoiceAmounts?.remainingCents ?? 0) / 100)} />
              <Row label="Verified invoices" value={fmtInr(ko!.verified)} />
              {ko!.carried_out > 0 && (
                <Row label={`Carried to ${adv.carried_out.map((c) => c.req_no).filter(Boolean).join(', ') || 'next advance'}`} value={fmtInr(ko!.carried_out)} />
              )}
              {ko!.balance_paid > 0 && <Row label="Extra spend paid to you" value={fmtInr(ko!.balance_paid)} />}
              <View style={[styles.divider, { backgroundColor: border }]} />
              <Row
                label={ko!.balance > 0 ? 'Balance to knock off' : ko!.balance < 0 ? 'Extra spent (payable to you)' : 'Balance'}
                value={fmtInr(Math.abs(ko!.balance))}
                strong
                color={ko!.balance > 0 && ko!.state !== 'carry' ? palette.error : undefined}
              />
            </View>
          )}

          {/* invoices */}
          <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
            <Text style={[styles.section, { color: textTertiary }]}>Invoices ({adv.invoices?.length ?? 0})</Text>
            {(adv.invoices?.length ?? 0) === 0 ? (
              <Text style={[styles.cardSub, { color: textSecondary, marginTop: 4 }]}>
                {paid ? 'No invoices yet. Upload the bills for this activity to knock off the advance.' : 'You can upload invoices once the advance is paid.'}
              </Text>
            ) : (
              adv.invoices!.map((inv) => <DgInvoiceItem key={inv.id} inv={inv} />)
            )}
          </View>
        </ScrollView>
      )}

      {canShowUpload && (
        <View style={[styles.bottomBar, { backgroundColor: surface, borderTopColor: border }]}>
          {fullyUtilized && (
            <Text style={[styles.fullyUtilizedText, { color: textSecondary }]}>
              Your advance amount has been fully utilized. No further invoices can be uploaded.
            </Text>
          )}
          <PrimaryButton
            title={fullyUtilized ? 'Advance fully utilized' : 'Upload invoices'}
            disabled={fullyUtilized}
            onPress={() => navigation.navigate('DgInvoiceUpload', { id: adv!.id, reqNo: adv!.req_no, balance: ko!.balance })}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptySub: { fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 30 },
  banner: { borderRadius: radius.lg, borderWidth: 1, padding: 14, marginBottom: 12 },
  bannerLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  bannerText: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  bannerSub: { fontSize: 12.5, marginTop: 6, lineHeight: 18 },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: 16, marginBottom: 12, ...shadows.sm },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardSub: { fontSize: 12.5, marginTop: 2, lineHeight: 18 },
  section: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 5, gap: 12 },
  kvLabel: { fontSize: 13, flexShrink: 1 },
  kvValue: { fontSize: 13.5, fontWeight: '600', textAlign: 'right', flexShrink: 1 },
  divider: { height: 1, marginVertical: 6 },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 28, borderTopWidth: 1 },
  fullyUtilizedText: { fontSize: 12.5, lineHeight: 18, textAlign: 'center', marginBottom: 10 },
});
