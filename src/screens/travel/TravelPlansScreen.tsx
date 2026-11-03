import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { terApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import ScreenBackHeader from '../../components/ScreenBackHeader';
import { useTheme } from '../../theme/ThemeContext';
import { palette, typography, radius, shadows } from '../../theme/tokens';
import { getCache, hasCache, setCache } from '../../utils/screenCache';
import { claimStartDay, periodLabel } from '../../utils/claimPeriod';
import type { TravelPlan } from '../../types/api';

const CACHE_KEY = 'travel:my-plans';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: 'Pending Approval', color: palette.warning, bg: palette.warningLight, icon: 'clock-outline' },
  approved: { label: 'Approved', color: palette.success, bg: palette.successLight, icon: 'check-circle-outline' },
  rejected: { label: 'Rejected', color: palette.error, bg: palette.errorLight, icon: 'close-circle-outline' },
  returned_for_modification: { label: 'Returned', color: '#7C3AED', bg: '#EDE9FE', icon: 'arrow-u-left-top' },
};

export default function TravelPlansScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const initialCache = getCache<TravelPlan[]>(CACHE_KEY);
  const [plans, setPlans] = useState<TravelPlan[]>(initialCache ?? []);
  const [loading, setLoading] = useState(!initialCache);
  const [refreshing, setRefreshing] = useState(false);

  const bg = isDark ? palette.darkBg : palette.background;
  const surface = isDark ? palette.darkSurface : palette.surface;
  const textPrimary = isDark ? palette.darkTextPrimary : palette.textPrimary;
  const textSecondary = isDark ? palette.darkTextSecondary : palette.textSecondary;
  const border = isDark ? palette.darkBorder : palette.border;

  const fetchPlans = useCallback(async () => {
    // Full loader only on first visit; later visits refresh silently.
    if (!hasCache(CACHE_KEY)) setLoading(true);
    try {
      const res = await terApi.travelPlanMyPlans();
      if (res.data.status === 'success') {
        setCache(CACHE_KEY, res.data.data || []);
        setPlans(res.data.data || []);
      } else {
        setPlans([]);
      }
    } catch (err: any) {
      if (err.response?.status === 401) useAuthStore.getState().logout();
      else setPlans([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPlans();
    }, [fetchPlans])
  );

  // Period-aware label: "21 Aug – 20 Sep 2026" for 21st-cycle companies, "Aug 2026" otherwise.
  const monthLabel = (p: TravelPlan) =>
    periodLabel(claimStartDay(useAuthStore.getState().user), p.plan_month || 1, p.plan_year || new Date().getFullYear());

  // "2026-08-20T..." -> "20 Aug 2026"
  const submittedLabel = (dateStr?: string | null) => {
    if (!dateStr) return 'Not submitted';
    const d = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
    if (isNaN(d.getTime())) return dateStr.slice(0, 10);
    return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <ScreenBackHeader title="Travel Plans" onBack={() => navigation.goBack()} />
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPlans(); }} tintColor={palette.primary} />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero — plan overview with gradient stats */}
        <LinearGradient
          colors={['#186E93', '#0FA58C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>MONTHLY TRAVEL PLANNING</Text>
              <Text style={styles.heroTitle}>My Travel Plans</Text>
            </View>
            <TouchableOpacity style={styles.heroIcon} activeOpacity={0.8} onPress={() => navigation.navigate('TravelPlanForm')}>
              <MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.heroDesc}>
            Plan your month's field travel and get supervisor approval before you start. Returned plans can be edited and resubmitted.
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <MaterialCommunityIcons name="map-marker-path" size={17} color="#BFDBFE" />
              <Text style={styles.heroStatValue}>{plans.length}</Text>
              <Text style={styles.heroStatLabel}>Plans</Text>
            </View>
            <View style={[styles.heroStat, styles.heroStatDivider]}>
              <MaterialCommunityIcons name="clock-outline" size={17} color="#BFDBFE" />
              <Text style={styles.heroStatValue}>{plans.filter((p) => p.status_label === 'pending').length}</Text>
              <Text style={styles.heroStatLabel}>Pending</Text>
            </View>
            <View style={[styles.heroStat, styles.heroStatDivider]}>
              <MaterialCommunityIcons name="check-circle-outline" size={17} color="#BFDBFE" />
              <Text style={styles.heroStatValue}>{plans.filter((p) => p.status_label === 'approved').length}</Text>
              <Text style={styles.heroStatLabel}>Approved</Text>
            </View>
          </View>
        </LinearGradient>

        {plans.length > 0 ? (
          plans.map((plan) => {
            const meta = STATUS_META[plan.status_label] || STATUS_META.pending;
            return (
              <TouchableOpacity
                key={plan.plan_id}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('TravelPlanDetail', { plan })}
                style={[styles.planCard, { backgroundColor: surface, borderColor: border }]}
              >
                <View style={styles.planHeader}>
                  <LinearGradient colors={['#186E93', '#0FA58C']} style={styles.monthChip}>
                    <Text style={styles.monthChipText}>{monthLabel(plan)}</Text>
                  </LinearGradient>
                  <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                    <MaterialCommunityIcons name={meta.icon as any} size={12} color={meta.color} />
                    <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>

                <View style={styles.planMetaRow}>
                  <MaterialCommunityIcons name="calendar-check-outline" size={13} color={textSecondary} />
                  <Text style={[styles.planMeta, { color: textSecondary }]} numberOfLines={1}>
                    Submitted {submittedLabel(plan.submitted_at)}
                  </Text>
                  <View style={[styles.metaDot, { backgroundColor: border }]} />
                  <MaterialCommunityIcons name="format-list-bulleted" size={13} color={textSecondary} />
                  <Text style={[styles.planMeta, { color: textSecondary }]} numberOfLines={1}>
                    {(plan.items || []).length} item{(plan.items || []).length === 1 ? '' : 's'}
                  </Text>
                </View>

                <View style={[styles.planStats, { borderTopColor: border }]}>
                  <View style={styles.stat}>
                    <MaterialCommunityIcons name="calendar-blank-outline" size={13} color={palette.primary} />
                    <Text style={[styles.statValue, { color: textPrimary }]}>{(plan.items || []).length}</Text>
                    <Text style={[styles.statLabel, { color: textSecondary }]}>Days</Text>
                  </View>
                  <View style={[styles.stat, styles.statDivider]}>
                    <MaterialCommunityIcons name="bed-outline" size={13} color={palette.primary} />
                    <Text style={[styles.statValue, { color: textPrimary }]}>
                      {(plan.items || []).filter((it: any) => it.type === 'stay').length}
                    </Text>
                    <Text style={[styles.statLabel, { color: textSecondary }]}>Stays</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={textSecondary} style={{ alignSelf: 'center' }} />
                </View>

                {plan.status_label === 'returned_for_modification' && plan.return_remarks ? (
                  <View style={[styles.remarksBox, { borderTopColor: border, backgroundColor: '#EDE9FE' }]}>
                    <MaterialCommunityIcons name="information-outline" size={15} color="#7C3AED" />
                    <Text style={styles.remarksText}>
                      <Text style={{ fontWeight: '700', color: '#7C3AED' }}>Changes required: </Text>
                      {plan.return_remarks}
                    </Text>
                  </View>
                ) : null}

                {plan.status_label === 'rejected' && plan.reject_reason ? (
                  <View style={[styles.remarksBox, { borderTopColor: border, backgroundColor: palette.errorLight }]}>
                    <MaterialCommunityIcons name="close-circle-outline" size={15} color={palette.error} />
                    <Text style={[styles.remarksText, { color: palette.error }]}>
                      <Text style={{ fontWeight: '700' }}>Reason: </Text>
                      {plan.reject_reason}
                    </Text>
                  </View>
                ) : null}

                {plan.status_label === 'returned_for_modification' && (
                  <TouchableOpacity
                    style={styles.resubmitBtn}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('TravelPlanForm', { plan })}
                  >
                    <MaterialCommunityIcons name="pencil-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.resubmitBtnText}>Edit & Resubmit</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })
        ) : !loading ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="map-marker-path" size={44} color={textSecondary} />
            <Text style={[styles.emptyTitle, { color: textPrimary }]}>No travel plans yet</Text>
            <Text style={[styles.emptySub, { color: textSecondary }]}>
              Create a monthly travel plan and submit it for your supervisor's approval.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    borderRadius: radius.xl,
    padding: 18,
    marginBottom: 18,
    ...shadows.lg,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLabel: { ...typography.label, color: '#BFDBFE', textTransform: 'uppercase', letterSpacing: 1 },
  heroTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginTop: 4 },
  heroIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  heroDesc: { color: '#E2F0F5', fontSize: 12.5, lineHeight: 18, marginTop: 10 },
  heroStats: { flexDirection: 'row', marginTop: 16 },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatDivider: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)' },
  heroStatValue: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginTop: 2 },
  heroStatLabel: { color: '#BFDBFE', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },
  monthChip: {
    borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  monthChipText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  loadingBox: { alignItems: 'center', paddingVertical: 60 },
  planCard: { borderRadius: radius.lg, padding: 12, paddingBottom: 10, marginBottom: 12, borderWidth: 1, ...shadows.sm },
  planHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, marginHorizontal: 2 },
  planMeta: { fontSize: 12, fontWeight: '500', flexShrink: 1 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3,
  },
  statusText: { fontSize: 10.5, fontWeight: '700' },
  planStats: {
    flexDirection: 'row', alignItems: 'center', borderTopWidth: 1,
    marginTop: 10, paddingTop: 10, gap: 8,
  },
  stat: { flex: 1, alignItems: 'center', gap: 1 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: 'transparent' },
  statValue: { fontSize: 15, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.5 },
  remarksBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    borderTopWidth: 1, marginTop: 12, paddingTop: 10, borderRadius: 8, padding: 10,
  },
  remarksText: { flex: 1, fontSize: 12, lineHeight: 17 },
  resubmitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#7C3AED', borderRadius: radius.pill,
    paddingVertical: 10, marginTop: 12,
  },
  resubmitBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptySub: { fontSize: 13, marginTop: 4, textAlign: 'center', paddingHorizontal: 30, lineHeight: 19 },
});
