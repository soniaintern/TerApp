import React, { useEffect, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { palette, radius } from '../theme/tokens';

/**
 * react-native-web's Alert.alert is an empty no-op (`static alert() {}`),
 * so on the PWA every error/validation alert was silently dropped.
 * This module patches Alert.alert ON WEB ONLY and renders a themed modal.
 * Native builds keep the OS alert untouched.
 */

export type WebAlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type WebAlertSpec = {
  title?: string;
  message?: string;
  buttons?: WebAlertButton[];
};

let pending: WebAlertSpec | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function getSnapshot(): WebAlertSpec | null {
  return pending;
}

function dismiss() {
  pending = null;
  emit();
}

/** Patch Alert.alert on web only. Call once at app boot. */
export function installWebAlertPatch() {
  if (Platform.OS !== 'web') return;
  const original = Alert.alert.bind(Alert);
  (Alert as any).alert = (
    title?: string,
    message?: string,
    buttons?: WebAlertButton[],
  ) => {
    if (!title && !message) return;
    pending = { title, message, buttons };
    emit();
  };
  // keep a no-op reference so nothing else re-binds later
  void original;
}

/** Renders the pending alert. Mount once inside the app tree (web only). */
export function WebAlertHost() {
  const { isDark } = useTheme();
  const [spec, setSpec] = useState<WebAlertSpec | null>(null);

  useEffect(() => {
    const unsub = subscribe(() => setSpec(getSnapshot()));
    return unsub;
  }, []);

  if (Platform.OS !== 'web' || !spec) return null;

  const buttons: WebAlertButton[] =
    spec.buttons && spec.buttons.length > 0 ? spec.buttons : [{ text: 'OK' }];

  const handlePress = (b: WebAlertButton) => {
    dismiss();
    // run onPress after the modal closes so navigation/state updates aren't
    // blocked by the host's render lifecycle
    if (b.onPress) setTimeout(() => b.onPress?.(), 0);
  };

  const surface = isDark ? palette.darkSurface : palette.surface;
  const textPrimary = isDark ? palette.darkTextPrimary : palette.textPrimary;
  const textSecondary = isDark ? palette.darkTextSecondary : palette.textSecondary;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: surface }]}>
          {/* Long messages (e.g. the Claim TER category summary) must stay fully
              readable on short viewports, so the body scrolls inside the card. */}
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {spec.title ? (
              <Text style={[styles.title, { color: textPrimary }]}>{spec.title}</Text>
            ) : null}
            {spec.message ? (
              <Text style={[styles.message, { color: textSecondary }]}>{spec.message}</Text>
            ) : null}
          </ScrollView>
          <View style={styles.btnRow}>
            {buttons.map((b, i) => {
              const destructive = b.style === 'destructive';
              const cancel = b.style === 'cancel';
              const isPrimary = !cancel && (buttons.length === 1 || i === buttons.length - 1);
              const label = b.text || 'OK';
              return (
                <Pressable
                  key={i}
                  onPress={() => handlePress(b)}
                  style={[
                    styles.btn,
                    isPrimary
                      ? { backgroundColor: palette.primary }
                      : { backgroundColor: destructive ? '#DC2626' : palette.surfaceMuted },
                  ]}
                >
                  <Text
                    style={[
                      styles.btnText,
                      { color: isPrimary || destructive ? '#FFFFFF' : textPrimary },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '100%',
    borderRadius: radius.xl,
    padding: 22,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  body: { flexShrink: 1 },
  bodyContent: { paddingBottom: 0 },
  title: { fontSize: 17, fontWeight: '800', marginBottom: 8 },
  message: { fontSize: 14.5, lineHeight: 21, marginBottom: 18 },
  btnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  btn: {
    minWidth: 84,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  btnText: { fontSize: 14.5, fontWeight: '700' },
});
