import React from "react";
import { Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { api } from "../runtime";
import { guestTodaySchema } from "../api/contracts";
import { useAuth } from "../auth/provider";
import { ApiError } from "../core/errors";
import { findFeedItem } from "./feed-query";
import { dateLabel } from "../content";
import { Attribution, Field } from "../components/content";
import {
  Body,
  Card,
  ErrorState,
  GuestCta,
  Loading,
  Screen,
  styles,
} from "../components/ui";

export default function InformationDetail({
  privateFeed = false,
}: {
  privateFeed?: boolean;
}) {
  const { key } = useLocalSearchParams<{ key?: string | string[] }>();
  const auth = useAuth();
  const valid = typeof key === "string" && key.length > 0 && key.length <= 240;
  const allowed = !privateFeed || auth.status === "signedIn";
  const query = useQuery({
    queryKey: privateFeed
      ? ["private", auth.me?.user.id, "feed-detail", key]
      : ["public", "information", key],
    enabled: valid && allowed,
    queryFn: async ({ signal }) => {
      if (typeof key !== "string") throw new ApiError("not_found", 404);
      if (privateFeed) return findFeedItem(key, signal);
      const result = await api.request("/today", guestTodaySchema, { signal });
      if (result.data.sections.information.status === "unavailable")
        throw new ApiError("internal_error", 503);
      const item = result.data.sections.information.items.find(
        (item) => item.key === key,
      );
      if (!item) throw new ApiError("not_found", 404);
      return item;
    },
  });
  const item = allowed ? query.data : undefined;
  return (
    <Screen>
      {!allowed ? (
        <GuestCta />
      ) : !valid ? (
        <ErrorState error={new ApiError("not_found", 404)} />
      ) : (
        <>
          {query.isPending && <Loading />}
          {query.error && (
            <ErrorState
              error={query.error}
              retry={() => void query.refetch()}
              retryDisabled={query.isFetching}
            />
          )}
          {item && (
            <>
              <Text style={styles.title}>{item.title}</Text>
              <Card>
                <Body>{item.shortBody}</Body>
                {"publishedAt" in item && (
                  <Field
                    title="Objavljeno"
                    value={dateLabel(item.publishedAt)}
                  />
                )}
                {"validUntil" in item && (
                  <Field title="Važi do" value={dateLabel(item.validUntil)} />
                )}
                {"reasons" in item &&
                  item.reasons.map((reason, i) => (
                    <Body key={i}>{reason.message}</Body>
                  ))}
              </Card>
              {"attribution" in item && (
                <Attribution value={item.attribution} />
              )}
            </>
          )}
        </>
      )}
    </Screen>
  );
}
