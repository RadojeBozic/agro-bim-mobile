import React from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { ContentRow } from "../components/content";
import type { ContentItem } from "../content";
import { useAuth } from "../auth/provider";
import {
  Body,
  Button,
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
    items: ContentItem[];
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
      { label: "deadlines", ...data.sections.deadlines },
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
          <Button label={t("farm")} onPress={() => router.push("/farm")} />
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
            <>
              <Body>{t("internal_error")}</Body>
              <Button
                label={t("retry")}
                onPress={() => void refresh()}
                disabled={query.isFetching}
              />
            </>
          ) : section.items.length ? (
            section.items
              .slice(0, 3)
              .map((item, i) => (
                <ContentRow
                  key={item.key ?? item.id ?? i}
                  item={item}
                  signed={signed}
                />
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
          {data.market.exchange.items.length +
            data.market.stips.items.length ===
            0 && <Empty />}
          {(data.market.exchange.status === "unavailable" ||
            data.market.stips.status === "unavailable") && (
            <Body>{t("internal_error")}</Body>
          )}
          <Button
            label="Pregled tržišnih cena"
            onPress={() => router.push("/more/market")}
          />
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
