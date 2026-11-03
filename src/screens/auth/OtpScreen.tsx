import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform,
  Alert, StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import PrimaryButton from '../../components/PrimaryButton';
import { useTheme } from '../../theme/ThemeContext';
import { palette, typography, radius } from '../../theme/tokens';

/**
 * Resend countdown — isolated in its own component so the 1-second tick
 * re-renders ONLY this row, not the whole screen (OTP inputs stay stable,
 * preventing keyboard/focus flicker).
 */
function ResendRow({ isDark, onResend }: { isDark: boolean; onResend: () => Promise<boolean> }) {
  const [timer, setTimer] = useState(30);

  useEffect(() => {
    const interval = setInterval(() => setTimer((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleResend = async () => {
    if (await onResend()) setTimer(30);
  };

  const secondary = isDark ? palette.darkTextSecondary : palette.textSecondary;

  return (
    <View style={styles.resendRow}>
      <Text style={{ color: secondary }}>Didn't receive the code? </Text>
      {timer > 0 ? (
        <Text style={{ color: secondary, fontWeight: '600' }}>Resend in {timer}s</Text>
      ) : (
        <TouchableOpacity onPress={handleResend}>
          <Text style={styles.resendLink}>Resend OTP</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function OtpScreen({ navigation, route }: any) {
  const { phone } = route.params;
  const { setToken, setUser } = useAuthStore();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  // Stable ref callback — inline arrows would detach/reattach the inputs on
  // every re-render (React 19), causing focus + keyboard flicker.
  const setInputRef = useCallback((i: number) => (ref: TextInput | null) => {
    inputs.current[i] = ref;
  }, []);

  const handleChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 3) inputs.current[index + 1]?.focus();
    if (text && index === 3) verifyOtp(newOtp.join(''));
  };

  const handleKey = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) inputs.current[index - 1]?.focus();
  };

  const verifyOtp = async (code?: string) => {
    const finalOtp = code || otp.join('');
    if (finalOtp.length !== 4) return;
    setLoading(true);
    try {
      const res = await authApi.verifyOtp(phone, finalOtp);
      if (res.data.status === 'success') {
        const { token, user } = res.data.data;
        setToken(token);
        setUser(user);
      } else {
        Alert.alert('Error', res.data.message || 'Invalid OTP.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async (): Promise<boolean> => {
    try {
      setLoading(true);
      await authApi.sendOtp(phone);
      setOtp(['', '', '', '']);
      inputs.current[0]?.focus();
      return true;
    } catch {
      Alert.alert('Error', 'Failed to resend OTP.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const borderColor = isDark ? palette.darkBorder : palette.border;
  const textColor = isDark ? palette.darkTextPrimary : palette.textPrimary;
  const textSecondary = isDark ? palette.darkTextSecondary : palette.textSecondary;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isDark ? palette.darkBg : palette.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <View style={[styles.header, { top: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={isDark ? palette.darkTextPrimary : palette.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.iconWrap}>
          <LinearGradient colors={['#13C7A8', '#186E93']} style={styles.iconCircle}>
            <MaterialCommunityIcons name="shield-check-outline" size={34} color="#FFFFFF" />
          </LinearGradient>
        </View>

        <Text style={[styles.title, { color: textColor }]}>Verify OTP</Text>
        <Text style={[styles.subtitle, { color: textSecondary }]}>
          Enter the 4-digit code sent to{'\n'}
          <Text style={styles.phone}>+91 {phone}</Text>
        </Text>

        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={setInputRef(i)}
              style={[
                styles.otpBox,
                { borderColor, color: textColor, backgroundColor: isDark ? palette.darkSurface : palette.surfaceMuted },
                digit && { borderColor: palette.primary, borderWidth: 1.5 },
              ]}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(t) => handleChange(t, i)}
              onKeyPress={({ nativeEvent }) => handleKey(nativeEvent.key, i)}
            />
          ))}
        </View>

        <PrimaryButton
          title="Verify & Continue"
          onPress={() => verifyOtp()}
          loading={loading}
          icon={<MaterialCommunityIcons name="check-circle-outline" size={18} color="#FFFFFF" />}
          style={styles.verifyBtn}
        />

        <ResendRow isDark={isDark} onResend={resendOtp} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  header: { position: 'absolute', left: 24 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconWrap: { alignItems: 'center', marginBottom: 20 },
  iconCircle: { width: 76, height: 76, borderRadius: 22, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#186E93', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10 },
  title: { ...typography.h2, textAlign: 'center' },
  subtitle: { ...typography.body, textAlign: 'center', marginTop: 8, lineHeight: 24 },
  phone: { fontWeight: '700', color: palette.primary },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 32, marginBottom: 8 },
  otpBox: { width: 58, height: 64, borderRadius: radius.md, borderWidth: 1, textAlign: 'center', fontSize: 26, fontWeight: '700' },
  verifyBtn: { marginTop: 28 },
  resendRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  resendLink: { color: palette.primary, fontWeight: '700' },
});
