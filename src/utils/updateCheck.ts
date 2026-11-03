import { Platform } from 'react-native';
import * as Application from 'expo-application';
import apiClient from '../api/client';
import { storage } from './storage';

/**
 * In-app "update available" check.
 * Backend publishes the latest build per platform (admin: App Versions page);
 * GET api/app-version returns { latest_name, latest_code, min_code, store_url }.
 *
 *   latest_code > installed         → prompt "update available" (once per day)
 *   min_code > 0 && installed < min → blocking force update (no dismiss)
 */

export type UpdateCheckResult = {
  status: 'up-to-date' | 'update' | 'force';
  latestName: string;
  storeUrl: string | null;
};

const LAST_PROMPT_KEY = 'lastUpdatePromptDate';

/** Installed native build code (Play versionCode / iOS buildNumber). */
export async function getInstalledBuildCode(): Promise<number> {
  try {
    const v = Application.nativeBuildVersion;
    return parseInt(v || '0', 10) || 0;
  } catch {
    return 0;
  }
}

export async function checkForUpdate(): Promise<UpdateCheckResult | null> {
  try {
    // PWA/web: no native store builds — the server itself is the update channel.
    if (Platform.OS === 'web') return null;
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    const res = await apiClient.get(`api/app-version?platform=${platform}`);
    const d = res.data?.data;
    if (!d || d.latest_code == null) return null;

    // In Expo Go / dev builds, nativeBuildVersion is Expo Go's own (large)
    // version code, so the real comparison always reads "up-to-date". Simulate
    // an old install in dev so the update flow can be exercised (release builds
    // keep __DEV__ = false and use the real installed code).
    const installed = __DEV__ ? 0 : await getInstalledBuildCode();
    const latest = Number(d.latest_code) || 0;
    const min = Number(d.min_code) || 0;

    if (latest <= installed) return { status: 'up-to-date', latestName: d.latest_name, storeUrl: d.store_url ?? null };
    if (min > 0 && installed < min) return { status: 'force', latestName: d.latest_name, storeUrl: d.store_url ?? null };
    return { status: 'update', latestName: d.latest_name, storeUrl: d.store_url ?? null };
  } catch {
    return null; // offline / backend down — never block on the check itself
  }
}

/** Prompt at most once per calendar day. */
export async function shouldPromptToday(): Promise<boolean> {
  try {
    const last = await storage.get(LAST_PROMPT_KEY);
    return last !== new Date().toISOString().slice(0, 10);
  } catch {
    return true;
  }
}

export async function markPromptedToday(): Promise<void> {
  try {
    await storage.set(LAST_PROMPT_KEY, new Date().toISOString().slice(0, 10));
  } catch {
    // ignore
  }
}
