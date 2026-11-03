import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { palette, radius } from '../theme/tokens';

export const formatDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

interface Props {
  visible: boolean;
  value: string; // yyyy-mm-dd or ''
  minimumDate?: Date;
  maximumDate?: Date;
  onSelect: (value: string) => void;
  onClose: () => void;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// 3 columns for the month and year grids.
const COLS = 3;
const YEAR_ROW_H = 46; // chip height + padding, used to scroll the year list

type Mode = 'days' | 'months' | 'years';

export default function WebDatePickerModal({ visible, value, minimumDate, maximumDate, onSelect, onClose }: Props) {
  const { isDark } = useTheme();
  const [mode, setMode] = useState<Mode>('days');
  const [view, setView] = useState<Date>(() => {
    const v = value ? startOfDay(new Date(`${value}T00:00:00`)) : new Date();
    return new Date(v.getFullYear(), v.getMonth(), 1);
  });
  const yearScrollRef = useRef<ScrollView>(null);

  const min = minimumDate ? startOfDay(minimumDate) : null;
  const max = maximumDate ? startOfDay(maximumDate) : null;

  const minMonth = min ? new Date(min.getFullYear(), min.getMonth(), 1) : null;
  const maxMonth = max ? new Date(max.getFullYear(), max.getMonth(), 1) : null;

  const thisYear = new Date().getFullYear();
  const maxYear = max ? max.getFullYear() : thisYear;
  // Falls back to a 100-year range when no minimum is supplied, which is what a
  // date of birth needs.
  const minYear = min ? min.getFullYear() : maxYear - 100;

  // Re-open on the selected date, always starting from the day grid.
  useEffect(() => {
    if (!visible) return;
    setMode('days');
    const v = value ? startOfDay(new Date(`${value}T00:00:00`)) : new Date();
    setView(new Date(v.getFullYear(), v.getMonth(), 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Bring the viewed year into sight when the year list opens.
  useEffect(() => {
    if (mode !== 'years') return;
    const idx = Math.max(0, maxYear - view.getFullYear());
    const y = Math.max(0, Math.floor(idx / COLS) * YEAR_ROW_H - 60);
    const id = requestAnimationFrame(() => yearScrollRef.current?.scrollTo({ y, animated: false }));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  if (Platform.OS !== 'web') return null;

  const canPrev =
    mode === 'days' ? (!minMonth || view > minMonth) : mode === 'months' ? view.getFullYear() > minYear : false;
  const canNext =
    mode === 'days' ? (!maxMonth || view < maxMonth) : mode === 'months' ? view.getFullYear() < maxYear : false;

  const cells = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const lead = first.getDay(); // 0 = Sunday
    const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    const arr: (Date | null)[] = [];
    for (let i = 0; i < lead; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(view.getFullYear(), view.getMonth(), d));
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [view]);

  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = maxYear; y >= minYear; y--) arr.push(y);
    return arr;
  }, [maxYear, minYear]);

  const isDisabled = (d: Date) => {
    const day = startOfDay(d);
    if (min && day < min) return true;
    if (max && day > max) return true;
    return false;
  };

  // A month is only offered if some day inside it is selectable.
  const monthDisabled = (y: number, m: number) => {
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    if (min && last < min) return true;
    if (max && first > max) return true;
    return false;
  };

  const move = (dir: -1 | 1) => {
    if (mode === 'months') {
      setView((prev) => new Date(prev.getFullYear() + dir, prev.getMonth(), 1));
      return;
    }
    setView((prev) => new Date(prev.getFullYear(), prev.getMonth() + dir, 1));
  };

  const surface = isDark ? palette.darkSurface : palette.surface;
  const textPrimary = isDark ? palette.darkTextPrimary : palette.textPrimary;
  const textSecondary = isDark ? palette.darkTextSecondary : palette.textSecondary;
  const border = isDark ? palette.darkBorder : palette.border;
  const muted = isDark ? palette.darkSurfaceMuted : palette.surfaceMuted;

  const title =
    mode === 'days' ? `${MONTHS[view.getMonth()]} ${view.getFullYear()}`
      : mode === 'months' ? String(view.getFullYear())
        : 'Select year';

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: surface }]} onPress={() => {}}>
          {/* Header: chevrons step month (day view) or year (month view).
              The title drills day → month → year. */}
          <View style={styles.headRow}>
            <Pressable
              onPress={() => move(-1)}
              disabled={!canPrev}
              style={[styles.navBtn, { backgroundColor: muted, opacity: canPrev ? 1 : 0.35 }]}
            >
              <MaterialCommunityIcons name="chevron-left" size={22} color={textPrimary} />
            </Pressable>
            <Pressable
              onPress={() => setMode(mode === 'days' ? 'months' : 'years')}
              disabled={mode === 'years'}
              style={styles.titleBtn}
            >
              <Text style={[styles.headTitle, { color: textPrimary }]}>{title}</Text>
              {mode !== 'years' && (
                <MaterialCommunityIcons name="chevron-down" size={18} color={textSecondary} />
              )}
            </Pressable>
            <Pressable
              onPress={() => move(1)}
              disabled={!canNext}
              style={[styles.navBtn, { backgroundColor: muted, opacity: canNext ? 1 : 0.35 }]}
            >
              <MaterialCommunityIcons name="chevron-right" size={22} color={textPrimary} />
            </Pressable>
          </View>

