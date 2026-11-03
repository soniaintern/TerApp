import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { palette, typography, radius, shadows } from '../../theme/tokens';
import { useAuthStore } from '../../store/authStore';
import {
  dgApi, DgAdvance, DgAdvanceSummary, DgTeamRequest, DG_STATE_COLOR, DG_REQUEST_COLOR, fmtInr, dgStatusText,
} from '../../api/dg';

/**
 * DG Advance — advances raised for the employee on the TER portal.
 * Requests are made and approved on the web; here the employee follows the
 * payment and, once paid, uploads invoices to knock the advance off.
 * A supervisor named as "Requested By" also sees those requests and the bills
 * their employees uploaded ("Raised by me", read-only).
 */
export default function DgAdvanceScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const isSupervisor = user?.is_supervisor === 1;

  const [list, setList] = useState<DgAdvance[]>([]);
  const [summary, setSummary] = useState<DgAdvanceSummary | null>(null);
  const [team, setTeam] = useState<DgTeamRequest[]>([]);
  // Approver-only users raise requests for their team, so they land on that list.
  const [view, setView] = useState<'mine' | 'raised'>(isSupervisor ? 'raised' : 'mine');
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
      const [res, raised] = await Promise.all([
        dgApi.myAdvances(),
        dgApi.raisedByMe().catch(() => null),
      ]);
      setList(res.advances);
      setSummary(res.summary);
      if (raised) setTeam(raised.requests);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not load your DG advances. Pull down to retry.');
    }
  }, []);

  // Reload whenever the screen comes back into view (e.g. after uploading invoices).
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

  const showTabs = isSupervisor || team.length > 0;
  const active = showTabs ? view : 'mine';
  const pendingBills = team.reduce((t, r) => t + r.invoice_counts.pending, 0);

  const renderTeamCard = (r: DgTeamRequest) => {
    const color = DG_REQUEST_COLOR[r.status] || '#64748B';
    return (
      <TouchableOpacity
        key={r.id}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('DgTeamRequest', { id: r.id })}
        style={[styles.card, { backgroundColor: surface, borderColor: r.invoice_counts.pending ? '#FDBA74' : border }]}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardCode, { color: palette.primary }]}>{r.req_no}</Text>
            <Text style={[styles.cardTitle, { color: textPrimary }]} numberOfLines={2}>{r.activity_name}</Text>
            <Text style={[styles.cardSub, { color: textSecondary }]}>{r.activity_type}{r.po_no ? ` · PO ${r.po_no}` : ''}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: color + '1A' }]}>
            <Text style={[styles.statusText, { color }]}>{r.status_label}</Text>
          </View>
        </View>
        <View style={styles.cardRow}>
          <View style={styles.cardStat}>
            <Text style={[styles.cardStatLabel, { color: textTertiary }]}>Total</Text>
            <Text style={[styles.cardStatValue, { color: textPrimary }]}>{fmtInr(r.total)}</Text>
          </View>
          <View style={styles.cardStat}>
            <Text style={[styles.cardStatLabel, { color: textTertiary }]}>Employees</Text>
            <Text style={[styles.cardStatValue, { color: textPrimary }]}>{r.paid_employees}/{r.employees} paid</Text>
          </View>
          <View style={styles.cardStat}>
            <Text style={[styles.cardStatLabel, { color: textTertiary }]}>To knock off</Text>
            <Text style={[styles.cardStatValue, { color: r.to_knock_off > 0 ? palette.error : textPrimary }]}>{fmtInr(r.to_knock_off)}</Text>
          </View>
        </View>
        <View style={[styles.footer, { borderTopColor: border }]}>
          <MaterialCommunityIcons name="file-document-multiple-outline" size={15} color={r.invoice_counts.pending ? '#C2410C' : textSecondary} />
          <Text style={[styles.footerText, { color: r.invoice_counts.pending ? '#C2410C' : textSecondary }]} numberOfLines={2}>
            {r.invoice_counts.pending ? `${r.invoice_counts.pending} to check · ` : ''}{r.invoice_counts.l1_verified ? `${r.invoice_counts.l1_verified} with maker · ` : ''}{r.invoice_counts.verified} verified
            {r.invoice_counts.rejected ? ` · ${r.invoice_counts.rejected} rejected` : ''}
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={textTertiary} />
        </View>
      </TouchableOpacity>
    );
  };

  const toUpload = list.filter((a) => a.can_upload && a.payment.status === 'paid' && a.knock_off.balance > 0 && a.knock_off.state !== 'carry').length;

  const renderCard = (a: DgAdvance) => {
    const paid = a.payment.status === 'paid';
    const color = paid ? DG_STATE_COLOR[a.knock_off.state] : '#4338CA';
    const label = paid ? a.knock_off.label : a.payment.label;
    const needsAction = paid && a.can_upload && a.knock_off.balance > 0 && a.knock_off.state !== 'carry';
    return (
      <TouchableOpacity
        key={a.id}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('DgAdvanceDetail', { id: a.id })}
        style={[styles.card, { backgroundColor: surface, borderColor: needsAction ? '#FDBA74' : border }]}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardCode, { color: palette.primary }]}>{a.req_no}{a.unid ? ` · ${a.unid}` : ''}</Text>
            <Text style={[styles.cardTitle, { color: textPrimary }]} numberOfLines={2}>{a.activity_name}</Text>
            <Text style={[styles.cardSub, { color: textSecondary }]}>{a.activity_type}{a.po_no ? ` · PO ${a.po_no}` : ''}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: color + '1A' }]}>
            <Text style={[styles.statusText, { color }]}>{label}</Text>
          </View>
        </View>

        <View style={styles.cardRow}>
          <View style={styles.cardStat}>
            <Text style={[styles.cardStatLabel, { color: textTertiary }]}>Advance</Text>
            <Text style={[styles.cardStatValue, { color: textPrimary }]}>{fmtInr(a.amount)}</Text>
          </View>
          <View style={styles.cardStat}>
            <Text style={[styles.cardStatLabel, { color: textTertiary }]}>Knocked off</Text>
            <Text style={[styles.cardStatValue, { color: textPrimary }]}>{fmtInr(a.knock_off.verified + a.knock_off.carried_out)}</Text>
          </View>
          <View style={styles.cardStat}>
            <Text style={[styles.cardStatLabel, { color: textTertiary }]}>Balance</Text>
            <Text style={[styles.cardStatValue, { color: a.knock_off.balance > 0 && paid ? palette.error : textPrimary }]}>
              {paid ? fmtInr(Math.abs(a.knock_off.balance)) : '—'}
            </Text>
          </View>
        </View>

        <View style={[styles.footer, { borderTopColor: border }]}>
          <MaterialCommunityIcons
            name={needsAction ? 'upload-outline' : paid ? 'information-outline' : 'clock-outline'}
            size={15}
            color={needsAction ? '#C2410C' : textSecondary}
          />
          <Text style={[styles.footerText, { color: needsAction ? '#C2410C' : textSecondary }]} numberOfLines={2}>
            {dgStatusText(a)}
            {a.knock_off.awaiting_verification > 0 ? ` · ${fmtInr(a.knock_off.awaiting_verification)} awaiting verification` : ''}
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={textTertiary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <LinearGradient
        colors={isDark ? ['#0D2B3A', '#186E93'] : ['#186E93', '#13C7A8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        {navigation.canGoBack() && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerBackBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        <Text style={[styles.headerGreeting, { marginTop: 12 }]}>DG Advance</Text>
        {active === 'raised' ? (
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <View style={styles.heroStatTop}>
                <MaterialCommunityIcons name="clipboard-list-outline" size={15} color="#BFDBFE" />
                <Text style={styles.heroStatValue}>{team.length}</Text>
              </View>
              <Text style={styles.heroStatLabel}>Requests</Text>
            </View>
            <View style={[styles.heroStat, styles.heroStatDivider]}>
              <View style={styles.heroStatTop}>
                <MaterialCommunityIcons name="clock-outline" size={15} color="#BFDBFE" />
                <Text style={styles.heroStatValue}>{pendingBills}</Text>
              </View>
              <Text style={styles.heroStatLabel}>Bills to check</Text>
            </View>
            <View style={[styles.heroStat, styles.heroStatDivider]}>
              <Text style={[styles.heroStatValue, { fontSize: 16 }]} numberOfLines={1}>{fmtInr(team.reduce((t, r) => t + r.to_knock_off, 0))}</Text>
              <Text style={styles.heroStatLabel}>To knock off</Text>
            </View>
          </View>
        ) : (
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <View style={styles.heroStatTop}>
              <MaterialCommunityIcons name="hand-coin-outline" size={15} color="#BFDBFE" />
              <Text style={styles.heroStatValue}>{summary?.count ?? 0}</Text>
            </View>
            <Text style={styles.heroStatLabel}>Advances</Text>
          </View>
          <View style={[styles.heroStat, styles.heroStatDivider]}>
            <View style={styles.heroStatTop}>
              <MaterialCommunityIcons name="upload-outline" size={15} color="#BFDBFE" />
              <Text style={styles.heroStatValue}>{toUpload}</Text>
            </View>
            <Text style={styles.heroStatLabel}>Need invoices</Text>
          </View>
          <View style={[styles.heroStat, styles.heroStatDivider]}>
            <Text style={[styles.heroStatValue, { fontSize: 16 }]} numberOfLines={1}>{fmtInr(summary?.to_knock_off ?? 0)}</Text>
            <Text style={styles.heroStatLabel}>To knock off</Text>
          </View>
        </View>
        )}
      </LinearGradient>

      {showTabs && (
        <View style={styles.tabRow}>
          {([['raised', 'Raised by me', pendingBills], ['mine', 'My advances', toUpload]] as const).map(([k, label, badge]) => (
            <TouchableOpacity key={k} style={[styles.tab, active === k && styles.tabActive]} onPress={() => setView(k)}>
              <Text style={[styles.tabText, { color: textSecondary }, active === k && styles.tabTextActive]}>{label}</Text>
              {badge > 0 && (
                <View style={[styles.tabBadge, active === k && { backgroundColor: '#FFFFFF' }]}>
                  <Text style={[styles.tabBadgeText, active === k && { color: palette.primary }]}>{badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />}
      >
        {loading ? (
          <ActivityIndicator color={palette.primary} style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={styles.centerBox}>
            <MaterialCommunityIcons name="wifi-off" size={48} color={textTertiary} />
            <Text style={[styles.emptySub, { color: textSecondary }]}>{error}</Text>
          </View>
        ) : active === 'raised' ? (
          team.length === 0 ? (
            <View style={styles.centerBox}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={56} color={textTertiary} />
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>No requests raised by you</Text>
              <Text style={[styles.emptySub, { color: textSecondary }]}>
                DG Advance requests made on the TER portal with you as Requested By show up here, with the bills your employees upload.
              </Text>
            </View>
          ) : (
            team.map(renderTeamCard)
          )
        ) : list.length === 0 ? (
          <View style={styles.centerBox}>
            <MaterialCommunityIcons name="cash-multiple" size={56} color={textTertiary} />
            <Text style={[styles.emptyTitle, { color: textPrimary }]}>No DG advances yet</Text>
            <Text style={[styles.emptySub, { color: textSecondary }]}>
              Advances approved for you on the TER portal show up here. Once one is paid, upload its invoices from here.
            </Text>
          </View>
        ) : (
          list.map(renderCard)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 22, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerBackBtn: { alignSelf: 'flex-start', marginTop: 4 },
  headerGreeting: { ...typography.label, color: '#BFDBFE', textTransform: 'uppercase', letterSpacing: 1.2 },
  heroStats: { flexDirection: 'row', marginTop: 16 },
  heroStat: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  heroStatDivider: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)' },
  heroStatTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroStatValue: { color: '#FFFFFF', fontSize: 21, fontWeight: '800' },
  heroStatLabel: { color: '#BFDBFE', fontSize: 10.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 3 },
  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 10 },
  emptySub: { fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 30, lineHeight: 19 },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: 16, marginBottom: 12, ...shadows.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardCode: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  cardSub: { fontSize: 12.5, marginTop: 2 },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, maxWidth: 140 },
  statusText: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  cardRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  cardStat: { flex: 1 },
  cardStatLabel: { fontSize: 10.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  cardStatValue: { fontSize: 14.5, fontWeight: '800', marginTop: 2 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 10, borderTopWidth: 1 },
  footerText: { flex: 1, fontSize: 12.5, fontWeight: '600' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  tabActive: { backgroundColor: palette.primary },
  tabText: { fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF' },
  tabBadge: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F97316' },
  tabBadgeText: { color: '#FFFFFF', fontSize: 10.5, fontWeight: '800' },
});
