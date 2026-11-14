import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Text } from "react-native";
import { z } from "zod";
import { page, programmeSchema, todaySchema } from "../api/contracts";
import { ContentRow } from "../components/content";
import { Body, Card, ErrorState, Loading, styles } from "../components/ui";
import { dateLabel } from "../content";
import { t } from "../i18n";
import { api } from "../runtime";

const programmePage = page(programmeSchema);

async function publicProgrammes(signal: AbortSignal) {
  const items: z.output<typeof programmeSchema>[] = [];
  let offset: number | null = 0;
  while (offset !== null) {
    const result: { data: z.output<typeof programmePage> } = await api.request(
      "/programmes?limit=50&offset=" + offset,
      programmePage,
      { signal },
    );
    items.push(...result.data.items);
    offset = result.data.pagination.nextOffset;
  }
  return items;
}

export function HomeDeadlines({
  signed,
  today,
  pending,
  error,
  personalized,
  refreshHome,
}: {
  signed: boolean;
  today: Date;
  pending: boolean;
  error: unknown;
  personalized?: z.output<typeof todaySchema>["sections"]["deadlines"];
  refreshHome: () => void;
}) {
  const programmes = useQuery({
    queryKey: ["public", "home-deadline-programmes"],
    queryFn: ({ signal }) => publicProgrammes(signal),
    enabled: !signed,
  });
  const localDay = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
  const published = programmes.data ?? [];
  const items = signed
    ? (personalized?.items ?? []).map((item) => ({
        item,
        date: item.validUntil,
      }))
    : published
        .filter((item) => item.status === "open" || item.status === "planned")
        .map((item) => ({ item, date: item.deadline }));
  const upcoming = items
    .filter(({ date }) => date && date >= localDay)
    .sort((a, b) => a.date!.localeCompare(b.date!))
    .slice(0, 3);
  const failed = signed
    ? Boolean(error) || personalized?.status === "unavailable"
    : programmes.isError;
  return (
    <Card>
      <Text accessibilityRole="header" style={styles.section}>
        {t("deadlines")}
      </Text>
      {failed ? (
        <ErrorState
          error={signed ? error : programmes.error}
          message={t("deadlinesUnavailable")}
          retry={signed ? refreshHome : () => void programmes.refetch()}
          compact
        />
      ) : (signed ? pending : programmes.isPending) ? (
        <Loading />
      ) : upcoming.length ? (
        upcoming.map(({ item, date }) => (
          <React.Fragment key={"key" in item ? item.key : item.id}>
            <ContentRow item={item} signed={signed} />
            <Body>
              {t("deadlineDate")} · {dateLabel(date)}
            </Body>
          </React.Fragment>
        ))
      ) : (
        <Body>
          {t(
            signed
              ? "noRelevantDeadlines"
              : published.length
                ? "noFutureDeadlines"
                : "noDeadlines",
          )}
        </Body>
      )}
    </Card>
  );
}
