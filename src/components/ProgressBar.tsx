import React from 'react';
import { View, StyleSheet } from 'react-native';
import { palette, radius } from '../theme/tokens';

interface ProgressBarProps {
  progress: number; // 0-100
  color?: string;
  trackColor?: string;
  height?: number;
}

export default function ProgressBar({
  progress,
  color = palette.primary,
  trackColor = palette.border,
  height = 8,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, progress));
  return (
    <View style={[styles.track, { height, backgroundColor: trackColor }]}>
      <View
        style={[
          styles.fill,
          { width: `${clamped}%`, backgroundColor: clamped > 100 ? palette.error : color },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
