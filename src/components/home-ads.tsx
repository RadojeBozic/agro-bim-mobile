import React, { useCallback, useEffect, useState } from "react";
import { AppState, Image, Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { adListSchema, adPhotoUrl, adPrice } from "../api/ads";
import { listingTypes } from "../api/ads-catalog";
import { ExternalLink } from "./content";
import { Body, Button, Card, ErrorState, Loading, styles } from "./ui";
import { config } from "../config/environment";
import { api } from "../runtime";
import { theme } from "../theme";
import {
  homeAdsPath,
  moveAd,
  type RotationPosition,
} from "./home-ads-rotation";

const interval = 8000;
const first = { page: 0, index: 0 };
export function HomeAds({ guest }: { guest: boolean }) {
  const [focused, setFocused] = useState(false);
  const [foreground, setForeground] = useState(
    AppState.currentState === "active",
  );
  const [position, setPosition] = useState<RotationPosition>(first);
  const [priorityId, setPriorityId] = useState<string>();
  const [failedPhoto, setFailedPhoto] = useState<string>();
  const [now, updateClock] = useState(Date.now);
  useFocusEffect(
    useCallback(() => {
      updateClock(Date.now());
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      updateClock(Date.now());
      setForeground(state === "active");
    });
    return () => subscription.remove();
  }, []);
  const active = focused && foreground;
  const path = homeAdsPath(position.page);
  const query = useQuery({
    queryKey: ["public", "ads", "home", path],
    queryFn: ({ signal }) => api.request(path, adListSchema, { signal }),
    enabled: active,
    staleTime: 60_000,
    gcTime: 120_000,
  });
  const data = query.data?.data;
  const valid =
    data?.items.filter(
      (ad) => !ad.expiresAt || Date.parse(ad.expiresAt) > now,
    ) ?? [];
  const items =
    position.page === 0
      ? valid.slice(0, 1)
      : valid.filter((ad) => ad.id !== priorityId || data?.total === 1);
  const index = Math.min(position.index, items.length - 1);
  const ad = items[index];
  const total = data?.total ?? 0;
  const canMove = active && !!data && total > 1;
  const advance = useCallback(
    (step: -1 | 1) => {
      if (!canMove) return;
      updateClock(Date.now());
      if (position.page === 0) setPriorityId(ad?.id);
      setPosition(moveAd(position.page, index, items.length, total, step));
    },
    [ad?.id, canMove, index, items.length, position.page, total],
  );
  useEffect(() => {
    if (!canMove) return;
    const timer = setTimeout(() => advance(1), interval);
    return () => clearTimeout(timer);
  }, [advance, canMove]);
  const refetch = query.refetch;
  useEffect(() => {
    const expiry = data?.items.reduce((earliest, item) => {
      const time = Date.parse(item.expiresAt ?? "");
      return time > now ? Math.min(time, earliest) : earliest;
    }, Infinity);
    if (!active || expiry === undefined || !Number.isFinite(expiry)) return;
    const timer = setTimeout(
      () => {
        const time = Date.now();
        updateClock(time);
        if (time >= expiry) void refetch({ cancelRefetch: false });
      },
      Math.min(2_147_483_647, Math.max(0, expiry - Date.now())),
    );
    return () => clearTimeout(timer);
  }, [active, data, now, refetch]);
  useEffect(() => {
    if (!active || !data || total > 1 || position.page === 0) return;
    const timer = setTimeout(() => setPosition(first), 0);
    return () => clearTimeout(timer);
  }, [active, data, total, position.page]);
  const photo =
    ad?.coverPhotoId && adPhotoUrl(config.apiBase, ad.id, ad.coverPhotoId);
  return (
    <Card>
      <Text accessibilityRole="header" style={styles.section}>
        Agro Oglasi
      </Text>
      {query.isLoading && <Loading />}
      {query.error && (
        <ErrorState
          error={query.error}
          compact
          message="Mali oglasi trenutno nisu dostupni."
          retryDisabled={query.isFetching}
          retry={() => void query.refetch({ cancelRefetch: false })}
        />
      )}
      {query.isPaused && !data && (
        <Body>Mali oglasi će se učitati po povratku internet veze.</Body>
      )}
      {data && total === 0 && !query.error && (
        <Body>Trenutno nema objavljenih malih oglasa.</Body>
      )}
      {ad && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ad.title}
          accessibilityHint="Otvori detalj oglasa"
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: theme.space.sm,
            minHeight: theme.touch,
          }}
          onPress={() =>
            router.push({ pathname: "/more/ads/[id]", params: { id: ad.id } })
          }
        >
          {photo && photo !== failedPhoto && (
            <Image
              source={{ uri: photo, cache: "reload" }}
              style={{
                width: "28%",
                maxWidth: 104,
                aspectRatio: 1,
                borderRadius: theme.radius.button,
              }}
              accessibilityLabel="Naslovna fotografija oglasa"
              onError={() => setFailedPhoto(photo)}
            />
          )}
          <View style={{ flex: 1, gap: theme.space.xs }}>
            <Text style={styles.section}>{ad.title}</Text>
            <Body>
              {listingTypes[ad.type as keyof typeof listingTypes] ?? ad.type}
            </Body>
            <Body>{adPrice(ad)}</Body>
            <Body>
              {ad.settlement && ad.settlement !== ad.municipality
                ? ad.settlement + ", " + ad.municipality
                : ad.municipality}
            </Body>
          </View>
        </Pressable>
      )}
      {total > 1 && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: theme.space.sm,
          }}
        >
          {([-1, 1] as const).map((step) => (
            <Pressable
              key={step}
              accessibilityRole="button"
              disabled={!canMove}
              accessibilityLabel={
                step < 0 ? "Prethodni oglas" : "Sledeći oglas"
              }
              style={{
                minHeight: theme.touch,
                minWidth: theme.touch,
                justifyContent: "center",
                alignItems: "center",
              }}
              onPress={() => advance(step)}
            >
              <Text style={styles.section}>{step < 0 ? "‹" : "›"}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <ExternalLink
        title="Prikaži sve oglase"
        url="https://agrobim.digital/oglasi"
      />
      <Button
        label="Predajte mali oglas"
        onPress={() => router.push("/more/ads/new")}
      />
      {guest && (
        <ExternalLink
          title="Predajte besplatno mali oglas"
          url="https://agrobim.digital/oglasi/novi"
        />
      )}
      {guest && (
        <>
          <Body>
            Registrujte se besplatno i jednostavnije upravljajte svojim
            oglasima. AgroBIM nalog pruža vam i pristup dodatnim korisnim
            alatima.
          </Body>
          <Button
            label="Besplatna registracija"
            onPress={() => router.push("/auth/register")}
          />
        </>
      )}
    </Card>
  );
}
