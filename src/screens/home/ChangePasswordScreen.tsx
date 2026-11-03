import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert,
  ActivityIndicator, ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenBackHeader from '../../components/ScreenBackHeader';
import { useTheme } from '../../theme/ThemeContext';
import { palette, typography, radius, shadows } from '../../theme/tokens';
import apiClient from '../../api/client';

export default function ChangePasswordScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const [current, setCurrent] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const bg = isDark ? palette.darkBg : palette.background;
  const surface = isDark ? palette.darkSurface : palette.surface;
  const textPrimary = isDark ? palette.darkTextPrimary : palette.textPrimary;
  const textSecondary = isDark ? palette.darkTextSecondary : palette.textSecondary;
  const textTertiary = isDark ? palette.darkTextTertiary : palette.textTertiary;
  const border = isDark ? palette.darkBorder : palette.border;

  const inputStyle = [styles.input, { backgroundColor: surface, borderColor: border, color: textPrimary }];

  const handleChange = async () => {
    if (!current) return Alert.alert('Required', 'Enter your current password.');
    if (!newPwd || newPwd.length < 4) return Alert.alert('Required', 'New password must be at least 4 characters.');
    if (newPwd !== confirm) return Alert.alert('Mismatch', 'New password and confirmation do not match.');
    if (newPwd === current) return Alert.alert('Same password', 'New password must differ from the current one.');

    setLoading(true);
    try {
      const res = await apiClient.post('api/change-password', {
        current_password: current,
        new_password: newPwd,
      });
      if (res.data.status === 'success') {
        Alert.alert('Success', 'Password changed successfully.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        Alert.alert('Error', res.data.message || 'Could not change password.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Could not change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
    <ScreenBackHeader title="Change Password" onBack={() => navigation.goBack()} />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} automaticallyAdjustKeyboardInsets>
      <View style={[styles.card, { backgroundColor: surface }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { backgroundColor: palette.primarySoft }]}>
            <MaterialCommunityIcons name="key-change" size={22} color={palette.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: textPrimary }]}>Change Password</Text>
            <Text style={[styles.cardSub, { color: textSecondary }]}>
              Used for the mobile + password login option
            </Text>
          </View>
        </View>

        <Text style={[styles.label, { color: textSecondary }]}>Current Password</Text>
        <TextInput style={inputStyle} value={current} onChangeText={setCurrent} secureTextEntry={!showPwd} placeholder="Enter current password" placeholderTextColor={textTertiary} autoCapitalize="none" />

        <Text style={[styles.label, { color: textSecondary }]}>New Password</Text>
        <TextInput style={inputStyle} value={newPwd} onChangeText={setNewPwd} secureTextEntry={!showPwd} placeholder="Min 4 characters" placeholderTextColor={textTertiary} autoCapitalize="none" />

        <Text style={[styles.label, { color: textSecondary }]}>Confirm New Password</Text>
        <TextInput style={inputStyle} value={confirm} onChangeText={setConfirm} secureTextEntry={!showPwd} placeholder="Re-enter new password" placeholderTextColor={textTertiary} autoCapitalize="none" />

        <TouchableOpacity style={styles.showRow} onPress={() => setShowPwd((v) => !v)}>
          <MaterialCommunityIcons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={16} color={textSecondary} />
          <Text style={{ color: textSecondary, fontSize: 12.5, marginLeft: 6 }}>{showPwd ? 'Hide' : 'Show'} passwords</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.saveBtn, loading && { opacity: 0.7 }]} onPress={handleChange} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Change Password</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, padding: 20, ...shadows.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  iconBox: { width: 46, height: 46, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { ...typography.h3 },
  cardSub: { fontSize: 12.5, marginTop: 2 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 14 },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, height: 50 },
  showRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  saveBtn: { marginTop: 22, height: 50, borderRadius: radius.md, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
