// Design tokens — TER App (Finfect teal theme)
export const palette = {
  // Brand — deep teal (matches ter.finfect.biz)
  primary: '#186E93',
  primaryDark: '#125A79',
  primaryLight: '#D9EEF5',
  primarySoft: '#EDF7FA',

  // Accent — teal-green
  accent: '#13C7A8',
  accentDark: '#0FA98F',

  // Status
  success: '#059669',
  successLight: '#D1FAE5',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  error: '#D51101',
  errorLight: '#FEE2E2',
  info: '#0284C7',
  infoLight: '#E0F2FE',

  // Neutral scale
  background: '#F6F8FA',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  border: '#E2E8F0',
  textPrimary: '#3B3F5C',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  white: '#FFFFFF',

  // Dark mode — teal-tinted slate
  darkBg: '#0E1C26',
  darkSurface: '#162A38',
  darkSurfaceMuted: '#1F3A4C',
  darkBorder: '#2A485E',
  darkTextPrimary: '#F1F5F9',
  darkTextSecondary: '#A8C4D4',
  darkTextTertiary: '#6B8DA3',

  // Category colors (expense heads)
  catTravel: '#186E93',
  catFood: '#F59E0B',
  catPhone: '#13C7A8',
  catMisc: '#8B5CF6',
  catStay: '#EC4899',
  catOther: '#64748B',
} as const;

// Gradients
export const gradients = {
  hero: ['#186E93', '#13C7A8'] as const,     // teal → teal-green hero
  heroDark: ['#0D2B3A', '#186E93'] as const,
  success: ['#059669', '#13C7A8'] as const,
  card: ['#FFFFFF', '#F8FAFC'] as const,
  purple: ['#8B5CF6', '#6366F1'] as const,
  orange: ['#F59E0B', '#F97316'] as const,
} as const;

// Spacing scale
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// Radius scale
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

// Typography
export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodyMedium: { fontSize: 15, fontWeight: '500' as const, lineHeight: 22 },
  bodyBold: { fontSize: 15, fontWeight: '700' as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  captionMedium: { fontSize: 13, fontWeight: '500' as const, lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16, letterSpacing: 0.4 },
  amount: { fontSize: 32, fontWeight: '800' as const, lineHeight: 38 },
  amountSmall: { fontSize: 20, fontWeight: '700' as const, lineHeight: 26 },
} as const;

export const shadows = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;
