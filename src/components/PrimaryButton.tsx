import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { radius, shadows, typography } from '../theme/tokens';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  variant?: 'primary' | 'outline' | 'ghost';
  style?: any;
}

export default function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
  icon,
  variant = 'primary',
  style,
}: PrimaryButtonProps) {
  const { isDark } = useTheme();

  if (variant === 'outline') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        style={[
          styles.btn,
          {
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: isDark ? '#3AA0C8' : '#186E93',
          },
          disabled && styles.disabled,
          style,
        ]}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color={isDark ? '#3AA0C8' : '#186E93'} />
        ) : (
          <View style={styles.content}>
            {icon}
            <Text style={[styles.text, { color: isDark ? '#3AA0C8' : '#186E93' }]}>{title}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  if (variant === 'ghost') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        style={[styles.btn, { backgroundColor: 'transparent' }, style]}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator color={isDark ? '#94A3B8' : '#64748B'} />
        ) : (
          <View style={styles.content}>
            {icon}
            <Text style={[styles.text, { color: isDark ? '#94A3B8' : '#64748B' }]}>{title}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.btn, disabled && styles.disabled, style]}
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={disabled ? ['#7FB8CE', '#7FB8CE'] : ['#186E93', '#13C7A8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: radius.lg }]}
      />
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.text, { color: '#FFFFFF' }]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadows.sm,
  },
  disabled: { opacity: 0.6 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 16, fontWeight: '700', marginLeft: 8 },
});
