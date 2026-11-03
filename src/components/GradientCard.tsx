import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients, radius, shadows, typography } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

interface GradientCardProps {
  children: React.ReactNode;
  colors?: readonly [string, string, ...string[]];
  style?: any;
}

export default function GradientCard({ children, colors, style }: GradientCardProps) {
  const { isDark } = useTheme();
  const defaultColors = isDark ? gradients.heroDark : gradients.hero;
  return (
    <LinearGradient
      colors={colors ? [...colors] : [...defaultColors]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, shadows.lg, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    padding: 20,
  },
});
