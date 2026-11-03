import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet,
  RefreshControl, Modal, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { terApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import { normalizeDataArray } from '../../utils/api';
import { MONTHS } from '../../utils/constants';
import { useTheme } from '../../theme/ThemeContext';
import { palette, typography, radius, shadows } from '../../theme/tokens';
import { EmptyBills } from '../../components/Illustrations';
import ScreenBackHeader from '../../components/ScreenBackHeader';
import { getCache, hasCache, setCache } from '../../utils/screenCache';
import {
  claimStartDay,
  boundsFromEndMonth,
  periodLabel,
  periodShort,
  periodOf,
  claimWindow,
  periodEndsBeforeJoining,
} from '../../utils/claimPeriod';
import type { ExpenseLimitDataItem, ExpenseLimitItem } from '../../types/api';

interface TerCache {
  data: ExpenseLimitDataItem | null;
  limits: ExpenseLimitItem[];
  totalClaimed: number;
}

// Category icon + color map (matches Flutter app)
const CATEGORY_META: Record<number, { icon: string; color: string }> = {
  1: { icon: 'motorbike', color: '#3B82F6' },
  2: { icon: 'motorbike', color: '#8B5CF6' },
  3: { icon: 'gas-station', color: '#3B82F6' },
  4: { icon: 'car-wrench', color: '#F59E0B' },
  5: { icon: 'home-city-outline', color: '#14B8A6' },
  6: { icon: 'cellphone', color: '#EC4899' },
  7: { icon: 'silverware-fork-knife', color: '#F97316' },
  8: { icon: 'bus', color: '#06B6D4' },
  9: { icon: 'star-outline', color: '#64748B' },
  10: { icon: 'road-variant', color: '#6366F1' },
  11: { icon: 'flash-outline', color: '#EAB308' },
  12: { icon: 'walk', color: '#0FA58C' },                    // DA - Out of HQ (No night halt)
  13: { icon: 'storefront-outline', color: '#D97706' },      // DA - Local Market
  14: { icon: 'package-variant-closed', color: '#64748B' },  // Courier, Internet & Stationery
  15: { icon: 'silverware-fork-knife', color: '#F97316' },   // Food - Campaign
  16: { icon: 'bed', color: '#14B8A6' },                     // Room Rent - Campaign
  17: { icon: 'car-multiple', color: '#8B5CF6' },            // Vehicle Hiring
  18: { icon: 'gas-station', color: '#F59E0B' },             // Fuel Hired Vehicle
  19: { icon: 'road-variant', color: '#6366F1' },            // Toll Tax
};

// Name-keyed lookup — ids differ between environments (local vs UAT), so
// resolve icons by category name first, then fall back to id.
const CATEGORY_ICON_BY_NAME: Record<string, { icon: string; color: string }> = {
  'da - out of hq (no night halt)': { icon: 'walk', color: '#0FA58C' },
  'da - local market': { icon: 'storefront-outline', color: '#D97706' },
  'courier, internet & stationery': { icon: 'package-variant-closed', color: '#64748B' },
  'food - campaign': { icon: 'silverware-fork-knife', color: '#F97316' },
  'room rent - campaign': { icon: 'bed', color: '#14B8A6' },
  'vehicle hiring': { icon: 'car-multiple', color: '#8B5CF6' },
  'fuel hired vehicle': { icon: 'gas-station', color: '#F59E0B' },
  'toll tax': { icon: 'road-variant', color: '#6366F1' },
};

const categoryMeta = (id: number, name?: string) =>
  CATEGORY_ICON_BY_NAME[(name || '').toLowerCase()] || CATEGORY_META[id] || { icon: 'shape-outline', color: '#64748B' };

const STATUS_CARD: Record<string, { bg: string; fg: string; icon: string; label: string }> = {
  '5': { bg: '#D1FAE5', fg: '#065F46', icon: 'check-circle', label: 'Paid' },
  '3': { bg: '#D9EEF5', fg: '#125A79', icon: 'send-check-outline', label: 'Sent to Accounts' },
  '14': { bg: '#E0F7F5', fg: '#0B6B5B', icon: 'file-document-check-outline', label: 'Received' },
  '1': { bg: '#FEF3C7', fg: '#92400E', icon: 'inbox-arrow-down-outline', label: 'Received' },
  '2': { bg: '#EDE9FE', fg: '#5B21B6', icon: 'account-switch-outline', label: 'Processing' },
  '0': { bg: '#FEE2E2', fg: '#991B1B', icon: 'alert-circle-outline', label: 'Payment Failed' },
  '8': { bg: '#FEE2E2', fg: '#991B1B', icon: 'close-circle-outline', label: 'Rejected' },
  '13': { bg: '#FEE2E2', fg: '#991B1B', icon: 'cash-remove', label: 'Payment Rejected' },
};

const DEFAULT_STATUS_CARD = { bg: '#F1F5F9', fg: '#475569', icon: 'information-outline', label: 'Status' };

type StageState = 'done' | 'current' | 'warn' | 'todo';

const JOURNEY = [
  { key: 'add', label: 'Add invoices' },
  { key: 'submit', label: 'Submit' },
  { key: 'approve', label: 'Approve' },
  { key: 'paid', label: 'Paid' },
] as const;

const cacheKey = (month: number, year: number) => `ter:${year}-${month}`;

export default function TerScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { user } = useAuthStore();
  const enforceMode = user?.enforcement_mode || 'A'; // 'A' block add | 'B' block submit | 'C' flag only → hide limit info
  // Open on the period the employee is actually in. selectedMonth is a period END
  // month, so for a 16th-based company the current period ends next month — seeding
  // from the calendar month opens one period behind, which for a recent joiner is a
  // period that predates their joining date. The app renders behind a splash until
  // the session is restored, so the store already holds the user on first mount.
  const [selectedMonth, setSelectedMonth] = useState(
    () => periodOf(claimStartDay(useAuthStore.getState().user), new Date()).endMonth,
  );
  const [selectedYear, setSelectedYear] = useState(
    () => periodOf(claimStartDay(useAuthStore.getState().user), new Date()).endYear,
  );
  const initialCache = getCache<TerCache>(cacheKey(selectedMonth, selectedYear));
  const [loading, setLoading] = useState(!initialCache);
  const [data, setData] = useState<ExpenseLimitDataItem | null>(initialCache?.data ?? null);
  const [limits, setLimits] = useState<ExpenseLimitItem[]>(initialCache?.limits ?? []);
  const [totalClaimed, setTotalClaimed] = useState(initialCache?.totalClaimed ?? 0);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  // The sheet opens at 80% height and the list scrolls to the selected period
  // instead of always starting at January. Row offsets and the scrollable range are
  // only known after layout, so the target is queued and consumed once measured.
  const pickerScrollRef = useRef<ScrollView>(null);
  const pickerRowY = useRef<Record<number, number>>({});
  const pickerViewportH = useRef(0);
  const pickerContentH = useRef(0);
  const pickerPendingScroll = useRef<number | 'top' | null>(null);
  const pickerScrollRaf = useRef<number | null>(null);

  // True once the scroll was applied, or pending was already cleared.
  const applyPickerScroll = useCallback(() => {
    const target = pickerPendingScroll.current;
    if (target === null) return true;
    const vh = pickerViewportH.current;
    const ch = pickerContentH.current;
    if (vh <= 0 || ch <= 0) return false;

    let offset = 0;
    if (target !== 'top') {
      const y = pickerRowY.current[target];
      if (y == null) return false;
      // Land the selected period about a third down the viewport so the periods
      // just before it stay visible for context, then clamp to the end of the
      // scrollable range — the current period sits late in the year, and without
      // the clamp the list would over-scroll past the last row.
      offset = Math.max(0, y - vh * 0.32);
      offset = Math.min(offset, Math.max(0, ch - vh));
    }
    pickerScrollRef.current?.scrollTo({ y: offset, animated: false });
    pickerPendingScroll.current = null;
    return true;
  }, []);

  // Measurements arrive in separate passes (12 rows, then content size, then the
  // viewport), so retry across a few frames until they are all available.
  const flushPickerScroll = useCallback((attempt = 0) => {
    if (pickerPendingScroll.current === null) return;
    if (pickerScrollRaf.current != null) return;
    pickerScrollRaf.current = requestAnimationFrame(() => {
      pickerScrollRaf.current = null;
      if (!applyPickerScroll() && attempt < 12) flushPickerScroll(attempt + 1);
    });
  }, [applyPickerScroll]);

  // Arm the scroll each time the sheet is opened.
  useEffect(() => {
    if (!showMonthPicker) return;
    pickerPendingScroll.current = selectedMonth;
    flushPickerScroll();
  }, [showMonthPicker, selectedMonth, flushPickerScroll]);

  useEffect(() => () => {
    if (pickerScrollRaf.current != null) cancelAnimationFrame(pickerScrollRaf.current);
  }, []);

  const changePickerYear = useCallback((delta: number) => {
    const next = pickerYear + delta;
    setPickerYear(next);
    // Back on the selected year → jump to the selection; another year → start at the top.
    pickerPendingScroll.current = next === selectedYear ? selectedMonth : 'top';
    flushPickerScroll();
  }, [pickerYear, selectedMonth, selectedYear, flushPickerScroll]);
  const [generating, setGenerating] = useState(false);
  // Periods (end month/year) that already have a TER claim — drives the
  // "Claimed" / "Not yet claimed" chips inside the period picker.
  const [claimedPeriods, setClaimedPeriods] = useState<Set<string>>(new Set());

  // Period-aware range: (month, year) = the period's END month. Calendar
  // companies (start day 1) behave exactly as before (1st → last day).
  const getDateRange = useCallback((month: number, year: number) => {
    const b = boundsFromEndMonth(claimStartDay(user), month, year);
    const f = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { from: f(b.from), to: f(b.to) };
  }, [user]);

  // Period label for the picker/header ("21 Aug – 20 Sep 2026" · "Aug 2026" for calendar)
  const periodLabelFor = useCallback((month: number, year: number) =>
    periodLabel(claimStartDay(user), month, year), [user]);

  // Period-wise companies: compact from–to range, e.g. "21 Jun – 20 Jul"
  const isPeriodWise = claimStartDay(user) > 1;
  const periodRangeFor = useCallback((month: number, year: number) => {
    const b = boundsFromEndMonth(claimStartDay(user), month, year);
    return `${b.from.getDate()} ${MONTHS[b.from.getMonth()].substring(0, 3)} – ${b.to.getDate()} ${MONTHS[b.to.getMonth()].substring(0, 3)}`;
  }, [user]);

  const fetchData = useCallback(async (month: number, year: number) => {
    const key = cacheKey(month, year);
    // Only show the loader when there is nothing cached for this month yet.
    if (!hasCache(key)) setLoading(true);
    try {
      const { from, to } = getDateRange(month, year);
      const res = await terApi.getExpenseLimitData(from, to);
      const items = normalizeDataArray(res.data.data) as ExpenseLimitDataItem[];
      if (res.data.status === 'success' && items.length > 0) {
        const item = items[0];
        const limitsArr = item.expense_limit_data || [];
        // Total claimed: sum of category claimed amounts (matches Flutter)
        const catSum = limitsArr.reduce((s, l) => s + (l.claimed_amount || 0), 0);
        setCache(key, { data: item, limits: limitsArr, totalClaimed: catSum });
        setData(item);
        setLimits(limitsArr);
        setTotalClaimed(catSum);
      } else {
        setCache(key, { data: null, limits: [], totalClaimed: 0 });
        setData(null); setLimits([]); setTotalClaimed(0);
      }
    } catch (err: any) {
      if (err.response?.status === 401) useAuthStore.getState().logout();
    } finally {
      setLoading(false);
    }
  }, [getDateRange]);

  // All TERs the API returns (last ~11 months) → set of claimed periods.
  // The TER's `date` is the period's END date, so it maps 1:1 to the rows
  // shown in the picker (month = end month, key `year-month`).
  const fetchClaimedPeriods = useCallback(async () => {
    try {
      const res = await terApi.getExpenseLimitData();
      const items = normalizeDataArray(res.data?.data) as any[];
      const set = new Set<string>();
      items.forEach((it) => {
        if (!it?.date) return;
        const d = new Date(`${it.date}T00:00:00`);
        if (!Number.isNaN(d.getTime())) set.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
      });
      setClaimedPeriods(set);
    } catch {
      /* non-blocking — picker falls back to no chips */
    }
  }, []);

  useEffect(() => {
    // Hydrate instantly from cache if this month was viewed before.
    const cached = getCache<TerCache>(cacheKey(selectedMonth, selectedYear));
    if (cached) {
      setData(cached.data);
      setLimits(cached.limits);
      setTotalClaimed(cached.totalClaimed);
      setLoading(false);
    }
    fetchData(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  useFocusEffect(
    useCallback(() => {
      fetchData(selectedMonth, selectedYear);
      fetchClaimedPeriods();
    }, [selectedMonth, selectedYear, fetchData, fetchClaimedPeriods])
  );

  // ---- Claim window ----
  // This period plus the previous three, resolved from PERIODS. selectedMonth is a
  // period END month, so a calendar-month window lands a period out for any company
  // whose period straddles two months (16th-based: the in-progress period ends next
  // month) and hides the very period the employee is in.
  //
  // Periods that ended before the employee joined are excluded too: their monthly
  // limits all pro-rate to zero, and the backend drops zero-limit categories, so the
  // screen would show a near-empty grid that looks broken.
  const startDay = claimStartDay(user);
  const claimable = claimWindow(startDay).filter(
    (c) => !periodEndsBeforeJoining(startDay, c.month, c.year, user?.date_of_joining),
  );
  const isInClaimWindow =
    claimable.some((c) => c.year === selectedYear && c.month === selectedMonth);

  // Future period: its window hasn't opened yet (start date is still ahead).
  // The screen stays readable but every claim action is disabled.
  const isFuturePeriod = (() => {
    const b = boundsFromEndMonth(claimStartDay(user), selectedMonth, selectedYear);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return b.from.getTime() > today.getTime();
  })();

  // Pre-UNID submission state (P4): none | pending_l1 | pending_l2 | returned
  const submissionStatus = data?.submission_status ?? 'none';
  const isPendingSupervisor = submissionStatus === 'pending_l1' || submissionStatus === 'pending_l2';
  const isReturned = submissionStatus === 'returned';

  // Visible only for current or previous 3 months AND no UNID exists yet
  // (a UNID with status 0 is still a real claim — the status value alone is
  // unreliable across flows) AND not already pending supervisor approval.
  const claimBtnVisible = isInClaimWindow
    ? (data ? !data.unid && submissionStatus === 'none' : true)
    : false;
  // Enabled only when there's a claimed amount
  const claimBtnEnabled = totalClaimed > 0;

  // "View Draft" opens a full review screen; the submit action now lives there.
  const handleViewDraft = () => {
    if (!claimBtnEnabled) {
      Alert.alert('No Expenses', 'Please add your invoices before claiming TER.');
      return;
    }
    navigation.navigate('ClaimDraft', {
      month: selectedMonth,
      year: selectedYear,
      limits,
      totalClaimed,
    });
  };


  const handleResubmit = async () => {
    setGenerating(true);
    try {
      const { from, to } = getDateRange(selectedMonth, selectedYear);
      const res = await terApi.resubmit(from, to);
      if (res.data.status === 'success') {
        Alert.alert(
          'Success',
          res.data.message || 'Invoices resubmitted to supervisor for approval.',
          [{ text: 'OK', onPress: () => fetchData(selectedMonth, selectedYear) }]
        );
      } else {
        Alert.alert('Error', res.data.message);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to resubmit.');
    } finally {
      setGenerating(false);
    }
  };

  const fmt = (v: any) => '\u20B9' + Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Same guard as the first submission: resubmitting locks the invoices again, so the
  // employee confirms the total they are re-sending after rectification.
  const confirmResubmit = () => {
    Alert.alert(
      'Resubmit claim?',
      `Total to claim: ${fmt(totalClaimed)}\n` +
        `${periodLabelFor(selectedMonth, selectedYear)}\n\n` +
        'This goes back to your supervisor for approval and your invoices lock again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Resubmit', onPress: handleResubmit },
      ],
    );
  };

  const bg = isDark ? palette.darkBg : palette.background;
  const surface = isDark ? palette.darkSurface : palette.surface;
  const textPrimary = isDark ? palette.darkTextPrimary : palette.textPrimary;
  const textSecondary = isDark ? palette.darkTextSecondary : palette.textSecondary;
  const border = isDark ? palette.darkBorder : palette.border;

  // Status card (when a TER exists for the month)
  const statusCard = data && String(data.status ?? '0') !== '0' ? STATUS_CARD[String(data.status)] || DEFAULT_STATUS_CARD : null;

  const isClaimable = claimBtnVisible && !isFuturePeriod;
  // Bills can be added while claimable OR while a returned claim is being rectified —
  // deleting a wrong invoice often means adding the correct one (matches TerDetail).
  const canAddBills = isClaimable || (isReturned && !data?.unid);

  // ---- Journey stepper state ----
  const hasUnid = !!data?.unid;
  const isPaid = String(data?.status) === '5';
  const hasBills = totalClaimed > 0;
  // Once submitted for approval (or any later stage), the hero figure is the
  // amount actually claimed — not what is still claimable.
  const isSubmitted = hasUnid || isPendingSupervisor || isReturned;

  const stageState = (key: string): StageState => {
    if (key === 'add') return hasBills || hasUnid || isPendingSupervisor || isReturned ? 'done' : 'current';
    if (key === 'submit') {
      if (isReturned) return 'warn';
      if (isPendingSupervisor || hasUnid) return 'done';
      return 'todo';
    }
    if (key === 'approve') {
      if (hasUnid) return 'done';
      if (isPendingSupervisor) return 'current';
      return 'todo';
    }
    // paid
    return isPaid ? 'done' : hasUnid ? 'current' : 'todo';
  };

  const stepperMsg = (() => {
    if (isFuturePeriod) return 'Period not started yet.';
    if (isPaid) return 'Paid — check Track TER for the UTR number.';
    if (hasUnid) return 'UNID generated — your claim is in the payment pipeline.';
    if (isReturned) return 'Returned by supervisor — rectify the invoices and resubmit.';
    if (isPendingSupervisor) return 'Pending for approval.';
    if (hasBills) return 'Invoices added — ready to submit.';
    return 'Add your invoices to get started.';
  })();

  const stageIcon = (s: StageState, i: number) => {
    if (s === 'done') return <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />;
    if (s === 'warn') return <MaterialCommunityIcons name="alert" size={12} color="#FFFFFF" />;
    return <Text style={[styles.stageNum, { color: s === 'current' ? '#FFFFFF' : textSecondary }]}>{i + 1}</Text>;
  };

  const stageColors = (s: StageState): { bg: string; border: string } => {
    if (s === 'done') return { bg: palette.primary, border: palette.primary };
    if (s === 'current') return { bg: palette.primary, border: palette.primary };
    if (s === 'warn') return { bg: palette.warning, border: palette.warning };
    return { bg: isDark ? palette.darkSurfaceMuted : palette.surfaceMuted, border: isDark ? palette.darkBorder : palette.border };
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <ScreenBackHeader title="My Expenses" onBack={() => navigation.navigate('HomeTab')} />
      <ScrollView
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchData(selectedMonth, selectedYear)} tintColor={palette.primary} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header card */}
        <LinearGradient
          colors={isDark ? ['#0D2B3A', '#186E93'] : ['#186E93', '#13C7A8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          {/* Decorative blobs */}
          <View pointerEvents="none" style={styles.heroBlob1} />
          <View pointerEvents="none" style={styles.heroBlob2} />
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <View style={styles.heroLabelRow}>
                <MaterialCommunityIcons name="receipt-text-outline" size={14} color="#BFDBFE" />
                <Text style={styles.heroLabel}>
                  {isSubmitted ? 'Amount Claimed' : 'Claimable Amount'}
                </Text>
              </View>
              <Text style={styles.heroAmount}>{fmt(totalClaimed)}</Text>
              {data?.unid || isReturned || isInClaimWindow ? (
                <TouchableOpacity
                  style={styles.viewExpensesBtn}
                  onPress={() => navigation.navigate('TerDetail', {
                    data,
                    from: getDateRange(selectedMonth, selectedYear).from,
                    to: getDateRange(selectedMonth, selectedYear).to,
                  })}
                >
                  <Text style={styles.viewExpensesText}>{isReturned ? 'View & Rectify' : 'View Expenses'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {/* For Month / For Period card */}
            <View style={{ alignItems: 'flex-end' }}>
              <TouchableOpacity style={styles.monthCard} onPress={() => { setPickerYear(selectedYear); setShowMonthPicker(true); }}>
                <View style={styles.monthHeader}>
                  <Text style={styles.monthHeaderText}>{isPeriodWise ? 'For Period' : 'For Month'}</Text>
                </View>
                <View style={styles.monthBody}>
                  {isPeriodWise ? (
                    <>
                      <View style={styles.monthIconYear}>
                        <MaterialCommunityIcons name="calendar-month" size={13} color={palette.primary} />
                        <Text style={styles.monthYearSmall}>{selectedYear}</Text>
                      </View>
                      <Text style={styles.monthText} numberOfLines={1}>
                        {periodShort(claimStartDay(user), selectedMonth, selectedYear)}
                      </Text>
                      <Text style={styles.monthRange} numberOfLines={1}>
                        {periodRangeFor(selectedMonth, selectedYear)}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.monthText} numberOfLines={1}>
                        {MONTHS[selectedMonth - 1].substring(0, 3).toUpperCase()}
                      </Text>
                      <Text style={styles.yearText}>{selectedYear}</Text>
                      <MaterialCommunityIcons name="calendar-month" size={16} color={palette.primary} />
                    </>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Future period notice — claiming is disabled until the window opens */}
        {isFuturePeriod && (
          <View
            style={[
              styles.futureCard,
              {
                backgroundColor: isDark ? palette.darkSurfaceMuted : palette.primarySoft,
                borderColor: palette.primary,
              },
            ]}
          >
            <MaterialCommunityIcons name="calendar-clock" size={20} color={palette.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.futureTitle, { color: palette.primary }]}>Period not started yet</Text>
              <Text style={[styles.futureMsg, { color: textSecondary }]}>
                {periodLabelFor(selectedMonth, selectedYear)} hasn't begun. You'll be able to add bills and claim TER once the period starts.
              </Text>
            </View>
          </View>
        )}

        {/* Journey stepper */}
        {(
          <View style={[styles.stepCard, { backgroundColor: surface, borderColor: border }]}>
            <View style={styles.stepHead}>
              <View style={[styles.stepHeadIcon, { backgroundColor: palette.primarySoft }]}>
                <MaterialCommunityIcons name="map-marker-path" size={16} color={palette.primary} />
              </View>
              <Text style={[styles.stepHeadTitle, { color: textPrimary }]}>Claim journey</Text>
              <Text style={[styles.stepHeadMonth, { color: textSecondary }]}>
                {periodLabelFor(selectedMonth, selectedYear)}
              </Text>
            </View>
            <View style={styles.stepsRow}>
              <View pointerEvents="none" style={[styles.stepsTrack, { backgroundColor: border }]} />
              {JOURNEY.map((s, i) => {
                const st = stageState(s.key);
                const c = stageColors(st);
                return (
                  <View key={s.key} style={styles.stepCol}>
                    <View style={[styles.stageDot, { backgroundColor: c.bg, borderColor: c.border }]}>
                      {stageIcon(st, i)}
                    </View>
                    <Text
                      style={[
                        styles.stageLabel,
                        { color: st === 'todo' ? textSecondary : textPrimary },
                      ]}
                    >
                      {s.label}
                    </Text>
                  </View>
                );
              })}
            </View>
            <View style={[styles.stepMsgRow, { backgroundColor: isDark ? palette.darkSurfaceMuted : palette.surfaceMuted }]}>
              <MaterialCommunityIcons
                name={isReturned ? 'alert-circle-outline' : isPendingSupervisor ? 'clock-outline' : hasUnid ? isPaid ? 'check-circle-outline' : 'send-clock-outline' : 'plus-circle-outline'}
                size={15}
                color={isReturned ? palette.error : palette.primary}
              />
              <Text
                style={[styles.stepMsg, { color: isReturned ? palette.error : textSecondary }]}
                numberOfLines={1}
              >
                {stepperMsg}
              </Text>

              {/* Small inline action in the timeline strip */}
              {isClaimable && (
                <TouchableOpacity
                  style={styles.draftChip}
                  disabled={generating || !claimBtnEnabled}
                  onPress={handleViewDraft}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={claimBtnEnabled ? ['#186E93', '#13C7A8'] : ['#D1D5DB', '#D1D5DB']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.draftChipInner}
                  >
                    <MaterialCommunityIcons
                      name="eye-outline"
                      size={12}
                      color={claimBtnEnabled ? '#FFFFFF' : '#9CA3AF'}
                    />
                    <Text style={[styles.draftChipText, { color: claimBtnEnabled ? '#FFFFFF' : '#9CA3AF' }]}>
                      View Draft
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Status card (when TER exists) */}
        {statusCard && (
          <View style={[styles.statusCard, { backgroundColor: statusCard.bg }]}>
            <View style={[styles.statusIcon, { backgroundColor: statusCard.fg }]}>
              <MaterialCommunityIcons name={statusCard.icon as any} size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.statusTitle, { color: statusCard.fg }]}>{statusCard.label}</Text>
              <Text style={[styles.statusMsg, { color: statusCard.fg }]}>
                TER for {periodLabelFor(selectedMonth, selectedYear)} with UNID: {data?.unid} {String(data?.status) === '5' ? 'paid successfully' : 'submitted'}.
              </Text>
              {data?.approved_amount ? (
                <View style={styles.statusRow}>
                  <Text style={[styles.statusRowLabel, { color: statusCard.fg }]}>Approved Amount: {fmt(data.approved_amount)}</Text>
                  {data?.paid_date ? (
                    <Text style={[styles.statusRowLabel, { color: statusCard.fg }]}>  ·  Approved Date: {String(data.paid_date).split('-').reverse().join('-')}</Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* Returned for rectification card (P4) */}
        {isReturned && (
          <View style={[styles.statusCard, { backgroundColor: palette.errorLight }]}>
            <View style={[styles.statusIcon, { backgroundColor: palette.error }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.statusTitle, { color: palette.error }]}>Returned for Rectification</Text>
              <Text style={[styles.statusMsg, { color: palette.error }]}>
                {data?.reject_reason
                  ? `Reason: ${data.reject_reason}`
                  : 'Your supervisor returned this claim. Please rectify the invoices and resubmit.'}
              </Text>
              <TouchableOpacity
                style={[styles.rectifyBtn, { backgroundColor: palette.error }]}
                disabled={generating}
                onPress={confirmResubmit}
                activeOpacity={0.85}
              >
                {generating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.rectifyBtnText}>Rectify & Resubmit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Categories section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Categories</Text>
          {limits.length > 0 ? (
            <Text style={[styles.sectionCount, { color: textSecondary }]}>{limits.length} categories</Text>
          ) : null}
        </View>

        {limits.length > 0 ? (
          <View
            style={[styles.catGrid, isFuturePeriod && styles.catGridDisabled]}
            pointerEvents={isFuturePeriod ? 'none' : 'auto'}
          >
            {(() => {
              // Lodging & Boarding always sits FIRST (full-width tile), so the
              // grid stays balanced regardless of category order.
              const gridLimits = [...limits];
              const lbIdx = gridLimits.findIndex((l: any) => l.head_name === 'Lodging & Boarding');
              if (lbIdx > 0) {
                gridLimits.unshift(gridLimits.splice(lbIdx, 1)[0]);
              }
              return gridLimits.map((limit, i) => {
              const meta = categoryMeta(limit.category_id, limit.head_name);
              const claimed = limit.claimed_amount || 0;
              // First category is the "main" one — highlighted bg + inline Add New
              const isFeatured = i === 0;
              // Lodging & Boarding spans full width and keeps its own Add New pill
              const isLodging = limit.head_name === 'Lodging & Boarding';
              // Once-per-period categories (Phone): one bill per period — show Edit instead of Add
              const oncePerPeriodWithBill = ['Phone'].includes(limit.head_name) && (limit.bill_count || 0) > 0;
              const range = getDateRange(selectedMonth, selectedYear);
              const goDetail = () => navigation.navigate('TerDetail', {
                data,
                categoryId: limit.category_id,
                categoryName: limit.head_name,
                from: range.from,
                to: range.to,
              });
              const goAdd = () => navigation.navigate('AddBill', {
                // Keep the full limit payload — AddBill needs limit_amount /
                // claimed_amount / limit_period to cap the claimable amount.
                categories: limits.map((l: any) => ({ ...l, id: Number(l.category_id), name: l.head_name })),
                preselected: Number(limit.category_id),
                monthFrom: range.from,
                monthTo: range.to,
              });
              return (
                <View
                  key={i}
                  style={[
                    styles.catTile,
                    // Lodging & Boarding always spans full width — it carries
                    // FY limits + nights info that doesn't fit a half tile
                    isLodging && styles.catTileFull,
                    {
                      backgroundColor: isFeatured ? (isDark ? palette.darkSurface : palette.primarySoft) : surface,
                      borderColor: isFeatured ? palette.primary : border,
                      borderWidth: isFeatured ? 1.5 : 1,
                    },
                  ]}
                >
                  <TouchableOpacity activeOpacity={0.8} onPress={goDetail}>
                    {/* Compact tinted panel — icon with decorative blobs */}
                    <View style={[styles.catTileArt, { backgroundColor: meta.color + '2E' }]}>
                      <View pointerEvents="none" style={styles.panelBlobLarge} />
                      <View pointerEvents="none" style={styles.panelBlobSmall} />
                      <MaterialCommunityIcons name={meta.icon as any} size={30} color={meta.color} />
                    </View>
                    <View style={styles.catTileBody}>
                      {/* Category name right under the icon */}
                      <View style={styles.catTileLabelRow}>
                        <Text style={[styles.catTileName, { color: textPrimary }]} numberOfLines={1}>{limit.head_name}</Text>
                        <View style={[styles.countPill, { backgroundColor: limit.bill_count > 0 ? palette.primary : palette.primarySoft }]}>
                          <Text style={[styles.countPillText, { color: limit.bill_count > 0 ? '#FFFFFF' : palette.primary }]}>{limit.bill_count}</Text>
                        </View>
                      </View>
                      <Text style={[styles.catTileAmount, { color: textPrimary }]}>{fmt(claimed)}</Text>
                    </View>
                  </TouchableOpacity>
                  {isFeatured && canAddBills && (
                    <TouchableOpacity
                      style={styles.catTileAdd}
                      onPress={oncePerPeriodWithBill ? goDetail : goAdd}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons name={oncePerPeriodWithBill ? 'pencil-outline' : 'plus'} size={13} color="#FFFFFF" />
                      <Text style={styles.catTileAddText}>{oncePerPeriodWithBill ? 'Edit' : 'Add New'}</Text>
                    </TouchableOpacity>
                  )}
                  {/* Quick add-bill shortcut on every category except
                      Lodging & Boarding (which keeps its own Add New action) */}
                  {canAddBills && !isLodging && (
                    <TouchableOpacity
                      style={styles.catTilePlus}
                      onPress={oncePerPeriodWithBill ? goDetail : goAdd}
                      activeOpacity={0.85}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <MaterialCommunityIcons
                        name={oncePerPeriodWithBill ? 'pencil-outline' : 'plus'}
                        size={16}
                        color="#FFFFFF"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              );
              });
            })()}
          </View>
        ) : !loading ? (
          <View style={styles.emptyBox}>
            <EmptyBills width={170} height={140} />
            <Text style={[styles.emptyTitle, { color: textPrimary }]}>No categories</Text>
            <Text style={[styles.emptySub, { color: textSecondary }]}>
              No expense categories configured for this month.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Month Picker Modal (month + year) */}
      <Modal visible={showMonthPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          {/* The backdrop sits beside the sheet rather than around it: a touchable
              wrapping the sheet competes with the inner ScrollView for the gesture
              responder, which is what stopped the period list from scrolling. */}
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowMonthPicker(false)} />
          <View style={[styles.pickerSheet, { backgroundColor: surface }]}>
            <View style={styles.pickerHandle} />
            <Text style={[styles.pickerTitle, { color: textPrimary }]}>{isPeriodWise ? 'Select Period' : 'Select Month'}</Text>

            {/* Year navigation */}
            <View style={styles.pickerYearRow}>
              <TouchableOpacity
                style={styles.pickerYearBtn}
                onPress={() => changePickerYear(-1)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="chevron-left" size={24} color={palette.primary} />
              </TouchableOpacity>
              <Text style={[styles.pickerYearText, { color: textPrimary }]}>{pickerYear}</Text>
              <TouchableOpacity
                style={styles.pickerYearBtn}
                onPress={() => changePickerYear(1)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="chevron-right" size={24} color={palette.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={pickerScrollRef}
              style={styles.pickerScroll}
              contentContainerStyle={styles.pickerScrollContent}
              showsVerticalScrollIndicator
              onLayout={(e) => {
                pickerViewportH.current = e.nativeEvent.layout.height;
                flushPickerScroll();
              }}
              onContentSizeChange={(_w, h) => {
                pickerContentH.current = h;
                flushPickerScroll();
              }}
            >
              {Array.from({ length: 12 }, (_, i) => {
                const m = i + 1;
                // Only highlight the selected month when the picker is on the selected year
                const active = m === selectedMonth && pickerYear === selectedYear;
                const claimableThisYear = claimable.some((c) => c.year === pickerYear && c.month === m);
                // Periods that ended before the employee joined aren't claimable —
                // every monthly limit pro-rates to zero there, so opening one shows a
                // near-empty grid. Shown but not selectable.
                const preJoining = periodEndsBeforeJoining(startDay, m, pickerYear, user?.date_of_joining);
                return (
                  <TouchableOpacity
                    key={`${pickerYear}-${m}`}
                    style={[styles.pickerItem, active && styles.pickerItemActive, preJoining && styles.pickerItemDisabled]}
                    disabled={preJoining}
                    onLayout={(e) => {
                      pickerRowY.current[m] = e.nativeEvent.layout.y;
                      flushPickerScroll();
                    }}
                    onPress={() => { setSelectedMonth(m); setSelectedYear(pickerYear); setShowMonthPicker(false); }}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.pickerItemText, { color: textPrimary }, active && styles.pickerItemTextActive]} numberOfLines={1}>
                          {isPeriodWise ? periodShort(claimStartDay(user), m, pickerYear) : MONTHS[i]}
                        </Text>
                        {(() => {
                          const periodKey = `${pickerYear}-${m}`;
                          // A period counts as claimed once it has a TER of its
                          // own (UNID) or is already awaiting approval.
                          const claimed =
                            claimedPeriods.has(periodKey) ||
                            (active && (hasUnid || isPendingSupervisor));
                          if (claimed) {
                            return (
                              <View style={styles.pickerClaimedBadge}>
                                <Text style={styles.pickerClaimedText}>Claimed</Text>
                              </View>
                            );
                          }
                          // Only periods still inside the claim window can be
                          // claimed, so only they say "Not yet claimed".
                          if (preJoining) {
                            return (
                              <View style={[styles.pickerNotClaimedBadge, {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : '#F1F5F9',
                              }]}>
                                <Text style={[styles.pickerNotClaimedText, { color: textSecondary }]}>
                                  Before joining
                                </Text>
                              </View>
                            );
                          }
                          if (claimableThisYear) {
                            return (
                              <View style={[styles.pickerNotClaimedBadge, {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : '#F1F5F9',
                              }]}>
                                <Text style={[styles.pickerNotClaimedText, { color: textSecondary }]}>
                                  Not yet claimed
                                </Text>
                              </View>
                            );
                          }
                          return null;
                        })()}
                      </View>
                      {isPeriodWise && (
                        <Text style={[styles.pickerItemRange, { color: active ? '#BFDBFE' : textSecondary }]} numberOfLines={1}>
                          {periodRangeFor(m, pickerYear)}
                        </Text>
                      )}
                    </View>
                    {active && <MaterialCommunityIcons name="check-circle" size={18} color={palette.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { borderRadius: radius.xl, padding: 20, ...shadows.lg, overflow: 'hidden', position: 'relative' },
  heroBlob1: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    top: -50, right: -40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  heroBlob2: {
    position: 'absolute', width: 70, height: 70, borderRadius: 35,
    bottom: -28, left: 30,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', position: 'relative' },
  heroLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroLabel: { ...typography.label, color: '#BFDBFE', textTransform: 'uppercase', letterSpacing: 1 },
  heroAmount: { ...typography.amount, color: '#FFFFFF', marginTop: 4 },
  viewExpensesBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 6, alignSelf: 'flex-start', marginTop: 10 },
  viewExpensesText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  monthCard: { borderRadius: radius.lg, overflow: 'hidden', width: 118, alignSelf: 'flex-start' },
  monthHeader: { backgroundColor: 'rgba(255,255,255,0.25)', paddingVertical: 6, alignItems: 'center' },
  monthHeaderText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  monthBody: { backgroundColor: '#FFFFFF', paddingVertical: 7, alignItems: 'center' },
  monthText: { fontSize: 18, fontWeight: '700', color: palette.textPrimary },
  monthRange: { fontSize: 10.5, color: palette.textSecondary, marginTop: 1 },
  monthIconYear: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 1 },
  monthYearSmall: { fontSize: 11, fontWeight: '700', color: palette.textSecondary },
  yearText: { fontSize: 14, color: palette.textPrimary, marginBottom: 4 },

  // Journey stepper
  stepCard: { borderRadius: radius.lg, borderWidth: 1, padding: 14, marginTop: 14, ...shadows.sm },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepHeadIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepHeadTitle: { fontSize: 14.5, fontWeight: '700', flex: 1 },
  stepHeadMonth: { fontSize: 11.5, fontWeight: '600' },
  stepsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, position: 'relative' },
  stepsTrack: {
    position: 'absolute', top: 11, left: 20, right: 20, height: 2, borderRadius: 1,
  },
  stepCol: { alignItems: 'center', width: 62 },
  stageDot: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: palette.surface,
  },
  stageNum: { fontSize: 11, fontWeight: '800' },
  stageLabel: { fontSize: 10.5, marginTop: 5 },
  stepMsgRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 8, marginTop: 12,
  },
  stepMsg: { flex: 1, fontSize: 11.5, fontWeight: '600', lineHeight: 15 },

  statusCard: { flexDirection: 'row', borderRadius: radius.lg, padding: 14, marginTop: 14 },
  statusIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  statusTitle: { fontSize: 16, fontWeight: '700' },
  statusMsg: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  statusRow: { flexDirection: 'row', marginTop: 6, flexWrap: 'wrap' },
  statusRowLabel: { fontSize: 13, fontWeight: '600' },
  rectifyBtn: {
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 9,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  rectifyBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  // Claim CTA
  // compact inline action that sits in the claim-journey timeline strip
  draftChip: { borderRadius: radius.pill, overflow: 'hidden', marginLeft: 4 },
  draftChipInner: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 5,
  },
  draftChipText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.2 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 },
  sectionTitle: { ...typography.h3 },
  sectionCount: { fontSize: 12, fontWeight: '600' },
  loadingBox: { alignItems: 'center', paddingVertical: 40 },

  // Category grid — home-screen-inspired 2-column tiles; first (main) category highlighted
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  catTile: {
    width: '48%', borderRadius: radius.lg, borderWidth: 1,
    overflow: 'hidden', ...shadows.sm,
  },
  // Last odd tile stretches to fill the row
  catTileFull: { width: '100%' },
  // Compact tinted panel with decorative blobs — name sits under the icon
  catTileArt: {
    height: 56, alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', position: 'relative',
  },
  panelBlobLarge: {
    position: 'absolute', width: 70, height: 70, borderRadius: 35,
    top: -24, right: -18, backgroundColor: 'rgba(255,255,255,0.55)',
  },
  panelBlobSmall: {
    position: 'absolute', width: 34, height: 34, borderRadius: 17,
    bottom: -10, left: 8, backgroundColor: 'rgba(255,255,255,0.5)',
  },
  catTileBody: { padding: 10 },
  catTileLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catTileName: { flex: 1, fontSize: 12.5, fontWeight: '700', marginRight: 6 },
  countPill: {
    minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5,
    alignItems: 'center', justifyContent: 'center',
  },
  countPillText: { fontSize: 10.5, fontWeight: '700' },
  catTileAmount: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  catTileAdd: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    marginHorizontal: 10, marginBottom: 10,
    backgroundColor: palette.primary, borderRadius: radius.pill, paddingVertical: 5,
  },
  catTileAddText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  // Compact circular quick-add shortcut shown on each category tile
  catTilePlus: {
    position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', backgroundColor: palette.primary, zIndex: 2,
  },
  countBadge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  countText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  progressTrack: { height: 5, borderRadius: radius.pill, marginTop: 7, overflow: 'hidden' },
  overLimitTag: { alignSelf: 'flex-start', marginTop: 6, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  overLimitText: { fontSize: 10, fontWeight: '700', color: '#991B1B' },
  progressFill: { height: '100%', borderRadius: radius.pill },

  emptyBox: { alignItems: 'center', paddingVertical: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 10 },
  emptySub: { fontSize: 13, marginTop: 4, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  // 80% of the viewport, with the list scrolling inside it — previously the sheet was
  // capped at 70% and the list at a fixed 320px, so the later periods were clipped and
  // unreachable.
  pickerSheet: { borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, padding: 20, paddingBottom: 32, height: '80%' },
  pickerScroll: { flex: 1, marginTop: 4 },
  pickerScrollContent: { paddingBottom: 8 },
  pickerHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 16 },
  pickerTitle: { ...typography.h3, textAlign: 'center', marginBottom: 8 },
  pickerYearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 8 },
  pickerYearBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.primarySoft },
  pickerYearText: { fontSize: 18, fontWeight: '800', minWidth: 80, textAlign: 'center' },
  pickerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderRadius: radius.md, marginBottom: 4 },
  pickerItemDisabled: { opacity: 0.45 },
  pickerItemActive: { backgroundColor: palette.primarySoft },
  pickerItemText: { fontSize: 16 },
  pickerItemRange: { fontSize: 11.5, marginTop: 1 },
  pickerItemTextActive: { color: palette.primary, fontWeight: '700' },
  futureCard: { flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: 16, marginTop: 14, padding: 14, borderRadius: radius.lg, borderWidth: 1.5 },
  futureTitle: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  futureMsg: { fontSize: 12, lineHeight: 17 },
  catGridDisabled: { opacity: 0.55 },
  pickerClaimedBadge: { marginLeft: 10, backgroundColor: '#DCFCE7', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  pickerClaimedText: { fontSize: 10, fontWeight: '800', color: '#15803D' },
  pickerNotClaimedBadge: { marginLeft: 10, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  pickerNotClaimedText: { fontSize: 10, fontWeight: '700' },
});
