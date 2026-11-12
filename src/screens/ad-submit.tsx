import React, { useEffect, useRef, useState } from "react";
import { Image, Keyboard, Text, View } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { randomUUID } from "expo-crypto";
import { api, session } from "../runtime";
import { useAuth } from "../auth/provider";
import { ExternalLink, Field } from "../components/content";
import {
  Body,
  Button,
  Card,
  ErrorState,
  Loading,
  Screen,
  styles,
} from "../components/ui";
import { ApiError } from "../core/errors";
import { listingTypes } from "../api/ads-catalog";
import {
  AdFieldsForm,
  categoryOptions,
  townOptions,
} from "../components/ad-fields";
import { discardPreparedPhoto, prepareAdPhoto } from "../ads/photos";
import {
  adReceipt,
  initialAdForm,
  maxPhotoBytes,
  photoReceipt,
  photoRoom,
  sendAd,
  validateAd,
  type AdForm,
  type Attempt,
} from "../ads/submission";

const steps = ["Podaci o oglasu", "Fotografije", "Pregled i predaja"] as const;

export default function AdSubmission() {
  const auth = useAuth();
  return (
    <Screen>
      <Text style={styles.title}>Predajte mali oglas</Text>
      {auth.status === "checking" && <Loading />}
      {auth.me && auth.status !== "guest" && (
        <View
          key={auth.me.user.id}
          style={auth.status === "checking" ? { display: "none" } : undefined}
        >
          <AdFormScreen />
        </View>
      )}
      {(auth.status === "guest" ||
        (auth.status === "signedIn" && !auth.me)) && (
        <Card>
          <Body>
            Za predaju iz aplikacije potreban je besplatan AgroBIM nalog.
            Registrovano gazdinstvo nije uslov.
          </Body>
          <Button
            label="Prijavite se"
            onPress={() =>
              router.push({
                pathname: "/auth/login",
                params: { flow: "submit-ad" },
              })
            }
          />
          <Button
            label="Besplatna registracija"
            onPress={() =>
              router.push({
                pathname: "/auth/register",
                params: { flow: "submit-ad" },
              })
            }
          />
          <ExternalLink
            title="Predajte oglas na webu bez registracije"
            url="https://agrobim.digital/oglasi/novi"
          />
        </Card>
      )}
    </Screen>
  );
}

