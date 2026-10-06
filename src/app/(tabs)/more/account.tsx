import React from "react";
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
import { t, TranslationKey } from "../../../i18n";
export default function Account() {
  const auth = useAuth();
  const me = auth.me;
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
            <Body>{t(me.farm.completionState)}</Body>
            <Body>
              {t("access")}:{" "}
              {t(
                (me.access.financingState === "trial_expired"
                  ? "trial_expired_access"
                  : me.access.financingState) as TranslationKey,
              )}
            </Body>
          </Card>
          <Card>
            <Text style={styles.section}>{t("capabilities")}</Text>
            {Object.entries(me.access.capabilities).map(([key, value]) => (
              <Body key={key}>
                {t(key as TranslationKey)}: {t(value ? "enabled" : "disabled")}
              </Body>
            ))}
          </Card>
          <Button label={t("logout")} onPress={() => void auth.logout()} />
        </>
      )}
    </Screen>
  );
}
