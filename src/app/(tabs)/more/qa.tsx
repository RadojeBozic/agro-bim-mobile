import React, { useState } from "react";
import { Text, TextInput } from "react-native";
import { Redirect } from "expo-router";
import { config } from "../../../config/environment";
import { useAuth } from "../../../auth/provider";
import {
  Body,
  Button,
  Card,
  ErrorState,
  Screen,
  styles,
} from "../../../components/ui";
import { t } from "../../../i18n";
import {
  reads,
  unchangedProfile,
  eligibility,
  SmokeResult,
} from "../../../qa/smoke";
export default function QA() {
  const auth = useAuth();
  const [id, setId] = useState(""),
    [busy, setBusy] = useState(false),
    [patched, setPatched] = useState(false),
    [checked, setChecked] = useState(false),
    [results, setResults] = useState<SmokeResult[]>([]),
    [error, setError] = useState<unknown>(null);
  if (!config.qaEnabled || auth.status !== "signedIn")
    return <Redirect href="/home" />;
  const run = async (action: () => Promise<SmokeResult | SmokeResult[]>) => {
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      setResults((old) => [
        ...old,
        ...(Array.isArray(result) ? result : [result]),
      ]);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Text style={styles.title}>{t("qa")}</Text>
      <Body>{t("qaSafe")}</Body>
      <Button
        label={t("qaRead")}
        disabled={busy}
        onPress={() => void run(reads)}
      />
      <Button
        label={t("qaPatch")}
        disabled={busy || patched}
        onPress={() => {
          setPatched(true);
          void run(unchangedProfile);
        }}
      />
      <Body>{t("programmeId")}</Body>
      <TextInput
        accessibilityLabel={t("programmeId")}
        style={styles.input}
        value={id}
        onChangeText={setId}
        autoCapitalize="none"
      />
      <Button
        label={t("qaEligibility")}
        disabled={busy || checked || !id}
        onPress={() => {
          setChecked(true);
          void run(() => eligibility(id));
        }}
      />
      {error != null && <ErrorState error={error} />}
      {results.map((r, i) => (
        <Card key={i}>
          <Body>
            {r.endpoint}: {r.status}
          </Body>
          <Body>{r.result}</Body>
          <Body>{r.requestId}</Body>
        </Card>
      ))}
    </Screen>
  );
}
