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
      <Button label="Agro Oglasi" onPress={() => router.push("/more/ads")} />
      <Button label="Moji oglasi" onPress={() => router.push("/more/my-ads")} />
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
        {auth.status === "signedIn" ? (
          <>
            <ExternalLink
              title={t("production")}
              url="https://agrobim.digital/proizvodnja"
            />
            <Body>{t("productionWeb")}</Body>
          </>
        ) : (
          <>
            <Text style={styles.section}>{t("production")}</Text>
            <Body>{t("productionGuest")}</Body>
            {auth.status === "guest" && (
              <Button
                label={t("freeRegistration")}
                onPress={() => router.push("/auth/register")}
              />
            )}
          </>
        )}
      </Card>
      <TrustLinks showAppInfo />
    </Screen>
  );
}
