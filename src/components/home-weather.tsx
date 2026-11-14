import React, { useEffect, useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import {
  weatherLocation,
  weatherPath,
  weatherSchema,
  type WeatherLocation,
} from "../api/weather";
import { api, storage } from "../runtime";
import { theme } from "../theme";
import { ExternalLink } from "./content";
import { Button, Card, ErrorState, Loading, styles } from "./ui";

const preferenceKey = "home.weather.location";
const locale = "sr-Latn-RS";
const timezone = "Europe/Belgrade";
const dayLabels = ["Danas", "Sutra", "Prekosutra"];
const formatNumber = (value: number) => value.toLocaleString(locale);

export function HomeWeather() {
  const [location, setLocation] = useState<WeatherLocation | null>(null);
  const [open, setOpen] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let active = true;
    void storage
      .getItem(preferenceKey)
      .catch(() => null)
      .then((value) => {
        if (!active) return;
        const saved = weatherLocation.safeParse(value);
        setLocation(saved.success ? saved.data : "Beograd");
      });
    return () => {
      active = false;
    };
  }, []);

  const query = useQuery({
    queryKey: ["public", "weather", location],
    queryFn: ({ signal }) =>
      api.request(weatherPath(location ?? "Beograd"), weatherSchema, {
        signal,
      }),
    enabled: location !== null,
    staleTime: 15 * 60_000,
    gcTime: 30 * 60_000,
    retry: false,
  });
  const data = query.data?.data;
  const localDay = new Intl.DateTimeFormat("sv-SE", {
    timeZone: timezone,
  }).format(new Date());
  const labelsMatch = data?.forecast[0]?.date === localDay;

  async function select(place: WeatherLocation) {
    setLocation(place);
    setOpen(false);
    setSaveFailed(false);
    setSaving(true);
    try {
      await storage.setItem(preferenceKey, place);
    } catch {
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <Text accessibilityRole="header" style={styles.section}>
        Vremenska prognoza
      </Text>
      <Button
        label={location ? "Mesto: " + location : "Izbor mesta"}
        disabled={!location || saving}
        onPress={() => setOpen(true)}
      />
      {saveFailed && (
        <Text style={styles.muted}>Izbor mesta nije sačuvan.</Text>
      )}
      {query.isPending && <Loading />}
      {query.error && (
        <ErrorState
          error={query.error}
          message="Vremenska prognoza trenutno nije dostupna."
          compact
          retryDisabled={query.isFetching}
          retry={() => void query.refetch({ cancelRefetch: false })}
        />
      )}
      {data && (
        <>
          {(data.stale || query.error) && (
            <Text style={styles.muted}>Prikazani su stariji podaci.</Text>
          )}
          <Text style={styles.text}>
            {formatNumber(data.current.temperatureC)} °C ·{" "}
            {data.current.condition.text}
          </Text>
          <Text style={styles.muted}>
            Padavine {formatNumber(data.current.precipitationMm)} mm · Vetar{" "}
            {formatNumber(data.current.windKph)} km/h
          </Text>
          {data.forecast.map((day, index) => (
            <View key={day.date}>
              <Text style={styles.text}>
                {labelsMatch
                  ? dayLabels[index]
                  : new Date(day.date + "T12:00:00Z").toLocaleDateString(
                      locale,
                      { day: "numeric", month: "short", timeZone: timezone },
                    )}
                {" · "}
                {formatNumber(day.minTemperatureC)} /{" "}
                {formatNumber(day.maxTemperatureC)} °C · {day.condition.text}
              </Text>
              <Text style={styles.muted}>
                {formatNumber(day.precipitationMm)} mm · Kiša{" "}
                {formatNumber(day.rainChancePercent)}% · Vetar do{" "}
                {formatNumber(day.maxWindKph)} km/h
              </Text>
            </View>
          ))}
          <Text style={styles.muted}>
            Ažurirano{" "}
            {new Date(data.updatedAt).toLocaleString(locale, {
              dateStyle: "short",
              timeStyle: "short",
              timeZone: timezone,
            })}
          </Text>
          <ExternalLink title="Izvor: WeatherAPI.com" url={data.source.url} />
        </>
      )}
      {open && (
        <Modal
          visible
          animationType="slide"
          onRequestClose={() => setOpen(false)}
        >
          <View
            accessibilityViewIsModal
            style={{
              flex: 1,
              backgroundColor: theme.color.background,
              paddingTop: insets.top + theme.space.md,
              paddingBottom: insets.bottom + theme.space.md,
              paddingHorizontal: theme.space.md,
              gap: theme.space.sm,
            }}
          >
            <Text accessibilityRole="header" style={styles.section}>
              Izaberite mesto
            </Text>
            <Button label="Zatvori izbor" onPress={() => setOpen(false)} />
            <FlatList
              data={weatherLocation.options}
              keyExtractor={(place) => place}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: item === location }}
                  style={{ minHeight: theme.touch, justifyContent: "center" }}
                  onPress={() => void select(item)}
                >
                  <Text style={styles.text}>
                    {item}
                    {item === location ? " ✓" : ""}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Modal>
      )}
    </Card>
  );
}
