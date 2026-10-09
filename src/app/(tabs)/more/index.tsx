import React from "react";
import { router } from "expo-router";
import { Text } from "react-native";
import { useAuth } from "../../../auth/provider";
import { Body, Button, Card, Screen, styles } from "../../../components/ui";
import { ExternalLink } from "../../../components/content";
import { TrustLinks } from "../../../components/trust-links";
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
      <Button
        label="Kalkulator finansiranja"
        onPress={() => router.push("/more/calculator")}
      />
      <Card>
        <ExternalLink
          title="Proizvodnja i parcele · web"
          url="https://agrobim.digital/proizvodnja"
        />
        <Body>
          Proizvodnja se otvara na sajtu i može zahtevati prijavu na sajtu.
        </Body>
      </Card>
      <TrustLinks showAppInfo />
    </Screen>
  );
}
