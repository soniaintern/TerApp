import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { palette } from '../../theme/tokens';
import { DgInvoice, DG_INVOICE_COLOR, fmtInr } from '../../api/dg';

export const fmtDgDate = (d?: string | null) =>
  d ? new Date(d.replace(' ', 'T')).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/**
 * One invoice row: number, date, amount, verification status, reject reason and tappable files.
 * With onVerify/onReject (supervisor view) a bill waiting for the L1 check gets Verify / Reject buttons.
 */
export default function DgInvoiceItem({ inv, onVerify, onReject, busy }: {
  inv: DgInvoice;
  onVerify?: (inv: DgInvoice) => void;
  onReject?: (inv: DgInvoice) => void;
  busy?: boolean;
}) {
  const { isDark } = useTheme();
  const muted = isDark ? palette.darkSurfaceMuted : '#F4F7FA';
  const textPrimary = isDark ? palette.darkTextPrimary : palette.textPrimary;
  const textSecondary = isDark ? palette.darkTextSecondary : palette.textSecondary;
  const border = isDark ? palette.darkBorder : palette.border;
  const c = DG_INVOICE_COLOR[inv.status] || '#64748B';

  return (
    <View style={[styles.invoice, { borderColor: border }]}>
      <View style={styles.invTop}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.invNo, { color: textPrimary }]}>{inv.invoice_no}</Text>
          <Text style={[styles.invSub, { color: textSecondary }]}>
            {fmtDgDate(inv.invoice_date)}{inv.uploaded_from === 'web' ? ' · added by office' : ''}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.invAmt, { color: textPrimary }]}>{fmtInr(inv.amount)}</Text>
          <View style={[styles.chip, { backgroundColor: c + '1A' }]}>
            <Text style={[styles.chipText, { color: c }]}>{inv.status_label}</Text>
          </View>
        </View>
      </View>
      {inv.status === 'rejected' && inv.reject_reason ? (
        <View style={styles.rejectBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#991B1B" />
          <Text style={styles.rejectText}>{inv.reject_reason}</Text>
        </View>
      ) : null}
      {inv.files.length > 0 && (
        <View style={styles.files}>
          {inv.files.map((f, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.fileChip, { backgroundColor: muted }]}
              disabled={!f.url}
              onPress={() => f.url && Linking.openURL(f.url)}
            >
              <MaterialCommunityIcons name={/\.pdf$/i.test(f.name) ? 'file-pdf-box' : 'image-outline'} size={14} color={palette.primary} />
              <Text style={[styles.fileText, { color: palette.primary }]} numberOfLines={1}>{f.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {inv.can_check && onVerify && onReject && (
        <View style={styles.actions}>
          <TouchableOpacity disabled={busy} style={[styles.actBtn, { backgroundColor: '#DC2626', opacity: busy ? 0.6 : 1 }]} onPress={() => onReject(inv)}>
            <MaterialCommunityIcons name="close" size={15} color="#FFFFFF" />
            <Text style={styles.actText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={busy} style={[styles.actBtn, { backgroundColor: '#0E9F6E', opacity: busy ? 0.6 : 1 }]} onPress={() => onVerify(inv)}>
            <MaterialCommunityIcons name="check" size={15} color="#FFFFFF" />
            <Text style={styles.actText}>Verify</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  invoice: { borderTopWidth: 1, paddingTop: 12, marginTop: 10 },
  invTop: { flexDirection: 'row', gap: 10 },
  invNo: { fontSize: 14, fontWeight: '700' },
  invSub: { fontSize: 12, marginTop: 2 },
  invAmt: { fontSize: 14, fontWeight: '800' },
  chip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  chipText: { fontSize: 10.5, fontWeight: '700' },
  rejectBox: { flexDirection: 'row', gap: 6, backgroundColor: '#FEF2F2', borderRadius: 8, padding: 8, marginTop: 8 },
  rejectText: { flex: 1, color: '#991B1B', fontSize: 12.5 },
  files: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  fileChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, maxWidth: '100%' },
  fileText: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  actBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  actText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' },
});
