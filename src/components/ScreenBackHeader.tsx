import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { palette } from '../theme/tokens';

/**
 * In-content header — replaces the native navigation header (which can render
 * under the status bar on edge-to-edge Android). Renders the title (+ optional
 * back button) below the status bar with safe-area padding.
 */
export default function ScreenBackHeader({ title, onBack, showBack = true }: {
  title: string;
  onBack?: () => void;
  showBack?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const surface = isDark ? palette.darkSurfaceMuted : '#E6F0F5';
  return (
    <View style={[styles.row, { paddingTop: insets.top + 10 }]}>
      {showBack && (
        <TouchableOpacity
          onPress={onBack}
          style={[styles.backBtn, { backgroundColor: surface }]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={palette.primary} />
        </TouchableOpacity>
      )}
      <Text
        style={[styles.title, { color: isDark ? palette.darkTextPrimary : palette.textPrimary }]}
        numberOfLines={1}
      >
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '800', flex: 1 },
});
