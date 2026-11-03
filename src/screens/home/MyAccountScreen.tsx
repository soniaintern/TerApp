import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator,
  StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { navigateTo } from '../../utils/navigationRef';
import { profileApi } from '../../api';
import apiClient from '../../api/client';
import { useTheme } from '../../theme/ThemeContext';
import { palette, typography, radius, shadows } from '../../theme/tokens';

export default function MyAccountScreen() {
  const { user, logout, setUser } = useAuthStore();
  const { toggleTheme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [profileFetched, setProfileFetched] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const isSupervisor = Number(user?.is_supervisor) === 1 || user?.role === 'supervisor';
  // Dedicated approvers (L1/L2) only review — they cannot apply travel plans
  // or submit claims, so hide the submission-side entries for them.
  const approverOnly = isSupervisor;
  // Per-unit feature toggles — hide Travel Plan / DG Advance entries when disabled
  const travelEnabled = user?.features?.travel_plan_enabled ?? true;
  const dgEnabled = user?.features?.dg_advance_enabled ?? true;

  useEffect(() => { if (!profileFetched) fetchProfile(); }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try { const res = await profileApi.getProfile(); if (res.data?.user) setUser(res.data.user); } catch {} finally {
      setProfileFetched(true); setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => logout() },
    ]);
  };

  // App Store requirement — in-app account deletion (per Apple guideline).
  // Requires typing "delete my account" to enable the button.
  const deleteMatched = deleteConfirmText.trim().toLowerCase() === 'delete my account';

  const handleDeleteAccount = () => {
    setDeleteConfirmText('');
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteMatched || deleting) return;
    setDeleting(true);
    try {
      await apiClient.post('api/account/delete-request');
      setShowDeleteModal(false);
      Alert.alert('Account Deleted', 'Your account has been deleted. You are being logged out.', [{ text: 'OK', onPress: () => logout() }]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Could not process the deletion request.');
    } finally {
      setDeleting(false);
    }
  };

  const bg = isDark ? palette.darkBg : palette.background;
  const surface = isDark ? palette.darkSurface : palette.surface;
  const textPrimary = isDark ? palette.darkTextPrimary : palette.textPrimary;
  const textSecondary = isDark ? palette.darkTextSecondary : palette.textSecondary;
  const border = isDark ? palette.darkBorder : palette.border;

  const detailItems = [
    { icon: 'badge-account-horizontal-outline', label: 'Employee ID', value: user?.employee_id },
    { icon: 'briefcase-outline', label: 'Designation', value: user?.designation },
    { icon: 'office-building-outline', label: 'UNIT', value: user?.pfu },
    { icon: 'map-marker-outline', label: 'Location', value: user?.location },
    { icon: 'cellphone', label: 'Phone', value: user?.telephone_no },
    // Email shown only when the employee has one on record
    ...(user?.personal_email_id
      ? [{ icon: 'email-outline', label: 'Email', value: user?.personal_email_id }]
      : []),
  ];

  return (
    <>
    <ScrollView style={[styles.container, { backgroundColor: bg }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={isDark ? ['#0D2B3A', '#186E93'] : ['#186E93', '#13C7A8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <View pointerEvents="none" style={styles.headerBlob1} />
        <View pointerEvents="none" style={styles.headerBlob2} />
        <View style={styles.headerTopRow}>
          <Text style={styles.headerGreeting}>My Account</Text>
          {isSupervisor && (
            <View style={styles.supBadge}>
              <MaterialCommunityIcons name="shield-account" size={12} color="#E6FFF9" />
              <Text style={styles.supBadgeText}>Supervisor</Text>
            </View>
          )}
        </View>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            {loading ? (
              <ActivityIndicator color="#186E93" />
            ) : (
              <Image
                source={require('../../../assets/logo-mark.png')}
                style={styles.avatarLogo}
                resizeMode="contain"
              />
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user?.name || 'Loading...'}</Text>
            <Text style={styles.subText}>
              {user?.designation || ''}{user?.pfu ? ` · ${user.pfu}` : ''}
            </Text>
            <View style={styles.headerPills}>
              <View style={styles.headerPill}>
                <MaterialCommunityIcons name="briefcase-outline" size={12} color="#E6FFF9" />
                <Text style={styles.headerPillText}>Expense Reimbursement</Text>
              </View>
              {isSupervisor && user?.team_members_count !== undefined ? (
                <View style={styles.teamPill}>
                  <MaterialCommunityIcons name="account-group-outline" size={12} color="#FDE68A" />
                  <Text style={styles.teamPillText}>{user.team_members_count} team</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Employee Details */}
      <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
        <Text style={[styles.sectionTitle, { color: textSecondary }]}>Employee Details</Text>
        {detailItems.map((item, i) => (
          <View
            key={item.label}
            style={[
              styles.detailRow,
              i < detailItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: border },
            ]}
          >
            <View style={styles.detailLeft}>
              <View style={styles.detailIcon}>
                <MaterialCommunityIcons name={item.icon as any} size={17} color={palette.primary} />
              </View>
              <Text style={[styles.detailLabel, { color: textSecondary }]}>{item.label}</Text>
            </View>
            <Text style={[styles.detailValue, { color: textPrimary }]} numberOfLines={1}>
              {item.value || '--'}
            </Text>
          </View>
        ))}
      </View>

      {/* Settings */}
      <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
        <Text style={[styles.sectionTitle, { color: textSecondary }]}>Settings</Text>

        {!approverOnly && (
          <TouchableOpacity
            onPress={() => navigateTo('ClaimGuide')}
            style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: border }]}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <MaterialCommunityIcons name="school-outline" size={18} color={palette.primary} />
              </View>
              <Text style={[styles.settingLabel, { color: textPrimary }]}>How Claims Work</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={textSecondary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => navigateTo('ChangePassword')}
          style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: border }]}
        >
          <View style={styles.settingLeft}>
            <View style={styles.settingIcon}>
              <MaterialCommunityIcons name="key-change" size={18} color={palette.primary} />
            </View>
            <Text style={[styles.settingLabel, { color: textPrimary }]}>Change Password</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={textSecondary} />
        </TouchableOpacity>

        {!approverOnly && travelEnabled && (
          <TouchableOpacity
            onPress={() => navigateTo('TravelPlans')}
            style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: border }]}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <MaterialCommunityIcons name="map-marker-path" size={18} color={palette.primary} />
              </View>
              <Text style={[styles.settingLabel, { color: textPrimary }]}>Travel Plan</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={textSecondary} />
          </TouchableOpacity>
        )}

        {isSupervisor && !approverOnly && (
          <TouchableOpacity
            onPress={() => navigateTo('SupervisorPanel')}
            style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: border }]}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <MaterialCommunityIcons name="shield-account" size={18} color={palette.success} />
              </View>
              <Text style={[styles.settingLabel, { color: textPrimary }]}>Supervisor Panel</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={textSecondary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={toggleTheme} style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: border }]}>
          <View style={styles.settingLeft}>
            <View style={styles.settingIcon}>
              <MaterialCommunityIcons name={isDark ? 'weather-night' : 'white-balance-sunny'} size={18} color={palette.primary} />
            </View>
            <Text style={[styles.settingLabel, { color: textPrimary }]}>Dark Mode</Text>
          </View>
          <View style={[styles.toggle, isDark && styles.toggleActive]}>
            <View style={[styles.toggleKnob, isDark && styles.toggleKnobActive]} />
          </View>
        </TouchableOpacity>

        {/* Actions — collapsed by default so destructive options stay tucked away */}
        <TouchableOpacity
          onPress={() => setShowActions((s) => !s)}
          style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: border, marginTop: 4 }]}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, styles.logoutIcon]}>
              <MaterialCommunityIcons name="dots-horizontal-circle-outline" size={18} color={palette.error} />
            </View>
            <Text style={[styles.settingLabel, { color: palette.error }]}>Actions</Text>
          </View>
          <MaterialCommunityIcons name={showActions ? 'chevron-up' : 'chevron-down'} size={20} color={textSecondary} />
        </TouchableOpacity>

        {showActions && (
          <>
            <TouchableOpacity onPress={handleLogout} style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: border }]}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, styles.logoutIcon]}>
                  <MaterialCommunityIcons name="logout" size={18} color={palette.error} />
                </View>
                <Text style={[styles.settingLabel, { color: palette.error }]}>Logout</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleDeleteAccount} style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, styles.logoutIcon]}>
                  <MaterialCommunityIcons name="account-remove" size={18} color={palette.error} />
                </View>
                <Text style={[styles.settingLabel, { color: palette.error }]}>Delete Account</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={textSecondary} />
            </TouchableOpacity>
          </>
        )}
      </View>

      <Text style={[styles.version, { color: isDark ? palette.darkTextTertiary : palette.textTertiary }]}>
        TER App v1.0.0
      </Text>
    </ScrollView>

    {/* Delete Account — typed confirmation */}
    <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
      <KeyboardAvoidingView style={styles.deleteOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.deleteCard, { backgroundColor: surface }]}>
          <View style={styles.deleteIconWrap}>
            <MaterialCommunityIcons name="account-remove" size={26} color={palette.error} />
          </View>
          <Text style={[styles.deleteTitle, { color: textPrimary }]}>Delete Account</Text>
          <Text style={[styles.deleteMsg, { color: textSecondary }]}>
            This permanently deletes your account and personal data. You will no longer be able to log in. This action cannot be undone.
          </Text>
          <Text style={[styles.deleteMsg, { color: textSecondary }]}>
            Type <Text style={{ fontWeight: '700', color: textPrimary }}>delete my account</Text> to confirm:
          </Text>
          <TextInput
            style={[styles.deleteInput, { backgroundColor: surface, borderColor: border, color: textPrimary }]}
            value={deleteConfirmText}
            onChangeText={setDeleteConfirmText}
            placeholder="delete my account"
            placeholderTextColor={textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
          />
          <View style={styles.deleteActions}>
            <TouchableOpacity
              onPress={() => setShowDeleteModal(false)}
              style={[styles.deleteBtn, styles.cancelBtn, { borderColor: border }]}
            >
              <Text style={[styles.deleteBtnText, { color: textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={confirmDelete}
              disabled={!deleteMatched || deleting}
              style={[styles.deleteBtn, styles.confirmBtn, (!deleteMatched || deleting) && styles.confirmBtnDisabled]}
            >
              {deleting
                ? <ActivityIndicator color="#FFFFFF" size="small" />
                : <Text style={[styles.deleteBtnText, { color: '#FFFFFF' }]}>Delete Account</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingBottom: 32, paddingHorizontal: 20,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    overflow: 'hidden', position: 'relative',
  },
  headerBlob1: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    top: -55, right: -45,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerBlob2: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    bottom: -30, left: 24,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  headerTopRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16, position: 'relative',
  },
  headerGreeting: { ...typography.label, color: '#BFDBFE', textTransform: 'uppercase', letterSpacing: 1.2 },
  supBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4,
  },
  supBadgeText: { color: '#E6FFF9', fontSize: 11, fontWeight: '600' },
  profileRow: { flexDirection: 'row', alignItems: 'center', position: 'relative' },
  avatar: {
    // Opaque white plate so the solid brand mark reads on the teal header
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.75)',
    shadowColor: '#0B3A4A', shadowOpacity: 0.25, shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  avatarLogo: { width: 44, height: 52 },
  profileInfo: { marginLeft: 16, flex: 1 },
  name: { ...typography.h3, color: '#FFFFFF' },
  subText: { ...typography.caption, color: '#BFDBFE', marginTop: 2 },
  headerPills: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  headerPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4,
  },
  headerPillText: { color: '#E6FFF9', fontSize: 11, fontWeight: '600' },
  teamPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4,
  },
  teamPillText: { color: '#FDE68A', fontSize: 11, fontWeight: '600' },
  card: { marginHorizontal: 16, marginTop: 16, borderRadius: radius.xl, padding: 20, borderWidth: 1, ...shadows.sm },
  sectionTitle: { ...typography.label, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13 },
  detailLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  detailIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: palette.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  detailLabel: { ...typography.body, marginLeft: 10 },
  detailValue: { ...typography.bodyMedium, maxWidth: '55%', textAlign: 'right' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  settingLeft: { flexDirection: 'row', alignItems: 'center' },
  settingIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: palette.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  logoutIcon: { backgroundColor: palette.errorLight },
  settingLabel: { ...typography.bodyMedium },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: '#CBD5E1', justifyContent: 'center', paddingHorizontal: 2 },
  toggleActive: { backgroundColor: palette.primary },
  toggleKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', alignSelf: 'flex-start', elevation: 2 },
  toggleKnobActive: { alignSelf: 'flex-end' },
  version: { ...typography.caption, textAlign: 'center', marginVertical: 24 },

  // Delete Account typed-confirmation modal
  deleteOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  deleteCard: { width: '100%', maxWidth: 380, borderRadius: radius.xl, padding: 24, ...shadows.lg, alignItems: 'center' },
  deleteIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: palette.errorLight, alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  deleteTitle: { ...typography.h3, textAlign: 'center' },
  deleteMsg: { ...typography.body, textAlign: 'center', marginTop: 10 },
  deleteInput: {
    width: '100%', borderWidth: 1, borderRadius: radius.lg,
    paddingHorizontal: 14, paddingVertical: 12, marginTop: 16,
    fontSize: 14, textAlign: 'center',
  },
  deleteActions: { flexDirection: 'row', gap: 12, marginTop: 20, width: '100%' },
  deleteBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: radius.lg },
  cancelBtn: { borderWidth: 1 },
  confirmBtn: { backgroundColor: palette.error },
  confirmBtnDisabled: { opacity: 0.4 },
  deleteBtnText: { fontSize: 15, fontWeight: '700' },
});
