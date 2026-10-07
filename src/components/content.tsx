import React, { useState } from "react";
import { Linking, Pressable, Text } from "react-native";
import { router } from "expo-router";
import { z } from "zod";
import { attributionSchema } from "../api/contracts";
import { ContentItem, contentHref, safePublicUrl, dateLabel } from "../content";
import { Body, Card, ErrorState, styles } from "./ui";
import { theme } from "../theme";
import { ApiError } from "../core/errors";

export function ExternalLink({
  url,
  title = "Otvori zvanični izvor",
}: {
  url: string | null | undefined;
  title?: string;
}) {
  const [failed, setFailed] = useState(false);
  const safe = safePublicUrl(url);
  if (!safe) return null;
  return (
    <>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={title}
        style={{ minHeight: theme.touch, justifyContent: "center" }}
        onPress={() => {
          setFailed(false);
          void Linking.openURL(safe).catch(() => setFailed(true));
        }}
      >
        <Text style={[styles.text, { color: theme.color.primary }]}>
          {title} ↗
        </Text>
      </Pressable>
      {failed && (
        <ErrorState
          error={new ApiError("network")}
          retry={() => {
            setFailed(false);
            void Linking.openURL(safe).catch(() => setFailed(true));
          }}
        />
      )}
    </>
  );
}
export function ContentRow({
  item,
  signed = false,
}: {
  item: ContentItem;
  signed?: boolean;
}) {
  const href = contentHref(item, signed);
  const title = item.title ?? item.name ?? item.productName ?? "Informacija";
  const text = (
    <Text style={[styles.homeEntry, href && { color: theme.color.primary }]}>
      {title}
      {item.shortBody ? " · " + item.shortBody : ""}
      {href ? " ›" : ""}
    </Text>
  );
  return href ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint="Otvori detalje"
      style={{ minHeight: theme.touch, justifyContent: "center" }}
      onPress={() => router.push(href)}
    >
      {text}
    </Pressable>
  ) : (
    <>
      {text}
      <ExternalLink url={item.attribution?.publicUrl} />
    </>
  );
}
export function Field({
  title,
  value,
}: {
  title: string;
  value: React.ReactNode;
}) {
  return value === null || value === undefined || value === "" ? null : (
    <Body>
      {title}: {value}
    </Body>
  );
}
export function Attribution({
  value,
}: {
  value: z.output<typeof attributionSchema>;
}) {
  if (!Object.values(value).some(Boolean)) return null;
  return (
    <Card>
      <Field title="Izvor" value={value.name} />
      <Field title="Objavljeno" value={dateLabel(value.publishedAt)} />
      <Field title="Poslednja provera" value={dateLabel(value.checkedAt)} />
      <Field title="Potvrđeno" value={dateLabel(value.verifiedAt)} />
      <Field title="Važi do" value={dateLabel(value.validUntil)} />
      <ExternalLink url={value.publicUrl} />
    </Card>
  );
}
