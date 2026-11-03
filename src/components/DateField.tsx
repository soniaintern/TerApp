import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet, Modal } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import WebDatePickerModal from './WebDatePickerModal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { palette, typography, radius } from '../theme/tokens';

/** Format a Date as yyyy-mm-dd (e.g. 2026-07-18) — the format the backend expects. */
export const formatDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

interface DateFieldProps {
  label: string;
  value: string; // yyyy-mm-dd or ''
  onChange: (value: string) => void;
  maximumDate?: Date;
  minimumDate?: Date;
  required?: boolean;
}

export default function DateField({
  label,
  value,
  onChange,
  maximumDate,
  minimumDate,
  required,
}: DateFieldProps) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [show, setShow] = useState(false);

  const inputBg = isDark ? palette.darkSurfaceMuted : palette.surfaceMuted;
  const border = isDark ? palette.darkBorder : palette.border;
  const textPrimary = isDark ? palette.darkTextPrimary : palette.textPrimary;
  const textSecondary = isDark ? palette.darkTextSecondary : palette.textSecondary;
  const placeholder = isDark ? palette.darkTextTertiary : palette.textTertiary;
  const sheetBg = isDark ? palette.darkSurface : palette.surface;

  // Picker value follows the field value (yyyy-mm-dd) or defaults to today
  const pickerDate = value ? new Date(`${value}T00:00:00`) : new Date();

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShow(false); // android dialog closes itself
    if (event.type === 'dismissed') return;
    if (selected) onChange(formatDate(selected));
    // iOS: keep the sheet open while scrolling; close via Done / backdrop
  };

  return (
    <View>
      <Text style={[styles.label, { color: textSecondary }]}>
        {label}
        {required ? ' *' : ''}
      </Text>
      <TouchableOpacity
        style={[styles.field, { backgroundColor: inputBg, borderColor: border }]}
        activeOpacity={0.7}
        onPress={() => setShow(true)}
      >
        <MaterialCommunityIcons name="calendar-month-outline" size={18} color={palette.primary} />
        <Text style={[styles.value, { color: value ? textPrimary : placeholder }]}>
          {value || 'Select date'}
        </Text>
      </TouchableOpacity>

      {/* Web: the community datetimepicker has no web build, so we use our
          own themed month-grid modal. Native keeps OS pickers below. */}
      <WebDatePickerModal
        visible={show && Platform.OS === 'web'}
        value={value}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onSelect={onChange}
        onClose={() => setShow(false)}
      />

      {/* iOS: themed bottom-sheet picker (inline spinners inside the form look
          broken). Android keeps the native dialog. */}
      {show && Platform.OS === 'ios' ? (
        <Modal transparent animationType="slide" visible={show} onRequestClose={() => setShow(false)}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShow(false)} />
          <View style={[styles.sheet, { backgroundColor: sheetBg, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: textPrimary }]} numberOfLines={1}>
                {label}
              </Text>
              <TouchableOpacity onPress={() => setShow(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={pickerDate}
              mode="date"
              display="spinner"
              maximumDate={maximumDate}
              minimumDate={minimumDate}
              onChange={handleChange}
              themeVariant={isDark ? 'dark' : 'light'}
              textColor={isDark ? '#FFFFFF' : '#0F172A'}
            />
          </View>
        </Modal>
      ) : (
        show && Platform.OS !== 'web' && (
          <DateTimePicker
            value={pickerDate}
            mode="date"
            display="default"
            maximumDate={maximumDate}
            minimumDate={minimumDate}
            onChange={handleChange}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.label, marginBottom: 8, marginTop: 14 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 50,
  },
  value: { fontSize: 15 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 14,
    paddingHorizontal: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 12 },
  doneText: { color: palette.primary, fontSize: 16, fontWeight: '800' },
});
