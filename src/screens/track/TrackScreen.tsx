import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { terApi } from '../../api';
import { normalizeDataArray } from '../../utils/api';
import { useAuthStore } from '../../store/authStore';
import StatusChip from '../../components/StatusChip';
import ScreenBackHeader from '../../components/ScreenBackHeader';
import { EmptySearch, EmptyState } from '../../components/Illustrations';
import { useTheme } from '../../theme/ThemeContext';
import { palette, typography, radius, shadows } from '../../theme/tokens';
import { MONTHS } from '../../utils/constants';
import { formatDateDisplay } from '../../utils/dateFormat';
import { claimStartDay, periodLabel } from '../../utils/claimPeriod';
import { getCache, hasCache, setCache, getCacheAge } from '../../utils/screenCache';
import type { TrackDataItem } from '../../types/api';

const CACHE_KEY = 'track:all';

// Status tile icon + color per TER status
const TRACK_META: Record<string, { icon: string; color: string }> = {
  '5': { icon: 'check-decagram', color: '#059669' },
  '14': { icon: 'file-document-check-outline', color: '#0D9488' },
  '3': { icon: 'send-check-outline', color: '#0284C7' },
  '1': { icon: 'inbox-arrow-down-outline', color: '#D97706' },
  '2': { icon: 'account-switch-outline', color: '#7C3AED' },
  '0': { icon: 'alert-circle-outline', color: '#DC2626' },
  '8': { icon: 'close-circle-outline', color: '#DC2626' },
  '13': { icon: 'cash-remove', color: '#DC2626' },
  '7': { icon: 'chart-donut', color: '#D97706' },
  '4': { icon: 'timer-sand-outline', color: '#9333EA' },
  '12': { icon: 'swap-horizontal', color: '#7C3AED' },
  '9': { icon: 'account-question-outline', color: '#64748B' },
};
const DEFAULT_TRACK_META = { icon: 'ticket-outline', color: '#64748B' };

