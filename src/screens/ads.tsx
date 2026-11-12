import React, { useRef, useState } from "react";
import {
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../runtime";
import { useAuth } from "../auth/provider";
import { config } from "../config/environment";
import { ApiError } from "../core/errors";
import {
  Body,
  Button,
  Card,
  ErrorState,
  Loading,
  Screen,
  styles,
} from "../components/ui";
import { ExternalLink, Field } from "../components/content";
import { theme } from "../theme";
import {
  listingCategories,
  listingTypes,
  proposedCategoryPolicy,
} from "../api/ads-catalog";
import municipalities from "../api/ads-municipalities.json";
import {
  adDetailSchema,
  adId,
  adListSchema,
  adPhoneSchema,
  adPhotoUrl,
  adPrice,
  adsListPath,
  adSorts,
  defaultAdFilters,
  nextAdsPage,
  type AdFilters,
  type AdSummary,
} from "../api/ads";

type Option = { value: string; label: string };
const options = (values: Record<string, string>): Option[] =>
  Object.entries(values).map(([value, label]) => ({ value, label }));
const categories = options(listingCategories);
const types = options(listingTypes);
const towns = municipalities.items.map(({ code, name }) => ({
  value: code,
  label: name,
}));
const sorts = options(adSorts);
const all = (label: string) => ({ value: "", label });
const labelFor = (items: Option[], value: string, fallback: string) =>
  items.find((item) => item.value === value)?.label ?? fallback;

export function Picker({
  title,
  items,
  value,
  onSelect,
  searchable = false,
  disabled = false,
}: {
  title: string;
  items: Option[];
  value: string;
  onSelect: (value: string) => void;
  searchable?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const normalized = search.trim().toLocaleLowerCase("sr-Latn");
  const close = () => setOpen(false);
  const insets = useSafeAreaInsets();
  return (
    <>
      <Button
        disabled={disabled}
        label={title + ": " + labelFor(items, value, "Sve")}
        onPress={() => {
          setSearch("");
          setOpen(true);
        }}
      />
      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={close}
        presentationStyle="pageSheet"
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
          <Text style={styles.section}>{title}</Text>
          <Button label="Zatvori izbor" onPress={close} />
          {searchable && (
            <TextInput
              style={styles.input}
              accessibilityLabel="Pretraži opštine"
              placeholder="Pretraži opštine"
              value={search}
              onChangeText={setSearch}
            />
          )}
          <FlatList
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            data={items.filter(
              (item) =>
                !item.value ||
                item.label.toLocaleLowerCase("sr-Latn").includes(normalized),
            )}
            keyExtractor={(item) => item.value || "all"}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: value === item.value }}
                style={{
                  minHeight: theme.touch,
                  justifyContent: "center",
                  padding: theme.space.sm,
                }}
                onPress={() => {
                  onSelect(item.value);
                  close();
                }}
              >
                <Body>
                  {item.label}
                  {value === item.value ? " ✓" : ""}
                </Body>
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

function Photo({
  listingId,
  photoId,
  label,
}: {
  listingId: string;
  photoId: string;
  label: string;
}) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <Body>Fotografija nije dostupna.</Body>
  ) : (
    <Image
      accessibilityLabel={label}
      accessible
      source={{
        uri: adPhotoUrl(config.apiBase, listingId, photoId),
        cache: "reload",
      }}
      onError={() => setFailed(true)}
      resizeMode="contain"
      style={{
        width: "100%",
        aspectRatio: 4 / 3,
        backgroundColor: theme.color.background,
      }}
    />
  );
}

function Facts({ ad }: { ad: AdSummary }) {
  return (
    <>
      <Field title="Vrsta" value={labelFor(types, ad.type, ad.type)} />
      <Field
        title="Rubrika"
        value={labelFor(categories, ad.category, ad.category)}
      />
      <Field
        title="Mesto"
        value={[ad.settlement, ad.municipality]
          .filter(Boolean)
          .filter((v, i, a) => a.indexOf(v) === i)
          .join(", ")}
      />
      <Field title="Cena" value={adPrice(ad)} />
    </>
  );
}

