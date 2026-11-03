// API response normalizer — handles the backend returning either
// an array OR a single object for `data` depending on request mode.
export function normalizeDataArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') return [data];
  return [];
}