function AdFormScreen() {
  const [form, setForm] = useState(initialAdForm);
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [locked, setLocked] = useState(false);
  const [uploaded, setUploaded] = useState(0);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState<{
    cause: unknown;
    stage: string;
  } | null>(null);
  const attempt = useRef<Attempt | null>(null);
  const gate = useRef(false);
  const files = useRef<string[]>([]);
  const life = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    life.current = controller;
    return () => {
      controller.abort();
      for (const uri of files.current) discardPreparedPhoto(uri);
      files.current = [];
    };
  }, []);
  const set = (key: keyof AdForm, value: string) => {
    setMessage("");
    setForm((f) => ({
      ...f,
      [key]: value,
      ...(key === "category" ? { type: "" } : {}),
    }));
  };
  const updatePhotos = (next: string[]) => {
    files.current = next;
    setPhotos(next);
  };
  const choose = async (camera: boolean) => {
    const signal = life.current?.signal;
    const room = photoRoom(photos.length);
    if (locked || gate.current || !room || !signal || signal.aborted) return;
    gate.current = true;
    setPicking(true);
    setMessage("");
    try {
      if (
        camera &&
        !(await ImagePicker.requestCameraPermissionsAsync()).granted
      ) {
        if (!signal.aborted)
          setMessage(
            "Dozvolite pristup kameri ili izaberite fotografiju iz galerije.",
          );
        return;
      }
      const result = camera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"] })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsMultipleSelection: true,
            selectionLimit: room,
          });
      if (result.canceled || signal.aborted) return;
      for (const asset of result.assets.slice(0, room)) {
        const uri = await prepareAdPhoto(asset);
        if (signal.aborted) {
          discardPreparedPhoto(uri);
          return;
        }
        updatePhotos([...files.current, uri]);
      }
    } catch {
      if (!signal.aborted)
        setMessage(
          "Fotografija ne može da se pripremi. Izaberite drugu sliku.",
        );
    } finally {
      gate.current = false;
      if (!signal.aborted) setPicking(false);
    }
  };
  const next = () => {
    const result = validateAd(form);
    if (result.error) setMessage(result.error);
    else {
      Keyboard.dismiss();
      setMessage("");
      setStep(step + 1);
    }
  };
  const send = async () => {
    const signal = life.current?.signal;
    if (gate.current || !signal || signal.aborted) return;
    const result = validateAd(form);
    if (!result.fields) {
      setMessage(result.error);
      return;
    }
    gate.current = true;
    setBusy(true);
    setLocked(true);
    setMessage("");
    setFailure(null);
    const generation = session.generation();
    const verify = () => {
      if (signal.aborted || generation !== session.generation())
        throw new ApiError("unauthenticated", 401);
    };
    try {
      const current = attempt.current ?? {
        requestId: randomUUID(),
        uploaded: 0,
      };
      attempt.current = current;
      await sendAd(
        {
          create: async (body) => {
            verify();
            return (
              await api.request("/me/ads", adReceipt, {
                method: "POST",
                private: true,
                body,
                signal,
              })
            ).data;
          },
          upload: async (id, position, uri) => {
            verify();
            const file = new File(uri);
            if (!file.exists || !file.size || file.size > maxPhotoBytes)
              throw new Error("Pripremljena fotografija nije dostupna.");
            const bytes = await file.arrayBuffer();
            verify();
            if (!bytes.byteLength || bytes.byteLength > maxPhotoBytes)
              throw new Error("Pripremljena fotografija nije dostupna.");
            await api.request(
              "/me/ads/" + id + "/photos/" + position,
              photoReceipt,
              {
                method: "PUT",
                private: true,
                rawBody: { bytes, contentType: "image/jpeg" },
                signal,
              },
            );
          },
          submit: async (id) => {
            verify();
            return (
              await api.request("/me/ads/" + id + "/submit", adReceipt, {
                method: "POST",
                private: true,
                signal,
              })
            ).data;
          },
        },
        current,
        result.fields,
        photos,
        (count) => {
          if (!signal.aborted) setUploaded(count);
        },
      );
      verify();
      for (const uri of photos) discardPreparedPhoto(uri);
      updatePhotos([]);
      setSuccess(true);
    } catch (cause) {
      if (!signal.aborted) {
        const current = attempt.current;
        setFailure({
          cause,
          stage: !current?.listingId
            ? "Kreiranje nacrta"
            : current.uploaded < photos.length
              ? "Slanje fotografija"
              : "Završna predaja",
        });
        if (
          !attempt.current?.listingId &&
          cause instanceof ApiError &&
          cause.status === 400
        ) {
          // The create endpoint validates before any write.
          setLocked(false);
          attempt.current = null;
        }
      }
    } finally {
      gate.current = false;
      if (!signal.aborted) setBusy(false);
    }
  };

  const error = failure?.cause;
  const apiError = error instanceof ApiError ? error : null;

  if (success)
    return (
      <Card>
        <Text accessibilityRole="header" style={styles.section}>
          Oglas je poslat na pregled
        </Text>
        <Body>
          Oglas nije objavljen. Biće objavljen nakon odobrenja uredništva.
        </Body>
        <Button
          label="Nazad u Oglasnik"
          onPress={() => router.dismissTo("/more/ads")}
        />
      </Card>
    );
  return (
    <>
      <Text accessibilityRole="header" style={styles.section}>
        Korak {step + 1} od 3 · {steps[step]}
      </Text>
      {step > 0 && !!message && (
        <Text accessibilityRole="alert" style={styles.text}>
          {message}
        </Text>
      )}
      {step === 0 && (
        <Card>
          <AdFieldsForm form={form} set={set} disabled={locked} />
          {!!message && (
            <Text accessibilityRole="alert" style={styles.text}>
              {message}
            </Text>
          )}
          <Button label="Dalje na fotografije" onPress={next} />
        </Card>
      )}
      {step > 0 && (
        <Card>
          {step === 1 ? (
            <>
              <Body>Fotografije su opcione. Izaberite najviše pet.</Body>
              <Button
                label="Izaberite iz galerije"
                disabled={picking || !photoRoom(photos.length)}
                onPress={() => void choose(false)}
              />
              <Button
                label="Fotografišite"
                disabled={picking || !photoRoom(photos.length)}
                onPress={() => void choose(true)}
              />
              {picking && <Loading />}
            </>
          ) : (
            <>
              <Field title="Naslov" value={form.title} />
              <Field title="Opis" value={form.description} />
              <Field
                title="Rubrika"
                value={
                  categoryOptions.find((item) => item.value === form.category)
                    ?.label
                }
              />
              <Field title="Potkategorija" value={form.subcategory} />
              <Field
                title="Vrsta"
                value={listingTypes[form.type as keyof typeof listingTypes]}
              />
              <Field
                title="Lokacija"
                value={[
                  form.settlement.trim(),
                  townOptions.find(
                    (item) => item.value === form.municipalityCode,
                  )?.label,
                ]
                  .filter(Boolean)
                  .join(", ")}
              />
              <Field
                title="Cena"
                value={
                  form.amount.trim()
                    ? [
                        form.amount.trim(),
                        form.currency,
                        form.priceBasis.trim() && "/ " + form.priceBasis.trim(),
                      ]
                        .filter(Boolean)
                        .join(" ")
                    : "Nije navedena"
                }
              />
              <Field title="Kontakt telefon" value={form.phone} />
              <Field title="Dodatne karakteristike" value={form.details} />
            </>
          )}
          {photos.map((uri, index) => (
            <React.Fragment key={uri}>
              <Image
                source={{ uri }}
                accessibilityLabel={"Fotografija " + (index + 1)}
                style={{ width: "100%", maxWidth: 320, aspectRatio: 4 / 3 }}
                resizeMode="contain"
              />
              {step === 1 ? (
                <Button
                  label={"Uklonite fotografiju " + (index + 1)}
                  disabled={picking}
                  onPress={() => {
                    updatePhotos(photos.filter((p) => p !== uri));
                    discardPreparedPhoto(uri);
                  }}
                />
              ) : (
                <Body>
                  Fotografija {index + 1}:{" "}
                  {index < uploaded
                    ? "sačuvana"
                    : busy && index === uploaded
                      ? "u toku predaje"
                      : "čeka slanje"}
                </Body>
              )}
            </React.Fragment>
          ))}
          {step === 1 ? (
            <Button
              label="Dalje na pregled"
              disabled={picking}
              onPress={next}
            />
          ) : (
            <>
              <Body>Vaš oglas biće objavljen nakon odobrenja uredništva.</Body>
              {locked && !busy && (
                <Body>
                  Ponovite isti zahtev dok je ekran otvoren. Nemojte zatvarati
                  aplikaciju ako želite da nastavite.
                </Body>
              )}
              {busy && (
                <Text accessibilityRole="alert" style={styles.text}>
                  {uploaded < photos.length
                    ? "Sačuvano fotografija: " + uploaded + "/" + photos.length
                    : "Potvrđivanje predaje…"}
                </Text>
              )}
              {error != null && (
                <>
                  <ErrorState
                    error={error}
                    compact
                    message={
                      error instanceof ApiError &&
                      [404, 503].includes(error.status ?? 0)
                        ? "Mobilna predaja trenutno nije dostupna."
                        : error instanceof ApiError && error.status === 409
                          ? "Server nije prihvatio predaju. Proverite limit oglasa ili ponovite slanje priloga."
                          : error instanceof ApiError &&
                              ["network", "timeout"].includes(error.code)
                            ? undefined
                            : "Predaja nije potvrđena. Podaci nisu obrisani."
                    }
                  />
                  {apiError && (
                    <Body>
                      {[
                        failure?.stage,
                        apiError.status ? "HTTP " + apiError.status : null,
                        apiError.code,
                        apiError.requestId
                          ? "ID zahteva " + apiError.requestId
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Body>
                  )}
                </>
              )}
              <Button
                label={
                  busy
                    ? "Predaja u toku…"
                    : locked
                      ? "Ponovite predaju"
                      : "Pošalji oglas na pregled"
                }
                disabled={busy}
                onPress={() => void send()}
              />
            </>
          )}
          {!locked && (
            <Button
              label="Prethodni korak"
              disabled={picking}
              onPress={() => {
                setMessage("");
                setStep(step - 1);
              }}
            />
          )}
        </Card>
      )}
    </>
  );
}
