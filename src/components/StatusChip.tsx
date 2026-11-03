import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TER_STATUS_MAP } from '../utils/constants';

const STATUS_STYLES: Record<string, { bg: string; fg: string; dot: string }> = {
  '5': { bg: '#D1FAE5', fg: '#065F46', dot: '#059669' },
  '3': { bg: '#D9EEF5', fg: '#125A79', dot: '#186E93' },
  '14': { bg: '#E0F7F5', fg: '#0B6B5B', dot: '#13C7A8' },
  '0': { bg: '#FEE2E2', fg: '#991B1B', dot: '#DC2626' },
  '8': { bg: '#FEE2E2', fg: '#991B1B', dot: '#DC2626' },
  '13': { bg: '#FEE2E2', fg: '#991B1B', dot: '#DC2626' },
  '7': { bg: '#FEF3C7', fg: '#92400E', dot: '#D97706' },
  '4': { bg: '#F3E8FF', fg: '#6B21A8', dot: '#9333EA' },
  '12': { bg: '#EDE9FE', fg: '#5B21B6', dot: '#7C3AED' },
  '9': { bg: '#F1F5F9', fg: '#475569', dot: '#64748B' },
};

const DEFAULT_STYLE = { bg: '#F1F5F9', fg: '#475569', dot: '#64748B' };

export default function StatusChip({ status }: { status: string | null | undefined }) {
  if (!status) return null;
  const label = TER_STATUS_MAP[status] || 'Unknown';
  const s = STATUS_STYLES[status] || DEFAULT_STYLE;

  return (
    <View style={[styles.chip, { backgroundColor: s.bg }]}>
      <View style={[styles.dot, { backgroundColor: s.dot }]} />
      <Text style={[styles.label, { color: s.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  label: { fontSize: 12, fontWeight: '600' },
});
