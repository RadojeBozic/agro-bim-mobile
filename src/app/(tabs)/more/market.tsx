import React from "react";
import { Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../runtime";
import { marketSchema } from "../../../api/contracts";
import {
  Body,
  Card,
  Empty,
  ErrorState,
  Loading,
  Screen,
  Timestamp,
  styles,
} from "../../../components/ui";
import { Attribution, Field } from "../../../components/content";
import { dateLabel, label } from "../../../content";
import { t } from "../../../i18n";
export default function Market() {
  const query = useQuery({
    queryKey: ["public", "market"],
    queryFn: ({ signal }) =>
      api.request("/market/summary", marketSchema, { signal }),
  });
  const refresh = () => void query.refetch({ cancelRefetch: false });
  return (
    <Screen refreshing={query.isRefetching} onRefresh={refresh}>
      <Text style={styles.title}>{t("market")}</Text>
      {query.isPending && <Loading />}
      {query.error && <ErrorState error={query.error} retry={refresh} />}
      {query.data && (
        <>
          <Timestamp value={query.dataUpdatedAt} />
          {(["exchange", "stips"] as const).map((source) => {
            const section = query.data.data[source];
            return (
              <Card key={source}>
                <Text style={styles.section}>
                  {source === "exchange" ? "Berzanske cene" : "STIPS"}
                </Text>
                {section.status === "unavailable" ? (
                  <Body>{t("internal_error")}</Body>
                ) : section.items.length === 0 ? (
                  <Empty />
                ) : (
                  section.items.map((item) => (
                    <Card key={item.id}>
                      <Text style={styles.section}>{item.commodity}</Text>
                      <Field
                        title="Cena"
                        value={
                          item.value == null
                            ? null
                            : item.value +
                              " " +
                              (item.currency ?? "") +
                              (item.unit ? "/" + item.unit : "")
                        }
                      />
                      <Field title="Najniža cena" value={item.min} />
                      <Field title="Najviša cena" value={item.max} />
                      <Field title="Mesto" value={item.location} />
                      <Field title="Od" value={dateLabel(item.periodFrom)} />
                      <Field title="Do" value={dateLabel(item.periodTo)} />
                      <Field title="Promena (%)" value={item.changePercent} />
                      <Field title="Aktuelnost" value={label(item.freshness)} />
                      <Attribution value={item.attribution} />
                    </Card>
                  ))
                )}
              </Card>
            );
          })}
        </>
      )}
    </Screen>
  );
}
