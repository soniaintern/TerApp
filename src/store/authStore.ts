import { create } from 'zustand';
import { storage } from '../utils/storage';
import { clearCache } from '../utils/screenCache';
import type { UserData } from '../types/api';

interface AuthState {
  token: string | null;
  user: UserData | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  pfu: string;

  setToken: (token: string) => void;
  setUser: (user: UserData) => void;
  setPfu: (pfu: string) => void;
  logout: () => void;
  restoreSession: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isLoggedIn: false,
  isLoading: true,
  pfu: '',

  setToken: (token) => {
    set({ token, isLoggedIn: true });
    storage.set(storage.KEYS.TOKEN, token);
  },

  setUser: (user) => {
    set({ user });
    if (user.pfu) storage.set(storage.KEYS.PFU, user.pfu);
    storage.set(storage.KEYS.USER, JSON.stringify(user));
    storage.set(storage.KEYS.REGISTERED, 'true');
  },

  setPfu: (pfu) => {
    set({ pfu });
    storage.set(storage.KEYS.PFU, pfu);
  },

  logout: async () => {
    await storage.clearAll();
    clearCache(); // never leak the previous user's data into a new session
    set({ token: null, user: null, isLoggedIn: false, pfu: '' });
  },

  restoreSession: async () => {
    // Keep the branded splash visible for a moment on cold start
    await new Promise((resolve) => setTimeout(resolve, 1200));

    try {
      // Add a safety timeout: if storage hangs, proceed anyway
      const result = await Promise.race([
        Promise.all([
          storage.get(storage.KEYS.TOKEN),
          storage.get(storage.KEYS.PFU),
          storage.get(storage.KEYS.REGISTERED),
        ]),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]);

      if (result && Array.isArray(result)) {
        const [token, pfu, registered] = result;
        if (token && registered === 'true') {
          let user = null;
          try {
            const storedUser = await storage.get(storage.KEYS.USER);
            if (storedUser) user = JSON.parse(storedUser);
          } catch (e) {
            user = null;
          }
          set({ token, user, isLoggedIn: true, pfu: pfu || '', isLoading: false });
          return;
        }
      }
      set({ isLoading: false });
    } catch (e) {
      console.log('restoreSession error:', e);
      set({ isLoading: false });
    }
  },

  setLoading: (loading) => set({ isLoading: loading }),
}));
