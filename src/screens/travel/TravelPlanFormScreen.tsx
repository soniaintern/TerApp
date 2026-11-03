import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform,
  Modal, Alert, ActivityIndicator, StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { terApi } from '../../api';
import DateField from '../../components/DateField';
import ScreenBackHeader from '../../components/ScreenBackHeader';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import { palette, typography, radius, shadows } from '../../theme/tokens';
import { storage } from '../../utils/storage';
import { claimStartDay, periodOf, nextPeriodOf, boundsFromEndMonth, periodLabel, dateKey } from '../../utils/claimPeriod';
import type { TravelPlan, TravelPlanItem } from '../../types/api';

interface DraftItem {
  type: 'travel' | 'stay';
  date: string; // YYYY-MM-DD — set by the calendar
  from: string;
  to: string;
  mode: string;
  km: string;
  amount: string;
  hotel_name: string;
  check_out: string;
  purpose: string;
}

const EMPTY_ITEM: DraftItem = {
  type: 'travel', date: '', from: '', to: '', mode: '', km: '', amount: '',
  hotel_name: '', check_out: '', purpose: '',
};

const MODES = ['Bus', 'Train', 'Car', 'Flight', 'Other'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDraft(item?: TravelPlanItem): DraftItem {
  if (!item) return { ...EMPTY_ITEM };
  const amount = item.fare != null && item.fare > 0 ? String(item.fare) : (item.estimate != null ? String(item.estimate) : '');
  return {
    type: item.type === 'stay' ? 'stay' : 'travel',
    date: item.date || '',
    from: item.from || '',
    to: item.to || '',
    mode: item.mode || '',
    km: item.km != null ? String(item.km) : '',
    amount,
    hotel_name: item.hotel_name || '',
    check_out: item.check_out || '',
    purpose: item.purpose || '',
  };
}

function toPayload(items: DraftItem[]): any[] {
  return items.map((it) =>
    it.type === 'stay'
      ? {
          type: 'stay',
          date: it.date,
          hotel_name: it.hotel_name.trim() || 'Tentative',
          check_out: it.check_out,
          purpose: it.purpose.trim() || null,
          estimate: Number(it.amount),
        }
      : {
          type: 'travel',
          date: it.date,
          from: it.from.trim(),
          to: it.to.trim(),
          mode: it.mode.trim(),
          km: it.km.trim() ? Number(it.km) : null,
          fare: Number(it.amount),
          purpose: it.purpose.trim() || null,
          estimate: Number(it.amount),
        }
  );
}

const nextDay = (y: number, m: number, d: number) => {
  const dt = new Date(y, m - 1, d + 1);
  return dateKey(dt.getFullYear(), dt.getMonth(), dt.getDate());
};

export default function TravelPlanFormScreen({ navigation, route }: any) {
  const editing: TravelPlan | undefined = route.params?.plan;
  const { isDark } = useTheme();
  const { user } = useAuthStore();

  // ---- period: next period for new plans · the plan's own period when editing ----
  const planStartDay = claimStartDay(user);
  const now = new Date();
  const nextBounds = nextPeriodOf(planStartDay, now);
  const planEndMonth = editing ? editing.plan_month : nextBounds.endMonth;
  const planEndYear = editing ? editing.plan_year : nextBounds.endYear;
  const bounds = editing
    ? boundsFromEndMonth(planStartDay, planEndMonth, planEndYear)
    : { from: nextBounds.from, to: nextBounds.to };
  const periodLabelText = periodLabel(planStartDay, planEndMonth, planEndYear);

  // all dates of the period (single combined calendar grid)
  const periodDates: Date[] = [];
  {
    const dt = new Date(bounds.from);
    while (dt <= bounds.to) {
      periodDates.push(new Date(dt));
      dt.setDate(dt.getDate() + 1);
    }
  }
  const firstWeekday = bounds.from.getDay();

  const draftKey = `travel_plan_draft_${planEndYear}-${planEndMonth}`;

  const [items, setItems] = useState<DraftItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [modalDay, setModalDay] = useState<string | null>(null); // full date being edited
  const [form, setForm] = useState<DraftItem | null>(null);
  const [saving, setSaving] = useState(false);

  const bg = isDark ? palette.darkBg : palette.background;
  const surface = isDark ? palette.darkSurface : palette.surface;
  const textPrimary = isDark ? palette.darkTextPrimary : palette.textPrimary;
  const textSecondary = isDark ? palette.darkTextSecondary : palette.textSecondary;
  const border = isDark ? palette.darkBorder : palette.border;
  const inputBg = isDark ? palette.darkSurfaceMuted : palette.surfaceMuted;

  // Load: local draft first, else the returned plan's items.
  useEffect(() => {
    (async () => {
      try {
        const cached = await storage.get(draftKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) setItems(parsed);
        } else if (editing && editing.items.length) {
          setItems(editing.items.map(toDraft));
        }
      } catch { /* ignore */ }
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save draft locally on every change.
  useEffect(() => {
    if (!loaded) return;
    storage.set(draftKey, JSON.stringify(items)).catch(() => {});
  }, [items, loaded, draftKey]);

  const markedKeys = new Set(items.map((it) => it.date));

  const openDayModal = (date: Date) => {
    const key = dateKey(date.getFullYear(), date.getMonth(), date.getDate());
    const existing = items.find((it) => it.date === key);
    setForm(existing ? { ...existing } : { ...EMPTY_ITEM, date: key });
    setModalDay(key);
  };

  const closeModal = () => {
    setModalDay(null);
    setForm(null);
  };

  const validateForm = (): string | null => {
    if (!form) return 'Missing form data.';
    if (form.type === 'travel') {
      if (!form.from.trim() || !form.to.trim()) return 'Add From and To places for this trip.';
      if (!form.mode.trim()) return 'Pick a travel mode.';
    } else {
      // Stay is kept simple: hotel is tentative/optional, no room charge
      if (!form.check_out || form.check_out < form.date) return 'Check-out cannot be before check-in.';
    }
    return null;
  };

  const saveDay = () => {
    const error = validateForm();
    if (error) {
      Alert.alert('Check this day', error);
      return;
    }
    setItems((prev) => {
      const i = prev.findIndex((it) => it.date === form!.date);
      if (i >= 0) return prev.map((it, idx) => (idx === i ? { ...form! } : it));
      return [...prev, { ...form! }];
    });
    closeModal();
  };

  const removeDay = (key: string) => {
    const dt = new Date(`${key}T00:00:00`);
    Alert.alert('Remove day', `Remove ${DAY_NAMES[dt.getDay()]} ${dt.getDate()} ${MONTH_NAMES[dt.getMonth()]} from the plan?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setItems((prev) => prev.filter((it) => it.date !== key)) },
    ]);
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      Alert.alert('Empty plan', 'Tap days on the calendar and fill them before submitting.');
      return;
    }
    setSaving(true);
    try {
      const payload = toPayload(items);
      const res = editing
        ? await terApi.travelPlanResubmit(editing.plan_id, payload)
        : await terApi.travelPlanSubmit({ plan_month: planEndMonth, plan_year: planEndYear, items: payload });

      if (res.data.status === 'success') {
        await storage.remove(draftKey);
        Alert.alert(
          editing ? 'Resubmitted' : 'Submitted',
          editing ? 'Your travel plan is back with your supervisor.' : 'Travel plan submitted for approval.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', res.data.message || 'Something went wrong.');
      }
    } catch (err: any) {
      if (err.response?.status === 401) useAuthStore.getState().logout();
      else Alert.alert('Error', err.response?.data?.message || 'Unable to connect.');
    } finally {
      setSaving(false);
    }
  };

  const setFormField = (key: keyof DraftItem, value: string) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...periodDates,
  ];
  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const modalField = (label: string, key: keyof DraftItem, opts?: any) => (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, { backgroundColor: inputBg, color: textPrimary, borderColor: border }]}
        placeholderTextColor={palette.textTertiary}
        value={form?.[key] ?? ''}
        onChangeText={(t) => setFormField(key, t)}
        {...opts}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenBackHeader title={editing ? 'Edit Travel Plan' : 'New Travel Plan'} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {editing && editing.return_remarks ? (
          <View style={[styles.returnNote, { backgroundColor: '#EDE9FE' }]}>
            <MaterialCommunityIcons name="information-outline" size={16} color="#7C3AED" />
            <Text style={styles.returnNoteText}>
              <Text style={{ fontWeight: '700', color: '#7C3AED' }}>Changes required: </Text>
              {editing.return_remarks}
            </Text>
          </View>
        ) : null}

        {/* Plan period */}
        <View style={[styles.periodCard, { backgroundColor: surface, borderColor: border }]}>
          <MaterialCommunityIcons name="calendar-month" size={22} color={palette.primary} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={[styles.periodValue, { color: textPrimary }]}>{periodLabelText}</Text>
            <Text style={[styles.periodHint, { color: textSecondary }]}>
              {editing ? 'Fixed period for this returned plan' : 'Plans are always for the next claim period'}
            </Text>
          </View>
          <View style={styles.markedCount}>
            <Text style={styles.markedCountText}>{items.length} day{items.length === 1 ? '' : 's'}</Text>
          </View>
        </View>

        {/* Calendar — tap a day to add or edit its entry */}
        <Text style={[styles.sectionTitle, { color: textPrimary }]}>Tap a day to add or edit</Text>
        <View style={[styles.calendarCard, { backgroundColor: surface, borderColor: border }]}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {DAY_NAMES.map((w) => (
              <Text key={w} style={[styles.dayHead, { color: textSecondary }]}>{w}</Text>
            ))}
          </View>
          {rows.map((row, ri) => (
            <View key={ri} style={{ flexDirection: 'row', gap: 8 }}>
              {row.map((dt, ci) => {
                if (dt === null) return <View key={`e${ci}`} style={styles.dayCell} />;
                const key = dateKey(dt.getFullYear(), dt.getMonth(), dt.getDate());
                const on = markedKeys.has(key);
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.dayCell,
                      { borderWidth: 1.5, borderColor: on ? palette.primary : border },
                      { backgroundColor: on ? palette.primary : (isDark ? palette.darkSurfaceMuted : palette.surfaceMuted) },
                    ]}
                    onPress={() => openDayModal(dt)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '700', color: on ? '#FFFFFF' : textPrimary }}>{dt.getDate()}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
          <View style={styles.calendarLegend}>
            <View style={[styles.legendDot, { backgroundColor: palette.primary }]} />
            <Text style={[styles.legendText, { color: textSecondary }]}>Filled days are teal — tap any day to fill or edit</Text>
          </View>
        </View>

        {/* Summary table */}
        {items.length > 0 && (
          <>
            <View style={styles.summaryHead}>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>Summary</Text>
              <Text style={[styles.summaryHint, { color: textSecondary }]}>Tap a row to edit</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: surface, borderColor: border }]}>
              {[...items]
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((it) => {
                  const dt = new Date(`${it.date}T00:00:00`);
                  const label = `${DAY_NAMES[dt.getDay()]} ${dt.getDate()} ${MONTH_NAMES[dt.getMonth()]}`;
                  const detail = it.type === 'travel'
                    ? `${it.from || '—'} → ${it.to || '—'} · ${it.mode || '—'}${it.km ? ` · ${it.km} km` : ''}`
                    : `${it.hotel_name || '—'} · till ${it.check_out ? it.check_out.slice(8, 10) : '—'}`;
                  return (
                    <TouchableOpacity
                      key={it.date}
                      style={[styles.summaryRow, { borderBottomColor: border }]}
                      activeOpacity={0.7}
                      onPress={() => openDayModal(new Date(`${it.date}T00:00:00`))}
                    >
                      <View style={[styles.summaryIcon, { backgroundColor: it.type === 'stay' ? '#EDE9FE' : palette.primarySoft }]}>
                        <MaterialCommunityIcons
                          name={it.type === 'stay' ? 'bed' : 'bus'}
                          size={14}
                          color={it.type === 'stay' ? '#7C3AED' : palette.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.summaryDate, { color: textPrimary }]}>{label}</Text>
                        <Text style={[styles.summaryDetail, { color: textSecondary }]} numberOfLines={1}>{detail}</Text>
                      </View>
                      <MaterialCommunityIcons name="pencil-outline" size={15} color={textSecondary} />
                      <TouchableOpacity onPress={() => removeDay(it.date)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <MaterialCommunityIcons name="trash-can-outline" size={17} color={palette.error} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
            </View>
          </>
        )}

        {/* Plan summary + submit */}
        <View style={[styles.totalCard, { backgroundColor: surface, borderColor: border }]}>
          <Text style={[styles.totalHint, { color: textSecondary }]}>
            {items.length} day{items.length === 1 ? '' : 's'} · {items.filter((x) => x.type === 'stay').length} stay
            {items.filter((x) => x.type === 'travel').length > 0 ? ` · ${items.filter((x) => x.type === 'travel').length} travel` : ''}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, saving && { opacity: 0.6 }]}
          disabled={saving}
          onPress={handleSubmit}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <MaterialCommunityIcons name="send" size={18} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>{editing ? 'Resubmit for Approval' : 'Submit for Approval'}</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={[styles.draftHint, { color: textSecondary }]}>
          Your entries are saved on this device — you can close and come back anytime.
        </Text>
      </ScrollView>

      {/* Day entry modal */}
      <Modal visible={modalDay !== null} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeModal} />
          <View style={[styles.modalBody, { backgroundColor: bg }]}>
            <View style={styles.modalHead}>
              <View>
                <Text style={[styles.modalTitle, { color: textPrimary }]}>
                  {modalDay ? (() => { const d = new Date(`${modalDay}T00:00:00`); return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`; })() : ''}
                </Text>
                <Text style={[styles.modalSub, { color: textSecondary }]}>Fill the details for this day</Text>
              </View>
              <TouchableOpacity onPress={closeModal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="close" size={22} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={{ flexShrink: 1 }}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
            <View style={[styles.typeToggle, { backgroundColor: isDark ? palette.darkSurfaceMuted : palette.surfaceMuted }]}>
              <TouchableOpacity
                style={[styles.typeBtn, form?.type === 'travel' && styles.typeBtnActive]}
                onPress={() => setFormField('type', 'travel')}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="bus" size={13} color={form?.type === 'travel' ? '#FFFFFF' : palette.primary} />
                <Text style={[styles.typeBtnText, { color: form?.type === 'travel' ? '#FFFFFF' : textSecondary }]}>Travel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, form?.type === 'stay' && styles.typeBtnActive]}
                onPress={() => setFormField('type', 'stay')}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="bed" size={13} color={form?.type === 'stay' ? '#FFFFFF' : palette.primary} />
                <Text style={[styles.typeBtnText, { color: form?.type === 'stay' ? '#FFFFFF' : textSecondary }]}>Stay</Text>
              </TouchableOpacity>
            </View>

            {form?.type === 'travel' ? (
              <>
                <View style={styles.twoCol}>
                  {modalField('From', 'from', { placeholder: 'City / village', maxLength: 191 })}
                  {modalField('To', 'to', { placeholder: 'City / village', maxLength: 191 })}
                </View>
                <Text style={[styles.fieldLabel, { color: textSecondary }]}>Mode</Text>
                <View style={styles.modeRow}>
                  {MODES.map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.modeChip, { borderColor: border }, form?.mode === m && styles.modeChipActive]}
                      onPress={() => setFormField('mode', m)}
                    >
                      <Text style={[styles.modeChipText, { color: textSecondary }, form?.mode === m && styles.modeChipTextActive]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {modalField('Km (optional)', 'km', { keyboardType: 'decimal-pad', placeholder: 'Approx km if known' })}
              </>
            ) : (
              <>
                {modalField('Hotel Name (optional)', 'hotel_name', { placeholder: 'Tentative', maxLength: 191 })}
                <View style={styles.twoCol}>
                  <View style={styles.fieldWrap}>
                    <Text style={[styles.fieldLabel, { color: textSecondary }]}>Check-in</Text>
                    <Text style={[styles.fixedValue, { color: textPrimary }]}>
                      {form?.date ? `${form.date.slice(8, 10)} ${MONTH_NAMES[Number(form.date.slice(5, 7)) - 1]}` : ''}
                    </Text>
                  </View>
                  <View style={styles.fieldWrap}>
                    <DateField
                      label="Check-out"
                      value={form?.check_out ?? ''}
                      onChange={(v: string) => setFormField('check_out', v)}
                      minimumDate={form?.date ? new Date(`${form.date}T00:00:00`) : undefined}
                    />
                  </View>
                </View>

              </>
            )}

            {modalField('Purpose', 'purpose', { placeholder: 'Optional', maxLength: 500 })}
            </ScrollView>

            <TouchableOpacity style={[styles.saveDayBtn, { marginTop: 12 }]} onPress={saveDay} activeOpacity={0.85}>
              <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
              <Text style={styles.saveDayText}>Save this day</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  returnNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    borderRadius: radius.md, padding: 12, marginBottom: 16,
  },
  returnNoteText: { flex: 1, fontSize: 13, lineHeight: 18 },
  sectionTitle: { ...typography.h3, marginBottom: 10 },
  periodCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.md, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14,
  },
  periodValue: { fontSize: 16, fontWeight: '700' },
  periodHint: { fontSize: 12, marginTop: 1 },
  markedCount: {
    backgroundColor: palette.primarySoft, borderRadius: radius.pill,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  markedCountText: { color: palette.primary, fontSize: 12, fontWeight: '800' },
  calendarCard: { borderRadius: radius.lg, borderWidth: 1, padding: 12, marginBottom: 14 },
  dayHead: { width: 44, textAlign: 'center', fontSize: 11, fontWeight: '700', marginBottom: 6 },
  dayCell: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  calendarLegend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11.5 },
  summaryHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  summaryHint: { fontSize: 12, marginBottom: 10 },
  summaryCard: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden', marginBottom: 14 },
  summaryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1,
  },
  summaryIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  summaryDate: { fontSize: 13.5, fontWeight: '700' },
  summaryDetail: { fontSize: 11.5, marginTop: 1 },
  summaryAmount: { fontSize: 13.5, fontWeight: '800' },
  totalCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: radius.lg, borderWidth: 1, padding: 14, marginTop: 6,
  },
  totalLabel: { fontSize: 12, fontWeight: '600' },
  totalValue: { fontSize: 22, fontWeight: '800', marginTop: 1 },
  totalHint: { fontSize: 12 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: palette.primary, borderRadius: radius.pill,
    paddingVertical: 14, marginTop: 14,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  draftHint: { textAlign: 'center', fontSize: 11.5, marginTop: 10 },
  // modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.5)' },
  modalBody: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 34,
    maxHeight: '88%',
  },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalSub: { fontSize: 12.5, marginTop: 2 },
  typeToggle: {
    flexDirection: 'row', alignSelf: 'flex-start', borderRadius: radius.pill, padding: 3, marginBottom: 14,
  },
  typeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 5,
  },
  typeBtnActive: { backgroundColor: palette.primary },
  typeBtnText: { fontSize: 12, fontWeight: '700' },
  twoCol: { flexDirection: 'row', gap: 12 },
  fieldWrap: { flex: 1, marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  fixedValue: { fontSize: 14, fontWeight: '700', paddingVertical: 12 },
  fieldInput: {
    height: 46, borderRadius: radius.md, borderWidth: 1,
    paddingHorizontal: 12, fontSize: 14,
  },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  modeChip: {
    borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5,
  },
  modeChipActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  modeChipText: { fontSize: 12, fontWeight: '600' },
  modeChipTextActive: { color: '#FFFFFF' },
  saveDayBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: palette.primary, borderRadius: radius.pill,
    paddingVertical: 13,
  },
  saveDayText: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '700' },
});
