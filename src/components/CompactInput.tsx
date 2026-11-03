import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { palette, radius } from '../theme/tokens';

interface CompactInputProps extends TextInputProps {
  label: string;
  required?: boolean;
  /** Layout override — e.g. `{ flex: 1 }` to share a row with a PickerField. */
  style?: any;
}

/**
 * Text input matching PickerField's compact metrics (42px field, 12px label) so
 * a typed field can sit beside a picker in the same grid without the row
 * looking mismatched. The form's standard inputs are 50px — deliberately
 * denser here, because these fields are a grouped cluster.
 */
export default function CompactInput({ label, required, style, ...props }: CompactInputProps) {
  const { isDark } = useTheme();
  const border = isDark ? palette.darkBorder : palette.border;
  const bg = isDark ? palette.darkSurface : palette.surfaceMuted;
  const textPrimary = isDark ? palette.darkTextPrimary : palette.textPrimary;
  const textTertiary = isDark ? palette.darkTextTertiary : palette.textTertiary;

  return (
    <View style={[styles.wrapper, style]}>
      <Text style={[styles.label, { color: isDark ? palette.darkTextSecondary : palette.textSecondary }]}>
        {label}{required ? ' *' : ''}
      </Text>
      <TextInput
        {...props}
        placeholderTextColor={textTertiary}
        style={[styles.input, { color: textPrimary, backgroundColor: bg, borderColor: border }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: 10 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 5 },
  input: {
    borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12,
    fontSize: 14, height: 42,
  },
});
