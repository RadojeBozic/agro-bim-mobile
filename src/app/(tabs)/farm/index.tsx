import React, { useState } from "react";
import { Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useAuth } from "../../../auth/provider";
import { api } from "../../../runtime";
import { feedPageSchema, profileSchema } from "../../../api/contracts";
import {
  Body,
  Button,
  Card,
  Empty,
  ErrorState,
  GuestCta,
  Loading,
  Screen,
  Timestamp,
  styles,
} from "../../../components/ui";
import { ContentRow, Field } from "../../../components/content";
import { label } from "../../../content";
import { t } from "../../../i18n";

export default function Farm() {
  const auth = useAuth();
  const signed = auth.status === "signedIn";
  const [offset, setOffset] = useState(0);
  const profile = useQuery({
    queryKey: ["private", auth.me?.user.id, "farm-profile"],
    enabled: signed,
    queryFn: ({ signal }) =>
      api.request("/me/farm-profile", profileSchema, { private: true, signal }),
  });
  const query = useQuery({
    queryKey: ["private", auth.me?.user.id, "feed", offset],
    enabled:
      signed && auth.me?.access.capabilities.usePersonalizedFeed === true,
    queryFn: ({ signal }) =>
      api.request("/me/feed?limit=20&offset=" + offset, feedPageSchema, {
        private: true,
        signal,
      }),
  });
  const data = signed ? profile.data?.data : undefined;
  const basic = data?.basicProfile;
  const refresh = () => {
    void profile.refetch({ cancelRefetch: false });
    if (auth.me?.access.capabilities.usePersonalizedFeed)
      void query.refetch({ cancelRefetch: false });
  };
  return (
    <Screen
      refreshing={profile.isRefetching || query.isRefetching}
      onRefresh={signed ? refresh : undefined}
    >
      <Text style={styles.title}>{t("farm")}</Text>
      {!signed ? (
        <GuestCta />
      ) : (
        <>
          <Card>
            <Text style={styles.section}>
              {basic?.displayName ?? auth.me?.farm.displayName ?? t("profile")}
            </Text>
            <Body>
              {t(
                data?.completionState ??
                  auth.me?.farm.completionState ??
                  "missing",
              )}
            </Body>
            <Field
              title="Registracija"
              value={label(basic?.registrationStatus)}
            />
            <Field title="Broj gazdinstva" value={basic?.registrationNumber} />
            <Field title="Podnosilac" value={label(basic?.applicantType)} />
            <Field title="Pravna forma" value={basic?.legalForm} />
            <Field title="Region" value={basic?.region} />
            <Field title="Opština" value={basic?.municipality} />
            <Field title="Naselje" value={basic?.settlement} />
            <Field
              title="Status gazdinstva"
              value={label(basic?.operationalStatus)}
            />
            <Field
              title="Organska proizvodnja"
              value={label(basic?.organicStatus)}
            />
            <Field
              title="U sistemu PDV-a"
              value={
                basic?.vatRegistered == null
                  ? null
                  : basic.vatRegistered
                    ? "Da"
                    : "Ne"
              }
            />
            {!!data?.activities?.length && (
              <Field
                title="Proizvodnja"
                value={data.activities.map(label).join(", ")}
              />
            )}
            {data?.capacities?.map((capacity, i) => (
              <Field
                key={i}
                title={label(capacity.type) ?? "Kapacitet"}
                value={[
                  capacity.category,
                  capacity.quantity,
                  capacity.unit === "head"
                    ? "grla"
                    : capacity.unit === "m2"
                      ? "m²"
                      : capacity.unit === "t_day"
                        ? "t/dan"
                        : ["ha", "t", "m3"].includes(capacity.unit)
                          ? capacity.unit
                          : null,
                ]
                  .filter((v) => v != null)
                  .join(" ")}
              />
            ))}
            <Field title="Planirana investicija" value={data?.intent?.title} />
            <Field
              title="Namena investicije"
              value={label(data?.intent?.purpose)}
            />
            <Field
              title="Planirani period"
              value={label(data?.intent?.targetTimeframe)}
            />
          </Card>
          {profile.isPending && <Loading />}
          {profile.error && (
            <ErrorState
              error={profile.error}
              retry={() => void profile.refetch()}
            />
          )}
          <Button
            label={t("programmes")}
            onPress={() => router.push("/programmes")}
          />
          <Button
            label={t("financing")}
            onPress={() => router.push("/more/financing")}
          />
          <Button
            label={t("account")}
            onPress={() => router.push("/more/account")}
          />
          <Text style={styles.section}>Informacije za moje gazdinstvo</Text>
          {!auth.me?.access.capabilities.usePersonalizedFeed ? (
            <Body>Informacije za vaše gazdinstvo trenutno nisu dostupne.</Body>
          ) : (
            <>
              {query.isPending && <Loading />}
              {query.error && (
                <ErrorState
                  error={query.error}
                  retry={() => void query.refetch()}
                />
              )}
              <Timestamp value={query.dataUpdatedAt} />
              {query.data?.data.items?.map((item) => (
                <Card key={item.key}>
                  <ContentRow item={item} signed />
                </Card>
              ))}
              {query.data?.data.items?.length === 0 && <Empty />}
              {offset > 0 && (
                <Button
                  label="Prethodna strana"
                  onPress={() => setOffset(Math.max(0, offset - 20))}
                />
              )}
              {query.data?.data.pagination?.nextOffset != null && (
                <Button
                  label="Sledeća strana"
                  onPress={() =>
                    setOffset(query.data!.data.pagination.nextOffset!)
                  }
                />
              )}
            </>
          )}
        </>
      )}
    </Screen>
  );
}
