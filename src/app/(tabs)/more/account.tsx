import React from "react";
import { router } from "expo-router";
import { Text } from "react-native";
import { useAuth } from "../../../auth/provider";
import {
  Body,
  Button,
  Card,
  GuestCta,
  Screen,
  styles,
} from "../../../components/ui";
import { t } from "../../../i18n";
export default function Account() {
  const auth = useAuth();
  const me = auth.status === "signedIn" ? auth.me : null;
  return (
    <Screen>
      <Text style={styles.title}>{t("account")}</Text>
      {!me ? (
        <GuestCta />
      ) : (
        <>
          <Card>
            <Body>{me.user.displayName ?? t("account")}</Body>
            <Body>{t(me.user.emailVerified ? "verified" : "unverified")}</Body>
            <Body>{me.farm.displayName}</Body>
            <Body>{t(me.farm.completionState)}</Body>
          </Card>
          <Button label={t("farm")} onPress={() => router.push("/farm")} />
          <Button label={t("logout")} onPress={() => void auth.logout()} />
        </>
      )}
    </Screen>
  );
}
