/**
 * Location cascade for the DG Advance screen (d2f).
 *
 *   POST {endpoint}   multipart/form-data:  state, district, sub_district
 *   -> { msg, statuscode, status: 'success'|'error', data: string[] }
 *
 * The endpoint returns the level *below* whatever you send:
 *   state only                    -> districts
 *   state + district              -> sub-districts
 *   state + district + sub_district -> villages
 *
 * Three behaviours of the API drive the design here:
 *
 * 1. **It has no state list.** Sending empty parameters returns
 *    "Invalid parameters.", and `all` / `India` return "No locations found".
 *    So the state options are hardcoded below — they are a fixed, stable list.
 *
 * 2. **Every error is HTTP 200.** Success and failure differ only in the body's
 *    `status` field, so the response body must be checked — never `res.ok`.
 *
 * 3. **It is rate limited to 60 requests/minute** (`x-ratelimit-limit: 60`),
 *    which is shared per IP. Since a full cascade is up to 3 calls per request
 *    and users may sit behind one NAT, every result is cached for the session.
 *
 * Live host first, development as fallback (see LOCATION_API_ENDPOINTS).
 */

import { LOCATION_API_ENDPOINTS } from '../utils/constants';

/**
 * State / UT names verified to return data on this API. Names are matched
 * case-insensitively, but the API's own spellings are inconsistent — it uses
 * "&" rather than "and" for two union territories, so "Andaman And Nicobar
 * Islands" and "Jammu And Kashmir" both FAIL while the "&" forms succeed.
 *
 * "Dadra & Nagar Haveli and Daman & Diu" is deliberately absent: none of the
 * 13 spelling variants tested resolve on this API. Do not guess a string here —
 * the option will simply return no districts. Ask d2f for the exact value and
 * add it in one line if it is needed.
 */
export const LOCATION_STATES = [
  'Andaman & Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu & Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

export interface LocationSelection {
  state?: string;
  district?: string;
  subDistrict?: string;
}

// Session cache: the hierarchy is effectively static, and this is what keeps
// the app well inside the 60/minute limit as users move back and forth.
const cache = new Map<string, string[]>();

const cacheKey = (s: LocationSelection) =>
  [s.state || '', s.district || '', s.subDistrict || ''].join('|');

async function requestFrom(
  endpoint: string,
  s: LocationSelection,
): Promise<string[] | null> {
  // fetch, not axios: axios serialises FormData bodies poorly and would fight
  // the multipart boundary. Same reasoning as uploadMultipart in api/client.ts.
  const form = new FormData();
  form.append('state', s.state || '');
  form.append('district', s.district || '');
  form.append('sub_district', s.subDistrict || '');

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: form,
  });
  // A 404/500 on the primary host is a fallback trigger, not a hard failure.
  if (!res.ok) return null;

  const body: any = await res.json();
  // HTTP 200 with status:"error" means "no locations for these filters" — for
  // a valid state that is a real empty result, but it is also what the wrong
  // host returns, so treat it as "this endpoint had no answer" and let the
  // caller try the next one before showing the user an empty list.
  if (body?.status !== 'success' || !Array.isArray(body.data)) return null;
  return body.data as string[];
}

/**
 * Fetch the options for the next level down. Throws `location-unavailable`
 * only when every endpoint failed, so callers can distinguish "no data for
 * this selection" (empty array) from "the service is unreachable".
 */
export async function fetchLocations(s: LocationSelection): Promise<string[]> {
  const key = cacheKey(s);
  const hit = cache.get(key);
  if (hit) return hit;

  let lastError: any = null;
  for (const endpoint of LOCATION_API_ENDPOINTS) {
    try {
      const data = await requestFrom(endpoint, s);
      if (data) {
        cache.set(key, data);
        return data;
      }
    } catch (err) {
      lastError = err;
    }
  }
  if (lastError) throw lastError;
  throw new Error('location-unavailable');
}
