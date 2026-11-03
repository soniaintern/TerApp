import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../../theme/ThemeContext';
import { palette, radius, shadows } from '../../theme/tokens';
import ScreenBackHeader from '../../components/ScreenBackHeader';
import PrimaryButton from '../../components/PrimaryButton';
import CompactInput from '../../components/CompactInput';
import DateField, { formatDate } from '../../components/DateField';
import { optimizeImage } from '../../utils/imageOptimize';
import { FormFilePart } from '../../utils/formFile';
import { dgApi, DgAdvance, DgInvoiceDraft, fmtInr, getDgInvoiceAmounts, dgAmountToCents } from '../../api/dg';
import DgInvoiceItem from './DgInvoiceItem';

const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024;

const blankItem = (): DgInvoiceDraft => ({ invoice_no: '', invoice_date: formatDate(new Date()), amount: '', files: [] });

/**
 * Upload one or more invoices against a paid DG advance. Each invoice needs a
 * number, date, amount and at least one photo/PDF. They go to the office for
 * verification and count in the knock-off once verified.
 */
export default function DgInvoiceUploadScreen({ navigation, route }: any) {
  // OLD IMPLEMENTATION - PRESERVED FOR LOCAL TESTING:
  // The upload screen previously relied on the detail screen's route balance,
  // which could be stale and did not account for invoice drafts or refreshes.
  const { id, reqNo } = route.params as { id: number; reqNo: string; balance: number };
  const { isDark } = useTheme();
  const [items, setItems] = useState<DgInvoiceDraft[]>([blankItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [advance, setAdvance] = useState<DgAdvance | null>(null);
  const [advanceLoading, setAdvanceLoading] = useState(true);
  const [advanceVerified, setAdvanceVerified] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');

  const bg = isDark ? palette.darkBg : palette.background;
  const surface = isDark ? palette.darkSurface : palette.surface;
  const muted = isDark ? palette.darkSurfaceMuted : '#F4F7FA';
  const textPrimary = isDark ? palette.darkTextPrimary : palette.textPrimary;
  const textSecondary = isDark ? palette.darkTextSecondary : palette.textSecondary;
  const textTertiary = isDark ? palette.darkTextTertiary : palette.textTertiary;
  const border = isDark ? palette.darkBorder : palette.border;

  const draftTotalCents = items.reduce((sum, item) => {
    return sum + dgAmountToCents(item.amount);
  }, 0);
  const total = draftTotalCents / 100;
  const invoiceAmounts = advance ? getDgInvoiceAmounts(advance) : null;
  const isFullyUtilized = !!invoiceAmounts && invoiceAmounts.remainingCents === 0;
  const exceedsBalance = !!invoiceAmounts && draftTotalCents > invoiceAmounts.remainingCents;

  const update = (i: number, patch: Partial<DgInvoiceDraft>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const fetchAdvance = useCallback(async (): Promise<DgAdvance | null> => {
    setAdvanceVerified(false);
    try {
      const current = await dgApi.advance(id);
      if (current?.id !== id) {
        throw new Error('The server returned a different DG advance record.');
      }
      setAdvance(current);
      setAdvanceVerified(true);
      setLoadError('');
      return current;
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Could not load this DG advance. Pull down to retry.';
      setLoadError(message);
      return null;
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setAdvanceLoading(true);
      fetchAdvance().finally(() => {
        if (active) setAdvanceLoading(false);
      });
      return () => { active = false; };
    }, [fetchAdvance]),
  );

  const refreshAdvance = async () => {
    setRefreshing(true);
    await fetchAdvance();
    setRefreshing(false);
  };

  const addFile = (i: number, f: FormFilePart) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, files: [...it.files, f] } : it)));

  const canAddFile = (i: number) => {
    if (items[i].files.length >= MAX_FILES) {
      Alert.alert('Limit reached', `Up to ${MAX_FILES} files per invoice.`);
      return false;
    }
    return true;
  };

  const fromCamera = async (i: number) => {
    if (!canAddFile(i)) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permission', 'Camera permission is required to photograph the invoice.');
    const r = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!r.canceled && r.assets?.[0]) {
      addFile(i, { uri: await optimizeImage(r.assets[0].uri), type: 'image/jpeg', name: `invoice-${Date.now()}.jpg` });
    }
  };

  const fromGallery = async (i: number) => {
    if (!canAddFile(i)) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permission', 'Gallery access is required to attach the invoice.');
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!r.canceled && r.assets?.[0]) {
      addFile(i, { uri: await optimizeImage(r.assets[0].uri), type: 'image/jpeg', name: `invoice-${Date.now()}.jpg` });
    }
  };

  const fromPdf = async (i: number) => {
    if (!canAddFile(i)) return;
    const r = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true, multiple: false });
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    if (a.size && a.size > MAX_BYTES) return Alert.alert('File too large', 'Each file must be 10 MB or smaller.');
    addFile(i, { uri: a.uri, type: a.mimeType || 'application/pdf', name: a.name || `invoice-${Date.now()}.pdf` });
  };

  const validate = (): string | null => {
    const seen = new Set<string>();
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const n = items.length > 1 ? ` (invoice ${i + 1})` : '';
      if (!it.invoice_no.trim()) return `Enter the invoice number${n}.`;
      if (!it.invoice_date) return `Select the invoice date${n}.`;
      if (!(parseFloat(it.amount) > 0)) return `Enter an amount greater than 0${n}.`;
      if (!it.files.length) return `Attach a photo or PDF of the invoice${n}.`;
      const key = it.invoice_no.trim().toLowerCase();
      if (seen.has(key)) return `Invoice ${it.invoice_no.trim()} is entered twice.`;
      seen.add(key);
    }
    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) return Alert.alert('Check invoices', err);
    setSubmitting(true);
    try {
      const current = await fetchAdvance();
      if (!current) {
        Alert.alert('Could not verify balance', 'Refresh the DG advance and try again.');
        return;
      }
      const currentAmounts = getDgInvoiceAmounts(current);
      const currentDraftTotalCents = items.reduce((sum, item) => {
        return sum + dgAmountToCents(item.amount);
      }, 0);
      if (currentAmounts.remainingCents === 0) {
        Alert.alert('Advance fully utilized', 'Your advance amount has been fully utilized. No further invoices can be uploaded.');
        return;
      }
      if (currentDraftTotalCents > currentAmounts.remainingCents) {
        Alert.alert(
          'Invoice amount exceeds balance',
          `The remaining eligible amount is ${fmtInr(currentAmounts.remainingCents / 100)}.`,
        );
        return;
      }

      const res = await dgApi.uploadInvoices(id, items);
      if (res?.status === 'success') {
        const refreshed = await fetchAdvance();
        if (refreshed) {
          Alert.alert('Submitted', res.message || 'Invoices submitted for verification.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
        } else {
          Alert.alert('Submitted', 'Invoices were uploaded, but the latest balance could not be refreshed. Pull down to retry.');
        }
      } else {
        Alert.alert('Could not submit', res?.message || 'Upload failed. Please try again.');
      }
    } catch {
      Alert.alert('Could not submit', 'Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <ScreenBackHeader title={`Invoices · ${reqNo}`} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAdvance} tintColor={palette.primary} />}
        >
          <View style={[styles.summaryCard, { backgroundColor: surface, borderColor: border }]}>
            <Text style={[styles.cardTitle, { color: textPrimary }]}>Advance invoice totals</Text>
            {advanceLoading && !advance ? (
              <ActivityIndicator color={palette.primary} style={{ marginTop: 12 }} />
            ) : advance ? (
              <>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: textSecondary }]}>Total Advance Amount</Text>
                  <Text style={[styles.summaryValue, { color: textPrimary }]}>
                    {fmtInr((invoiceAmounts?.advanceCents ?? 0) / 100)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: textSecondary }]}>Total Uploaded Invoice Amount</Text>
                  <Text style={[styles.summaryValue, { color: textPrimary }]}>
                    {fmtInr((invoiceAmounts?.uploadedCents ?? 0) / 100)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: textSecondary }]}>Remaining Amount</Text>
                  <Text style={[styles.summaryValue, { color: textPrimary }]}>
                    {fmtInr((invoiceAmounts?.remainingCents ?? 0) / 100)}
                  </Text>
                </View>
                {isFullyUtilized ? (
                  <Text style={styles.utilizedMessage}>
                    Your advance amount has been fully utilized. No further invoices can be uploaded.
                  </Text>
                ) : null}
                {loadError ? (
                  <Text style={styles.validationMessage}>{loadError} Refresh before uploading.</Text>
                ) : null}
                {exceedsBalance ? (
                  <Text style={styles.validationMessage}>
                    This invoice total exceeds the remaining eligible amount of {fmtInr((invoiceAmounts?.remainingCents ?? 0) / 100)}.
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={[styles.infoText, { color: palette.error, marginTop: 8 }]}>
                {loadError || 'Could not load the current advance balance. Pull down to retry.'}
              </Text>
            )}
          </View>

          <View style={[styles.info, { backgroundColor: palette.primaryLight }]}>
            <MaterialCommunityIcons name="information-outline" size={16} color={palette.primary} />
            <Text style={[styles.infoText, { color: '#0C4A6E' }]}>
              Your supervisor checks the invoices first, then the office verifies them — they count once verified. If you spent more than the advance, the extra is paid to you.
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
            <Text style={[styles.cardTitle, { color: textPrimary }]}>
              Uploaded invoices ({advance?.invoices?.length ?? 0})
            </Text>
            {advance?.invoices?.length ? (
              advance.invoices.map((invoice) => <DgInvoiceItem key={invoice.id} inv={invoice} />)
            ) : (
              <Text style={[styles.infoText, { color: textSecondary, marginTop: 8 }]}>
                {advanceLoading ? 'Loading invoices…' : 'No invoices have been uploaded for this advance.'}
              </Text>
            )}
          </View>

          {items.map((it, i) => (
            <View key={i} style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
              <View style={styles.cardHead}>
                <Text style={[styles.cardTitle, { color: textPrimary }]}>Invoice {i + 1}</Text>
                {items.length > 1 && (
                  <TouchableOpacity onPress={() => setItems((p) => p.filter((_, idx) => idx !== i))} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color={palette.error} />
                  </TouchableOpacity>
                )}
              </View>

              <CompactInput
                label="Invoice number" required value={it.invoice_no}
                onChangeText={(t: string) => update(i, { invoice_no: t })}
                placeholder="e.g. INV-1024" autoCapitalize="characters" maxLength={100}
              />
              <View style={styles.row}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <DateField label="Invoice date" required value={it.invoice_date} onChange={(v) => update(i, { invoice_date: v })} maximumDate={new Date()} />
                </View>
                <CompactInput
                  style={{ flex: 1, minWidth: 0 }}
                  label="Amount (₹)" required value={it.amount}
                  onChangeText={(t: string) => update(i, { amount: t.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1') })}
                  placeholder="0" keyboardType="decimal-pad"
                />
              </View>

              <Text style={[styles.label, { color: textSecondary }]}>Invoice photo / PDF *</Text>
              <View style={styles.row}>
                {[
                  { icon: 'camera-outline', text: 'Camera', fn: fromCamera },
                  { icon: 'image-outline', text: 'Gallery', fn: fromGallery },
                  { icon: 'file-pdf-box', text: 'PDF', fn: fromPdf },
                ].map((b) => (
                  <TouchableOpacity key={b.text} style={[styles.attachBtn, { borderColor: border }]} onPress={() => b.fn(i)}>
                    <MaterialCommunityIcons name={b.icon as any} size={18} color={palette.primary} />
                    <Text style={[styles.attachText, { color: textSecondary }]}>{b.text}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {it.files.map((f, fi) => (
                <View key={fi} style={[styles.fileRow, { backgroundColor: muted }]}>
                  <MaterialCommunityIcons name={f.type === 'application/pdf' ? 'file-pdf-box' : 'image-outline'} size={16} color={palette.success} />
                  <Text style={[styles.fileName, { color: textPrimary }]} numberOfLines={1}>{f.name}</Text>
                  <TouchableOpacity
                    onPress={() => update(i, { files: it.files.filter((_, idx) => idx !== fi) })}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <MaterialCommunityIcons name="close" size={16} color={textTertiary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))}

          <TouchableOpacity
            style={[styles.addBtn, { borderColor: palette.primary, opacity: isFullyUtilized || advanceLoading || !advanceVerified ? 0.5 : 1 }]}
            disabled={isFullyUtilized || advanceLoading || !advanceVerified}
            onPress={() => setItems((p) => [...p, blankItem()])}
          >
            <MaterialCommunityIcons name="plus" size={18} color={palette.primary} />
            <Text style={[styles.addText, { color: palette.primary }]}>Add another invoice</Text>
          </TouchableOpacity>

          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: textSecondary }]}>{items.length} invoice{items.length > 1 ? 's' : ''} · Total</Text>
            <Text style={[styles.totalValue, { color: textPrimary }]}>{fmtInr(total)}</Text>
          </View>

          <PrimaryButton
            title={isFullyUtilized ? 'Advance fully utilized' : 'Submit for verification'}
            onPress={submit}
            loading={submitting}
            disabled={!advance || !advanceVerified || advanceLoading || isFullyUtilized}
            style={{ marginTop: 12 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  info: { flexDirection: 'row', gap: 8, borderRadius: radius.md, padding: 12, marginBottom: 12 },
  infoText: { flex: 1, fontSize: 12.5, lineHeight: 18 },
  summaryCard: { borderRadius: radius.lg, borderWidth: 1, padding: 16, marginBottom: 12, ...shadows.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 10 },
  summaryLabel: { flex: 1, fontSize: 13 },
  summaryValue: { fontSize: 14, fontWeight: '700' },
  utilizedMessage: { color: '#991B1B', fontSize: 12.5, fontWeight: '700', lineHeight: 18, marginTop: 12 },
  validationMessage: { color: '#B45309', fontSize: 12.5, fontWeight: '700', lineHeight: 18, marginTop: 12 },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: 16, marginBottom: 12, gap: 10, ...shadows.sm },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  label: { fontSize: 12, fontWeight: '600', marginBottom: -4 },
  attachBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: radius.md, paddingVertical: 12 },
  attachText: { fontSize: 12.5, fontWeight: '600' },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  fileName: { flex: 1, fontSize: 12.5 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: radius.md, paddingVertical: 12 },
  addText: { fontSize: 13.5, fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  totalLabel: { fontSize: 13 },
  totalValue: { fontSize: 17, fontWeight: '800' },
});
