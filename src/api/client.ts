import axios from 'axios';
import { storage } from '../utils/storage';
import { BASE_URL } from '../utils/constants';
import { useAuthStore } from '../store/authStore';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 40000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor: attach JWT token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await storage.get(storage.KEYS.TOKEN);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// The backend's JWT middleware rejects an expired/invalid token with HTTP 200 and
// the real code in the body ({status:'error', statuscode:401, message:'Unauthorized'}),
// and an admin-blocked employee the same way with statuscode 403. Matched on the
// message too: login (wrong password) and the supervisor/admin role checks reuse
// statuscode 401/403 in the body for errors that must NOT end the session.
function isSessionRejected(body: any): boolean {
  if (!body || body.status !== 'error') return false;
  const code = Number(body.statuscode);
  const message = String(body.message ?? '');
  return (code === 401 && message === 'Unauthorized')
    || (code === 403 && message.startsWith('App access is blocked'));
}

async function endSession() {
  await storage.clearAll();
  useAuthStore.getState().logout();
}

// Response interceptor: handle 401 — real logout (clears storage AND the auth
// store so the user lands on the login screen; previously storage was cleared
// without navigating, leaving a "logged-in but no data" zombie state).
apiClient.interceptors.response.use(
  async (response) => {
    if (isSessionRejected(response.data)) {
      await endSession();
      // Reject so screens take their error path instead of caching the
      // rejection as an empty result ("No categories" until re-login).
      const error: any = new Error(response.data.message);
      error.response = { ...response, status: Number(response.data.statuscode) };
      return Promise.reject(error);
    }
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      await endSession();
    }
    return Promise.reject(error);
  }
);

/**
 * Multipart upload via RN's native fetch — required for file attachments.
 * axios (with its instance-level `Content-Type: application/json` default) can
 * serialize the RN FormData file part ({uri,type,name}) as a plain string,
 * which makes the server reject it with "attachment must be a file".
 * fetch lets React Native's networking build the multipart body (with the
 * boundary and filename) natively.
 */
export async function uploadMultipart(path: string, form: FormData): Promise<any> {
  const token = await storage.get(storage.KEYS.TOKEN);
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // NOTE: no manual Content-Type — RN adds "multipart/form-data; boundary=..."
    },
    body: form,
  });

  let json: any = {};
  try {
    json = await res.json();
  } catch {
    json = { status: 'error', message: `Upload failed (HTTP ${res.status}).` };
  }

  if (res.status === 401 || isSessionRejected(json)) {
    await endSession();
  }

  return json;
}

export default apiClient;