          {mode === 'days' && (
            <>
              <View style={styles.weekRow}>
                {WEEKDAYS.map((w) => (
                  <Text key={w} style={[styles.weekLabel, { color: textSecondary }]}>{w}</Text>
                ))}
              </View>
              <View style={styles.grid}>
                {cells.map((d, i) => {
                  if (!d) return <View key={`e${i}`} style={styles.cell} />;
                  const key = formatDate(d);
                  const selected = key === value;
                  const disabled = isDisabled(d);
                  const today = key === formatDate(new Date());
                  return (
                    <View key={key} style={styles.cell}>
                      <Pressable
                        disabled={disabled}
                        onPress={() => { onSelect(key); onClose(); }}
                        style={[
                          styles.day,
                          selected && { backgroundColor: palette.primary },
                          !selected && disabled && { opacity: 0.3 },
                          !selected && !disabled && { backgroundColor: muted },
                          !selected && today && { borderWidth: 1.5, borderColor: palette.primary },
                        ]}
                      >
                        <Text style={[styles.dayText, { color: selected ? '#FFFFFF' : textPrimary }]}>
                          {d.getDate()}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {mode === 'months' && (
            <View style={styles.grid}>
              {MONTHS_SHORT.map((label, m) => {
                const disabled = monthDisabled(view.getFullYear(), m);
                const selected = value.startsWith(`${view.getFullYear()}-${String(m + 1).padStart(2, '0')}`);
                return (
                  <View key={label} style={styles.monthCell}>
                    <Pressable
                      disabled={disabled}
                      onPress={() => { setView(new Date(view.getFullYear(), m, 1)); setMode('days'); }}
                      style={[
                        styles.monthChip,
                        selected && { backgroundColor: palette.primary },
                        !selected && disabled && { opacity: 0.3 },
                        !selected && !disabled && { backgroundColor: muted },
                      ]}
                    >
                      <Text style={[styles.monthText, { color: selected ? '#FFFFFF' : textPrimary }]}>
                        {label}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}

          {mode === 'years' && (
            <ScrollView ref={yearScrollRef} style={styles.yearScroll} contentContainerStyle={styles.grid}>
              {years.map((y) => {
                const selected = value.startsWith(`${y}-`);
                return (
                  <View key={y} style={styles.monthCell}>
                    <Pressable
                      onPress={() => { setView(new Date(y, view.getMonth(), 1)); setMode('months'); }}
                      style={[
                        styles.monthChip,
                        selected && { backgroundColor: palette.primary },
                        !selected && { backgroundColor: muted },
                      ]}
                    >
                      <Text style={[styles.monthText, { color: selected ? '#FFFFFF' : textPrimary }]}>
                        {y}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* Footer actions */}
          <View style={styles.footRow}>
            <Text style={[styles.hint, { color: textSecondary }]}>
              {min || max ? 'Select a date within the allowed window.' : ' '}
            </Text>
            <Pressable onPress={onClose} style={[styles.cancelBtn, { borderColor: border }]}>
              <Text style={[styles.cancelText, { color: textSecondary }]}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radius.xl,
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  titleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
  headTitle: { fontSize: 16, fontWeight: '800' },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 11.5, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, padding: 2, aspectRatio: 1 },
  day: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { fontSize: 14, fontWeight: '700' },
  monthCell: { width: `${100 / COLS}%`, padding: 3 },
  monthChip: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: { fontSize: 13.5, fontWeight: '700' },
  yearScroll: { maxHeight: 268 },
  footRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  hint: { fontSize: 11, flex: 1, marginRight: 8 },
  cancelBtn: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 7 },
  cancelText: { fontSize: 13, fontWeight: '700' },
});
