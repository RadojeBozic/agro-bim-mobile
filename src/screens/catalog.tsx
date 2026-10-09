import React, { useState } from "react";
import { Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { z } from "zod";
import { api } from "../runtime";
import {
  programmeSchema,
  financingSchema,
  productSchema,
  offerSchema,
  idSchema,
  page,
} from "../api/contracts";
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
import { Attribution, ContentRow, Field } from "../components/content";
import { ApiError } from "../core/errors";
import { dateLabel, label } from "../content";
import { t } from "../i18n";

export const catalogs = {
  programmes: {
    title: "programmes",
    endpoint: "/programmes",
    schema: programmeSchema,
  },
  financing: {
    title: "financing",
    endpoint: "/financing/products",
    schema: financingSchema,
  },
  cenoteka: {
    title: "cenoteka",
    endpoint: "/cenoteka/products",
    schema: productSchema,
  },
} as const;
type Kind = keyof typeof catalogs;
type RecordDto =
  | z.output<typeof programmeSchema>
  | z.output<typeof financingSchema>
  | z.output<typeof productSchema>;
const schemaFor = (kind: Kind): z.ZodType<RecordDto, z.ZodTypeDef, unknown> =>
  catalogs[kind].schema;

export function CatalogList({ kind }: { kind: Kind }) {
  const catalog = catalogs[kind];
  const [offset, setOffset] = useState(0);
  const query = useQuery({
    queryKey: ["public", kind, offset],
    queryFn: ({ signal }) =>
      api.request(
        catalog.endpoint + "?limit=20&offset=" + offset,
        page(schemaFor(kind)),
        { signal },
      ),
  });
  const data = query.data?.data;
  const refresh = () => void query.refetch({ cancelRefetch: false });
  return (
    <Screen refreshing={query.isRefetching} onRefresh={refresh}>
      <Text style={styles.title}>{t(catalog.title)}</Text>
      {kind === "financing" && (
        <Button
          label="Kalkulator finansiranja"
          onPress={() => router.push("/more/calculator")}
        />
      )}
      {query.isPending && <Loading />}
      {query.error && (
        <ErrorState
          error={query.error}
          retry={refresh}
          retryDisabled={query.isFetching}
        />
      )}
      {data && <Timestamp value={query.dataUpdatedAt} />}
      {data?.items.map((item) => (
        <Card key={item.id}>
          <ContentRow item={item} />
          {"institution" in item && (
            <>
              <Field title="Institucija" value={item.institution} />
              <Field title="Status" value={label(item.status)} />
              <Field
                title="Rok"
                value={item.deadlineText ?? dateLabel(item.deadline)}
              />
            </>
          )}
          {"instrument" in item && (
            <>
              <Field title="Pružalac" value={item.provider} />
              <Field title="Vrsta" value={label(item.instrument)} />
              <Field title="Status" value={label(item.status)} />
            </>
          )}
          {"offers" in item && (
            <>
              <Field title="Kategorija" value={item.category.label} />
              <Field title="Broj ponuda" value={item.offers.length} />
            </>
          )}
        </Card>
      ))}
      {data?.items.length === 0 && <Empty />}
      {offset > 0 && (
        <Button
          label="Prethodna strana"
          onPress={() => setOffset(Math.max(0, offset - 20))}
        />
      )}
      {data?.pagination.nextOffset != null && (
        <Button
          label="Sledeća strana"
          onPress={() => setOffset(data.pagination.nextOffset!)}
        />
      )}
    </Screen>
  );
}

export function Offer({ offer }: { offer: z.output<typeof offerSchema> }) {
  const amount =
    offer.price.amount == null
      ? null
      : offer.price.amount.toLocaleString("sr-Latn-RS") +
        " " +
        (offer.price.currency ?? "");
  return (
    <Card>
      <Text style={styles.section}>{offer.variant.name}</Text>
      <Field title="Dobavljač" value={offer.supplier.name} />
      <Field title="Mesto" value={offer.supplier.place} />
      <Field title="Proizvođač" value={offer.variant.manufacturer} />
      <Field title="Pakovanje" value={offer.package.label} />
      <Field
        title={label(offer.price.type) ?? "Cena"}
        value={amount ?? offer.price.originalText}
      />
      <Field title="Osnov cene" value={label(offer.price.basis)} />
      <Field title="Jedinica cene" value={offer.price.basisUnit} />
      <Field
        title="Uporediva cena po jedinici"
        value={
          offer.normalized.state === "comparable" &&
          offer.normalized.amount != null
            ? offer.normalized.amount +
              " " +
              (offer.price.currency ?? "") +
              "/" +
              (offer.normalized.unit ?? "")
            : null
        }
      />
      {offer.normalized.reasons.map((reason, i) => (
        <Body key={i}>{reason}</Body>
      ))}
      <Field title="PDV" value={label(offer.vat.state)} />
      <Field
        title="Minimalna količina"
        value={
          offer.moq.quantity == null
            ? null
            : offer.moq.quantity + " " + (offer.moq.basis ?? "")
        }
      />
      <Field title="Dostupnost" value={label(offer.availability)} />
      <Field title="Aktuelnost" value={label(offer.freshness)} />
      <Field title="Napomena" value={offer.publicNote} />
      <Attribution value={offer.attribution} />
    </Card>
  );
}
export function CatalogDetail({ kind }: { kind: Kind }) {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const valid = idSchema.safeParse(id);
  const catalog = catalogs[kind];
  const query = useQuery({
    queryKey: ["public", kind, "detail", id],
    enabled: valid.success,
    queryFn: ({ signal }) =>
      api.request(
        catalog.endpoint + "/" + idSchema.parse(id),
        schemaFor(kind),
        { signal },
      ),
  });
  const item = query.data?.data;
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
          {item && (
            <>
              <Text style={styles.title}>
                {"name" in item ? item.name : item.title}
              </Text>
              <Timestamp value={query.dataUpdatedAt} />
              {"institution" in item && (
                <Card>
                  <Field title="Institucija" value={item.institution} />
                  <Field title="Kategorija" value={item.category} />
                  <Field title="Status" value={label(item.status)} />
                  <Field
                    title="Rok"
                    value={item.deadlineText ?? dateLabel(item.deadline)}
                  />
                  <Field title="Opis" value={item.summary} />
                  <Field title="Podrška / namena" value={item.support} />
                  {item.documents?.map((doc) => (
                    <Body key={doc.id}>
                      {doc.label}
                      {doc.note ? " · " + doc.note : ""}
                    </Body>
                  ))}
                </Card>
              )}
              {"instrument" in item && (
                <Card>
                  <Field title="Pružalac" value={item.provider} />
                  <Field
                    title="Vrsta finansiranja"
                    value={label(item.instrument)}
                  />
                  <Field title="Status" value={label(item.status)} />
                  <Field title="Opis" value={item.description} />
                  <Field
                    title="Namena"
                    value={item.purposes.map(label).join(", ")}
                  />
                  <Field
                    title="Podnosioci"
                    value={item.applicants.map(label).join(", ")}
                  />
                  <Field title="Valuta" value={item.currency} />
                  <Field title="Minimalni iznos" value={item.minAmount} />
                  <Field title="Maksimalni iznos" value={item.maxAmount} />
                  <Field
                    title="Nominalna kamata (%)"
                    value={item.nominalRate}
                  />
                  <Field
                    title="Efektivna kamata (%)"
                    value={item.effectiveRate}
                  />
                  <Field
                    title="Minimalni rok (meseci)"
                    value={item.minTermMonths}
                  />
                  <Field
                    title="Maksimalni rok (meseci)"
                    value={item.maxTermMonths}
                  />
                  <Field
                    title="Grejs period (meseci)"
                    value={item.graceMonths}
                  />
                  <Field
                    title="Udeo podrške (%)"
                    value={item.supportPercentage}
                  />
                  <Field
                    title="Sopstveno učešće (%)"
                    value={item.ownContributionPercentage}
                  />
                  <Field title="Naknade" value={item.fees} />
                  <Field title="Obezbeđenje" value={item.collateral} />
                  <Field title="Dokumentacija" value={item.documents} />
                  <Field title="Napomena" value={item.publicNote} />
                  <Button
                    label="Kalkulator finansiranja"
                    onPress={() => router.push("/more/calculator")}
                  />
                </Card>
              )}
              {"attribution" in item && (
                <Attribution value={item.attribution} />
              )}
              {"offers" in item && (
                <>
                  <Field title="Kategorija" value={item.category.label} />
                  {item.offers.length ? (
                    item.offers.map((offer) => (
                      <Offer key={offer.id} offer={offer} />
                    ))
                  ) : (
                    <Empty />
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </Screen>
  );
}
