import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';

// Custom SVG illustrations for empty states
export function EmptyBills({ width = 160, height = 130 }: { width?: number; height?: number }) {
  const { isDark } = useTheme();
  const primary = isDark ? '#3AA0C8' : '#186E93';
  const muted = isDark ? '#64748B' : '#94A3B8';
  const soft = isDark ? '#334155' : '#E2E8F0';

  return (
    <Svg width={width} height={height} viewBox="0 0 200 160">
      {/* Paper/document */}
      <G>
        <Rect x="60" y="15" width="80" height="105" rx="8" fill={soft} />
        <Rect x="68" y="23" width="64" height="89" rx="4" fill={isDark ? '#1E293B' : '#FFFFFF'} />
        {/* Lines */}
        <Rect x="76" y="38" width="48" height="5" rx="2.5" fill={muted} opacity="0.6" />
        <Rect x="76" y="52" width="40" height="5" rx="2.5" fill={muted} opacity="0.6" />
        <Rect x="76" y="66" width="44" height="5" rx="2.5" fill={muted} opacity="0.6" />
        <Rect x="76" y="80" width="36" height="5" rx="2.5" fill={muted} opacity="0.6" />
        {/* Stamp circle */}
        <Circle cx="120" cy="55" r="18" stroke={primary} strokeWidth="2.5" fill="none" opacity="0.5" />
        <Circle cx="120" cy="55" r="8" fill={primary} opacity="0.6" />
      </G>
      {/* Floating coins */}
      <Circle cx="45" cy="110" r="12" fill="#F59E0B" opacity="0.9" />
      <Circle cx="45" cy="110" r="7" fill="none" stroke="#B45309" strokeWidth="1.5" />
      <Circle cx="155" cy="105" r="10" fill="#10B981" opacity="0.9" />
      <Circle cx="155" cy="105" r="6" fill="none" stroke="#047857" strokeWidth="1.5" />
      <Circle cx="150" cy="38" r="8" fill="#8B5CF6" opacity="0.8" />
      {/* Sparkle */}
      <Path d="M30 30 L33 38 L41 41 L33 44 L30 52 L27 44 L19 41 L27 38 Z" fill={primary} opacity="0.8" />
      <Path d="M170 68 L172 73 L177 75 L172 77 L170 82 L168 77 L163 75 L168 73 Z" fill="#F59E0B" opacity="0.8" />
    </Svg>
  );
}

export function EmptySearch({ width = 160, height = 130 }: { width?: number; height?: number }) {
  const { isDark } = useTheme();
  const primary = isDark ? '#3AA0C8' : '#186E93';
  const soft = isDark ? '#334155' : '#E2E8F0';

  return (
    <Svg width={width} height={height} viewBox="0 0 200 160">
      {/* Magnifying glass */}
      <Circle cx="95" cy="75" r="35" fill="none" stroke={primary} strokeWidth="6" opacity="0.5" />
      <G stroke={primary} strokeWidth="6" strokeLinecap="round">
        <Path d="M120 100 L150 130" />
      </G>
      {/* Dashes inside */}
      <Path d="M80 62 h20 M80 74 h14 M80 86 h18" stroke={soft} strokeWidth="5" strokeLinecap="round" />
      {/* Documents beside */}
      <Rect x="145" y="55" width="30" height="38" rx="5" fill={soft} />
      <Rect x="150" y="62" width="20" height="3" rx="1.5" fill={isDark ? '#475569' : '#CBD5E1'} />
      <Rect x="150" y="70" width="16" height="3" rx="1.5" fill={isDark ? '#475569' : '#CBD5E1'} />
      <Rect x="150" y="78" width="18" height="3" rx="1.5" fill={isDark ? '#475569' : '#CBD5E1'} />
      {/* Sparkles */}
      <Path d="M35 40 L37 46 L43 48 L37 50 L35 56 L33 50 L27 48 L33 46 Z" fill="#F59E0B" opacity="0.9" />
      <Path d="M160 25 L161.5 29 L165.5 30.5 L161.5 32 L160 36 L158.5 32 L154.5 30.5 L158.5 29 Z" fill="#10B981" opacity="0.9" />
    </Svg>
  );
}

export function EmptyTrack({ width = 160, height = 130 }: { width?: number; height?: number }) {
  const { isDark } = useTheme();
  const primary = isDark ? '#3AA0C8' : '#186E93';
  const soft = isDark ? '#334155' : '#E2E8F0';

  return (
    <Svg width={width} height={height} viewBox="0 0 200 160">
      {/* Route path */}
      <Path
        d="M40 130 C60 100, 80 120, 100 90 S140 60, 160 35"
        fill="none"
        stroke={primary}
        strokeWidth="3"
        strokeDasharray="6 6"
        opacity="0.6"
      />
      {/* Location pins */}
      <Circle cx="40" cy="130" r="9" fill={primary} />
      <Path d="M40 121 L40 130 M40 139 L40 130" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      <Circle cx="160" cy="35" r="9" fill="#10B981" />
      <Path d="M160 26 L160 35 M160 44 L160 35" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      {/* Middle node */}
      <Circle cx="100" cy="90" r="7" fill="#F59E0B" opacity="0.9" />
      {/* Calendar */}
      <G>
        <Rect x="120" y="90" width="34" height="36" rx="6" fill={soft} />
        <Rect x="126" y="98" width="22" height="22" rx="3" fill={isDark ? '#1E293B' : '#FFFFFF'} />
        <Path d="M128 94 v-4 M144 94 v-4" stroke={isDark ? '#94A3B8' : '#64748B'} strokeWidth="2" strokeLinecap="round" />
        <Rect x="130" y="104" width="14" height="3" rx="1.5" fill={primary} opacity="0.7" />
        <Rect x="130" y="111" width="10" height="3" rx="1.5" fill={isDark ? '#475569' : '#CBD5E1'} />
      </G>
      <Path d="M30 30 L32 36 L38 38 L32 40 L30 46 L28 40 L22 38 L28 36 Z" fill="#8B5CF6" opacity="0.9" />
    </Svg>
  );
}

export function EmptyState({
  illustration,
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  illustration: React.ReactNode;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { isDark } = useTheme();
  return (
    <View style={styles.container}>
      {illustration}
      <Text style={[styles.title, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>{subtitle}</Text>
      {actionLabel && onAction && (
        <View style={styles.actionBtn} onTouchEnd={onAction}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 32 },
  title: { fontSize: 18, fontWeight: '600', marginTop: 20 },
  subtitle: { fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  actionBtn: {
    marginTop: 20,
    backgroundColor: '#186E93',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  actionText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});
