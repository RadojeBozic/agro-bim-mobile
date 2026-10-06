import type { Session } from "@supabase/supabase-js";
import type { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./errors";
export class SessionCoordinator {
  session: Session | null = null;
  private epoch = 0;
  private pending: Promise<string | null> | null = null;
  constructor(
    private queryClient: QueryClient,
    private refreshSession: () => Promise<Session | null>,
    private signedOut: (expired: boolean) => void,
    private signOut: () => Promise<void>,
  ) {}
  generation = () => this.epoch;
  token = () => this.session?.access_token ?? null;
  set(session: Session | null) {
    if (this.session?.user.id !== session?.user.id) {
      this.epoch++;
      void this.queryClient.cancelQueries({ queryKey: ["private"] });
      this.queryClient.removeQueries({ queryKey: ["private"] });
    }
    this.session = session;
  }
  refresh = async () => {
    if (!this.session) return null;
    if (this.pending) return this.pending;
    const epoch = this.epoch;
    this.pending = this.refreshSession()
      .then((session) => {
        if (epoch !== this.epoch) return null;
        this.set(session);
        return this.token();
      })
      .finally(() => {
        this.pending = null;
      });
    return this.pending;
  };
  clear = async (expired = true) => {
    this.set(null);
    this.signedOut(expired);
    try {
      await this.signOut();
    } catch {
      throw new ApiError("storage");
    }
  };
}
