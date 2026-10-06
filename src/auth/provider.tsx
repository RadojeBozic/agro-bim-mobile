import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { AppState } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { z } from "zod";
import { meSchema } from "../api/contracts";
import {
  api,
  onSessionCleared,
  onStorageFailure,
  session,
  supabase,
} from "../runtime";
import { ApiError } from "../core/errors";
export type Me = z.output<typeof meSchema>;
type State = {
  status: "guest" | "checking" | "signedIn";
  me: Me | null;
  message: "session" | "storage" | "internal_error" | null;
};
const Context = createContext<
  State & { validate(): Promise<void>; logout(): Promise<void> }
>({
  status: "guest",
  me: null,
  message: null,
  validate: async () => {},
  logout: async () => {},
});
export function AuthProvider({ children }: React.PropsWithChildren) {
  const [state, setState] = useState<State>({
    status: "guest",
    me: null,
    message: null,
  });
  const validation = useRef<{
    generation: number;
    promise: Promise<void>;
  } | null>(null);
  const validate = useCallback(() => {
    if (!session.token()) return Promise.resolve();
    const generation = session.generation();
    if (validation.current?.generation === generation)
      return validation.current.promise;
    const promise = (async () => {
      setState({ status: "checking", me: null, message: null });
      try {
        const result = await api.request("/me", meSchema, { private: true });
        if (generation === session.generation() && session.token())
          setState({ status: "signedIn", me: result.data, message: null });
      } catch (e) {
        if (generation === session.generation())
          setState({
            status: "guest",
            me: null,
            message:
              e instanceof ApiError && e.code === "storage"
                ? "storage"
                : session.token()
                  ? "internal_error"
                  : "session",
          });
      }
    })().finally(() => {
      if (validation.current?.promise === promise) validation.current = null;
    });
    validation.current = { generation, promise };
    return promise;
  }, []);
  const logout = useCallback(async () => {
    setState({ status: "guest", me: null, message: null });
    try {
      await session.clear(false);
    } catch {
      setState({ status: "guest", me: null, message: "storage" });
    }
  }, []);
  useEffect(() => {
    let alive = true;
    let restored = false;
    const accept = (next: Session | null) => {
      if (!alive) return;
      const previous = session.session?.user.id;
      session.set(next);
      if (!next)
        setState((s) => ({ status: "guest", me: null, message: s.message }));
      else if (previous !== next.user.id || !restored) void validate();
    };
    const clearListener = onSessionCleared((expired) =>
      setState({
        status: "guest",
        me: null,
        message: expired ? "session" : null,
      }),
    );
    const storageListener = onStorageFailure(() => {
      session.set(null);
      setState({ status: "guest", me: null, message: "storage" });
    });
    const subscription = supabase?.auth.onAuthStateChange((event, next) => {
      if (
        event !== "INITIAL_SESSION" &&
        !(event === "TOKEN_REFRESHED" && !session.session)
      )
        queueMicrotask(() => {
          if (
            event === "TOKEN_REFRESHED" &&
            (!session.session || session.session.user.id !== next?.user.id)
          )
            return;
          accept(next);
        });
    });
    void supabase?.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        accept(data.session);
        restored = true;
      })
      .catch(() => {
        session.set(null);
        if (alive) setState({ status: "guest", me: null, message: "storage" });
      });
    let timer: ReturnType<typeof setInterval> | undefined;
    const tick = async (force = false) => {
      try {
        if (
          session.session &&
          (force ||
            (session.session.expires_at ?? 0) * 1000 - Date.now() < 60000)
        ) {
          if (!(await session.refresh())) await session.clear();
          else if (force) await validate();
        }
      } catch {
        /* Transient network loss keeps the local session; /me controls private UI. */
      }
    };
    const foreground = () => {
      if (timer) clearInterval(timer);
      void tick(true);
      timer = setInterval(() => void tick(), 30000);
    };
    if (AppState.currentState === "active") foreground();
    const app = AppState.addEventListener("change", (value) => {
      if (value === "active") foreground();
      else if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
    });
    return () => {
      alive = false;
      subscription?.data.subscription.unsubscribe();
      clearListener();
      storageListener();
      app.remove();
      if (timer) clearInterval(timer);
    };
  }, [validate]);
  return (
    <Context.Provider value={{ ...state, validate, logout }}>
      {children}
    </Context.Provider>
  );
}
export const useAuth = () => useContext(Context);
export const useCapability = (key: keyof Me["access"]["capabilities"]) => {
  const auth = useAuth();
  return (
    auth.status === "signedIn" && auth.me?.access.capabilities[key] === true
  );
};
