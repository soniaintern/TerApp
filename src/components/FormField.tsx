import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { palette, radius } from '../theme/tokens';

interface FormFieldProps extends TextInputProps {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
}

export default function FormField({ label, icon, error, ...props }: FormFieldProps) {
  const { isDark } = useTheme();
  const borderColor = error
    ? palette.error
    : isDark
      ? palette.darkBorder
      : palette.border;
  const bg = isDark ? palette.darkSurface : palette.surfaceMuted;
  const textColor = isDark ? palette.darkTextPrimary : palette.textPrimary;

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={[styles.label, { color: isDark ? palette.darkTextSecondary : palette.textSecondary }]}>
          {label}
        </Text>
      )}
      <View style={[styles.inputRow, { backgroundColor: bg, borderColor }]}>
        {icon && <View style={styles.icon}>{icon}</View>}
        <TextInput
          {...props}
          placeholderTextColor={isDark ? palette.darkTextTertiary : palette.textTertiary}
          style={[styles.input, { color: textColor }]}
        />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16, width: '100%' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 52,
  },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, height: '100%' },
  error: { color: palette.error, fontSize: 12, marginTop: 6 },
});
