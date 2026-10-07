import { useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../runtime";
import { guestTodaySchema, todaySchema } from "../api/contracts";
type HomeData =
  z.output<typeof guestTodaySchema> | z.output<typeof todaySchema>;
export function useHomeQuery(signed: boolean, userId?: string) {
  const query = useQuery({
    queryKey: signed ? ["private", userId, "today"] : ["public", "today"],
    refetchOnMount: "always",
    queryFn: ({
      signal,
    }): Promise<{ data: HomeData; requestId: string; status: number }> =>
      signed
        ? api.request("/me/today", todaySchema, { private: true, signal })
        : api.request("/today", guestTodaySchema, { signal }),
  });
  const { refetch } = query;
  // Join an existing initial/focus/retry fetch instead of cancelling and replaying it.
  const refresh = useCallback(
    () => refetch({ cancelRefetch: false }),
    [refetch],
  );
  const opened = useRef(false);
  useFocusEffect(
    useCallback(() => {
      // useQuery already fetches on mount, including a remount with cached data.
      if (opened.current) void refresh();
      opened.current = true;
    }, [refresh]),
  );
  return { query, refresh };
}