export function AdsList() {
  const [draft, setDraft] = useState("");
  const [filters, setFilters] = useState(defaultAdFilters);
  const [page, setPage] = useState(1);
  const change = (patch: Partial<AdFilters>) => {
    setPage(1);
    setFilters((current) => ({ ...current, ...patch }));
  };
  const search = () => change({ q: draft.trim() });
  const path = adsListPath(filters, page);
  const query = useQuery({
    queryKey: ["public", "ads", "list", path],
    queryFn: ({ signal }) => api.request(path, adListSchema, { signal }),
    staleTime: 0,
  });
  const data = query.data?.data;
  const next = data && nextAdsPage(page, data.total);
  const refresh = () => void query.refetch({ cancelRefetch: false });
  const allowedTypes = filters.category
    ? types.filter(({ value }) =>
        proposedCategoryPolicy[
          filters.category as keyof typeof listingCategories
        ].some((type) => type === value),
      )
    : types;
  return (
    <Screen refreshing={query.isRefetching} onRefresh={refresh}>
      <Text style={styles.title}>Agro Oglasi</Text>
      <Button
        label="Predajte mali oglas"
        onPress={() => router.push("/more/ads/new")}
      />
      <Card>
        <TextInput
          style={styles.input}
          placeholder="Pretraži oglase"
          accessibilityLabel="Pretraži oglase"
          value={draft}
          maxLength={100}
          onChangeText={setDraft}
          returnKeyType="search"
          onSubmitEditing={search}
        />
        <Button label="Pretraži" onPress={search} />
        <Picker
          title="Rubrika"
          items={[all("Sve rubrike"), ...categories]}
          value={filters.category}
          onSelect={(category) => change({ category, type: "" })}
        />
        <Picker
          title="Vrsta oglasa"
          items={[all("Sve vrste"), ...allowedTypes]}
          value={filters.type}
          onSelect={(type) => change({ type })}
        />
        <Picker
          title="Opština"
          items={[all("Sve opštine"), ...towns]}
          value={filters.municipality}
          onSelect={(municipality) => change({ municipality })}
          searchable
        />
        <Picker
          title="Sortiranje"
          items={sorts}
          value={filters.sort}
          onSelect={(sort) => change({ sort: sort as AdFilters["sort"] })}
        />
      </Card>
      {query.isPaused && !data && (
        <Body>Nema internet veze. Oglasi će se učitati po povratku veze.</Body>
      )}
      {query.isPending && !query.isPaused && <Loading />}
      {query.error && (
        <ErrorState
          error={query.error}
          compact={!!data}
          retry={refresh}
          retryDisabled={query.isFetching}
        />
      )}
      {data?.items.map((ad) => (
        <Card key={ad.id}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ad.title}
            accessibilityHint="Otvori detalj oglasa"
            style={{ gap: theme.space.sm }}
            onPress={() =>
              router.push({ pathname: "/more/ads/[id]", params: { id: ad.id } })
            }
          >
            {ad.coverPhotoId && (
              <Photo
                key={ad.coverPhotoId}
                listingId={ad.id}
                photoId={ad.coverPhotoId}
                label="Naslovna fotografija oglasa"
              />
            )}
            <Text style={styles.section}>{ad.title}</Text>
            <Facts ad={ad} />
          </Pressable>
        </Card>
      ))}
      {!query.error && data?.items.length === 0 && (
        <Body>Nema oglasa za izabranu pretragu i filtere.</Body>
      )}
      {data && (
        <Body>
          Strana {page} · Pronađeno oglasa: {data.total}
        </Body>
      )}
      {page > 1 && (
        <Button label="Prethodna strana" onPress={() => setPage(page - 1)} />
      )}
      {next != null && (
        <Button label="Sledeća strana" onPress={() => setPage(next)} />
      )}
    </Screen>
  );
}

