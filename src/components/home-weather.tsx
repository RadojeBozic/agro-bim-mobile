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

function weatherIcon(code: number) {
  switch (code) {
    case 1000:
      return "☀️";
    case 1003:
      return "⛅";
    case 1006:
    case 1009:
      return "☁️";
    case 1030:
    case 1135:
    case 1147:
      return "🌫️";
    case 1063:
    case 1150:
    case 1153:
    case 1180:
    case 1183:
    case 1186:
    case 1189:
    case 1192:
    case 1195:
    case 1240:
    case 1243:
    case 1246:
      return "🌧️";
    case 1066:
    case 1114:
    case 1117:
    case 1210:
    case 1213:
    case 1216:
    case 1219:
    case 1222:
    case 1225:
    case 1255:
    case 1258:
      return "❄️";
    case 1087:
    case 1273:
    case 1276:
    case 1279:
    case 1282:
      return "⛈️";
    default:
      return "◌";
  }
}
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
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          columnGap: theme.space.sm,
        }}
      >
        <Text
          accessibilityRole="header"
          style={[styles.section, { flexShrink: 1 }]}
        >
          Vremenska prognoza
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={location ? "Mesto: " + location : "Izbor mesta"}
          accessibilityState={{ disabled: !location || saving, expanded: open }}
          disabled={!location || saving}
          onPress={() => setOpen(true)}
          style={{
            minHeight: theme.touch,
            maxWidth: "100%",
            justifyContent: "center",
          }}
        >
          <Text style={[styles.muted, { color: theme.color.primary }]}>
            {location ?? "Izbor mesta"} ⌄
          </Text>
        </Pressable>
      </View>
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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: theme.space.sm,
            }}
          >
            <Text
              accessible={false}
              importantForAccessibility="no"
              style={{ fontSize: 30 }}
            >
              {weatherIcon(data.current.condition.code)}
            </Text>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.title, { fontSize: 32 }]}>
                {formatNumber(data.current.temperatureC)} °C
              </Text>
              <Text style={styles.text}>{data.current.condition.text}</Text>
            </View>
          </View>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              columnGap: theme.space.md,
            }}
          >
            <Text style={styles.muted}>
              Padavine {formatNumber(data.current.precipitationMm)} mm
            </Text>
            <Text style={styles.muted}>
              Vetar {formatNumber(data.current.windKph)} km/h
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: theme.space.xs,
            }}
          >
            {data.forecast.map((day, index) => (
              <View
                key={day.date}
                style={{
                  flexBasis: 80,
                  flexGrow: 1,
                  minWidth: 0,
                  paddingVertical: theme.space.sm,
                  paddingHorizontal: theme.space.xs,
                  borderRadius: theme.radius.button,
                  backgroundColor: theme.color.background,
                  gap: theme.space.xs,
                }}
              >
                <Text
                  style={[
                    styles.muted,
                    { textAlign: "center", fontWeight: "600" },
                  ]}
                >
                  {labelsMatch
                    ? dayLabels[index]
                    : new Date(day.date + "T12:00:00Z").toLocaleDateString(
                        locale,
                        { day: "numeric", month: "short", timeZone: timezone },
                      )}
                </Text>
                <Text
                  accessibilityLabel={day.condition.text}
                  style={{ fontSize: 22, textAlign: "center" }}
                >
                  {weatherIcon(day.condition.code)}
                </Text>
                <Text
                  style={[
                    styles.text,
                    { textAlign: "center", fontWeight: "600" },
                  ]}
                >
                  {formatNumber(day.minTemperatureC)}° /{" "}
                  {formatNumber(day.maxTemperatureC)}°
                </Text>
                <Text style={[styles.muted, { textAlign: "center" }]}>
                  Kiša {formatNumber(day.rainChancePercent)}%
                </Text>
                <Text
                  style={[styles.muted, { textAlign: "center" }]}
                  accessibilityLabel={`Padavine ${formatNumber(day.precipitationMm)} mm`}
                >
                  {formatNumber(day.precipitationMm)} mm
                </Text>
                <Text
                  style={[styles.muted, { textAlign: "center" }]}
                  accessibilityLabel={`Vetar do ${formatNumber(day.maxWindKph)} km/h`}
                >
                  {formatNumber(day.maxWindKph)} km/h
                </Text>
              </View>
            ))}
          </View>
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
