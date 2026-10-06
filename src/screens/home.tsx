import React from "react";
import { z } from "zod";
import { Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "../runtime";
import { guestTodaySchema, todaySchema } from "../api/contracts";
import { useAuth } from "../auth/provider";
import {
  Body,
  Card,
  Empty,
  ErrorState,
  Loading,
  Screen,
  Timestamp,
  styles,
} from "../components/ui";
import { t, TranslationKey } from "../i18n";
type HomeData =
  z.output<typeof guestTodaySchema> | z.output<typeof todaySchema>;
export default function Home() {
  const auth = useAuth();
  const signed = auth.status === "signedIn";
  const query = useQuery({
    queryKey: signed
      ? ["private", auth.me?.user.id, "today"]
      : ["public", "today"],
    queryFn: async ({
      signal,
    }): Promise<{ data: HomeData; requestId: string; status: number }> =>
      signed
        ? api.request("/me/today", todaySchema, { private: true, signal })
        : api.request("/today", guestTodaySchema, { signal }),
  });
  const data = query.data?.data;
  const sections: {
    label: TranslationKey;
    items: {
      title?: string;
      name?: string;
      productName?: string;
      shortBody?: string | null;
    }[];
    status: string;
  }[] = [];
  if (data && "audience" in data) {
    sections.push(
      { label: "current", ...data.sections.information },
      { label: "programmes", ...data.sections.programmes },
      { label: "cenoteka", ...data.sections.cenoteka },
      { label: "financing", ...data.sections.financing },
    );
  } else if (data && "profile" in data) {
    sections.push(
      { label: "current", ...data.sections.important },
      { label: "programmes", ...data.sections.subsidies },
      { label: "cenoteka", ...data.sections.cenoteka },
      { label: "financing", ...data.sections.financing },
    );
  }
  return (
    <Screen
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
    >
      <Text style={styles.title}>{t("home")}</Text>
      {signed && (
        <Card>
          <Body>
            {auth.me?.farm.displayName ??
              t(auth.me?.farm.completionState ?? "missing")}
          </Body>
          <Body>
            {t("capabilities")}:{" "}
            {Object.values(auth.me!.access.capabilities).filter(Boolean).length}
          </Body>
        </Card>
      )}
      {query.isPending && <Loading />}
      {query.error && (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      )}
      <Timestamp value={query.dataUpdatedAt} />
      {sections.map((section) => (
        <Card key={section.label}>
          <Text style={styles.section}>{t(section.label)}</Text>
          {section.status === "unavailable" ? (
            <Body>{t("internal_error")}</Body>
          ) : section.items.length ? (
            section.items.slice(0, 3).map((item, i) => (
              <Body key={i}>
                {item.title ?? item.name ?? item.productName ?? t("empty")}
                {item.shortBody ? " · " + item.shortBody : ""}
              </Body>
            ))
          ) : (
            <Empty />
          )}
        </Card>
      ))}
      {data && (
        <Card>
          <Text style={styles.section}>{t("market")}</Text>
          <Body>
            {data.market.exchange.items.length + data.market.stips.items.length}{" "}
            · {t("current")}
          </Body>
          {data.market.exchange.items.slice(0, 3).map((item) => (
            <Body key={item.id}>
              {item.commodity}: {item.value ?? "—"} {item.currency ?? ""}
              {item.unit ? "/" + item.unit : ""}
            </Body>
          ))}
        </Card>
      )}
    </Screen>
  );
}
