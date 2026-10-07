import React from "react";
import { Text } from "react-native";
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
import { useHomeQuery } from "./use-home-query";
export default function Home() {
  const auth = useAuth();
  const signed = auth.status === "signedIn";
  const { query, refresh } = useHomeQuery(signed, auth.me?.user.id);
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
    <Screen refreshing={query.isFetching} onRefresh={() => void refresh()}>
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
        <ErrorState
          error={query.error}
          compact={!!data}
          retryDisabled={query.isFetching}
          retry={() => void refresh()}
        />
      )}
      {data && <Timestamp value={query.dataUpdatedAt} />}
      {sections.map((section) => (
        <Card key={section.label}>
          <Text style={styles.section}>{t(section.label)}</Text>
          {section.status === "unavailable" ? (
            <Body>{t("internal_error")}</Body>
          ) : section.items.length ? (
            section.items.slice(0, 3).map((item, i) => (
              <Text key={i} style={styles.homeEntry}>
                {item.title ?? item.name ?? item.productName ?? t("empty")}
                {item.shortBody ? " · " + item.shortBody : ""}
              </Text>
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
