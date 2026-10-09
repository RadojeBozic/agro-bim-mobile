import React, { useState } from "react";
import { Text, TextInput, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../runtime";
import { page } from "../api/contracts";
import {
  stipsCodeSchema,
  stipsProductSchema,
  stipsDetailSchema,
} from "../api/stips-contracts";
import {
  Screen,
  Card,
  Body,
  Button,
  ErrorState,
  Loading,
  Timestamp,
  styles,
} from "../components/ui";
import { Attribution, Field } from "../components/content";
import { ApiError } from "../core/errors";
import { dateLabel, label } from "../content";
import {
  stipsLabel,
  locationLabel,
  priceLabel,
  samplePrice,
  StipsObservation,
} from "../stips";

const endpoint = "/market/stips/products";
function Period({ from, to }: { from: string | null; to: string | null }) {
  return (
    <Field
      title="Period"
      value={[dateLabel(from), dateLabel(to)].filter(Boolean).join(" – ")}
    />
  );
}
function Search({
  value,
  onChange,
  title,
  onSubmit,
}: {
  value: string;
  onChange: (s: string) => void;
  title: string;
  onSubmit: () => void;
}) {
  return (
    <Card>
      <TextInput
        style={styles.input}
        accessibilityLabel={title}
        placeholder={title}
        value={value}
        maxLength={120}
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
      />
      <Button label="Pretraži" onPress={onSubmit} />
    </Card>
  );
}
function Prices({ o }: { o: StipsObservation }) {
  return (
    <>
      <Field title="Dominantna cena" value={priceLabel(o.dominant, o)} />
      <Field
        title={o.priceRole === "dominant" ? "Dominantna cena" : "Cena"}
        value={priceLabel(o.single, o)}
      />
      <Field title="Najniža cena" value={priceLabel(o.minimum, o)} />
      <Field title="Najviša cena" value={priceLabel(o.maximum, o)} />
    </>
  );
}
function Pagination({
  offset,
  next,
  setOffset,
}: {
  offset: number;
  next: number | null | undefined;
  setOffset: (n: number) => void;
}) {
  return (
    <>
      {offset > 0 && (
        <Button
          label="Prethodna strana"
          onPress={() => setOffset(Math.max(0, offset - 20))}
        />
      )}
      {next != null && (
        <Button label="Sledeća strana" onPress={() => setOffset(next)} />
      )}
    </>
  );
}
export function StipsList() {
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const query = useQuery({
    queryKey: ["public", "stips", "products", search, offset],
    queryFn: ({ signal }) =>
      api.request(
        endpoint +
          "?limit=20&offset=" +
          offset +
          "&q=" +
          encodeURIComponent(search),
        page(stipsProductSchema),
        { signal },
      ),
  });
  const data = query.data?.data;
  const refresh = () => void query.refetch({ cancelRefetch: false });
  return (
    <Screen refreshing={query.isRefetching} onRefresh={refresh}>
      <Text style={styles.title}>Cenoteka</Text>
      <Text style={styles.section}>Pijačne i regionalne cene — STIPS</Text>
      <Body>
        Najnoviji dostupni period za svaki proizvod. Cene se odnose na navedeno
        mesto i vrstu tržišta.
      </Body>
      <Button
        label="Ponude dobavljača"
        onPress={() => router.push("/cenoteka/suppliers")}
      />
      <Search
        title="Pretraži proizvode"
        value={draft}
        onChange={setDraft}
        onSubmit={() => {
          setSearch(draft.trim());
          setOffset(0);
        }}
      />
      {query.isPending && <Loading />}
      {query.error && (
        <ErrorState
          error={query.error}
          message={
            query.error instanceof ApiError &&
            ["network", "timeout"].includes(query.error.code)
              ? undefined
              : "Podaci trenutno nisu dostupni. Pokušajte ponovo."
          }
          retry={refresh}
          retryDisabled={query.isFetching}
        />
      )}
      {data && <Timestamp value={query.dataUpdatedAt} />}
      {data?.items.map((p) => (
        <Card key={p.code}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={p.name}
            accessibilityHint="Otvori cene po mestima"
            style={{ minHeight: 48, justifyContent: "center" }}
            onPress={() =>
              router.push({
                pathname: "/cenoteka/stips/[code]",
                params: { code: p.code },
              })
            }
          >
            <Text style={styles.section}>{p.name} ›</Text>
          </Pressable>
          <Field title="Kategorija" value={stipsLabel(p.category)} />
          {p.sample && (
            <>
              <Body>
                {locationLabel(p.sample)} · {stipsLabel(p.sample.marketType)}
              </Body>
              <Body>{samplePrice(p.sample)}</Body>
              <Field title="Sorta / varijanta" value={p.sample.variety} />
              <Field title="Opis" value={p.sample.quality} />
              {Object.entries(p.sample.attributes).map(([k, v]) => (
                <Field key={k} title={stipsLabel(k)} value={v} />
              ))}
              <Field title="Aktuelnost" value={label(p.sample.freshness)} />
            </>
          )}
          <Period from={p.periodFrom} to={p.periodTo} />
          <Field title="Broj zapisa po mestima" value={p.observationCount} />
        </Card>
      ))}
      {!query.error && data?.items.length === 0 && (
        <Body>
          {search
            ? "Za ovu pretragu trenutno nema rezultata."
            : "Trenutno nema dostupnih STIPS cena."}
        </Body>
      )}
      <Pagination
        offset={offset}
        next={data?.pagination.nextOffset}
        setOffset={setOffset}
      />
    </Screen>
  );
}
export function StipsDetail() {
  const { code } = useLocalSearchParams<{ code?: string | string[] }>();
  const valid = stipsCodeSchema.safeParse(code);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const query = useQuery({
    queryKey: ["public", "stips", "detail", code, search, offset],
    enabled: valid.success,
    queryFn: ({ signal }) =>
      api.request(
        endpoint +
          "/" +
          stipsCodeSchema.parse(code) +
          "?limit=20&offset=" +
          offset +
          "&q=" +
          encodeURIComponent(search),
        stipsDetailSchema,
        { signal },
      ),
  });
  const data = query.data?.data;
  const refresh = () => void query.refetch({ cancelRefetch: false });
  return (
    <Screen
      refreshing={query.isRefetching}
      onRefresh={valid.success ? refresh : undefined}
    >
      {!valid.success ? (
        <ErrorState error={new ApiError("not_found", 404)} />
      ) : (
        <>
          {query.isPending && <Loading />}
          {query.error && (
            <ErrorState
              error={query.error}
              retry={refresh}
              retryDisabled={query.isFetching}
            />
          )}
          {data && (
            <>
              <Text style={styles.title}>{data.product.name}</Text>
              <Field
                title="Kategorija"
                value={stipsLabel(data.product.category)}
              />
              <Period
                from={data.product.periodFrom}
                to={data.product.periodTo}
              />
              <Body>
                Izvor: STIPS. Najnoviji dostupan period za ovaj proizvod. Cene
                su lokalne; sorte, pakovanja i vrste tržišta prikazani su uz
                svaki zapis.
              </Body>
              <Timestamp value={query.dataUpdatedAt} />
              {data.product.observationCount > 1 && (
                <Search
                  title="Pretraži grad ili pijacu"
                  value={draft}
                  onChange={setDraft}
                  onSubmit={() => {
                    setSearch(draft.trim());
                    setOffset(0);
                  }}
                />
              )}
              <Field title="Pronađeni zapisi" value={data.matchingCount} />
              {data.items.map((o) => (
                <Card key={o.id}>
                  <Text style={styles.section}>{locationLabel(o)}</Text>
                  <Body>{stipsLabel(o.marketType)}</Body>
                  <Field title="Sorta / varijanta" value={o.variety} />
                  <Field title="Opis" value={o.quality} />
                  {Object.entries(o.attributes).map(([k, v]) => (
                    <Field key={k} title={stipsLabel(k)} value={v} />
                  ))}
                  <Prices o={o} />
                  <Period from={o.periodFrom} to={o.periodTo} />
                  <Field
                    title="Bilten"
                    value={
                      o.bulletinNumber == null
                        ? null
                        : o.bulletinNumber + "/" + (o.reportYear ?? "")
                    }
                  />
                  <Field title="Aktuelnost" value={label(o.freshness)} />
                  <Attribution value={o.attribution} />
                </Card>
              ))}
              {data.items.length === 0 && (
                <Body>
                  {search
                    ? "Nema podataka za traženi grad ili pijacu."
                    : "Za ovaj proizvod trenutno nema dostupnih podataka po pijacama."}
                </Body>
              )}
              <Pagination
                offset={offset}
                next={data.pagination.nextOffset}
                setOffset={setOffset}
              />
            </>
          )}
        </>
      )}
    </Screen>
  );
}
