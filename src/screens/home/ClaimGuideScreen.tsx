import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenBackHeader from '../../components/ScreenBackHeader';
import { useTheme } from '../../theme/ThemeContext';
import { palette, radius, shadows } from '../../theme/tokens';
import {
  AddBillIllustration,
  SubmitClaimIllustration,
  ReviewClaimIllustration,
  TrackPaidIllustration,
} from '../../components/GuideIllustrations';

interface Step {
  n: number;
  title: string;
  desc: string;
  color: string;
  soft: string;
  chips: string[];
  art: React.ReactNode;
}

const STEPS: Step[] = [
  {
    n: 1,
    title: 'Add your invoices',
    desc: 'Open TER, pick a month, open a category and tap Add New. Upload a clear photo of each invoice and enter the vendor, invoice number, amount and dates.',
    color: '#186E93',
    soft: '#E3F2FB',
    chips: ['Photo attachment', 'Category limit', '₹ amounts'],
    art: <AddBillIllustration size={58} />,
  },
  {
    n: 2,
    title: 'Submit for approval',
    desc: 'Once your invoices are in, tap Submit for Approval. Your invoices lock and go to your supervisor\u2019s queue. No UNID is generated at this point.',
    color: '#0FA98F',
    soft: '#E0F6F0',
    chips: ['Invoices locked', 'Sent to supervisor'],
    art: <SubmitClaimIllustration size={58} />,
  },
  {
    n: 3,
    title: 'Supervisor reviews',
    desc: 'Your supervisor checks every invoice and attachment. Approve \u2192 a UNID is generated and your claim enters tracking. Reject \u2192 a reason is given and your invoices unlock.',
    color: '#7C3AED',
    soft: '#F1EBFE',
    chips: ['Approve \u2192 UNID', 'Reject \u2192 rectify'],
    art: <ReviewClaimIllustration size={58} />,
  },
  {
    n: 4,
    title: 'Track & get paid',
    desc: 'Follow your claim by UNID through the pipeline. Once paid, you can see the UTR number and the bank account it was credited to.',
    color: '#059669',
    soft: '#E3F5EC',
    chips: ['UNID tracking', 'UTR on payment'],
    art: <TrackPaidIllustration size={58} />,
  },
];

const PIPELINE = [
  { label: 'UNID generated', icon: 'link-variant' as const, color: '#0D9488' },
  { label: 'Received', icon: 'inbox-arrow-down' as const, color: '#D97706' },
  { label: 'Processing', icon: 'handshake-outline' as const, color: '#7C3AED' },
  { label: 'Sent to Accounts', icon: 'send-outline' as const, color: '#0284C7' },
  { label: 'Paid (UTR)', icon: 'check-decagram' as const, color: '#059669' },
];

const TIPS = [
  'Claim only for the current or previous 3 months.',
  'Keep invoice photos clear \u2014 unreadable invoices get rejected.',
  'A rejection always comes with a reason; fix and resubmit.',
  'Payment details (UTR, bank) appear under Track TER.',
];

