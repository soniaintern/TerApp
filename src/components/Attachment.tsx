import React from 'react';
import { ActivityIndicator, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { palette } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

/**
 * Static 44×44 attachment tile — deliberately makes NO network request.
 * Lists can hold many invoices, and eagerly loading every thumbnail makes the
 * screen crawl on mobile data. The image is fetched only when the user opens
 * the preview from the row, i.e. AttachmentPreviewModal.
 */
export function AttachmentTile({ icon = 'file-image-outline' }: { icon?: string }) {
  const { isDark } = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
      <MaterialCommunityIcons name={icon as any} size={19} color={palette.primary} />
    </View>
  );
}

/** Full-screen attachment viewer — loads the image on open, with its own spinner. */
export function AttachmentPreviewModal({ uri, onClose }: { uri: string | null; onClose: () => void }) {
  const [state, setState] = React.useState<'loading' | 'loaded' | 'error'>('loading');

  React.useEffect(() => {
    if (uri) setState('loading');
  }, [uri]);

  if (!uri) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.previewOverlay} activeOpacity={1} onPress={onClose}>
        <Image
          source={{ uri }}
          style={styles.previewImage}
          resizeMode="contain"
          onLoadStart={() => setState('loading')}
          onLoad={() => setState('loaded')}
          onError={() => setState('error')}
        />
        {state === 'loading' && <ActivityIndicator size="large" color="#FFFFFF" style={styles.previewSpinner} />}
        {state === 'error' && (
          <View style={styles.previewErrorBox}>
            <MaterialCommunityIcons name="alert-circle-outline" size={22} color="#FFFFFF" />
            <Text style={styles.previewErrorText}>Could not load the attachment</Text>
            <Text style={styles.previewErrorHint}>Tap anywhere to close</Text>
          </View>
        )}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  tile: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  previewImage: { width: '100%', height: '80%' },
  previewSpinner: { position: 'absolute' },
  previewErrorBox: { position: 'absolute', alignItems: 'center', paddingHorizontal: 24 },
  previewErrorText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginTop: 8 },
  previewErrorHint: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 3 },
  closeBtn: {
    position: 'absolute', top: 50, right: 20, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
});
