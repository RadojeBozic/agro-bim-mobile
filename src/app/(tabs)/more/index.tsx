import React from "react";
import { router } from "expo-router";
import { Text } from "react-native";
import { useAuth } from "../../../auth/provider";
import { config } from "../../../config/environment";
import { Button, Card, Screen, styles } from "../../../components/ui";
import { t, TranslationKey } from "../../../i18n";
export default function More() {
  const auth = useAuth();
  return (
    <Screen>
      <Text style={styles.title}>{t("more")}</Text>
      {(
        [
          "financing",
          "market",
          "profile",
          "notifications",
          "settings",
        ] as TranslationKey[]
      ).map((key) => (
        <Card key={key}>
          <Text style={styles.text}>
            {t(key)} · {t("soon")}
          </Text>
        </Card>
      ))}
      <Button
        label={t("account")}
        onPress={() =>
          router.push(
            auth.status === "signedIn" ? "/more/account" : "/auth/login",
          )
        }
      />
      {config.qaEnabled && auth.status === "signedIn" && (
        <Button label={t("qa")} onPress={() => router.push("/more/qa")} />
      )}
    </Screen>
  );
}
