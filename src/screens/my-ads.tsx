import React, { useEffect, useRef, useState } from "react";
import { Image, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api, session } from "../runtime";
import { useAuth } from "../auth/provider";
import { ApiError } from "../core/errors";
import { adId } from "../api/ads";
import { listingCategories } from "../api/ads-catalog";
import {
  editBody,
  editForm,
  myAdSchema,
  myAdsSchema,
  myEditSchema,
  ownerAdsKey,
  ownerAdsPath,
  ownerOk,
  renewed,
  type MyAd,
  type MyEdit,
  type OwnerAction,
} from "../api/my-ads";
import { validateAd } from "../ads/submission";
import { AdFieldsForm } from "../components/ad-fields";
import {
  Body,
  Button,
  Card,
  ErrorState,
  Loading,
  Screen,
  styles,
} from "../components/ui";
import { Field } from "../components/content";

const statuses = {
  draft: "Nije objavljen",
  active: "Aktivan",
  expired: "Istekao",
  withdrawn: "Povučen",
  completed: "Završen",
  suspended: "Suspendovan",
  pending_review: "Čeka pregled",
  changes_requested: "Vraćen na dopunu",
  rejected: "Odbijen",
  approved: "Odobren",
};
const labels: Record<OwnerAction, string> = {
  edit: "Izmeni",
  withdraw: "Povuci oglas",
  complete: "Označi kao završen",
  renew: "Obnovi oglas",
};
const confirmations = {
  withdraw: "Povlačenjem oglas više neće biti javno vidljiv.",
  complete: "Oglas će biti označen kao završen i više neće biti javno vidljiv.",
  renew: "Potvrdite da je ponuda i dalje aktuelna i da želite obnovu oglasa.",
};
const date = (value: string | null) =>
  value && Number.isFinite(Date.parse(value))
    ? new Intl.DateTimeFormat("sr-Latn-RS", {
        dateStyle: "medium",
        timeZone: "Europe/Belgrade",
      }).format(new Date(value))
    : null;
const category = (value: string | null) =>
  value &&
  (listingCategories[value as keyof typeof listingCategories] ?? value);
const confirmOk = z.string().startsWith("data:image/");
const pageSize = 20;
function ownerRead<T extends z.ZodTypeAny>(
  owner: string,
  path: string,
  schema: T,
  options: { signal: AbortSignal; private: true; responseImage?: boolean },
) {
  if (session.session?.user.id !== owner)
    throw new ApiError("unauthenticated", 401);
  return api.request(path, schema, options);
}

function OwnerGate({
  children,
  title,
}: {
  children: (owner: string) => React.ReactNode;
  title: string;
}) {
  const auth = useAuth();
  return (
    <Screen>
      <Text style={styles.title}>{title}</Text>
      {auth.status === "checking" ? (
        <Loading />
      ) : auth.status === "signedIn" && auth.me ? (
        <React.Fragment key={auth.me.user.id}>
          {children(auth.me.user.id)}
        </React.Fragment>
      ) : (
        <Card>
          <Body>
            Prijavite se da biste videli svoje male oglase. Registrovano
            gazdinstvo nije uslov.
          </Body>
          <Button
            label="Prijavite se"
            onPress={() => router.push("/auth/login")}
          />
          <Button
            label="Besplatna registracija"
            onPress={() => router.push("/auth/register")}
          />
        </Card>
      )}
    </Screen>
  );
}

function Failure({
  error,
  retry,
  conflict,
}: {
  error: unknown;
  retry?: () => void;
  conflict?: string;
}) {
  const status = error instanceof ApiError ? error.status : undefined;
  const message =
    status === 401 || status === 403
      ? "Prijavite se ponovo da biste pristupili oglasima."
      : status === 404
        ? "Oglas ili traženi podatak nije dostupan."
        : status === 409
          ? (conflict ??
            "Stanje oglasa je promenjeno ili radnja više nije dozvoljena. Osvežite podatke.")
          : status === 422
            ? "Proverite podatke i pokušajte ponovo."
            : status === 413
              ? "Zahtev je prevelik za slanje."
              : undefined;
  return <ErrorState error={error} message={message} retry={retry} compact />;
}

function Summary({ ad }: { ad: MyAd }) {
  return (
    <>
      <Text style={styles.section}>{ad.title ?? "Oglas bez naslova"}</Text>
      <Field title="Rubrika" value={category(ad.category)} />
      <Field title="Status" value={statuses[ad.status]} />
      <Field title="Ističe" value={date(ad.expiresAt)} />
      {ad.hasPendingReview && <Body>Izmena čeka urednički pregled.</Body>}
    </>
  );
}

