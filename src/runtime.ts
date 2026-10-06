import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { QueryClient } from "@tanstack/react-query";
import { config, validatePublicAuth } from "./config/environment";
import { secureAdapter } from "./core/storage";
import { SessionCoordinator } from "./core/session";
import { ApiClient } from "./core/client";
import { ApiError } from "./core/errors";
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000,
      gcTime: 5 * 60000,
      retry: (count, error) =>
        count < 1 && error instanceof ApiError && error.code === "network",
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
});
const storageListeners = new Set<() => void>();
export const onStorageFailure = (listener: () => void) => {
  storageListeners.add(listener);
  return () => {
    storageListeners.delete(listener);
  };
};
const memory = new Map<string, string>(); // Web QA only: no persistent session secrets in browser storage.
const storage = config.native
  ? secureAdapter(
      {
        getItemAsync: (key) => SecureStore.getItemAsync(key),
        setItemAsync: (key, value) =>
          SecureStore.setItemAsync(key, value, {
            keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          }),
        deleteItemAsync: (key) => SecureStore.deleteItemAsync(key),
      },
      () => storageListeners.forEach((fn) => fn()),
    )
  : {
      getItem: async (k: string) => memory.get(k) ?? null,
      setItem: async (k: string, v: string) => {
        memory.set(k, v);
      },
      removeItem: async (k: string) => {
        memory.delete(k);
      },
    };
export const supabase = validatePublicAuth(
  config.supabaseUrl,
  config.supabaseKey,
)
  ? createClient(config.supabaseUrl, config.supabaseKey, {
      auth: {
        storage,
        autoRefreshToken: false,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    })
  : null;
const clearedListeners = new Set<(expired: boolean) => void>();
export const onSessionCleared = (fn: (expired: boolean) => void) => {
  clearedListeners.add(fn);
  return () => {
    clearedListeners.delete(fn);
  };
};
export const session = new SessionCoordinator(
  queryClient,
  async () => {
    if (!supabase) return null;
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      if (
        error.status &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 429
      )
        return null;
      throw new ApiError("network");
    }
    return data.session;
  },
  (expired) => clearedListeners.forEach((fn) => fn(expired)),
  async () => {
    const result = await supabase?.auth.signOut({ scope: "local" });
    if (result?.error) throw result.error;
  },
);
export const api = new ApiClient(config.apiBase, session);
