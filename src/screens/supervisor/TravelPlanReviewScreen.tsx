import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { terApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import ScreenBackHeader from '../../components/ScreenBackHeader';
import { useTheme } from '../../theme/ThemeContext';
import { palette, typography, radius, shadows } from '../../theme/tokens';
import type { TravelPlan } from '../../types/api';

type ActionModal = 'none' | 'reject' | 'return';

const MODE_ICON: Record<string, string> = {
  bus: 'bus', train: 'train', car: 'car', flight: 'airplane', other: 'dots-horizontal',
};

export default function TravelPlanReviewScreen({ navigation, route }: any) {
  const { plan_id, employee_name, month } = route.params || {};
  const { isDark } = useTheme();

  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [modal, setModal] = useState<ActionModal>('none');
  const [remarks, setRemarks] = useState('');

  const bg = isDark ? palette.darkBg : palette.background;
  const surface = isDark ? palette.darkSurface : palette.surface;
  const textPrimary = isDark ? palette.darkTextPrimary : palette.textPrimary;
  const textSecondary = isDark ? palette.darkTextSecondary : palette.textSecondary;
  const border = isDark ? palette.darkBorder : palette.border;

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await terApi.travelPlanDetail(plan_id);
      if (res.data.status === 'success') {
        setPlan(res.data.data);
      } else {
        setPlan(null);
      }
    } catch (err: any) {
      if (err.response?.status === 401) useAuthStore.getState().logout();
      else setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [plan_id]);

  useFocusEffect(
    useCallback(() => {
      fetchDetail();
    }, [fetchDetail])
  );

  const handleActionError = (err: any) => {
    if (err.response?.status === 422) {
      Alert.alert('Already Processed', err.response?.data?.message || 'This travel plan was already reviewed.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      return;
    }
    if (err.response?.status === 403) {
      Alert.alert('Not Your Team', err.response?.data?.message || 'Employee is not a member of your team.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      return;
    }
    Alert.alert('Error', err.response?.data?.message || 'Something went wrong.');
  };

  const handleApprove = () => {
    Alert.alert('Approve Travel Plan', `Approve the ${month} travel plan of ${employee_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          setActing(true);
          try {
            const res = await terApi.supervisorTravelPlanApprove(plan_id);
            if (res.data.status === 'success') {
              Alert.alert('Approved', res.data.message || 'Travel plan approved.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } else {
              Alert.alert('Error', res.data.message);
            }
          } catch (err: any) {
            handleActionError(err);
          } finally {
            setActing(false);
          }
        },
      },
    ]);
  };

  const submitModalAction = async (action: 'reject' | 'return') => {
    if (!remarks.trim()) return;
    setActing(true);
    try {
      const res = action === 'reject'
        ? await terApi.supervisorTravelPlanReject(plan_id, remarks.trim())
        : await terApi.supervisorTravelPlanReturn(plan_id, remarks.trim());

      if (res.data.status === 'success') {
        setModal('none');
        setRemarks('');
        Alert.alert(
          action === 'reject' ? 'Rejected' : 'Returned',
          action === 'reject'
            ? 'Travel plan rejected with remarks.'
            : 'Travel plan returned to the employee for modification.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', res.data.message);
      }
    } catch (err: any) {
      handleActionError(err);
    } finally {
      setActing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <ScreenBackHeader title="Review Travel Plan" onBack={() => navigation.goBack()} />
      {!plan ? (
        loading ? null : (
        <View style={styles.loadingBox}>
          <Text style={{ color: textSecondary }}>Travel plan not found.</Text>
        </View>
        )
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
            {/* Summary */}
            <View style={[styles.summaryCard, { backgroundColor: surface, borderColor: border }]}>
              <View style={styles.summaryHeader}>
                <View style={[styles.avatar, { backgroundColor: palette.primarySoft }]}>
                  <Text style={[styles.avatarText, { color: palette.primary }]}>
                    {(employee_name || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.summaryName, { color: textPrimary }]}>{employee_name}</Text>
                  <Text style={[styles.summaryMeta, { color: textSecondary }]}>
                    {month} · {plan.items.length} item(s) · Submitted {plan.submitted_at ? plan.submitted_at.slice(0, 10) : '—'}
                  </Text>
                </View>
              </View>

              <View style={[styles.summaryRow, { borderTopColor: border }]}>
                <View>
                  <Text style={[styles.summaryLabel, { color: textSecondary }]}>Days</Text>
                  <Text style={[styles.summaryPeriod, { color: textPrimary }]}>{plan.items.length}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.summaryLabel, { color: textSecondary }]}>Stays</Text>
                  <Text style={[styles.summaryPeriod, { color: textPrimary }]}>
                    {plan.items.filter((it) => it.type === 'stay').length}
                  </Text>
                </View>
              </View>
            </View>

            {/* Items */}
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Itinerary ({plan.items.length})</Text>

            {plan.items.map((item, i) => {
              const isStay = item.type === 'stay';
              const nights =
                isStay && item.date && item.check_out
                  ? Math.max(
                      1,
                      Math.round(
                        (new Date(`${item.check_out}T00:00:00`).getTime() -
                          new Date(`${item.date}T00:00:00`).getTime()) /
                          86400000
                      )
                    )
                  : 0;
              return (
                <View key={i} style={[styles.itemCard, { backgroundColor: surface, borderColor: border }]}>
                  <View style={styles.itemHead}>
                    <MaterialCommunityIcons
                      name={isStay ? 'bed' : ((MODE_ICON[(item.mode || '').toLowerCase()] || MODE_ICON.other) as any)}
                      size={18}
                      color={palette.primary}
                    />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[styles.itemTitle, { color: textPrimary }]}>
                        {isStay ? item.hotel_name : `${item.from} → ${item.to}`}
                      </Text>
                      <Text style={[styles.itemMeta, { color: textSecondary }]}>
                        {isStay
                          ? `${item.date} → ${item.check_out} · ${nights} night${nights > 1 ? 's' : ''}`
                          : `${item.date} · ${item.mode}${item.km ? ` · ${item.km} km` : ''}`}
                      </Text>
                    </View>
                  </View>
                  {item.purpose ? (
                    <Text style={[styles.itemPurpose, { color: textSecondary }]}>Purpose: {item.purpose}</Text>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>

          {/* Actions */}
          <View style={[styles.actionBar, { backgroundColor: surface, borderTopColor: border }]}>
            <TouchableOpacity
              style={[styles.rejectBtn, { borderColor: palette.error }]}
              disabled={acting}
              onPress={() => { setRemarks(''); setModal('reject'); }}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="close" size={17} color={palette.error} />
              <Text style={[styles.rejectBtnText, { color: palette.error }]}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.returnBtn, { borderColor: '#7C3AED' }]}
              disabled={acting}
              onPress={() => { setRemarks(''); setModal('return'); }}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="arrow-u-left-top" size={17} color="#7C3AED" />
              <Text style={[styles.rejectBtnText, { color: '#7C3AED' }]}>Return</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.approveBtn} disabled={acting} onPress={handleApprove} activeOpacity={0.8}>
              {acting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                  <Text style={styles.approveBtnText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Remarks modal (reject / return) */}
          <Modal visible={modal !== 'none'} transparent animationType="slide">
            <KeyboardAvoidingView
              style={styles.modalOverlay}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <View style={[styles.modalSheet, { backgroundColor: surface }]}>
                <View style={styles.modalHandle} />
                <Text style={[styles.modalTitle, { color: textPrimary }]}>
                  {modal === 'reject' ? 'Reject Travel Plan' : 'Return for Modification'}
                </Text>
                <Text style={[styles.modalSub, { color: textSecondary }]}>
                  {modal === 'reject'
                    ? 'Remarks are mandatory — shown to the employee with the rejection.'
                    : 'Mention the required changes — the employee will modify and resubmit.'}
                </Text>
                <TextInput
                  style={[styles.remarksInput, { backgroundColor: bg, color: textPrimary, borderColor: border }]}
                  placeholder={modal === 'reject' ? 'Enter rejection remarks…' : 'Enter the changes required…'}
                  placeholderTextColor={palette.textTertiary}
                  value={remarks}
                  onChangeText={setRemarks}
                  multiline
                  autoFocus
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalCancelBtn, { borderColor: border }]}
                    onPress={() => { setModal('none'); setRemarks(''); }}
                  >
                    <Text style={[styles.modalCancelText, { color: textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalConfirmBtn,
                      { backgroundColor: modal === 'reject' ? palette.error : '#7C3AED' },
                      !remarks.trim() && { opacity: 0.5 },
                    ]}
                    disabled={!remarks.trim() || acting}
                    onPress={() => { if (modal !== 'none') submitModalAction(modal); }}
                  >
                    {acting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalConfirmText}>
                        {modal === 'reject' ? 'Reject Plan' : 'Return for Changes'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summaryCard: { borderRadius: radius.lg, padding: 16, borderWidth: 1, ...shadows.sm },
  summaryHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700' },
  summaryName: { fontSize: 16, fontWeight: '700' },
  summaryMeta: { fontSize: 12, marginTop: 2 },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    borderTopWidth: 1, marginTop: 12, paddingTop: 12,
  },
  summaryLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryPeriod: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  sectionTitle: { ...typography.h3, marginTop: 18, marginBottom: 10 },
  itemCard: { borderRadius: radius.lg, padding: 14, marginBottom: 12, borderWidth: 1, ...shadows.sm },
  itemHead: { flexDirection: 'row', alignItems: 'center' },
  itemTitle: { fontSize: 14, fontWeight: '700' },
  itemMeta: { fontSize: 12, marginTop: 2 },
  itemPurpose: { fontSize: 12, marginTop: 8, lineHeight: 17 },
  actionBar: {
    flexDirection: 'row', gap: 10, padding: 14, paddingBottom: 26,
    borderTopWidth: 1, ...shadows.lg,
  },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    borderRadius: radius.pill, paddingVertical: 12, borderWidth: 1.5,
  },
  rejectBtnText: { fontSize: 14, fontWeight: '700' },
  returnBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    borderRadius: radius.pill, paddingVertical: 12, borderWidth: 1.5,
  },
  approveBtn: {
    flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: radius.pill, paddingVertical: 12, backgroundColor: palette.success,
  },
  approveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl,
    padding: 20, paddingBottom: 40,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { ...typography.h3, textAlign: 'center' },
  modalSub: { fontSize: 13, textAlign: 'center', marginTop: 6, marginBottom: 14, lineHeight: 18 },
  remarksInput: {
    minHeight: 90, borderRadius: radius.md, borderWidth: 1,
    padding: 12, fontSize: 14, textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  modalCancelBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.pill, paddingVertical: 12, borderWidth: 1,
  },
  modalCancelText: { fontSize: 14, fontWeight: '600' },
  modalConfirmBtn: {
    flex: 1.4, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.pill, paddingVertical: 12,
  },
  modalConfirmText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
