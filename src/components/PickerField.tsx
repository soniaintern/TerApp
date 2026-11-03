import React, { useMemo, useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { palette, radius } from '../theme/tokens';

interface PickerFieldProps {
  label: string;
  value?: string;
  placeholder?: string;
  options: string[];
  onSelect: (option: string) => void;
  /** Field is not ready — a parent level hasn't been chosen yet. */
  disabled?: boolean;
  /** Options are being fetched. */
  loading?: boolean;
  /** Shown in the sheet when the fetch returned nothing. */
  emptyText?: string;
  required?: boolean;
  /** Layout override — e.g. `{ flex: 1 }` to sit two pickers in one row. */
  style?: any;
}

// A long list (any Indian sub-district can hold hundreds of villages) is
// unusable without filtering, but a search box on a 12-item state list is just
// noise — so it appears only when it earns its place.
const SEARCH_THRESHOLD = 15;

export default function PickerField({
  label, value, placeholder, options, onSelect,
  disabled, loading, emptyText, required, style,
}: PickerFieldProps) {
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const border = isDark ? palette.darkBorder : palette.border;
  const bg = isDark ? palette.darkSurface : palette.surfaceMuted;
  const surface = isDark ? palette.darkSurface : palette.surface;
  const textPrimary = isDark ? palette.darkTextPrimary : palette.textPrimary;
  const textTertiary = isDark ? palette.darkTextTertiary : palette.textTertiary;

  const searchable = options.length > SEARCH_THRESHOLD;
  const shown = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query, searchable]);

  const close = () => { setOpen(false); setQuery(''); };

  return (
    <View style={[styles.wrapper, style]}>
      <Text style={[styles.label, { color: isDark ? palette.darkTextSecondary : palette.textSecondary }]}>
        {label}{required ? ' *' : ''}
      </Text>

      <TouchableOpacity
        activeOpacity={0.7}
        disabled={disabled || loading}
        onPress={() => setOpen(true)}
        style={[styles.field, { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.55 : 1 }]}
      >
        <Text
          numberOfLines={1}
          style={[styles.fieldText, { color: value ? textPrimary : textTertiary }]}
        >
          {value || placeholder || 'Select'}
        </Text>
        {loading
          ? <ActivityIndicator size="small" color={palette.primary} />
          : <MaterialCommunityIcons name="chevron-down" size={18} color={textTertiary} />}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={close}>
          <View style={[styles.sheet, { backgroundColor: surface }]}>
            <Text style={[styles.sheetTitle, { color: textPrimary }]}>{label}</Text>

            {searchable && (
              <View style={[styles.searchRow, { borderColor: border, backgroundColor: bg }]}>
                <MaterialCommunityIcons name="magnify" size={18} color={textTertiary} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search…"
                  placeholderTextColor={textTertiary}
                  autoCorrect={false}
                  style={[styles.searchInput, { color: textPrimary }]}
                />
                {!!query && (
                  <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialCommunityIcons name="close-circle" size={16} color={textTertiary} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            <ScrollView style={styles.list} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {shown.length === 0 ? (
                <Text style={[styles.empty, { color: textTertiary }]}>
                  {options.length === 0
                    ? (emptyText || 'No options available.')
                    : 'No match for that search.'}
                </Text>
              ) : shown.map((opt) => {
                const selected = opt === value;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={styles.option}
                    onPress={() => { onSelect(opt); close(); }}
                  >
                    <Text
                      style={[styles.optionText, { color: selected ? palette.primary : textPrimary }, selected && { fontWeight: '700' }]}
                    >
                      {opt}
                    </Text>
                    {selected && <MaterialCommunityIcons name="check" size={18} color={palette.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {searchable && (
              <Text style={[styles.count, { color: textTertiary }]}>
                {shown.length} of {options.length}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: 10 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 5 },
  field: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, height: 42,
  },
  // minWidth: 0 — same react-native-web constraint as the amount fields: a flex
  // child with text won't shrink below its content unless minWidth is reset.
  fieldText: { flex: 1, minWidth: 0, fontSize: 14, marginRight: 4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 24 },
  sheet: { borderRadius: radius.lg, paddingVertical: 8, overflow: 'hidden' },
  sheetTitle: { fontSize: 15, fontWeight: '700', paddingHorizontal: 16, paddingVertical: 12 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 12, marginBottom: 6, paddingHorizontal: 12,
    borderWidth: 1, borderRadius: radius.md, height: 42,
  },
  searchInput: { flex: 1, minWidth: 0, fontSize: 15, height: '100%' },
  list: { maxHeight: 340 },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  optionText: { flex: 1, minWidth: 0, fontSize: 15, marginRight: 8 },
  empty: { fontSize: 14, paddingHorizontal: 16, paddingVertical: 24, textAlign: 'center' },
  count: { fontSize: 12, textAlign: 'center', paddingVertical: 8 },
});