export default function TrackScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const { user } = useAuthStore();
  // Period label under the UNID: "21 Jul – 20 Aug 2026" for period-wise units,
  // "Aug 2026" for calendar-month units (derived from the TER's end date).
  const claimPeriodLabel = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const d = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(d.getTime())) return formatDateDisplay(dateStr);
    return periodLabel(claimStartDay(user), d.getMonth() + 1, d.getFullYear());
  };
  // treat the cached list as fresh for this long
  const FRESH_TTL_MS = 60_000;
  const initialCache = getCache<TrackDataItem[]>(CACHE_KEY);
  const [loading, setLoading] = useState(!initialCache);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<TrackDataItem[]>(initialCache ?? []);
  const [search, setSearch] = useState('');
  // 0 = All (default). Shows EVERY TER the API returns (last 11 months).
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [selectedYear, setSelectedYear] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  // Year displayed inside the picker (independent of the applied filter)
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  // Fetch ALL TERs (last 11 months) — call API without dates → getAllData mode (array)
  const fetchData = useCallback(async () => {
    // Only show the full loader when nothing is cached yet.
    if (!hasCache(CACHE_KEY)) setLoading(true);
    try {
      const res = await terApi.getExpenseLimitData();
      if (res.data.status === 'success') {
        const list = normalizeDataArray(res.data.data) as TrackDataItem[];
        setCache(CACHE_KEY, list);
        setItems(list);
      } else {
        setCache(CACHE_KEY, []);
        setItems([]);
      }
    } catch (err: any) {
      if (err.response?.status === 401) useAuthStore.getState().logout();
      else setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Refresh when the Track tab is focused (new UNIDs may have been generated).
  // Guarded by a TTL: this call fetches every TER of ~11 months with all their
  // invoices, which takes seconds — re-running it on every tab switch made the
  // screen feel frozen. Pull-to-refresh still forces a fetch.
  useFocusEffect(
    useCallback(() => {
      const age = getCacheAge(CACHE_KEY);
      if (age === null || age > FRESH_TTL_MS) fetchData();
    }, [fetchData])
  );

  const filtered = items.filter((it) => {
    // Year filter — only applied when the user explicitly picks a year
    if (it?.date && selectedYear > 0) {
      const d = new Date(it.date);
      if (d.getFullYear() !== selectedYear) return false;
      // Month filter (only when a month is also selected)
      if (selectedMonth > 0 && d.getMonth() + 1 !== selectedMonth) return false;
    }
    // UNID search
    if (search.trim() && !String(it?.unid ?? '').includes(search.trim())) return false;
    return true;
  });

  // Hero summary (over the filtered set so it reacts to filters)
  const totalClaimed = filtered.reduce((s, it) => s + (Number(it?.claimed_amount) || 0), 0);
  const paidCount = filtered.filter((it) => String(it?.status) === '5').length;
  const pendingCount = filtered.length - paidCount;

  const fmt = (v: any) => '\u20B9' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

  const bg = isDark ? palette.darkBg : palette.background;
  const surface = isDark ? palette.darkSurface : palette.surface;
  const textPrimary = isDark ? palette.darkTextPrimary : palette.textPrimary;
  const textSecondary = isDark ? palette.darkTextSecondary : palette.textSecondary;
  const border = isDark ? palette.darkBorder : palette.border;
  // placeholder fill for the loading skeleton
  const skeleton = isDark ? '#1E293B' : '#E2E8F0';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <ScreenBackHeader title="Track" onBack={() => navigation.navigate('HomeTab')} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />}
      >
        {/* Hero summary */}
        <LinearGradient
          colors={isDark ? ['#0D2B3A', '#186E93'] : ['#186E93', '#13C7A8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View pointerEvents="none" style={styles.heroBlob1} />
          <View pointerEvents="none" style={styles.heroBlob2} />
          <View style={styles.heroLabelRow}>
            <MaterialCommunityIcons name="map-search-outline" size={15} color="#BFDBFE" />
            <Text style={styles.heroLabel}>Total Claimed</Text>
          </View>
          <Text style={styles.heroAmount}>{fmt(totalClaimed)}</Text>
          <View style={styles.heroChips}>
              <View style={styles.heroChip}>
                <Text style={styles.heroChipNum}>{filtered.length}</Text>
                <Text style={styles.heroChipLabel}>TERs</Text>
              </View>
              <View style={styles.heroChipDivider} />
              <View style={styles.heroChip}>
                <Text style={[styles.heroChipNum, { color: '#86EFAC' }]}>{paidCount}</Text>
                <Text style={styles.heroChipLabel}>paid</Text>
              </View>
              <View style={styles.heroChipDivider} />
              <View style={styles.heroChip}>
                <Text style={[styles.heroChipNum, { color: '#FDE68A' }]}>{pendingCount}</Text>
                <Text style={styles.heroChipLabel}>in progress</Text>
              </View>
            </View>
        </LinearGradient>

        {/* Search bar */}
        <View style={[styles.searchBar, { backgroundColor: surface, borderColor: border }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: textPrimary }]}
            placeholder="Search by UNID..."
            placeholderTextColor={isDark ? palette.darkTextTertiary : palette.textTertiary}
            value={search}
            onChangeText={setSearch}
            keyboardType="number-pad"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={18} color={textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Month/year filter */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.monthFilter, { backgroundColor: surface, borderColor: border }]}
            onPress={() => setShowPicker(true)}
          >
            <MaterialCommunityIcons name="calendar-month-outline" size={18} color={palette.primary} />
            <Text style={[styles.monthFilterText, { color: textPrimary }]}>
              {selectedYear === 0
                ? 'All TERs'
                : selectedMonth === 0
                  ? `All of ${selectedYear}`
                  : `${MONTHS[selectedMonth - 1]} ${selectedYear}`}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={18} color={textSecondary} />
          </TouchableOpacity>
          {(selectedMonth > 0 || selectedYear > 0) && (
            <TouchableOpacity
              style={[styles.clearFilter, { backgroundColor: palette.primarySoft }]}
              onPress={() => { setSelectedMonth(0); setSelectedYear(0); }}
            >
              <Text style={styles.clearFilterText}>Show all</Text>
            </TouchableOpacity>
          )}
          <Text style={[styles.countText, { color: textSecondary }]}>
            {loading && items.length === 0 ? 'Loading…' : `${filtered.length} TER${filtered.length === 1 ? '' : 's'}`}
          </Text>
        </View>

        {/* List */}
        {filtered.length > 0 ? (
          filtered.map((item, i) => {
            const meta = TRACK_META[String(item?.status)] || DEFAULT_TRACK_META;
            const paid = String(item?.status) === '5';
            return (
              <TouchableOpacity
                key={item.unid ?? i}
                style={[styles.trackCard, { backgroundColor: surface, borderColor: border }]}
                onPress={() => navigation.navigate('ViewTrack', { data: item })}
                activeOpacity={0.85}
              >
                <View style={styles.cardTop}>
                  <LinearGradient
                    colors={[meta.color, `${meta.color}77`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardTile}
                  >
                    <MaterialCommunityIcons name={meta.icon as any} size={20} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={styles.cardMid}>
                    <Text style={[styles.unidText, { color: textPrimary }]}>UNID #{item.unid}</Text>
                    <Text style={[styles.cardDate, { color: textSecondary }]}>
                      {claimPeriodLabel(item?.date)}
                    </Text>
                  </View>
                  <View style={styles.cardRight}>
                    <Text style={[styles.cardAmount, { color: textPrimary }]}>{fmt(item.claimed_amount)}</Text>
                    <Text style={[styles.cardSub, { color: textSecondary }]}>
                      {paid
                        ? `Paid ${fmt(item.final_payable_amount)}`
                        : item.utr_no
                          ? `UTR: ${item.utr_no}`
                          : ''}
                    </Text>
                  </View>
                </View>
                <View style={[styles.cardFooter, { borderTopColor: border }]}>
                  {item.status !== undefined && <StatusChip status={item.status} />}
                  <View style={styles.chevronCircle}>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={palette.primary} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        ) : loading ? (
          // Skeleton cards: the first load pulls every TER with all their invoices
          // and can take seconds. Previously this branch rendered nothing at all,
          // so the screen looked like the tap had done nothing.
          <>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.trackCard, { backgroundColor: surface, borderColor: border }]}>
                <View style={styles.cardTop}>
                  <View style={[styles.skTile, { backgroundColor: skeleton }]} />
                  <View style={styles.cardMid}>
                    <View style={[styles.skLine, { width: '42%', backgroundColor: skeleton }]} />
                    <View style={[styles.skLine, { width: '68%', marginTop: 9, backgroundColor: skeleton }]} />
                  </View>
                  <View style={[styles.skAmount, { backgroundColor: skeleton }]} />
                </View>
                <View style={[styles.cardFooter, { borderTopColor: border }]}>
                  <View style={[styles.skChip, { backgroundColor: skeleton }]} />
                </View>
              </View>
            ))}
          </>
        ) : !loading ? (
          <EmptyState
            illustration={<EmptySearch />}
            title={search ? 'No matching UNID' : selectedYear === 0 ? 'No TERs yet' : `No TERs in ${selectedYear}`}
            subtitle={search
              ? `No TER found matching "${search}". Try a different UNID number.`
              : selectedYear === 0
                ? 'Once you submit a TER via the TER tab, it will appear here for tracking.'
                : selectedMonth > 0
                  ? `No TERs for ${MONTHS[selectedMonth - 1]} ${selectedYear}. Tap "Show all" to view everything.`
                  : `No TERs submitted in ${selectedYear}. Tap the filter to browse another year.`}
          />
        ) : null}
      </ScrollView>

      {/* Month picker modal */}
      <Modal visible={showPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPicker(false)}>
          <View style={[styles.pickerSheet, { backgroundColor: surface }]}>
            <View style={styles.pickerHandle} />
            <Text style={[styles.pickerTitle, { color: textPrimary }]}>Filter by Month</Text>

            {/* Year navigation (affects the picker display only) */}
            <View style={styles.yearNav}>
              <TouchableOpacity
                style={styles.yearBtn}
                onPress={() => setPickerYear((y) => y - 1)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons name="chevron-left" size={22} color={palette.primary} />
              </TouchableOpacity>
              <Text style={[styles.yearLabel, { color: textPrimary }]}>{pickerYear}</Text>
              <TouchableOpacity
                style={styles.yearBtn}
                onPress={() => setPickerYear((y) => y + 1)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons name="chevron-right" size={22} color={palette.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
              {/* All TERs option (no filter at all) */}
              <TouchableOpacity
                style={[styles.pickerItem, selectedYear === 0 && styles.pickerItemActive]}
                onPress={() => { setSelectedMonth(0); setSelectedYear(0); setShowPicker(false); }}
              >
                <Text style={[styles.pickerItemText, { color: textPrimary }, selectedYear === 0 && { color: palette.primary, fontWeight: '700' }]}>
                  All TERs
                </Text>
                {selectedYear === 0 && <MaterialCommunityIcons name="check-circle" size={18} color={palette.primary} />}
              </TouchableOpacity>

              {/* All months of the picker year */}
              <TouchableOpacity
                style={[styles.pickerItem, selectedMonth === 0 && selectedYear === pickerYear && selectedYear !== 0 && styles.pickerItemActive]}
                onPress={() => { setSelectedMonth(0); setSelectedYear(pickerYear); setShowPicker(false); }}
              >
                <Text style={[styles.pickerItemText, { color: textPrimary }]}>
                  All of {pickerYear}
                </Text>
                {selectedMonth === 0 && selectedYear === pickerYear && selectedYear !== 0 && (
                  <MaterialCommunityIcons name="check-circle" size={18} color={palette.primary} />
                )}
              </TouchableOpacity>

              {Array.from({ length: 12 }, (_, i) => {
                const m = i + 1;
                const active = m === selectedMonth && selectedYear === pickerYear && selectedYear !== 0;
                return (
                  <TouchableOpacity
                    key={m}
                    style={[styles.pickerItem, active && styles.pickerItemActive]}
                    onPress={() => { setSelectedMonth(m); setSelectedYear(pickerYear); setShowPicker(false); }}
                  >
                    <Text style={[styles.pickerItemText, { color: textPrimary }, active && { color: palette.primary, fontWeight: '700' }]}>
                      {MONTHS[i]}
                    </Text>
                    {active && <MaterialCommunityIcons name="check-circle" size={18} color={palette.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    borderRadius: radius.xl,
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.lg,
  },
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
  heroLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, position: 'relative' },
  heroLabel: { ...typography.label, color: '#BFDBFE', textTransform: 'uppercase', letterSpacing: 1 },
  heroAmount: { ...typography.amount, color: '#FFFFFF', marginTop: 4, position: 'relative' },
  heroChips: { flexDirection: 'row', alignItems: 'center', marginTop: 14, position: 'relative' },
  heroChip: { alignItems: 'center', paddingHorizontal: 14 },
  heroChipNum: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  heroChipLabel: { color: '#BFDBFE', fontSize: 10.5, marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.5 },
  heroChipDivider: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.25)' },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 14, height: 50, gap: 10, ...shadows.sm },
  searchInput: { flex: 1, fontSize: 15, height: '100%' },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, marginBottom: 16 },
  monthFilter: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  monthFilterText: { fontSize: 14, fontWeight: '600' },
  clearFilter: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 10 },
  clearFilterText: { color: palette.primary, fontSize: 13, fontWeight: '600' },
  countText: { fontSize: 13, fontWeight: '500', marginLeft: 'auto' },
  skTile: { width: 44, height: 44, borderRadius: 14, marginRight: 12 },
  skLine: { height: 11, borderRadius: 6 },
  skAmount: { width: 62, height: 14, borderRadius: 6 },
  skChip: { width: 78, height: 18, borderRadius: radius.pill },

  // Track cards
  trackCard: { borderRadius: radius.lg, padding: 14, marginBottom: 12, borderWidth: 1, ...shadows.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  cardTile: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  cardMid: { flex: 1 },
  unidText: { fontSize: 14.5, fontWeight: '700', flexShrink: 1 },
  cardDate: { fontSize: 12.5, marginTop: 4 },
  cardRight: { alignItems: 'flex-end', marginLeft: 8 },
  cardAmount: { fontSize: 17, fontWeight: '800' },
  cardSub: { fontSize: 11.5, marginTop: 2 },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 12, paddingTop: 12, borderTopWidth: 1,
  },
  chevronCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: palette.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  pickerSheet: { borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, padding: 20, paddingBottom: 40 },
  pickerHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 16 },
  pickerTitle: { ...typography.h3, textAlign: 'center', marginBottom: 12 },
  yearNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 12 },
  yearBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: palette.primarySoft, alignItems: 'center', justifyContent: 'center' },
  yearLabel: { fontSize: 17, fontWeight: '700', minWidth: 70, textAlign: 'center' },
  pickerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderRadius: radius.md, marginBottom: 4 },
  pickerItemActive: { backgroundColor: palette.primarySoft },
  pickerItemText: { fontSize: 16 },
});