function useOwnerSignal() {
  const lifetime = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => controller.abort();
  }, []);
  return lifetime;
}

function AdsList({ owner }: { owner: string }) {
  const [offset, setOffset] = useState(0);
  const query = useQuery({
    queryKey: [...ownerAdsKey(owner), "list", offset],
    queryFn: ({ signal }) =>
      ownerRead(
        owner,
        "/me/ads?limit=" + pageSize + "&offset=" + offset,
        myAdsSchema,
        { private: true, signal },
      ),
  });
  const data = query.data?.data;
  return (
    <>
      <Button
        label="Predajte mali oglas"
        onPress={() => router.push("/more/ads/new")}
      />
      {query.isLoading && <Loading />}
      {query.isPaused && !data && (
        <Body>Lista će se učitati po povratku internet veze.</Body>
      )}
      {query.error && (
        <Failure
          error={query.error}
          retry={() => void query.refetch({ cancelRefetch: false })}
        />
      )}
      {!query.error && data?.items.length === 0 && offset === 0 && (
        <Body>
          Još nemate malih oglasa. Prvi oglas možete predati besplatno.
        </Body>
      )}
      {data?.items.map((ad) => (
        <Card key={ad.id}>
          <Summary ad={ad} />
          {ad.actions.length > 0 && (
            <Body>
              Dostupno: {ad.actions.map((action) => labels[action]).join(" · ")}
            </Body>
          )}
          <Button
            label="Otvori oglas"
            onPress={() =>
              router.push({
                pathname: "/more/my-ads/[id]",
                params: { id: ad.id },
              })
            }
          />
        </Card>
      ))}
      {offset > 0 && (
        <Button
          label="Prethodna strana"
          onPress={() => setOffset(Math.max(0, offset - pageSize))}
        />
      )}
      {data?.pagination.nextOffset != null && (
        <Button
          label="Sledeća strana"
          onPress={() => setOffset(data.pagination.nextOffset!)}
        />
      )}
    </>
  );
}

function OwnerPhoto({
  owner,
  id,
  photo,
}: {
  owner: string;
  id: string;
  photo: string;
}) {
  const query = useQuery({
    queryKey: [...ownerAdsKey(owner), "photo", id, photo],
    queryFn: ({ signal }) =>
      ownerRead(
        owner,
        ownerAdsPath(id) + "/photo/" + adId.parse(photo),
        confirmOk,
        {
          private: true,
          responseImage: true,
          signal,
        },
      ),
    gcTime: 0,
  });
  return (
    <>
      {query.isLoading && <Loading />}
      {query.isPaused && !query.data && (
        <Body>Fotografija će se učitati po povratku veze.</Body>
      )}
      {query.error && (
        <Failure
          error={query.error}
          retry={() => void query.refetch({ cancelRefetch: false })}
        />
      )}
      {query.data && !query.error && (
        <Image
          accessibilityLabel="Privatna fotografija oglasa"
          source={{ uri: query.data.data }}
          resizeMode="contain"
          style={{ width: "100%", maxWidth: 360, aspectRatio: 4 / 3 }}
        />
      )}
    </>
  );
}