export default function ClaimGuideScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const surface = isDark ? palette.darkSurface : palette.surface;
  const border = isDark ? palette.darkBorder : palette.border;
  const textPrimary = isDark ? palette.darkTextPrimary : palette.textPrimary;
  const textSecondary = isDark ? palette.darkTextSecondary : palette.textSecondary;
  const bg = isDark ? palette.darkBg : palette.background;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
    <ScreenBackHeader title="How Claims Work" onBack={() => navigation.goBack()} />
    <ScrollView
      style={[styles.container, { backgroundColor: bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <LinearGradient
        colors={['#186E93', '#13C7A8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroTitle}>Your claim, step by step</Text>
        <Text style={styles.heroSub}>
          From adding a bill to getting paid — the complete TER journey in 4 steps.
        </Text>
      </LinearGradient>

      {/* Steps */}
      {STEPS.map((step) => (
        <View
          key={step.n}
          style={[styles.stepCard, { backgroundColor: surface, borderColor: border }]}
        >
          <View style={styles.stepHead}>
            <View style={[styles.stepNum, { backgroundColor: step.soft }]}>
              <Text style={[styles.stepNumText, { color: step.color }]}>{step.n}</Text>
            </View>
            <View style={[styles.stepArt, { backgroundColor: step.soft }]}>{step.art}</View>
          </View>
          <Text style={[styles.stepTitle, { color: textPrimary }]}>{step.title}</Text>
          <Text style={[styles.stepDesc, { color: textSecondary }]}>{step.desc}</Text>
          <View style={styles.chipRow}>
            {step.chips.map((chip) => (
              <View key={chip} style={[styles.chip, { backgroundColor: step.soft }]}>
                <Text style={[styles.chipText, { color: step.color }]}>{chip}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      {/* Reject / rectify loop */}
      <View style={[styles.loopCard, { backgroundColor: surface, borderColor: border }]}>
        <View style={[styles.loopIcon, { backgroundColor: '#FEF3C7' }]}>
          <MaterialCommunityIcons name="refresh" size={22} color="#D97706" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.loopTitle, { color: textPrimary }]}>Rejected? No problem.</Text>
          <Text style={[styles.loopText, { color: textSecondary }]}>
            Your bills unlock — edit them, resubmit, and the claim goes straight back to the top of your supervisor's queue.
          </Text>
        </View>
      </View>

      {/* Status pipeline */}
      <View style={[styles.pipeCard, { backgroundColor: surface, borderColor: border }]}>
        <View style={styles.sectionRow}>
          <MaterialCommunityIcons name="map-marker-path" size={18} color={palette.primary} />
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>After approval \u2014 where your claim goes</Text>
        </View>
        {PIPELINE.map((p, i) => (
          <View key={p.label} style={styles.pipeRow}>
            <View style={styles.pipeRail}>
              <View style={[styles.pipeDot, { backgroundColor: p.color }]} />
              {i < PIPELINE.length - 1 && (
                <View style={[styles.pipeLine, { backgroundColor: border }]} />
              )}
            </View>
            <View style={[styles.pipeIcon, { backgroundColor: `${p.color}22` }]}>
              <MaterialCommunityIcons name={p.icon} size={15} color={p.color} />
            </View>
            <Text style={[styles.pipeLabel, { color: textPrimary }]}>{p.label}</Text>
          </View>
        ))}
        <Text style={[styles.pipeNote, { color: textSecondary }]}>
          Failed or rejected payments show in red on the Track screen.
        </Text>
      </View>

      {/* Tips */}
      <View style={[styles.tipsCard, { backgroundColor: surface, borderColor: border }]}>
        <View style={styles.sectionRow}>
          <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color={palette.primary} />
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Quick tips</Text>
        </View>
        {TIPS.map((tip) => (
          <View key={tip} style={styles.tipRow}>
            <MaterialCommunityIcons name="check-circle-outline" size={16} color={palette.accent} />
            <Text style={[styles.tipText, { color: textSecondary }]}>{tip}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  hero: {
    borderRadius: radius.xl,
    padding: 20,
    marginBottom: 16,
  },
  heroTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  heroSub: { color: '#E0F7F1', fontSize: 13, lineHeight: 19, marginTop: 6 },
  stepCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    ...shadows.sm,
  },
  stepHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stepNum: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { fontSize: 15, fontWeight: '800' },
  stepArt: {
    width: 66, height: 66, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  stepTitle: { fontSize: 16, fontWeight: '700' },
  stepDesc: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: { fontSize: 11, fontWeight: '600' },
  loopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  loopIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  loopTitle: { fontSize: 14, fontWeight: '700' },
  loopText: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  pipeCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 14.5, fontWeight: '700', flex: 1 },
  pipeRow: { flexDirection: 'row', alignItems: 'flex-start' },
  pipeRail: { alignItems: 'center', width: 26, marginRight: 10 },
  pipeDot: {
    width: 12, height: 12, borderRadius: 6,
    marginTop: 7,
  },
  pipeLine: { width: 2, flex: 1, minHeight: 24, marginVertical: 2 },
  pipeIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10, marginTop: -2,
  },
  pipeLabel: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 30 },
  pipeNote: { fontSize: 11.5, marginTop: 12, lineHeight: 16 },
  tipsCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 16,
  },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  tipText: { flex: 1, fontSize: 12.5, lineHeight: 18 },
});
