import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { terApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, typography, radius, shadows } from '../../theme/tokens';
import { getCache, hasCache, setCache } from '../../utils/screenCache';
import { claimStartDay, periodLabel } from '../../utils/claimPeriod';
import { L1ApprovalIllustration, L2ApprovalIllustration, TravelPlanIllustration } from '../../components/CardIllustrations';
import { approverLevelFromDesignation } from '../../utils/approverLevel';
import type { SupervisorClaim, SupervisorTravelPlan } from '../../types/api';

const CLAIMS_KEY = 'supervisor:claims';
const PLANS_KEY = 'supervisor:plans';

const MONTH_LABEL: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun',
  '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};

const PLAN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type Tab = 'claims' | 'plans';

export default function SupervisorScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user: authUser } = useAuthStore();
  const cachedClaims = getCache<SupervisorClaim[]>(CLAIMS_KEY);
  const cachedPlans = getCache<SupervisorTravelPlan[]>(PLANS_KEY);
  const [tab, setTab] = useState<Tab>('claims');
  // Designation marks the role: "Supervisor L1" → L1 only, "Supervisor L2" → L2 only,
  // anything else → both queues (legacy fallback).
  const approverLevel = approverLevelFromDesignation(authUser?.designation);
  const canSeeL1 = approverLevel !== 'l2';
  const canSeeL2 = approverLevel !== 'l1';
  const [claimLevel, setClaimLevel] = useState<'l1' | 'l2'>(approverLevel === 'l2' ? 'l2' : 'l1');
  const [claims, setClaims] = useState<SupervisorClaim[]>(cachedClaims ?? []);
  const [plans, setPlans] = useState<SupervisorTravelPlan[]>(cachedPlans ?? []);
  const [levelCounts, setLevelCounts] = useState<Record<'l1' | 'l2', number>>({ l1: cachedClaims?.length ?? 0, l2: 0 });
  const [loading, setLoading] = useState(!cachedClaims && !cachedPlans);
  const [refreshing, setRefreshing] = useState(false);

  // If the profile loads after first render and resolves the role, align the
  // default queue with it (e.g. an L2 approver should land on the L2 list).
  useEffect(() => {
    if (approverLevel !== 'both' && claimLevel !== approverLevel) {
      setClaimLevel(approverLevel);
    }
  }, [approverLevel]);

  // Rich home-style header (mirrors the employee home screen)
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const firstName = authUser?.name?.split(' ')[0] || 'there';
  const initials = (authUser?.name || 'U')
    .split(' ')
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const teamCount = authUser?.team_members_count;
  // Which review card is currently active (drives the list below)
  const activeCard = tab === 'plans' ? 'plans' : claimLevel === 'l2' ? 'l2' : 'l1';

  const bg = isDark ? palette.darkBg : palette.background;
  const surface = isDark ? palette.darkSurface : palette.surface;
  const textPrimary = isDark ? palette.darkTextPrimary : palette.textPrimary;
  const textSecondary = isDark ? palette.darkTextSecondary : palette.textSecondary;
  const textTertiary = isDark ? palette.darkTextTertiary : palette.textTertiary;
  const border = isDark ? palette.darkBorder : palette.border;

  const fmt = (v: any) => '\u20B9' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  // Pending-day urgency colour: green ≤2 · amber 3-7 · red >7
  const pendingColor = (d: number) => (d > 7 ? '#DC2626' : d > 2 ? '#D97706' : '#059669');

  const fetchClaims = useCallback(async (level: 'l1' | 'l2', countOnly = false) => {
    try {
      const res = await terApi.supervisorClaims(level);
      if (res.data.status === 'success') {
        const data = res.data.data || [];
        setCache(`${CLAIMS_KEY}:${level}`, data);
        setLevelCounts((prev) => ({ ...prev, [level]: data.length }));
        if (!countOnly) setClaims(data);
      } else {
        setLevelCounts((prev) => ({ ...prev, [level]: 0 }));
        if (!countOnly) setClaims([]);
      }
    } catch (err: any) {
      if (err.response?.status === 401) useAuthStore.getState().logout();
      else {
        setLevelCounts((prev) => ({ ...prev, [level]: 0 }));
        if (!countOnly) setClaims([]);
      }
    }
  }, []);

  // L2 queue cache is loaded lazily when the user switches to the L2 segment.
  const switchClaimLevel = (level: 'l1' | 'l2') => {
    setClaimLevel(level);
    const cached = getCache<SupervisorClaim[]>(`${CLAIMS_KEY}:${level}`);
    if (cached) setClaims(cached);
    fetchClaims(level);
  };

  const fetchPlans = useCallback(async () => {
    try {
      const res = await terApi.supervisorTravelPlans();
      if (res.data.status === 'success') {
        setCache(PLANS_KEY, res.data.data || []);
        setPlans(res.data.data || []);
      } else {
        setPlans([]);
      }
    } catch (err: any) {
      if (err.response?.status === 401) useAuthStore.getState().logout();
      else setPlans([]);
    }
  }, []);

  const refresh = useCallback(async () => {
    // Full loader only on the very first visit; later visits refresh silently.
    if (!hasCache(CLAIMS_KEY) && !hasCache(PLANS_KEY)) setLoading(true);
    const otherLevel: 'l1' | 'l2' | null =
      canSeeL1 && canSeeL2
        ? (claimLevel === 'l1' ? 'l2' : 'l1')
        : (canSeeL1 ? 'l1' : canSeeL2 ? 'l2' : null);
    const calls: Promise<void>[] = [fetchClaims(claimLevel), fetchPlans()];
    if (otherLevel) calls.push(fetchClaims(otherLevel, true));
    await Promise.all(calls);
    setLoading(false);
    setRefreshing(false);
  }, [fetchClaims, fetchPlans, claimLevel, canSeeL1, canSeeL2]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const monthShort = (ym: string) => {
    const [y, m] = ym.split('-');
    return `${MONTH_LABEL[m] || m} ${y}`;
  };

  // Period-aware plan label: "21 Aug – 20 Sep 2026" for 21st-cycle companies, "Aug 2026" otherwise.
  const planMonthLabel = (p: SupervisorTravelPlan) =>
    periodLabel(claimStartDay(useAuthStore.getState().user), p.plan_month || 1, p.plan_year || new Date().getFullYear());

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); refresh(); }} tintColor={palette.primary} />
        }
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Rich home-style header — greeting, avatar and queue stats */}
        <LinearGradient
          colors={isDark ? ['#0D2B3A', '#186E93'] : ['#186E93', '#13C7A8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 18 }]}
        >
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerGreeting}>{greeting},</Text>
              <Text style={styles.headerName}>{firstName}</Text>
              <Text style={styles.headerDate}>{today}</Text>
            </View>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>{initials}</Text>
            </View>
          </View>
          <View style={styles.headerPillRow}>
            <View style={styles.headerPill}>
              <MaterialCommunityIcons name="shield-account-outline" size={13} color="#E6FFF9" />
              <Text style={styles.headerPillText}>Team Approvals</Text>
            </View>
            {teamCount !== undefined ? (
              <View style={styles.headerPill}>
                <MaterialCommunityIcons name="account-group-outline" size={13} color="#FDE68A" />
                <Text style={styles.headerPillText}>{teamCount} team</Text>
              </View>
            ) : null}
          </View>
          {/* Queue stats — tap to jump straight to the queue (role-filtered) */}
          <View style={styles.heroStats}>
            {canSeeL1 && (
              <TouchableOpacity
                style={styles.heroStat}
                activeOpacity={0.7}
                onPress={() => { setTab('claims'); switchClaimLevel('l1'); }}
              >
                <View style={styles.heroStatTop}>
                  <MaterialCommunityIcons name="account-check-outline" size={15} color="#BFDBFE" />
                  <Text style={styles.heroStatValue}>{levelCounts.l1}</Text>
                </View>
                <Text style={styles.heroStatLabel}>L1 Pending</Text>
              </TouchableOpacity>
            )}
            {canSeeL2 && (
              <TouchableOpacity
                style={[styles.heroStat, canSeeL1 && styles.heroStatDivider]}
                activeOpacity={0.7}
                onPress={() => { setTab('claims'); switchClaimLevel('l2'); }}
              >
                <View style={styles.heroStatTop}>
                  <MaterialCommunityIcons name="account-supervisor-outline" size={15} color="#BFDBFE" />
                  <Text style={styles.heroStatValue}>{levelCounts.l2}</Text>
                </View>
                <Text style={styles.heroStatLabel}>L2 Pending</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.heroStat, (canSeeL1 || canSeeL2) && styles.heroStatDivider]}
              activeOpacity={0.7}
              onPress={() => setTab('plans')}
            >
              <View style={styles.heroStatTop}>
                <MaterialCommunityIcons name="map-marker-path" size={15} color="#BFDBFE" />
                <Text style={styles.heroStatValue}>{plans.length}</Text>
              </View>
              <Text style={styles.heroStatLabel}>Travel Plans</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.body}>
        <Text style={[styles.sectionTitle, { color: textPrimary }]}>Pending Reviews</Text>

        {/* Pending review cards — home-style quick actions with illustrations */}
        <View style={styles.cardGrid}>
          {canSeeL1 && (
          <TouchableOpacity
            style={[
              styles.reviewCard,
              { backgroundColor: surface, borderColor: activeCard === 'l1' ? palette.primary : border, borderWidth: activeCard === 'l1' ? 1.5 : 1 },
            ]}
            activeOpacity={0.8}
            onPress={() => { setTab('claims'); switchClaimLevel('l1'); }}
          >
            <View style={[styles.cardArtPanel, { backgroundColor: '#E3E8FC' }]}>
              <View pointerEvents="none" style={styles.panelBlobLarge} />
              <View pointerEvents="none" style={styles.panelBlobSmall} />
              <L1ApprovalIllustration size={62} />
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardLabelRow}>
                <Text style={[styles.cardLabel, { color: textPrimary }]} numberOfLines={1}>Claim Requests</Text>
                <View style={[styles.countPill, { backgroundColor: activeCard === 'l1' ? palette.primary : palette.primarySoft }]}>
                  <Text style={[styles.countPillText, { color: activeCard === 'l1' ? '#FFFFFF' : palette.primary }]}>{levelCounts.l1}</Text>
                </View>
              </View>
              <View style={styles.cardSubRow}>
                <Text style={[styles.cardSub, { color: textSecondary }]} numberOfLines={2}>Approve claims or forward to L2</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color={textTertiary} />
              </View>
            </View>
          </TouchableOpacity>
          )}

          {canSeeL2 && (
          <TouchableOpacity
            style={[
              styles.reviewCard,
              { backgroundColor: surface, borderColor: activeCard === 'l2' ? palette.primary : border, borderWidth: activeCard === 'l2' ? 1.5 : 1 },
            ]}
            activeOpacity={0.8}
            onPress={() => { setTab('claims'); switchClaimLevel('l2'); }}
          >
            <View style={[styles.cardArtPanel, { backgroundColor: '#EDE9FE' }]}>
              <View pointerEvents="none" style={styles.panelBlobLarge} />
              <View pointerEvents="none" style={styles.panelBlobSmall} />
              <L2ApprovalIllustration size={62} />
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardLabelRow}>
                <Text style={[styles.cardLabel, { color: textPrimary }]} numberOfLines={1}>Claim Requests</Text>
                <View style={[styles.countPill, { backgroundColor: activeCard === 'l2' ? palette.primary : palette.primarySoft }]}>
                  <Text style={[styles.countPillText, { color: activeCard === 'l2' ? '#FFFFFF' : palette.primary }]}>{levelCounts.l2}</Text>
                </View>
              </View>
              <View style={styles.cardSubRow}>
                <Text style={[styles.cardSub, { color: textSecondary }]} numberOfLines={2}>Final approval of approved claims</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color={textTertiary} />
              </View>
            </View>
          </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.reviewCard,
              { backgroundColor: surface, borderColor: activeCard === 'plans' ? palette.primary : border, borderWidth: activeCard === 'plans' ? 1.5 : 1 },
            ]}
            activeOpacity={0.8}
            onPress={() => setTab('plans')}
          >
            <View style={[styles.cardArtPanel, { backgroundColor: '#E8F5EC' }]}>
              <View pointerEvents="none" style={styles.panelBlobLarge} />
              <View pointerEvents="none" style={styles.panelBlobSmall} />
              <TravelPlanIllustration size={62} />
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardLabelRow}>
                <Text style={[styles.cardLabel, { color: textPrimary }]} numberOfLines={1}>Travel Plans</Text>
                <View style={[styles.countPill, { backgroundColor: activeCard === 'plans' ? palette.primary : palette.primarySoft }]}>
                  <Text style={[styles.countPillText, { color: activeCard === 'plans' ? '#FFFFFF' : palette.primary }]}>{plans.length}</Text>
                </View>
              </View>
              <View style={styles.cardSubRow}>
                <Text style={[styles.cardSub, { color: textSecondary }]} numberOfLines={2}>Review team travel requests</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color={textTertiary} />
              </View>
            </View>
          </TouchableOpacity>

        </View>

        {tab === 'claims' ? (
          <>
          {/* Queue caption — which approval level is listed below, plus a shortcut to
              the supervisor's own review history (now its own screen). */}
          <View style={styles.captionRow}>
            <Text style={[styles.levelCaption, { marginBottom: 0, color: isDark ? palette.darkTextTertiary : palette.textTertiary }]}>
              {claimLevel === 'l1' ? `CLAIM REQUESTS · ${levelCounts.l1} PENDING` : `CLAIM REQUESTS · ${levelCounts.l2} PENDING`}
            </Text>
            <TouchableOpacity
              style={styles.historyBtn}
              onPress={() => navigation.navigate('ReviewHistory')}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="history" size={14} color={palette.primary} />
              <Text style={styles.historyBtnText}>Review History</Text>
            </TouchableOpacity>
          </View>

          {claims.length > 0 ? (
            claims.map((claim) => (
              <TouchableOpacity
                key={`${claim.sender_id}-${claim.month}`}
                style={[styles.claimCard, { backgroundColor: surface, borderColor: border }]}
                activeOpacity={0.75}
                onPress={() => navigation.navigate('ClaimReview', {
                  sender_id: claim.sender_id,
                  from_date: claim.from_date,
                  to_date: claim.to_date,
                  employee_name: claim.employee_name,
                  month: monthShort(claim.month),
                  level: claim.approval_level || claimLevel,
                })}
              >
                <View style={styles.claimHeader}>
                  <LinearGradient
                    colors={['#186E93', '#0FA58C']}
                    style={styles.avatar}
                  >
                    <Text style={styles.avatarText}>
                      {(claim.employee_name || '?').charAt(0).toUpperCase()}
                    </Text>
                  </LinearGradient>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.claimName, { color: textPrimary }]}>{claim.employee_name}</Text>
                    <Text style={[styles.claimMeta, { color: textSecondary }]}>
                      {claim.employee_id} · {claim.designation || '—'} · {claim.pfu || '—'}
                    </Text>
                  </View>
                  <View style={[styles.monthBadge, { backgroundColor: claimLevel === 'l2' ? palette.primarySoft : palette.warningLight }]}>
                    <Text style={[styles.monthBadgeText, { color: claimLevel === 'l2' ? palette.primary : palette.warning }]}>
                      {claimLevel === 'l2' ? 'L2 · ' : ''}{monthShort(claim.month)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.claimStats, { borderTopColor: border }]}>
                  <View style={styles.stat}>
                    <Text style={[styles.statValue, { color: textPrimary }]}>{fmt(claim.total_claimed_amount)}</Text>
                    <Text style={[styles.statLabel, { color: textSecondary }]}>Claimed</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={[styles.statValue, { color: textPrimary }]}>{claim.bill_count}</Text>
                    <Text style={[styles.statLabel, { color: textSecondary }]}>Invoices</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={[styles.statValue, { color: pendingColor(claim.pending_days) }]}>{claim.pending_days}d</Text>
                    <Text style={[styles.statLabel, { color: textSecondary }]}>Pending</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={22} color={textSecondary} />
                </View>
              </TouchableOpacity>
            ))
          ) : !loading ? (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="inbox-outline" size={44} color={textSecondary} />
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>No pending claims</Text>
              <Text style={[styles.emptySub, { color: textSecondary }]}>
                {claimLevel === 'l2'
                  ? 'Claims approved by your L1 supervisors will appear here for final approval.'
                  : 'When your team submits TERs, they\'ll appear here for approval.'}
              </Text>
            </View>
          ) : null
          }
          </>
        ) : (
          <>
          <Text style={[styles.levelCaption, { color: isDark ? palette.darkTextTertiary : palette.textTertiary }]}>
            TRAVEL PLAN REQUESTS · {plans.length} PENDING
          </Text>
          {plans.length > 0 ? (
          plans.map((plan) => (
            <TouchableOpacity
              key={plan.plan_id}
              style={[styles.claimCard, { backgroundColor: surface, borderColor: border }]}
              activeOpacity={0.75}
              onPress={() => navigation.navigate('TravelPlanReview', {
                plan_id: plan.plan_id,
                employee_name: plan.employee_name,
                month: planMonthLabel(plan),
              })}
            >
              <View style={styles.claimHeader}>
                <LinearGradient
                  colors={['#186E93', '#0FA58C']}
                  style={styles.avatar}
                >
                  <Text style={styles.avatarText}>
                    {(plan.employee_name || '?').charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.claimName, { color: textPrimary }]}>{plan.employee_name}</Text>
                  <Text style={[styles.claimMeta, { color: textSecondary }]}>
                    {plan.employee_id} · {plan.designation || '—'} · {plan.pfu || '—'}
                  </Text>
                </View>
                <View style={[styles.monthBadge, { backgroundColor: palette.warningLight }]}>
                  <Text style={[styles.monthBadgeText, { color: palette.warning }]}>{planMonthLabel(plan)}</Text>
                </View>
              </View>

              <View style={[styles.claimStats, { borderTopColor: border }]}>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: textPrimary }]}>{plan.item_count}</Text>
                  <Text style={[styles.statLabel, { color: textSecondary }]}>Days</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: pendingColor(plan.pending_days) }]}>{plan.pending_days}d</Text>
                  <Text style={[styles.statLabel, { color: textSecondary }]}>Pending</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={textSecondary} />
              </View>
            </TouchableOpacity>
          ))
          ) : !loading ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="map-marker-path" size={44} color={textSecondary} />
            <Text style={[styles.emptyTitle, { color: textPrimary }]}>No pending travel plans</Text>
            <Text style={[styles.emptySub, { color: textSecondary }]}>
              When your team submits travel plans, they'll appear here for approval.
            </Text>
          </View>
          ) : null
          }
          </>
        )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 22,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerGreeting: { color: '#D7FFF5', fontSize: 14, fontWeight: '600' },
  headerName: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', marginTop: 2 },
  headerDate: { color: '#E0F7F1', fontSize: 12, marginTop: 6 },
  headerAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.45)',
  },
  headerAvatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  headerPillRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, flexWrap: 'wrap' },
  headerPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5,
  },
  headerPillText: { color: '#E6FFF9', fontSize: 12, fontWeight: '600' },
  body: { paddingHorizontal: 16, paddingTop: 18 },
  sectionTitle: { ...typography.h3, marginBottom: 12 },
  heroStats: { flexDirection: 'row', marginTop: 18 },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatDivider: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)' },
  heroStatTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroStatValue: { color: '#FFFFFF', fontSize: 21, fontWeight: '800' },
  heroStatLabel: { color: '#BFDBFE', fontSize: 10.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 3 },
  levelCaption: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8, marginBottom: 10 },
  // Shortcut to the Review History screen, beside the queue caption
  captionRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10,
  },
  historyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 4, paddingHorizontal: 8,
  },
  historyBtnText: { color: palette.primary, fontSize: 12, fontWeight: '700' },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  reviewCard: {
    width: '48%',
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 4,
    ...shadows.sm,
  },
  cardArtPanel: {
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  panelBlobLarge: {
    position: 'absolute',
    width: 92, height: 92, borderRadius: 46,
    top: -32, right: -26,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  panelBlobSmall: {
    position: 'absolute',
    width: 46, height: 46, borderRadius: 23,
    bottom: -16, left: 10,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  cardBody: { padding: 12 },
  cardLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  cardLabel: { flex: 1, fontSize: 14.5, fontWeight: '700' },
  countPill: {
    minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 7,
    alignItems: 'center', justifyContent: 'center',
  },
  countPillText: { fontSize: 12, fontWeight: '800' },
  cardSubRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 3,
  },
  cardSub: { flex: 1, fontSize: 11, lineHeight: 14.5, marginRight: 4 },
  loadingBox: { alignItems: 'center', paddingVertical: 60 },
  claimCard: { borderRadius: radius.lg, padding: 14, marginBottom: 12, borderWidth: 1, ...shadows.sm },
  claimHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  claimName: { fontSize: 15, fontWeight: '700' },
  claimMeta: { fontSize: 12, marginTop: 2 },
  monthBadge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  monthBadgeText: { fontSize: 12, fontWeight: '700' },
  claimStats: {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, marginTop: 12, paddingTop: 12,
  },
  stat: { flex: 1 },
  statValue: { fontSize: 15, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptySub: { fontSize: 13, marginTop: 4, textAlign: 'center', paddingHorizontal: 30, lineHeight: 19 },
});
