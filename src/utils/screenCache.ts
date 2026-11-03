// Lightweight module-level cache so screens render instantly when re-visited
// (tab switches / re-navigation) and refresh silently in the background.
// Keyed per screen + params. Survives unmountOnBlur remounts.

const cache = new Map<string, any>();
const writtenAt = new Map<string, number>();

export function getCache<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export function hasCache(key: string): boolean {
  return cache.has(key);
}

export function setCache(key: string, value: any): void {
  cache.set(key, value);
  writtenAt.set(key, Date.now());
}

/** Milliseconds since this key was last written, or null when never written. */
export function getCacheAge(key: string): number | null {
  const at = writtenAt.get(key);
  return at === undefined ? null : Date.now() - at;
}

export function clearCache(key?: string): void {
  if (key) {
    cache.delete(key);
    writtenAt.delete(key);
  } else {
    cache.clear();
    writtenAt.clear();
  }
}
