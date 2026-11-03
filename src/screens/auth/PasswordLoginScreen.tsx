import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Image,
  ScrollView, Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import { palette, typography, radius } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import FormField from '../../components/FormField';
import DateField from '../../components/DateField';
import PrimaryButton from '../../components/PrimaryButton';

// DOB bounds — a date of birth can't be in the future, and 100 years back is a
// generous floor. Module scope so the Date objects aren't rebuilt every render.
const TODAY = new Date();
const EARLIEST_DOB = new Date(TODAY.getFullYear() - 100, 0, 1);

/**
 * Password + DOB login — alternative when the employee never received the OTP.
 * Mobile number must match a sender record, the password hash must match,
 * and the date of birth must match the one on file.
 * Styled to match the OTP login screen (same logo, card and theme colours).
 */
export default function PasswordLoginScreen({ navigation }: any) {
  const { setToken, setUser } = useAuthStore();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  // Shrink the logo while the keyboard is up so the card stays fully visible.
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const textPrimary = isDark ? palette.darkTextPrimary : palette.textPrimary;
  const textSecondary = isDark ? palette.darkTextSecondary : palette.textSecondary;

  const handleLogin = async () => {
    if (!phone || phone.length !== 10) return Alert.alert('Required', 'Enter your 10-digit mobile number.');
    if (!password) return Alert.alert('Required', 'Enter your password.');
    if (!dob) return Alert.alert('Required', 'Select your date of birth.');

    setLoading(true);
    try {
      const res = await authApi.loginPassword(phone, password, dob);
      if (res.data.status === 'success') {
        const { token, user } = res.data.data;
        setToken(token);
        setUser(user);
      } else {
        Alert.alert('Login failed', res.data.message || 'Invalid credentials.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Login failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isDark ? palette.darkBg : '#FFFFFF' }]}
      // Android needs a real behaviour here. With `undefined` RN renders a plain View
      // (its render() switches on `behavior`, so no case matches) and the screen falls
      // back to windowSoftInputMode="resize" — which Expo SDK 54's mandatory
      // edge-to-edge no longer applies, leaving DOB + Login stuck under the keyboard.
      // 'height' is what the rest of the app uses on Android.
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Decorative blobs — same as the OTP login screen */}
      <View style={styles.decorTop} pointerEvents="none">
        <LinearGradient
          colors={['#13C7A8', '#186E93']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.decorCircle}
        />
        <LinearGradient
          colors={['#0B5CFF', '#13C7A8']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.decorCircleSmall}
        />
      </View>

      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 8 }]}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialCommunityIcons name="arrow-left" size={24} color={textPrimary} />
      </TouchableOpacity>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.inner, keyboardOpen && styles.innerKeyboard]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Finfect logo — same asset as the OTP login / splash screen */}
        <Image
          source={require('../../../assets/logo.png')}
          style={[styles.logo, keyboardOpen && styles.logoSmall]}
          resizeMode="contain"
        />

        <Text style={[styles.subtitle, { color: textSecondary }, keyboardOpen && styles.subtitleCompact]}>
          Travel & Expense Reimbursement
        </Text>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: isDark ? palette.darkSurface : palette.surface }, keyboardOpen && styles.cardCompact]}>
          <Text style={[styles.cardTitle, { color: textPrimary }]}>
            Login with Password
          </Text>
          <Text style={[styles.cardSub, { color: textSecondary }]}>
            Didn't receive the OTP? Verify with your password and date of birth.
          </Text>

          <FormField
            label="Mobile Number"
            value={phone}
            onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, '').slice(0, 10))}
            keyboardType="number-pad"
            maxLength={10}
            placeholder="10-digit mobile number"
            icon={<MaterialCommunityIcons name="cellphone" size={22} color={isDark ? palette.darkTextTertiary : palette.textTertiary} />}
          />

          <Text style={[styles.label, { color: textSecondary }]}>Password</Text>
          <View style={[styles.pwdWrap, { backgroundColor: isDark ? palette.darkSurface : palette.surfaceMuted, borderColor: isDark ? palette.darkBorder : palette.border }]}>
            <TextInput
              style={[styles.pwdInput, { color: textPrimary }]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPwd}
              placeholder="Your password"
              placeholderTextColor={isDark ? palette.darkTextTertiary : palette.textTertiary}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPwd((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Native date picker instead of free text — avoids format typos, which
              are otherwise indistinguishable from a wrong date of birth. Emits
              yyyy-mm-dd, which the backend canonicalises via strtotime(). */}
          <View style={styles.dobWrap}>
            <DateField
              label="Date of Birth"
              value={dob}
              onChange={setDob}
              maximumDate={TODAY}
              minimumDate={EARLIEST_DOB}
              required
            />
          </View>
          <Text style={[styles.hint, { color: isDark ? palette.darkTextTertiary : palette.textTertiary }]}>
            Date of birth as registered with your company.
          </Text>

          <PrimaryButton
            title="Login"
            onPress={handleLogin}
            loading={loading}
            icon={<MaterialCommunityIcons name="lock" size={18} color="#FFFFFF" />}
          />

          <TouchableOpacity
            style={{ marginTop: 16, alignItems: 'center', padding: 8 }}
            onPress={() => navigation.goBack()}
          >
            <Text style={{ color: palette.primary, fontSize: 13.5, fontWeight: '600' }}>
              ← Back to OTP login
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  decorTop: { position: 'absolute', top: -80, right: -60, width: 220, height: 220 },
  decorCircle: { position: 'absolute', width: 220, height: 220, borderRadius: 110, opacity: 0.12 },
  decorCircleSmall: { position: 'absolute', top: 40, right: 30, width: 90, height: 90, borderRadius: 45, opacity: 0.16 },
  backBtn: { position: 'absolute', left: 12, zIndex: 10, padding: 6 },
  inner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 24 },
  // Keyboard open: flow from the top so the form scrolls above the keyboard
  innerKeyboard: { justifyContent: 'flex-start' },
  // Smaller than the OTP login (100×119) — this form has 3 fields and needs
  // more room for the card
  logo: { width: 100, height: 119, alignSelf: 'center' },
  // ~60% while the keyboard is open so the card still fits on screen
  logoSmall: { width: 90, height: 107 },
  subtitle: { ...typography.body, textAlign: 'center', marginTop: 14 },
  subtitleCompact: { marginTop: 6 },
  card: {
    marginTop: 28,
    borderRadius: radius.xl,
    padding: 24,
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  cardCompact: { marginTop: 14, paddingVertical: 16 },
  cardTitle: { ...typography.h3 },
  cardSub: { ...typography.caption, marginTop: 4, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  pwdWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 16,
  },
  pwdInput: { flex: 1, fontSize: 15, height: '100%' },
  // Replaces FormField's own marginBottom (16) so the hint + button spacing is
  // unchanged from before the field became a picker.
  dobWrap: { marginBottom: 16 },
  hint: { fontSize: 11.5, marginTop: -8, marginBottom: 18 },
});
