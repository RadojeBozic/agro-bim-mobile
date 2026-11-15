import React, { useEffect, useState } from "react";
import { AppState, Pressable, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { guestTodaySchema } from "../api/contracts";
import { api } from "../runtime";
import { router } from "expo-router";
import type { Href } from "expo-router";
import { HomeDeadlines } from "./home-deadlines";
import { ContentRow } from "../components/content";
import { HomeAds } from "../components/home-ads";
import { HomeWeather } from "../components/home-weather";
import { HomeBrand } from "../components/home-brand";
import { TrustLinks } from "../components/trust-links";
import type { ContentItem } from "../content";
import { useAuth } from "../auth/provider";
import {
  Body,
  Button,
  Card,
  Empty,
  ErrorState,
  Loading,
  NavigationCard,
  Screen,
  Timestamp,
  styles,
} from "../components/ui";
import { t, TranslationKey } from "../i18n";
import { theme } from "../theme";
import { useHomeQuery } from "./use-home-query";

const primaryActions: {
  title: TranslationKey;
  description: TranslationKey;
  icon: string;
  href: Href;
}[] = [
  { title: "farm", description: "farmAction", icon: "♧", href: "/farm" },
  {
    title: "programmes",
    description: "programmesAction",
    icon: "◇",
    href: "/programmes",
  },
  {
    title: "cenoteka",
    description: "cenotekaAction",
    icon: "≋",
    href: "/cenoteka",
  },
  {
    title: "financing",
    description: "financingAction",
    icon: "↗",
    href: "/more/financing",
  },
];
export default function Home() {
  const auth = useAuth();
  const signed = auth.status === "signedIn";
  const displayName = auth.me?.user?.displayName?.trim();
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setToday(new Date());
    });
    return () => subscription.remove();
  }, []);
  const localDate = today.toLocaleDateString("sr-Latn-RS", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const { query, refresh } = useHomeQuery(signed, auth.me?.user.id);
  const data = query.data?.data;
  // Use the same public cache and server selection as the guest homepage.
  const publicToday = useQuery({
    queryKey: ["public", "today"],
    enabled: signed,
    queryFn: ({ signal }) =>
      api.request("/today", guestTodaySchema, { signal }),
  });
  const publicCenoteka = signed
    ? publicToday.data?.data.sections.cenoteka
    : data && "audience" in data
      ? data.sections.cenoteka
      : undefined;
  const cenotekaQuery = signed ? publicToday : query;
  const refreshCenoteka = () => cenotekaQuery.refetch({ cancelRefetch: false });
  const sections: {
    label: TranslationKey;
    items: ContentItem[];
    status: string;
    href?: Href;
  }[] = [];
  if (data && "audience" in data) {
    sections.push(
      { label: "current", ...data.sections.information },
      { label: "programmes", href: "/programmes", ...data.sections.programmes },
      {
        label: "financing",
        href: "/more/financing",
        ...data.sections.financing,
      },
    );
  } else if (data && "profile" in data) {
    sections.push(
      { label: "current", ...data.sections.important },
      { label: "programmes", href: "/programmes", ...data.sections.subsidies },
      {
        label: "financing",
        href: "/more/financing",
        ...data.sections.financing,
      },
    );
  }
  return (
    <Screen
      topInset
      refreshing={query.isFetching || (signed && publicToday.isFetching)}
      onRefresh={() => {
        setToday(new Date());
        void refresh();
        if (signed) void refreshCenoteka();
      }}
    >
      <View style={{ gap: theme.space.md, paddingVertical: theme.space.sm }}>
        <HomeBrand />
        <Text accessibilityRole="header" style={styles.title}>
          {t("welcome")}
        </Text>
        <Text style={styles.muted}>
          {localDate.charAt(0).toLocaleUpperCase("sr-Latn-RS") +
            localDate.slice(1)}
        </Text>
      </View>
      {signed ? (
        <Card>
          <Body>
            {t("signedInHome")}
            {displayName ? " · " + displayName : ""}
          </Body>
          <TextLink label={t("myAccount")} href="/more/account" />
          <TextLink label={t("myAds")} href="/more/my-ads" />
        </Card>
      ) : auth.status === "guest" ? (
        <Card>
          <Body>{t("registerHome")}</Body>
          <Button
            label={t("freeRegistration")}
            onPress={() => router.push("/auth/register")}
          />
        </Card>
      ) : null}
      <View style={{ gap: theme.space.sm }}>
        <Text accessibilityRole="header" style={styles.muted}>
          {t("explore")}
        </Text>
        {primaryActions.map((action) => (
          <NavigationCard
            key={action.title}
            title={t(action.title)}
            description={t(action.description)}
            icon={action.icon}
            href={action.href}
          />
        ))}
      </View>
      {signed && (
        <Card>
          <Text accessibilityRole="header" style={styles.section}>
            {t("farmSummary")}
          </Text>
          <Body>
            {auth.me?.farm.displayName ??
              t(auth.me?.farm.completionState ?? "missing")}
          </Body>
          {auth.me?.farm.displayName && (
            <Text style={styles.muted}>
              {t(auth.me.farm.completionState ?? "missing")}
            </Text>
          )}
        </Card>
      )}
      <View style={{ gap: theme.space.md, marginTop: theme.space.sm }}>
        <HomeWeather />
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
            <Text accessibilityRole="header" style={styles.section}>
              {t(section.label)}
            </Text>
            {section.status === "unavailable" ? (
              <ErrorState
                error={query.error}
                compact
                retryDisabled={query.isFetching}
                retry={() => void refresh()}
              />
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
            {section.href && (
              <TextLink
                label={t("browseAll") + " · " + t(section.label)}
                href={section.href}
              />
            )}
          </Card>
        ))}
        <Card>
          <Text accessibilityRole="header" style={styles.section}>
            {t("cenoteka")}
          </Text>
          {cenotekaQuery.error || publicCenoteka?.status === "unavailable" ? (
            <ErrorState
              error={cenotekaQuery.error}
              message={t("cenotekaUnavailable")}
              compact
              retryDisabled={cenotekaQuery.isFetching}
              retry={() => void refreshCenoteka()}
            />
          ) : !publicCenoteka ? (
            <Loading />
          ) : publicCenoteka.items.length ? (
            publicCenoteka.items
              .slice(0, 3)
              .map((offer) => <ContentRow key={offer.id} item={offer} />)
          ) : (
            <Body>{t("cenotekaEmpty")}</Body>
          )}
          <TextLink label="Ponude dobavljača" href="/cenoteka/suppliers" />
        </Card>
        {(signed || auth.status === "guest") && (
          <HomeDeadlines
            signed={signed}
            today={today}
            pending={query.isPending}
            error={query.error}
            personalized={
              data && "profile" in data ? data.sections.deadlines : undefined
            }
            refreshHome={() => void refresh()}
          />
        )}
        <HomeAds guest={auth.status === "guest"} />
        {data && (
          <Card>
            <Text accessibilityRole="header" style={styles.section}>
              {t("market")}
            </Text>
            {data.market.exchange.items.length +
              data.market.stips.items.length ===
            0 ? (
              data.market.exchange.status === "unavailable" ||
              data.market.stips.status === "unavailable" ? (
                <ErrorState
                  error={query.error}
                  compact
                  retry={() => void refresh()}
                  retryDisabled={query.isFetching}
                />
              ) : (
                <Empty />
              )
            ) : (
              <>
                <Text style={styles.muted}>
                  {data.market.exchange.items.length +
                    data.market.stips.items.length}{" "}
                  · {t("current")}
                </Text>
                {data.market.exchange.items.slice(0, 3).map((item) => (
                  <Body key={item.id}>
                    {item.commodity}: {item.value ?? "—"} {item.currency ?? ""}
                    {item.unit ? "/" + item.unit : ""}
                  </Body>
                ))}
                {(data.market.exchange.status === "unavailable" ||
                  data.market.stips.status === "unavailable") && (
                  <ErrorState
                    error={query.error}
                    compact
                    retry={() => void refresh()}
                    retryDisabled={query.isFetching}
                  />
                )}
              </>
            )}
            <TextLink label="Pregled tržišnih cena" href="/more/market" />
          </Card>
        )}
      </View>
      <View style={{ marginTop: theme.space.sm }}>
        <TrustLinks />
      </View>
    </Screen>
  );
}
// Use the existing button/Router behavior with a lighter visual weight for section entry points.

function TextLink({ label, href }: { label: string; href: Href }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ minHeight: theme.touch, justifyContent: "center" }}
      onPress={() => router.push(href)}
    >
      <Text style={[styles.text, { color: theme.color.primary }]}>
        {label} ›
      </Text>
    </Pressable>
  );
}