function AdContact({
  id,
  advertiser,
  messagingAvailable,
}: {
  id: string;
  advertiser?: string;
  messagingAvailable?: boolean;
}) {
  const auth = useAuth();
  const [phone, setPhone] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const revealing = useRef(false);
  const url = "https://agrobim.digital/oglasi/" + id;

  const reveal = async () => {
    if (revealing.current) return;
    revealing.current = true;
    setBusy(true);
    setMessage("");
    try {
      const result = await api.request("/ads/" + id + "/phone", adPhoneSchema, {
        method: "POST",
        private: auth.status === "signedIn",
      });
      setPhone(result.data.phone);
    } catch {
      setMessage("Telefon trenutno nije dostupan. Pokušajte ponovo kasnije.");
    } finally {
      revealing.current = false;
      setBusy(false);
    }
  };

  const call = async () => {
    const number = phone?.replace(/[^+0-9]/g, "");
    if (!number || !/^\+?\d+$/.test(number)) {
      setMessage("Broj nije u formatu za pozivanje.");
      return;
    }
    setMessage("");
    try {
      await Linking.openURL("tel:" + number);
    } catch {
      setMessage("Telefonska aplikacija nije dostupna.");
    }
  };

  const share = async () => {
    setMessage("");
    try {
      await Share.share({ message: url });
    } catch {
      setMessage("Deljenje oglasa trenutno nije dostupno.");
    }
  };

  return (
    <Card>
      <Text style={styles.section}>Kontakt</Text>
      {advertiser && <Field title="Oglašivač" value={advertiser} />}
      {phone ? (
        <Button label={"Pozovi " + phone} onPress={() => void call()} />
      ) : (
        <Button
          label="Prikaži telefon"
          disabled={busy}
          onPress={() => void reveal()}
        />
      )}
      <Button label="Podeli oglas" onPress={() => void share()} />
      {messagingAvailable && (
        <ExternalLink title="Pošaljite poruku" url={url} />
      )}
      {!!message && (
        <Text accessibilityRole="alert" style={styles.text}>
          {message}
        </Text>
      )}
    </Card>
  );
}

export function AdsDetail() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const parsed = adId.safeParse(id);
  const query = useQuery({
    queryKey: ["public", "ads", "detail", id],
    enabled: parsed.success,
    queryFn: ({ signal }) =>
      api.request("/ads/" + adId.parse(id), adDetailSchema, { signal }),
    staleTime: 0,
    refetchOnMount: "always",
    retry: (count, error) =>
      count < 1 && error instanceof ApiError && error.code === "network",
  });
  const unavailable =
    !parsed.success ||
    (query.error instanceof ApiError && query.error.status === 404);
  const data =
    query.isFetchedAfterMount && !unavailable ? query.data?.data : undefined;
  const refresh = () => void query.refetch({ cancelRefetch: false });
  return (
    <Screen
      refreshing={query.isRefetching}
      onRefresh={parsed.success && !unavailable ? refresh : undefined}
    >
      {unavailable ? (
        <Body>Oglas više nije javno dostupan.</Body>
      ) : (
        <>
          {query.isPaused && !data && (
            <Body>
              Nema internet veze. Detalj će se učitati po povratku veze.
            </Body>
          )}
          {!data && !query.error && !query.isPaused && <Loading />}
          {query.error && (
            <ErrorState
              error={query.error}
              retry={refresh}
              retryDisabled={query.isFetching}
            />
          )}
          {data && (
            <>
              <Text style={styles.title}>{data.title}</Text>
              <Card>
                <Body>{data.description}</Body>
                <Facts ad={data} />
                <Field
                  title="Objavljeno"
                  value={
                    data.publishedAt &&
                    Number.isFinite(Date.parse(data.publishedAt))
                      ? new Intl.DateTimeFormat("sr-Latn-RS", {
                          dateStyle: "medium",
                          timeZone: "Europe/Belgrade",
                        }).format(new Date(data.publishedAt))
                      : null
                  }
                />
                {Object.entries(data.attributes).map(([key, value]) => (
                  <Field key={key} title={key} value={value} />
                ))}
              </Card>
              <AdContact
                key={data.id}
                id={data.id}
                advertiser={data.advertiser}
                messagingAvailable={data.messagingAvailable}
              />
              {data.photos.map((photoId, index) => (
                <Photo
                  key={photoId}
                  listingId={data.id}
                  photoId={photoId}
                  label={"Fotografija oglasa " + (index + 1)}
                />
              ))}
            </>
          )}
        </>
      )}
    </Screen>
  );
}
