import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
  StyleSheet, Image, ScrollView, Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { authApi } from '../../api';
import FormField from '../../components/FormField';
import PrimaryButton from '../../components/PrimaryButton';
import { useTheme } from '../../theme/ThemeContext';
import { palette, typography, radius } from '../../theme/tokens';

export default function LoginScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // While the keyboard is up, shrink the logo + tighten spacing so the whole
  // card stays visible without the logo being pushed off the top.
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const handleSendOtp = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await authApi.sendOtp(cleaned);
      if (res.data.status === 'success') {
        navigation.navigate('Otp', { phone: cleaned });
      } else {
        Alert.alert('Error', res.data.message || 'Failed to send OTP.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Unable to connect.');
    } finally {
      setLoading(false);
    }
  };

  const textPrimary = isDark ? palette.darkTextPrimary : palette.textPrimary;
  const textSecondary = isDark ? palette.darkTextSecondary : palette.textSecondary;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isDark ? palette.darkBg : '#FFFFFF' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Decorative blobs in the Finfect logo's green → blue gradient */}
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

      {/* Scrollable: centered when idle, top-aligned when the keyboard is open
          so nothing gets clipped under it — content scrolls into view. */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.inner, keyboardOpen && styles.innerKeyboard]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Finfect logo — same asset as the splash screen */}
        <Image
          source={require('../../../assets/logo.png')}
          style={[styles.logo, keyboardOpen && styles.logoSmall]}
          resizeMode="contain"
        />

        <Text style={[styles.subtitle, { color: textSecondary }, keyboardOpen && styles.subtitleCompact]}>Travel & Expense Reimbursement</Text>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: isDark ? palette.darkSurface : palette.surface }, keyboardOpen && styles.cardCompact]}>
          <Text style={[styles.cardTitle, { color: textPrimary }]}>
            Login with Mobile Number
          </Text>
          <Text style={[styles.cardSub, { color: textSecondary }]}>
            We'll send a one-time password to verify
          </Text>

          <FormField
            label="Mobile Number"
            value={phone}
            onChangeText={(t) => setPhone(t.replace(/\D/g, ''))}
            keyboardType="phone-pad"
            maxLength={10}
            placeholder="Enter mobile number"
            error={error}
            icon={<MaterialCommunityIcons name="cellphone" size={22} color={isDark ? palette.darkTextTertiary : palette.textTertiary} />}
          />

          <PrimaryButton
            title="Send OTP"
            onPress={handleSendOtp}
            loading={loading}
            icon={<MaterialCommunityIcons name="send" size={18} color="#FFFFFF" />}
          />

          <TouchableOpacity
            style={{ marginTop: 16, alignItems: 'center', padding: 8 }}
            onPress={() => navigation.navigate('PasswordLogin')}
          >
            <Text style={{ color: palette.primary, fontSize: 13.5, fontWeight: '600' }}>
              Didn't receive the OTP? Login with password
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
  inner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 24 },
  // Keyboard open: flow from the top so the form scrolls above the keyboard
  innerKeyboard: { justifyContent: 'flex-start' },
  // Same logo asset as the splash screen (220×261 → 150×178, contained)
  logo: { width: 150, height: 178, alignSelf: 'center' },
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
  footer: { ...typography.caption, textAlign: 'center', marginTop: 24 },
});
