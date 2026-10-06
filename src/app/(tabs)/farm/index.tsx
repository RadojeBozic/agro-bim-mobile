import React from "react";
import { Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../auth/provider";
import { api } from "../../../runtime";
import { feedPageSchema } from "../../../api/contracts";
import {
  Body,
  Card,
  Empty,
  ErrorState,
  Gated,
  GuestCta,
  Loading,
  Screen,
  Timestamp,
  styles,
} from "../../../components/ui";
import { t } from "../../../i18n";
export default function Farm() {
  const auth = useAuth();
  const query = useQuery({
    queryKey: ["private", auth.me?.user.id, "feed"],
    enabled:
      auth.status === "signedIn" &&
      auth.me?.access.capabilities.usePersonalizedFeed === true,
    queryFn: ({ signal }) =>
      api.request("/me/feed", feedPageSchema, { private: true, signal }),
  });
  return (
    <Screen
      refreshing={query.isRefetching}
      onRefresh={
        auth.status === "signedIn" ? () => void query.refetch() : undefined
      }
    >
      <Text style={styles.title}>{t("farm")}</Text>
      {auth.status !== "signedIn" ? (
        <GuestCta />
      ) : (
        <>
          <Card>
            <Body>
              {auth.me?.farm.displayName ??
                t(auth.me?.farm.completionState ?? "missing")}
            </Body>
          </Card>
          {!auth.me?.access.capabilities.usePersonalizedFeed ? (
            <Gated />
          ) : (
            query.isPending && <Loading />
          )}
          {query.error && <ErrorState error={query.error} />}
          <Timestamp value={query.dataUpdatedAt} />
          {query.data?.data.items.map((item) => (
            <Card key={item.key}>
              <Text style={styles.section}>{item.title}</Text>
              <Body>{item.shortBody}</Body>
            </Card>
          ))}
          {query.data?.data.items.length === 0 && <Empty />}
        </>
      )}
    </Screen>
  );
}
