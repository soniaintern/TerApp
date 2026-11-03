import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { palette, radius, shadows, typography } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

type Props = {
  visible: boolean;
  force: boolean; // true = blocking (no dismiss until updated)
  latestName: string;
  storeUrl: string | null;
  onClose: () => void;
};

/**
 * "New version available" prompt. Non-force prompts once/day and can be
 * dismissed ("Later"); force mode is blocking — user must open the store.
 */
export default function UpdatePrompt({ visible, force, latestName, storeUrl, onClose }: Props) {
  const { isDark } = useTheme();
  const surface = isDark ? palette.darkSurface : palette.surface;
  const textPrimary = isDark ? palette.darkTextPrimary : palette.textPrimary;
  const textSecondary = isDark ? palette.darkTextSecondary : palette.textSecondary;
  const border = isDark ? palette.darkBorder : palette.border;

  const openStore = () => {
    if (storeUrl) {
      Linking.openURL(storeUrl).catch(() => {});
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={force ? () => {} : onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
          <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : palette.primarySoft }]}>
            <MaterialCommunityIcons name="update" size={30} color={palette.primary} />
          </View>
          <Text style={[styles.title, { color: textPrimary }]}>New version available</Text>
          <Text style={[styles.msg, { color: textSecondary }]}>
            {force
              ? `TER App ${latestName} is now available. This version is required — please update to continue using the app.`
              : `TER App ${latestName} is now available on the store. Update for the latest features and fixes.`}
          </Text>
          <TouchableOpacity style={[styles.btn, { backgroundColor: palette.primary }]} onPress={openStore}>
            <Text style={styles.btnText}>Update Now</Text>
          </TouchableOpacity>
          {!force && (
            <TouchableOpacity style={styles.later} onPress={onClose}>
              <Text style={[styles.laterText, { color: textSecondary }]}>Later</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, borderRadius: radius.xl, padding: 24, alignItems: 'center', ...shadows.lg },
  iconWrap: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { ...typography.h3, marginBottom: 8 },
  msg: { fontSize: 13.5, textAlign: 'center', lineHeight: 20, marginBottom: 18 },
  btn: { width: '100%', borderRadius: radius.pill, paddingVertical: 13, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  later: { paddingVertical: 12, paddingHorizontal: 20, marginTop: 2 },
  laterText: { fontSize: 13.5, fontWeight: '600' },
});