function Detail({ owner, id }: { owner: string; id: string }) {
  const client = useQueryClient();
  const lifetime = useOwnerSignal();
  const inFlight = useRef(false);
  const [confirm, setConfirm] = useState<Exclude<OwnerAction, "edit">>();
  const [photo, setPhoto] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const query = useQuery({
    queryKey: [...ownerAdsKey(owner), "detail", id],
    queryFn: ({ signal }) =>
      ownerRead(owner, ownerAdsPath(id), myAdSchema, { private: true, signal }),
    refetchOnMount: "always",
  });
  const data = query.data?.data;
  const act = async () => {
    const signal = lifetime.current?.signal;
    if (
      !signal ||
      signal.aborted ||
      !confirm ||
      !data?.actions.includes(confirm) ||
      inFlight.current ||
      session.session?.user.id !== owner
    )
      return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const path = ownerAdsPath(id) + "/" + confirm;
      if (confirm === "renew")
        await api.request(path, renewed, {
          private: true,
          method: "POST",
          signal,
          body: { confirmed: true, expectedExpiry: data.expiresAt },
        });
      else
        await api.request(path, ownerOk, {
          private: true,
          method: "POST",
          signal,
        });
      if (signal.aborted || session.session?.user.id !== owner) return;
      setConfirm(undefined);
      await client.invalidateQueries({ queryKey: ownerAdsKey(owner) });
    } catch (cause) {
      if (!signal.aborted) {
        setError(cause);
        if (cause instanceof ApiError && cause.status === 409)
          void client.invalidateQueries({ queryKey: ownerAdsKey(owner) });
      }
    } finally {
      inFlight.current = false;
      if (!signal.aborted) setBusy(false);
    }
  };
  return (
    <>
      {query.isLoading && <Loading />}
      {query.isPaused && !data && (
        <Body>Detalj će se učitati po povratku veze.</Body>
      )}
      {query.error && (
        <Failure
          error={query.error}
          retry={() => void query.refetch({ cancelRefetch: false })}
        />
      )}
      {data && !query.error && (
        <>
          <Card>
            <Summary ad={data} />
            <Field title="Opis" value={data.description} />
            <Field title="Objavljeno" value={date(data.publishedAt)} />
            {data.actions.map((action) => (
              <Button
                key={action}
                label={labels[action]}
                disabled={busy || query.isFetching}
                onPress={() => {
                  setError(null);
                  if (action === "edit")
                    router.push({
                      pathname: "/more/my-ads/[id]/edit",
                      params: { id },
                    });
                  else setConfirm(action);
                }}
              />
            ))}
            {confirm && data.actions.includes(confirm) && (
              <>
                <Body>{confirmations[confirm]}</Body>
                <Button
                  label={busy ? "Sačekajte…" : "Potvrdi"}
                  disabled={busy}
                  onPress={() => void act()}
                />
                <Button
                  label="Odustani"
                  disabled={busy}
                  onPress={() => setConfirm(undefined)}
                />
              </>
            )}
            {error != null && <Failure error={error} />}
          </Card>
          {data.versions.map((version, i) => (
            <Card key={version.id}>
              <Text style={styles.section}>
                Verzija {i + 1} · {statuses[version.reviewStatus]}
              </Text>
              {version.reason && (
                <Field title="Odluka uredništva" value={version.reason} />
              )}
              {version.photos.map((item, index) => (
                <Button
                  key={item.id}
                  label={
                    photo === item.id
                      ? "Sakrij fotografiju " + (index + 1)
                      : "Prikaži fotografiju " + (index + 1)
                  }
                  onPress={() =>
                    setPhoto(photo === item.id ? undefined : item.id)
                  }
                />
              ))}
              {photo && version.photos.some((item) => item.id === photo) && (
                <OwnerPhoto key={photo} owner={owner} id={id} photo={photo} />
              )}
            </Card>
          ))}
        </>
      )}
    </>
  );
}

function Edit({ owner, id }: { owner: string; id: string }) {
  const query = useQuery({
    queryKey: [...ownerAdsKey(owner), "edit", id],
    queryFn: ({ signal }) =>
      ownerRead(owner, ownerAdsPath(id) + "/edit", myEditSchema, {
        private: true,
        signal,
      }),
    refetchOnMount: "always",
    gcTime: 0,
  });
  const data = query.data?.data;
  if (query.error && !data)
    return (
      <Failure
        error={query.error}
        conflict="Izmena već čeka pregled ili oglas trenutno nije moguće menjati."
        retry={() => void query.refetch({ cancelRefetch: false })}
      />
    );
  if (query.isPaused && !data)
    return <Body>Formular će se učitati po povratku veze.</Body>;
  return data && query.isFetchedAfterMount ? (
    <Editor
      key={id}
      owner={owner}
      edit={data}
      blocked={
        query.error instanceof ApiError &&
        [403, 404, 409].includes(query.error.status)
      }
    />
  ) : (
    <Loading />
  );
}

