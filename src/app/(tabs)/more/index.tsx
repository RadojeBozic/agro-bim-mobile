import React from "react";
import { router } from "expo-router";
import { Text } from "react-native";
import { useAuth } from "../../../auth/provider";
import { config } from "../../../config/environment";
import { Body, Button, Card, Screen, styles } from "../../../components/ui";
import { ExternalLink } from "../../../components/content";
import { t } from "../../../i18n";
export default function More() {
  const auth = useAuth();
  return (
    <Screen>
      <Text style={styles.title}>{t("more")}</Text>
      <Button
        label={t("account")}
        onPress={() =>
          router.push(
            auth.status === "signedIn" ? "/more/account" : "/auth/login",
          )
        }
      />
      <Button
        label={t("financing")}
        onPress={() => router.push("/more/financing")}
      />
      <Button label={t("market")} onPress={() => router.push("/more/market")} />
      <Button label={t("profile")} onPress={() => router.push("/farm")} />
      <Card>
        <ExternalLink
          title="Kalkulator finansiranja · web"
          url="https://agrobim.digital/kalkulator-finansiranja"
        />
        <ExternalLink
          title="Proizvodnja i parcele · web"
          url="https://agrobim.digital/proizvodnja"
        />
        <Body>
          Proizvodnja se otvara na sajtu i može zahtevati prijavu na sajtu.
        </Body>
      </Card>
      {config.qaEnabled && auth.status === "signedIn" && (
        <Button label={t("qa")} onPress={() => router.push("/more/qa")} />
      )}
    </Screen>
  );
}
