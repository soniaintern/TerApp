import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import UpdatePrompt from '../../components/UpdatePrompt';
import { checkForUpdate, shouldPromptToday, markPromptedToday } from '../../utils/updateCheck';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import { navigateTo } from '../../utils/navigationRef';
import { palette, typography, radius, shadows } from '../../theme/tokens';
import {
  TerClaimIllustration,
  TravelPlanIllustration,
  TrackTerIllustration,
  SupervisorIllustration,

} from '../../components/CardIllustrations';

interface QuickLink {
  key: string;
  label: string;
  subtitle: string;
  bg: string;
  onPress: () => void;
}

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const firstName = user?.name?.split(' ')[0] || 'there';

  const isSupervisor = user?.is_supervisor === 1;
  // Per-unit feature toggles — opt-in: cards show ONLY when the backend
  // explicitly enables them (unconfigured units see neither)
  const travelEnabled = user?.features?.travel_plan_enabled === true;
  const dgEnabled = user?.features?.dg_advance_enabled === true;

  // In-app "update available" prompt — checked once per app open (throttled to
  // once per day); force mode (installed < minimum) cannot be dismissed.
  const [updateState, setUpdateState] = useState<{ force: boolean; latestName: string; storeUrl: string | null } | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const result = await checkForUpdate();
        if (!mounted || !result || result.status === 'up-to-date') return;
        if (result.status === 'force') {
          setUpdateState({ force: true, latestName: result.latestName, storeUrl: result.storeUrl });
          return;
        }
        // Dev builds (Expo Go): show every open for easy testing; release builds
        // are throttled to once per day via shouldPromptToday.
        if (__DEV__ || await shouldPromptToday()) {
          setUpdateState({ force: false, latestName: result.latestName, storeUrl: result.storeUrl });
          if (!__DEV__) await markPromptedToday();
        }
      } catch {
        // never block the home screen on the check itself
      }
    })();
    return () => { mounted = false; };
  }, []);

  const links: QuickLink[] = [
    {
      key: 'ter', label: 'TER Claim', subtitle: 'Monthly expense claim',
      bg: '#E7F2F8',
      onPress: () => navigateTo('TerTab'),
    },
    ...(travelEnabled
      ? [{
          key: 'travel', label: 'Travel Plan', subtitle: 'Plan your travel',
          bg: '#E9F1F6',
          onPress: () => navigateTo('TravelPlans'),
        } as QuickLink]
      : []),
    {
      key: 'track', label: 'Track TER', subtitle: 'Follow your claim',
      bg: '#FDF3E3',
      onPress: () => navigation.navigate('TrackTab'),
    },
    ...(isSupervisor
      ? [{
          key: 'sup', label: 'Supervisor Panel', subtitle: 'Approve team requests',
          bg: '#EDE9FE',
          onPress: () => navigateTo('SupervisorPanel'),
        } as QuickLink]
      : []),
    ...(dgEnabled
      ? [{
          key: 'dg', label: 'DG Advance', subtitle: 'Field activity advance',
          bg: '#E8F2EF',
          onPress: () => navigateTo('DgAdvance'),
        } as QuickLink]
      : []),
  ];

  const CARD_ART: Record<string, React.ReactNode> = {
    ter: <TerClaimIllustration size={64} />,
    travel: <TravelPlanIllustration size={64} />,
    track: <TrackTerIllustration size={64} />,
    sup: <SupervisorIllustration size={64} />,
    dg: <MaterialCommunityIcons name="cash-multiple" size={60} color="#0E9F6E" />,
  };

  const surface = isDark ? palette.darkSurface : palette.surface;
  const border = isDark ? palette.darkBorder : palette.border;
  const textPrimary = isDark ? palette.darkTextPrimary : palette.textPrimary;
  const textSecondary = isDark ? palette.darkTextSecondary : palette.textSecondary;
  const textTertiary = isDark ? palette.darkTextTertiary : palette.textTertiary;
  const bg = isDark ? palette.darkBg : palette.background;

  return (
    <>
    <ScrollView
      style={[styles.container, { backgroundColor: bg }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Brand header — Finfect green → blue gradient */}
      <LinearGradient
        colors={['#13C7A8', '#186E93']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 18 }]}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerGreeting}>{greeting},</Text>
            <Text style={styles.headerName}>{firstName}</Text>
            <Text style={styles.headerDate}>{today}</Text>
          </View>
          <View style={styles.headerAvatar}>
            {/* App icon / brand mark instead of the user's initials */}
            <Image
              source={require('../../../assets/logo-mark.png')}
              style={styles.headerAvatarLogo}
              resizeMode="contain"
            />
          </View>
        </View>
        <View style={styles.headerPillRow}>
          <View style={styles.headerPill}>
            <MaterialCommunityIcons name="briefcase-outline" size={13} color="#E6FFF9" />
            <Text style={styles.headerPillText}>Expense Reimbursement</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <Text style={[styles.sectionTitle, { color: textPrimary }]}>Quick Actions</Text>
        <View style={styles.grid}>
          {links.map((link) => (
            <TouchableOpacity
              key={link.key}
              style={[styles.card, { backgroundColor: surface, borderColor: border }]}
              activeOpacity={0.8}
              onPress={link.onPress}
            >
              {/* Full-width tinted illustration panel */}
              <View style={[styles.cardArtPanel, { backgroundColor: link.bg }]}>
                <View pointerEvents="none" style={styles.panelBlobLarge} />
                <View pointerEvents="none" style={styles.panelBlobSmall} />
                {CARD_ART[link.key]}
              </View>
              <View style={styles.cardBody}>
                <Text style={[styles.cardLabel, { color: textPrimary }]} numberOfLines={1}>
                  {link.label}
                </Text>
                <View style={styles.cardSubRow}>
                  <Text style={[styles.cardSub, { color: textSecondary }]} numberOfLines={2}>
                    {link.subtitle}
                  </Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={textTertiary} />
                </View>
              </View>
            </TouchableOpacity>
          ))}

        </View>

        {/* Travel promo banner — full width, mint, matches illustration-home.png */}
        <View style={styles.travelBanner}>
          <View style={styles.travelBannerText}>
            <Text style={styles.travelBannerTitle}>Travel made simple</Text>
            <Text style={styles.travelBannerSub}>
              Plan, claim and track every rupee on the move.
            </Text>
          </View>
          <Image
            source={require('../../../assets/illustration-home.png')}
            style={styles.travelBannerImg}
            resizeMode="cover"
          />
        </View>

        {/* How-claims-work teaser → full guide */}
        <TouchableOpacity
          style={[styles.guideCard, { backgroundColor: surface, borderColor: border }]}
          activeOpacity={0.8}
          onPress={() => navigateTo('ClaimGuide')}
        >
          <View style={styles.guideCardHead}>
            <View style={[styles.guideCardIcon, { backgroundColor: palette.primarySoft }]}>
              <MaterialCommunityIcons name="school-outline" size={18} color={palette.primary} />
            </View>
            <Text style={[styles.guideCardTitle, { color: textPrimary }]}>How claims work</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={textTertiary} />
          </View>
          {/* Mini 4-step strip */}
          <View style={styles.guideSteps}>
            <View pointerEvents="none" style={[styles.guideStepsTrack, { backgroundColor: border }]} />
            {[
              { label: 'Add invoices' },
              { label: 'Submit' },
              { label: 'Review' },
              { label: 'Paid' },
            ].map((s, i) => (
              <View key={s.label} style={styles.guideStep}>
                <View
                  style={[styles.guideStepDot, i === 3
                    ? { backgroundColor: palette.successLight, borderColor: palette.success }
                    : { backgroundColor: palette.primaryLight, borderColor: palette.primary }]}
                >
                  <Text style={[styles.guideStepNum, { color: i === 3 ? palette.success : palette.primary }]}>
                    {i + 1}
                  </Text>
                </View>
                <Text style={[styles.guideStepLabel, { color: textSecondary }]}>{s.label}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.guideCardSub, { color: textSecondary }]}>
            See the full step-by-step claim guide
          </Text>
        </TouchableOpacity>

        <View style={[styles.tipCard, { backgroundColor: surface, borderColor: border }]}>
          <MaterialCommunityIcons name="lightbulb-on-outline" size={20} color={palette.primary} />
          <Text style={[styles.tipText, { color: textSecondary }]}>
            Submit your TER bills for last month before the 3rd of this month to keep approvals on track.
          </Text>
        </View>
      </View>
    </ScrollView>

    {/* New-version prompt (soft once/day, blocking when forced) */}
    <UpdatePrompt
      visible={updateState !== null}
      force={updateState?.force ?? false}
      latestName={updateState?.latestName ?? ''}
      storeUrl={updateState?.storeUrl ?? null}
      onClose={() => setUpdateState(null)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 22,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerGreeting: { color: '#D7FFF5', fontSize: 14, fontWeight: '600' },
  headerName: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', marginTop: 2 },
  headerDate: { color: '#E0F7F1', fontSize: 12, marginTop: 6 },
  headerAvatar: {
    width: 60, height: 60, borderRadius: 30,
    // Opaque white plate + solid brand mark: the full-colour mark is a teal/blue
    // gradient whose green half only reached 2.8:1 on the old mint plate, so it
    // read as a smudge on the teal header.
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.75)',
    shadowColor: '#0B3A4A', shadowOpacity: 0.25, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  headerAvatarLogo: { width: 37, height: 44 },
  headerPillRow: { marginTop: 14 },
  headerPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5,
  },
  headerPillText: { color: '#E6FFF9', fontSize: 12, fontWeight: '600' },
  body: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: { ...typography.h3, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  card: {
    width: '48%',
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.sm,
  },
  cardArtPanel: {
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  panelBlobLarge: {
    position: 'absolute',
    width: 92, height: 92, borderRadius: 46,
    top: -32, right: -26,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  panelBlobSmall: {
    position: 'absolute',
    width: 46, height: 46, borderRadius: 23,
    bottom: -16, left: 10,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  cardBody: { padding: 12 },
  cardLabel: { fontSize: 14.5, fontWeight: '700' },
  cardSubRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 3,
  },
  cardSub: { flex: 1, fontSize: 11, lineHeight: 14.5, marginRight: 4 },
  travelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#C4E8DC',
    backgroundColor: '#E8F5EC',
    overflow: 'hidden',
  },
  travelBannerText: {
    flex: 1,
    paddingLeft: 16,
    paddingVertical: 16,
  },
  travelBannerTitle: { fontSize: 17, fontWeight: '800', color: '#1E6F53' },
  travelBannerSub: {
    fontSize: 12,
    color: '#3E7A63',
    marginTop: 4,
    lineHeight: 17,
  },
  travelBannerImg: { width: 136, height: 116 },
  guideCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 14,
    marginTop: 16,
    ...shadows.sm,
  },
  guideCardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  guideCardIcon: {
    width: 34, height: 34, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  guideCardTitle: { flex: 1, fontSize: 15, fontWeight: '700' },
  guideSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    position: 'relative',
  },
  guideStepsTrack: {
    position: 'absolute',
    top: 10,
    left: 14,
    right: 14,
    height: 2,
    borderRadius: 1,
  },
  guideStep: { alignItems: 'center', width: 64 },
  guideStepDot: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  guideStepNum: { fontSize: 11, fontWeight: '800' },
  guideStepLabel: { fontSize: 10.5, marginTop: 5 },
  guideCardSub: { fontSize: 11.5, marginTop: 12, lineHeight: 16 },
  tipCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: radius.lg, borderWidth: 1,
    padding: 14, marginTop: 20,
  },
  tipText: { flex: 1, fontSize: 12, lineHeight: 17 },
});
