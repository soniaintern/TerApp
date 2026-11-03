// Category icon + colour (matches the Flutter app), shared by the TER detail
// screen and the Track detail screen so a category looks the same everywhere.
import { palette } from '../theme/tokens';

export const CATEGORY_META: Record<number, { icon: string; color: string }> = {
  1: { icon: 'motorbike', color: '#3B82F6' },
  2: { icon: 'motorbike', color: '#8B5CF6' },
  3: { icon: 'gas-station', color: '#3B82F6' },
  4: { icon: 'car-wrench', color: '#F59E0B' },
  5: { icon: 'home-city-outline', color: '#14B8A6' },
  6: { icon: 'cellphone', color: '#EC4899' },
  7: { icon: 'silverware-fork-knife', color: '#F97316' },
  8: { icon: 'bus', color: '#06B6D4' },
  9: { icon: 'star-outline', color: '#64748B' },
  10: { icon: 'road-variant', color: '#6366F1' },
  11: { icon: 'flash-outline', color: '#EAB308' },
  12: { icon: 'walk', color: '#0FA58C' },                    // DA - Out of HQ (No night halt)
  13: { icon: 'storefront-outline', color: '#D97706' },      // DA - Local Market
  14: { icon: 'package-variant-closed', color: '#64748B' },  // Courier, Internet & Stationery
  15: { icon: 'silverware-fork-knife', color: '#F97316' },   // Food - Campaign
  16: { icon: 'bed', color: '#14B8A6' },                     // Room Rent - Campaign
  17: { icon: 'car-multiple', color: '#8B5CF6' },            // Vehicle Hiring
  18: { icon: 'gas-station', color: '#F59E0B' },             // Fuel Hired Vehicle
};

export const CATEGORY_ICON_BY_NAME: Record<string, { icon: string; color: string }> = {
  'da - out of hq (no night halt)': { icon: 'walk', color: '#0FA58C' },
  'da - local market': { icon: 'storefront-outline', color: '#D97706' },
  'courier, internet & stationery': { icon: 'package-variant-closed', color: '#64748B' },
  'food - campaign': { icon: 'silverware-fork-knife', color: '#F97316' },
  'room rent - campaign': { icon: 'bed', color: '#14B8A6' },
  'vehicle hiring': { icon: 'car-multiple', color: '#8B5CF6' },
  'fuel hired vehicle': { icon: 'gas-station', color: '#F59E0B' },
  'toll tax': { icon: 'road-variant', color: '#6366F1' },
};

export const categoryMeta = (id: number, name?: string) =>
  CATEGORY_ICON_BY_NAME[(name || '').toLowerCase()] || CATEGORY_META[id] || { icon: 'shape-outline', color: palette.primary };
