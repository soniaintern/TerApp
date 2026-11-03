import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenBackHeader from '../../components/ScreenBackHeader';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import { palette, typography, radius, shadows } from '../../theme/tokens';
import { claimStartDay, periodLabel } from '../../utils/claimPeriod';
import type { TravelPlan } from '../../types/api';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MODE_ICON: Record<string, string> = {
  bus: 'bus', train: 'train', car: 'car', flight: 'airplane', other: 'dots-horizontal',
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: 'Pending Approval', color: palette.warning, bg: palette.warningLight, icon: 'clock-outline' },
  approved: { label: 'Approved', color: palette.success, bg: palette.successLight, icon: 'check-circle-outline' },
  rejected: { label: 'Rejected', color: palette.error, bg: palette.errorLight, icon: 'close-circle-outline' },
  returned_for_modification: { label: 'Returned', color: '#7C3AED', bg: '#EDE9FE', icon: 'arrow-u-left-top' },
};

export default function TravelPlanDetailScreen({ navigation, route }: any) {
  const plan: TravelPlan = route.params?.plan;
  const { isDark } = useTheme();

  const bg = isDark ? palette.darkBg : palette.background;
  const surface = isDark ? palette.darkSurface : palette.surface;
  const textPrimary = isDark ? palette.darkTextPrimary : palette.textPrimary;
  const textSecondary = isDark ? palette.darkTextSecondary : palette.textSecondary;
  const border = isDark ? palette.darkBorder : palette.border;

  const dateLabel = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    const d = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
    if (isNaN(d.getTime())) return dateStr.slice(0, 10);
    return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
  };

  const submittedLabel = (dateStr?: string | null) => {
    if (!dateStr) return 'Not submitted';
    const d = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
    if (isNaN(d.getTime())) return dateStr.slice(0, 10);
    return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  };

  if (!plan) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <ScreenBackHeader title="Travel Plan Details" onBack={() => navigation.goBack()} />
        <View style={styles.loadingBox}>
          <Text style={{ color: textSecondary }}>Travel plan not found.</Text>
        </View>
      </View>
    );
  }

  const meta = STATUS_META[plan.status_label] || STATUS_META.pending;
  const items = plan.items || [];
  const monthLabel = periodLabel(claimStartDay(useAuthStore.getState().user), plan.plan_month || 1, plan.plan_year || new Date().getFullYear());

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <ScreenBackHeader title="Travel Plan Details" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={[styles.summaryCard, { backgroundColor: surface, borderColor: border }]}>
          <View style={styles.summaryHeader}>
            <LinearGradient colors={['#186E93', '#0FA58C']} style={styles.monthChip}>
              <Text style={styles.monthChipText}>{monthLabel}</Text>
            </LinearGradient>
            <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
              <MaterialCommunityIcons name={meta.icon as any} size={12} color={meta.color} />
              <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
            </View>
          </View>

          <View style={styles.summaryMetaRow}>
            <MaterialCommunityIcons name="calendar-check-outline" size={13} color={textSecondary} />
            <Text style={[styles.summaryMeta, { color: textSecondary }]}>
              Submitted {submittedLabel(plan.submitted_at)}
            </Text>
            {plan.supervisor ? (
              <>
                <View style={[styles.metaDot, { backgroundColor: border }]} />
                <MaterialCommunityIcons name="account-outline" size={13} color={textSecondary} />
                <Text style={[styles.summaryMeta, { color: textSecondary }]}>{plan.supervisor.name}</Text>
              </>
            ) : null}
          </View>

          <View style={[styles.summaryRow, { borderTopColor: border }]}>
            <View>
              <Text style={[styles.summaryLabel, { color: textSecondary }]}>Days</Text>
              <Text style={[styles.summaryPeriod, { color: textPrimary }]}>{items.length}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.summaryLabel, { color: textSecondary }]}>Stays</Text>
              <Text style={[styles.summaryPeriod, { color: textPrimary }]}>
                {items.filter((it) => it.type === 'stay').length}
              </Text>
            </View>
          </View>
        </View>

        {plan.status_label === 'returned_for_modification' && plan.return_remarks ? (
          <View style={[styles.remarksBox, { backgroundColor: '#EDE9FE' }]}>
            <MaterialCommunityIcons name="information-outline" size={16} color="#7C3AED" />
            <Text style={styles.remarksText}>
              <Text style={{ fontWeight: '700', color: '#7C3AED' }}>Changes required: </Text>
              {plan.return_remarks}
            </Text>
          </View>
        ) : null}

        {plan.status_label === 'rejected' && plan.reject_reason ? (
          <View style={[styles.remarksBox, { backgroundColor: palette.errorLight }]}>
            <MaterialCommunityIcons name="close-circle-outline" size={16} color={palette.error} />
            <Text style={[styles.remarksText, { color: palette.error }]}>
              <Text style={{ fontWeight: '700' }}>Reason: </Text>
              {plan.reject_reason}
            </Text>
          </View>
        ) : null}

        {/* Items */}
        <Text style={[styles.sectionTitle, { color: textPrimary }]}>Itinerary ({items.length})</Text>

        {items.map((item, i) => {
          const isStay = item.type === 'stay';
          const nights =
            isStay && item.date && item.check_out
              ? Math.max(
                  1,
                  Math.round(
                    (new Date(`${item.check_out}T00:00:00`).getTime() -
                      new Date(`${item.date}T00:00:00`).getTime()) /
                      86400000
                  )
                )
              : 0;
          return (
            <View key={i} style={[styles.itemCard, { backgroundColor: surface, borderColor: border }]}>
              <View style={styles.itemHead}>
                <MaterialCommunityIcons
                  name={isStay ? 'bed' : ((MODE_ICON[(item.mode || '').toLowerCase()] || MODE_ICON.other) as any)}
                  size={18}
                  color={palette.primary}
                />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.itemTitle, { color: textPrimary }]}>
                    {isStay ? item.hotel_name : `${item.from} → ${item.to}`}
                  </Text>
                  <Text style={[styles.itemMeta, { color: textSecondary }]}>
                    {isStay
                      ? `${dateLabel(item.date)} → ${dateLabel(item.check_out)} · ${nights} night${nights > 1 ? 's' : ''}`
                      : `${dateLabel(item.date)} · ${item.mode}${item.km ? ` · ${item.km} km` : ''}`}
                  </Text>
                </View>
              </View>
              {item.purpose ? (
                <Text style={[styles.itemPurpose, { color: textSecondary }]}>Purpose: {item.purpose}</Text>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      {plan.status_label === 'returned_for_modification' && (
        <View style={[styles.actionBar, { backgroundColor: surface, borderTopColor: border }]}>
          <TouchableOpacity
            style={styles.resubmitBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('TravelPlanForm', { plan })}
          >
            <MaterialCommunityIcons name="pencil-outline" size={17} color="#FFFFFF" />
            <Text style={styles.resubmitBtnText}>Edit & Resubmit</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summaryCard: { borderRadius: radius.lg, padding: 16, borderWidth: 1, ...shadows.sm },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthChip: { borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' },
  monthChipText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 10.5, fontWeight: '700' },
  summaryMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12 },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, marginHorizontal: 2 },
  summaryMeta: { fontSize: 12, fontWeight: '500' },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    borderTopWidth: 1, marginTop: 14, paddingTop: 12,
  },
  summaryLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryPeriod: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  remarksBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    borderRadius: radius.md, padding: 12, marginTop: 12,
  },
  remarksText: { flex: 1, fontSize: 12.5, lineHeight: 18 },
  sectionTitle: { ...typography.h3, marginTop: 18, marginBottom: 10 },
  itemCard: { borderRadius: radius.lg, padding: 14, marginBottom: 12, borderWidth: 1, ...shadows.sm },
  itemHead: { flexDirection: 'row', alignItems: 'center' },
  itemTitle: { fontSize: 14, fontWeight: '700' },
  itemMeta: { fontSize: 12, marginTop: 2 },
  itemPurpose: { fontSize: 12, marginTop: 8, lineHeight: 17 },
  actionBar: { padding: 14, paddingBottom: 26, borderTopWidth: 1, ...shadows.lg },
  resubmitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#7C3AED', borderRadius: radius.pill, paddingVertical: 13,
  },
  resubmitBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
