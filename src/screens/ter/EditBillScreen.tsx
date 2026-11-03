import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, Alert,
  ActivityIndicator, StyleSheet, Image, Platform, KeyboardAvoidingView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { optimizeImage } from '../../utils/imageOptimize';
import { billApi, terApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import PrimaryButton from '../../components/PrimaryButton';
import DateField from '../../components/DateField';
import ScreenBackHeader from '../../components/ScreenBackHeader';
import { useTheme } from '../../theme/ThemeContext';
import { palette, typography, radius } from '../../theme/tokens';
import { claimStartDay, periodOf, boundsFromEndMonth, periodLabel, dateKey, floorAtJoiningDate } from '../../utils/claimPeriod';
import { parseLastWorkingDate, capAtLastWorkingDay, lwdDayKey, formatLastWorkingDate } from '../../utils/lastWorkingDate';
import { S3_BASE } from '../../utils/constants';
import { appendFormFile } from '../../utils/formFile';
import { calculateDaClaimAmount, resolveDaPolicy } from '../../utils/daPolicy';

export default function EditBillScreen({ navigation, route }: any) {
  const { bill, categories, monthFrom, monthTo } = route.params || {};
  const { user } = useAuthStore();
  const isD2F = String(user?.pfu || '').trim().toUpperCase() === 'D2F';
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [vendor, setVendor] = useState(bill?.vendor_name || '');
  const [billNo, setBillNo] = useState(bill?.bill_no || '');
  const [billAmount, setBillAmount] = useState(() => {
    const n = Number(bill?.bill_amount);
    return Number.isFinite(n) && n > 0 ? String(Math.trunc(n)) : '';
  });
  const [claimedAmount, setClaimedAmount] = useState(() => {
    const n = Number(bill?.claimed_amount);
    return Number.isFinite(n) && n > 0 ? String(Math.trunc(n)) : '';
  });
  const [fromDate, setFromDate] = useState(bill?.from_date || '');
  const [toDate, setToDate] = useState(bill?.to_date || '');
  const [selectedCategory, setSelectedCategory] = useState(bill?.expense_categories_id || categories?.[0]?.id || 0);
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);

  // ---- Daily Allowance: day-marker edit (no bill photo) ----
  // Flag-driven (is_da on the category) so EVERY DA-related category gets the
  // day-marker form; name check kept as fallback for older payloads.
  const selectedCat = categories?.find((c: any) => String(c.id) === String(selectedCategory));
  const selectedCatName = (selectedCat?.name || '').toLowerCase();
  const isDA = Number(selectedCat?.is_da) === 1
    || selectedCatName.includes('da -')
    || selectedCatName.includes('daily allowance');
  const daBillPrefix = selectedCatName.includes('local market') ? 'DA-LM' : selectedCatName.includes('out of hq') ? 'DA-OOH' : 'DA';
  const daVendorName = selectedCat?.name || 'Daily Allowance';
  // Grid = the FULL claim period containing the bill (not just the saved
  // from→to range), so the employee can change any day of the period.
  const daBounds = (() => {
    const anchor = bill?.to_date ? new Date(`${bill.to_date}T00:00:00`) : new Date();
    const cur = periodOf(claimStartDay(user), anchor);
    return { from: cur.from, to: cur.to };
  })();
  const daDates: Date[] = [];
  {
    const dt = new Date(daBounds.from);
    while (dt <= daBounds.to) {
      daDates.push(new Date(dt));
      dt.setDate(dt.getDate() + 1);
    }
  }
  const daPolicy = resolveDaPolicy({
    unit: user?.pfu,
    designation: user?.designation,
    categoryName: selectedCatName,
    limitAmount: selectedCat?.limit_amount,
    maxDays: selectedCat?.max_days,
    periodDays: daDates.length,
  });
  const daRate = daPolicy.dailyRate;
  const MAX_DA_DAYS = daPolicy.maxDays;
  const [daDays, setDaDays] = useState<Set<string>>(() => {
    // Exact marked days stored in remarks (e.g. "2026-08-21,2026-08-22") — preferred.
    const s = new Set<string>();
    if (bill?.remarks) {
      bill.remarks.split(',').forEach((v: string) => {
        const key = v.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(key)) s.add(key);
      });
      if (s.size > 0) return s;
    }
    // Fallback for old bills: every date of the stored from→to range.
    const dt = new Date(daBounds.from);
    while (dt <= daBounds.to) {
      s.add(dateKey(dt.getFullYear(), dt.getMonth(), dt.getDate()));
      dt.setDate(dt.getDate() + 1);
    }
    return s;
  });
  // Days already claimed under the OTHER DA categories in this period — the
  // same day can't be marked in two DA categories (mirrors backend validation).
  const [daConflicts, setDaConflicts] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!isDA) {
      setDaConflicts(new Set());
      return;
    }
    let cancelled = false;
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    // Categories from navigation may only carry {id, name} — detect DA by name too.
    const others = (categories || []).filter((c: any) =>
      (Number(c.is_da) === 1
        || String(c?.name || '').toLowerCase().includes('da -')
        || String(c?.name || '').toLowerCase().includes('daily allowance'))
      && String(c.id) !== String(selectedCategory));
    (async () => {
      const merged = new Set<string>();
      for (const oc of others) {
        try {
          const res = await terApi.fetchBills(fmt(daBounds.from), fmt(daBounds.to), String(oc.id));
          for (const b of res.data.data || []) {
            for (const d of (b.remarks || '').split(',')) {
              const t = d.trim();
              if (!t) continue;
              if (/^\d{4}-\d{2}-\d{2}$/.test(t)) { merged.add(t); continue; }
              // legacy day-of-month numbers (e.g. "10") → date in this period
              const day = Number(t);
              if (day >= 1 && day <= 31) {
                const m = daDates.find((x) => x.getDate() === day);
                if (m) merged.add(dateKey(m.getFullYear(), m.getMonth(), m.getDate()));
              }
            }
          }
        } catch { /* network — backend still guards */ }
      }
      if (!cancelled) setDaConflicts(merged);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDA, selectedCategory]);
  // No future-day lock inside the claim period — the period's final day
  // (e.g. the 20th for 21st–20th cycles) stays selectable.
  const daDayDisabled = (key: string) => daConflicts.has(key);
  const toggleDaDay = (key: string) => {
    if (daDayDisabled(key)) return;
    setDaDays((prev) => {
      if (prev.has(key)) {
        const next = new Set(prev);
        next.delete(key);
        return next;
      }
      if (prev.size >= MAX_DA_DAYS) {
        Alert.alert('Limit reached', `You can mark up to ${MAX_DA_DAYS} DA days per period.`);
        return prev;
      }
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };
  const daSorted = [...daDays].sort();
  const daFrom = daSorted[0] || '';
  const daTo = daSorted[daSorted.length - 1] || '';
  const daAmount = calculateDaClaimAmount(daPolicy, daDays.size);

  const selectedCatLimit = categories?.find((c: any) => String(c.id) === String(selectedCategory));
  const shouldEnforceCategoryLimits = isD2F || (user?.enforcement_mode || 'A') === 'A';
  const isYearlyLimit = shouldEnforceCategoryLimits && selectedCatLimit?.limit_period === 'Y';
  const currentClaimAmount = Number(bill?.claimed_amount) || 0;
  const currentFyAmount = Number(bill?.claimed_amount) || 0;
  const usedAmount = isYearlyLimit
    ? Math.max(0, (Number(selectedCatLimit?.fy_used_amount) || 0) - currentFyAmount)
    : Math.max(0, (Number(selectedCatLimit?.claimed_amount) || 0) - currentClaimAmount);
  const configuredLimit = Number(selectedCatLimit?.limit_amount) || 0;
  const limitCap = shouldEnforceCategoryLimits && configuredLimit > 0
    ? Math.max(0, configuredLimit - usedAmount)
    : null;

  useEffect(() => {
    if (isDA || limitCap === null) return;
    const value = Number(claimedAmount) || 0;
    if (value > limitCap) setClaimedAmount(String(Math.floor(limitCap)));
  }, [isDA, limitCap, claimedAmount]);

  const handleClaimedChange = (text: string) => {
    const digits = text.replace(/\D/g, '');
    const value = Number(digits) || 0;
    setClaimedAmount(
      !isDA && limitCap !== null && value > 0
        ? String(Math.min(value, Math.floor(limitCap)))
        : digits
    );
  };

  // Claim window: current period + previous 3 periods (period-aware, matches backend rule).
  const claimWindowStart = (() => {
    const sd = claimStartDay(user);
    const cur = periodOf(sd, new Date());
    const backEnd = new Date(cur.endYear, cur.endMonth - 1 - 3, 1); // end month 3 periods back
    return boundsFromEndMonth(sd, backEnd.getMonth() + 1, backEnd.getFullYear()).from;
  })();

  // Locked to the selected month when opened from the TER month view.
  const monthMin = monthFrom ? new Date(`${monthFrom}T00:00:00`) : null;
  const monthMax = monthTo ? new Date(`${monthTo}T23:59:59`) : null;
  // No bill may predate the employee's date of joining (same rule as Add).
  const dateMin = floorAtJoiningDate(monthMin || claimWindowStart, user?.date_of_joining);
  // Max bill date = the current claim period's end (same rule as Add).
  // Resigned employees cannot claim an expense dated after their last working
  // date (same rule as Add — backend enforces it at API/BillItemController.php:148).
  const lwd = parseLastWorkingDate(user?.last_working_date);
  const dateMax = capAtLastWorkingDay(
    monthMax || periodOf(claimStartDay(user), new Date()).to,
    lwd,
  );

  const bg = isDark ? palette.darkBg : palette.background;
  const textPrimary = isDark ? palette.darkTextPrimary : palette.textPrimary;
  const textSecondary = isDark ? palette.darkTextSecondary : palette.textSecondary;
  const border = isDark ? palette.darkBorder : palette.border;
  const inputBg = isDark ? palette.darkSurfaceMuted : palette.surfaceMuted;

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) setImage({ ...result.assets[0], uri: await optimizeImage(result.assets[0].uri) });
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permission', 'Camera permission required.');
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) setImage({ ...result.assets[0], uri: await optimizeImage(result.assets[0].uri) });
  };

  const handleUpdate = async () => {
    if (shouldEnforceCategoryLimits && !isDA && limitCap !== null && Number(claimedAmount) > limitCap) {
      return Alert.alert(
        'Category limit exceeded',
        `Only ₹${limitCap.toLocaleString('en-IN')} remains for ${selectedCatLimit?.head_name || selectedCatLimit?.name || 'this category'}.`
      );
    }
    if (isDA && !daPolicy.configured) {
      return Alert.alert(
        'DA limit not configured',
        'The daily allowance rate is not configured for this category. Please ask your administrator to save the D2F category limit and refresh the TER screen.'
      );
    }
    // Daily Allowance: recompute from marked days (no bill photo).
    if (isDA) {
      if (daDays.size === 0) {
        return Alert.alert('Required', 'Mark at least one day for Daily Allowance.');
      }
      if (daDays.size > MAX_DA_DAYS) {
        return Alert.alert('DA limit exceeded', `Reduce the selection to ${MAX_DA_DAYS} DA days or fewer before saving.`);
      }
      setLoading(true);
      try {
        const formData = new FormData();
        formData.append('id', String(bill.id));
        formData.append('category', String(selectedCategory));
        formData.append('user_id', String(user?.id));
        formData.append('bill_no', billNo || `${daBillPrefix}-${daFrom.slice(0, 7)}`);
        formData.append('bill_amount', String(daAmount));
        formData.append('claimed_amount', String(daAmount));
        formData.append('from_date', daFrom);
        formData.append('to_date', daTo);
        formData.append('vendor_name', daVendorName);
        formData.append('remarks', [...daDays].sort().join(','));
        const res = await billApi.updateBill(formData);
        if (res.status === 'success') {
          Alert.alert('Success', 'Daily allowance updated successfully.', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        } else {
          Alert.alert('Error', res.message);
        }
      } catch (err: any) {
        Alert.alert('Error', err.response?.data?.message || 'Failed to update Daily Allowance.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!vendor || !billNo || !fromDate) {
      return Alert.alert('Required', 'Please fill all required fields.');
    }
    // Only whole numbers allowed — no decimals, commas or symbols.
    if (!/^\d+$/.test(String(billAmount).trim()) || !/^\d+$/.test(String(claimedAmount).trim())) {
      return Alert.alert('Invalid amount', 'Invoice amount and claimed amount must be whole numbers only (no decimals or symbols).');
    }
    if (!(Number(billAmount) > 0) || !(Number(claimedAmount) > 0)) {
      return Alert.alert('Invalid amount', 'Invoice amount and claimed amount must be greater than 0.');
    }
    // Claimed amount cannot exceed the bill amount (same rule as Add).
    if (Number(claimedAmount) > Number(billAmount)) {
      return Alert.alert('Invalid amount', 'Claimed amount cannot be greater than the invoice amount.');
    }
    // Hard guard: bill dates must be inside the month bracket or claim window.
    const fmtD = (d: Date) => d.toISOString().slice(0, 10);
    const chosen = toDate || fromDate;
    const exitKey = lwdDayKey(lwd);
    const pastExit = !!exitKey && chosen > exitKey;
    if (fromDate < fmtD(dateMin) || chosen > fmtD(dateMax)) {
      const msg = pastExit
        ? `Your last working date is ${formatLastWorkingDate(lwd)}. Invoices dated after it cannot be claimed.`
        : monthFrom
          ? `Invoice dates must fall within ${monthFrom} to ${monthTo} (the selected month).`
          : 'Invoices can only be added for the current month and the previous 3 months.';
      return Alert.alert('Date out of range', msg);
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('id', String(bill.id));
      formData.append('category', String(selectedCategory));
      formData.append('user_id', String(user?.id));
      formData.append('bill_no', billNo);
      formData.append('bill_amount', billAmount);
      formData.append('claimed_amount', claimedAmount);
      formData.append('from_date', fromDate);
      formData.append('to_date', toDate || fromDate);
      formData.append('vendor_name', vendor);
      if (image) {
        await appendFormFile(formData, 'attachment', { uri: image.uri, type: 'image/jpeg', name: image.fileName || 'bill.jpg' });
      }
      const res = await billApi.updateBill(formData);
      if (res.status === 'success') {
        Alert.alert('Success', 'Expense updated successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', res.message);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update invoice.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = [styles.input, { backgroundColor: inputBg, borderColor: border, color: textPrimary }];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
    <ScreenBackHeader title="Edit Expense" onBack={() => navigation.goBack()} />
    <ScrollView
      style={[styles.container, { backgroundColor: bg }]}
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <Text style={[styles.title, { color: textPrimary }]}>Edit Expense</Text>

      {!isDA && (<>
      <Text style={[styles.label, { color: textSecondary }]}>Vendor Name *</Text>
      <TextInput style={inputStyle} value={vendor} onChangeText={setVendor} placeholder="e.g. Hotel ABC" placeholderTextColor={isDark ? palette.darkTextTertiary : palette.textTertiary} />

      <Text style={[styles.label, { color: textSecondary }]}>Invoice No *</Text>
      <TextInput style={inputStyle} value={billNo} onChangeText={setBillNo} placeholder="e.g. INV-001" placeholderTextColor={isDark ? palette.darkTextTertiary : palette.textTertiary} />

      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={[styles.label, { color: textSecondary }]}>Invoice Amount *</Text>
          <View style={[styles.amountRow, { backgroundColor: inputBg, borderColor: border }]}>
            <Text style={[styles.amountSymbol, { color: textSecondary }]}>₹</Text>
            <TextInput style={[styles.amountInput, { color: textPrimary }]} value={billAmount} onChangeText={(t) => setBillAmount(t.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="0" placeholderTextColor={isDark ? palette.darkTextTertiary : palette.textTertiary} textAlign="right" />
          </View>
        </View>
        <View style={styles.half}>
          <Text style={[styles.label, { color: textSecondary }]}>Amount to be claimed *</Text>
          <View style={[styles.amountRow, { backgroundColor: inputBg, borderColor: border }]}>
            <Text style={[styles.amountSymbol, { color: textSecondary }]}>₹</Text>
            <TextInput style={[styles.amountInput, { color: textPrimary }]} value={claimedAmount} onChangeText={handleClaimedChange} keyboardType="number-pad" placeholder="0" placeholderTextColor={isDark ? palette.darkTextTertiary : palette.textTertiary} textAlign="right" />
          </View>
          {Number(claimedAmount) > Number(billAmount) && Number(billAmount) > 0 && (
            <Text style={{ color: '#DC2626', fontSize: 11, marginTop: 4 }}>Cannot exceed invoice amount</Text>
          )}
          {limitCap !== null && !isYearlyLimit && (
            <Text style={{ color: isD2F && Number(claimedAmount) > limitCap ? palette.error : textSecondary, fontSize: 11, marginTop: 4 }}>
              {Number(claimedAmount) > limitCap
                ? `Capped to remaining limit ₹${limitCap.toLocaleString('en-IN')}`
                : `Limit remaining: ₹${limitCap.toLocaleString('en-IN')}`}
            </Text>
          )}
        </View>
      </View>
      {isYearlyLimit && (
        <Text style={{ color: palette.warning, fontSize: 11.5, marginTop: 2 }}>
          FY remaining: ₹{limitCap?.toLocaleString('en-IN') ?? '0'}
          {selectedCatLimit?.max_days ? ` · ${selectedCatLimit.max_days} days/nights configured` : ''}
        </Text>
      )}

      <View style={styles.row}>
        <View style={styles.half}>
          <DateField label="From Date" value={fromDate} onChange={setFromDate} maximumDate={dateMax} minimumDate={dateMin} required />
        </View>
        <View style={styles.half}>
          <DateField
            label="To Date"
            value={toDate}
            onChange={setToDate}
            maximumDate={dateMax}
            minimumDate={fromDate ? new Date(`${fromDate}T00:00:00`) : dateMin}
          />
        </View>
      </View>

      <Text style={[styles.label, { color: textSecondary }]}>Replace Attachment</Text>
      <View style={styles.imageRow}>
        <TouchableOpacity style={[styles.imageBtn, { borderColor: border }]} onPress={takePhoto}>
          <MaterialCommunityIcons name="camera-outline" size={22} color={palette.primary} />
          <Text style={[styles.imageBtnText, { color: textSecondary }]}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.imageBtn, { borderColor: border }]} onPress={pickImage}>
          <MaterialCommunityIcons name="folder-image" size={22} color={palette.primary} />
          <Text style={[styles.imageBtnText, { color: textSecondary }]}>Gallery</Text>
        </TouchableOpacity>
      </View>

      {/* Existing uploaded attachment */}
      {!image && bill?.attachment ? (
        <View style={styles.existingWrap}>
          <Image source={{ uri: S3_BASE + bill.attachment }} style={styles.preview} resizeMode="cover" />
          <View style={styles.existingBadge}>
            <MaterialCommunityIcons name="check-decagram" size={14} color="#FFFFFF" />
            <Text style={styles.existingBadgeText}>Current attachment</Text>
          </View>
        </View>
      ) : null}

      {image && (
        <View style={styles.previewWrap}>
          <Image source={{ uri: image.uri }} style={styles.preview} />
          <TouchableOpacity style={styles.removeBtn} onPress={() => setImage(null)}>
            <MaterialCommunityIcons name="close" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
      </>)}

      {/* Daily Allowance: mark the days of the month (pre-filled from the bill) */}
      {isDA && (
        <View style={{ marginTop: 14 }}>
          <Text style={[styles.label, { color: textSecondary }]}>
            Mark DA Days — {periodLabel(claimStartDay(user), daBounds.to.getMonth() + 1, daBounds.to.getFullYear())}
          </Text>
          {/* Mini calendar: weekday names + only the claim-range days */}
          {(() => {
            const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const firstWeekday = daBounds.from.getDay(); // 0 = Sun
            const cells: (Date | null)[] = [
              ...Array.from({ length: firstWeekday }, () => null),
              ...daDates,
            ];
            const rows: (Date | null)[][] = [];
            for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
            return (
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {weekdayNames.map((w) => (
                    <Text key={w} style={{ width: 44, textAlign: 'center', fontSize: 11, fontWeight: '700', color: textSecondary }}>{w}</Text>
                  ))}
                </View>
                {rows.map((row, ri) => (
                  <View key={ri} style={{ flexDirection: 'row', gap: 8 }}>
                    {row.map((dt, ci) => {
                      if (dt === null) return <View key={`e${ci}`} style={{ width: 44, height: 44 }} />;
                      const key = dateKey(dt.getFullYear(), dt.getMonth(), dt.getDate());
                      const on = daDays.has(key);
                      const locked = daDayDisabled(key);
                      return (
                        <TouchableOpacity
                          key={key}
                          disabled={locked}
                          style={{
                            width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                            backgroundColor: on ? palette.primary : (isDark ? palette.darkSurfaceMuted : palette.surfaceMuted),
                            borderWidth: 1.5, borderColor: on ? palette.primary : border,
                            opacity: locked ? 0.35 : 1,
                          }}
                          onPress={() => toggleDaDay(key)}
                        >
                          <Text style={{ fontSize: 14, fontWeight: '700', color: on ? '#FFFFFF' : (locked ? (isDark ? palette.darkTextTertiary : palette.textTertiary) : textPrimary) }}>{dt.getDate()}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            );
          })()}
          <View style={[styles.daSummary, { backgroundColor: isDark ? palette.darkSurfaceMuted : palette.surfaceMuted }]}>
            <View style={styles.daSummaryRow}>
              <Text style={{ color: textSecondary, fontSize: 13 }}>Days marked</Text>
              <Text style={{ color: textPrimary, fontSize: 14, fontWeight: '700' }}>
                {daRate === null ? 'Rate not configured' : `${daDays.size} × ₹${daRate}/day`}
              </Text>
            </View>
            <View style={styles.daSummaryRow}>
              <Text style={{ color: textSecondary, fontSize: 13 }}>Daily Allowance</Text>
              <Text style={{ color: palette.primary, fontSize: 18, fontWeight: '800' }}>₹{daAmount}</Text>
            </View>
            {isDA && !daPolicy.configured && (
              <Text style={{ color: palette.error, fontSize: 11.5, marginTop: 6 }}>
                This D2F category has no valid monthly limit. Ask your administrator to configure it before saving.
              </Text>
            )}
            {isDA && isD2F && daPolicy.monthlyLimit !== null && daRate !== null && (
              <Text style={{ color: isDark ? palette.darkTextTertiary : palette.textTertiary, fontSize: 11.5, marginTop: 6 }}>
                Monthly limit ₹{daPolicy.monthlyLimit.toLocaleString('en-IN')} ÷ 30 days = ₹{daRate}/day
              </Text>
            )}
            <Text style={{ color: isDark ? palette.darkTextTertiary : palette.textTertiary, fontSize: 11.5, marginTop: 6 }}>
              {daDays.size > 0 ? `From ${daFrom} to ${daTo} · max ${MAX_DA_DAYS} days/period` : `Tap the days you travelled — max ${MAX_DA_DAYS} days/period.`}
            </Text>
            <Text style={{ color: isDark ? palette.darkTextTertiary : palette.textTertiary, fontSize: 11, marginTop: 3 }}>
              All days of this claim period are selectable (maximum {MAX_DA_DAYS} days).
            {daConflicts.size > 0 && (
              <Text style={{ color: palette.warning, fontSize: 11, marginTop: 3 }}>
                {daConflicts.size} day{daConflicts.size === 1 ? '' : 's'} already claimed under another DA category — not selectable.
              </Text>
            )}
            </Text>
          </View>
        </View>
      )}

      <PrimaryButton
        title={isDA ? 'Update Daily Allowance' : 'Update Expense'}
        onPress={handleUpdate}
        loading={loading}
        icon={<MaterialCommunityIcons name="content-save-edit-outline" size={18} color="#FFFFFF" />}
        style={{ marginTop: 28 }}
      />
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { ...typography.h2, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 14 },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, height: 50 },
  // Amount fields: ₹ prefix on the left, value right-aligned
  // minWidth:0 is required on web: without it the flex children keep their intrinsic
  // width, so the rupee symbol + input overflowed the field on narrow screens.
  amountRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, height: 50, width: '100%', minWidth: 0 },
  amountSymbol: { fontSize: 15, fontWeight: '700', marginRight: 6 },
  amountInput: { flex: 1, minWidth: 0, fontSize: 15, paddingVertical: 0, paddingHorizontal: 0, textAlign: 'right' },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1, minWidth: 0 },
  imageRow: { flexDirection: 'row', gap: 12 },
  imageBtn: { flex: 1, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: radius.lg, paddingVertical: 18, alignItems: 'center', gap: 6 },
  imageBtnText: { fontSize: 13, fontWeight: '600' },
  previewWrap: { marginTop: 12, position: 'relative' },
  existingWrap: { marginTop: 12, position: 'relative' },
  existingBadge: { position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(5,150,105,0.9)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  existingBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  preview: { width: '100%', height: 180, borderRadius: radius.lg, resizeMode: 'cover' },
  removeBtn: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  // DA multi-photo tiles
  daThumbWrap: { marginRight: 10, position: 'relative' },
  daThumb: { width: 76, height: 76, borderRadius: radius.md },
  daThumbRemove: {
    position: 'absolute', top: -6, right: -6,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: palette.error,
    alignItems: 'center', justifyContent: 'center',
  },
  daAddTile: {
    width: 76, height: 76, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', marginRight: 10, gap: 2,
  },
  daAddTileText: { fontSize: 11, fontWeight: '700' },
  daSummary: { marginTop: 14, borderRadius: radius.lg, padding: 14, gap: 6 },
  daSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