function Editor({
  owner,
  edit,
  blocked,
}: {
  owner: string;
  edit: MyEdit;
  blocked: boolean;
}) {
  const [snapshot] = useState(edit);
  const [form, setForm] = useState(() => editForm(snapshot.fields));
  const [kept, setKept] = useState(() => snapshot.photos.map((p) => p.id));
  const [photo, setPhoto] = useState<string>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const inFlight = useRef(false);
  const lifetime = useOwnerSignal();
  const client = useQueryClient();
  const save = async () => {
    const signal = lifetime.current?.signal;
    if (
      blocked ||
      !signal ||
      signal.aborted ||
      inFlight.current ||
      session.session?.user.id !== owner
    )
      return;
    setMessage("");
    setError(null);
    const result = validateAd(form);
    if (!result.fields) {
      setMessage(result.error);
      return;
    }
    let body;
    try {
      body = editBody(snapshot, result.fields, kept);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Proverite podatke.");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    try {
      await api.request(ownerAdsPath(snapshot.id), ownerOk, {
        private: true,
        method: "PUT",
        body,
        signal,
      });
      if (signal.aborted || session.session?.user.id !== owner) return;
      setSaved(true);
      await client.invalidateQueries({
        queryKey: ownerAdsKey(owner),
        predicate: (q) =>
          q.queryKey[3] === "list" || q.queryKey[3] === "detail",
      });
    } catch (cause) {
      if (!signal.aborted) setError(cause);
    } finally {
      inFlight.current = false;
      if (!signal.aborted) setBusy(false);
    }
  };
  if (saved)
    return (
      <Card>
        <Body>Izmena je poslata na urednički pregled.</Body>
        <Button
          label="Nazad na oglas"
          onPress={() =>
            router.dismissTo({
              pathname: "/more/my-ads/[id]",
              params: { id: snapshot.id },
            })
          }
        />
      </Card>
    );
  return (
    <Card>
      {blocked && (
        <Body>
          Oglas više nije dostupan za izmenu ili već čeka pregled. Unosi su
          sačuvani dok je ekran otvoren.
        </Body>
      )}
      <AdFieldsForm
        form={form}
        disabled={busy || blocked}
        set={(key, value) =>
          setForm((previous) => ({
            ...previous,
            [key]: value,
            ...(key === "category" ? { type: "" } : {}),
          }))
        }
      />
      <Text style={styles.section}>Postojeće fotografije</Text>
      <Body>
        Možete pregledati, zadržati ili ukloniti postojeće fotografije.
        Dodavanje novih pri izmeni privremeno nije dostupno dok se ne potvrdi
        bezbedna veličina zahteva.
      </Body>
      {snapshot.photos.map((item, index) => (
        <React.Fragment key={item.id}>
          <Button
            label={
              (photo === item.id ? "Sakrij" : "Prikaži") +
              " fotografiju " +
              (index + 1)
            }
            onPress={() => setPhoto(photo === item.id ? undefined : item.id)}
          />
          <Button
            label={
              (kept.includes(item.id) ? "Ukloni" : "Zadrži") +
              " fotografiju " +
              (index + 1)
            }
            disabled={busy || blocked}
            onPress={() =>
              setKept((previous) =>
                previous.includes(item.id)
                  ? previous.filter((id) => id !== item.id)
                  : snapshot.photos
                      .map((p) => p.id)
                      .filter((id) => id === item.id || previous.includes(id)),
              )
            }
          />
          {photo === item.id && (
            <OwnerPhoto owner={owner} id={snapshot.id} photo={item.id} />
          )}
        </React.Fragment>
      ))}
      <Body>
        Prethodno odobrena verzija ostaje javna dok uredništvo ne odobri izmenu.
      </Body>
      {!!message && (
        <Text accessibilityRole="alert" style={styles.text}>
          {message}
        </Text>
      )}
      {error != null && (
        <Failure
          error={error}
          conflict="Izmena već čeka pregled ili je oglas promenjen. Vaši unosi nisu obrisani."
        />
      )}
      <Button
        label={busy ? "Slanje…" : "Pošalji izmenu na pregled"}
        disabled={busy || blocked}
        onPress={() => void save()}
      />
    </Card>
  );
}

export function MyAdsList() {
  return (
    <OwnerGate title="Moji oglasi">
      {(owner) => <AdsList owner={owner} />}
    </OwnerGate>
  );
}
export function MyAdsDetail() {
  const id = adId.safeParse(useLocalSearchParams<{ id?: string }>().id);
  return (
    <OwnerGate title="Moj oglas">
      {(owner) =>
        id.success ? (
          <Detail owner={owner} id={id.data} />
        ) : (
          <Body>Oglas nije dostupan.</Body>
        )
      }
    </OwnerGate>
  );
}
export function MyAdsEdit() {
  const id = adId.safeParse(useLocalSearchParams<{ id?: string }>().id);
  return (
    <OwnerGate title="Izmena oglasa">
      {(owner) =>
        id.success ? (
          <Edit owner={owner} id={id.data} />
        ) : (
          <Body>Oglas nije dostupan.</Body>
        )
      }
    </OwnerGate>
  );
}
