import React from "react";
import { Text } from "react-native";
import { Body, Card, Screen, styles } from "../../../components/ui";
import { t } from "../../../i18n";
export default function Placeholder() {
  return (
    <Screen>
      <Text style={styles.title}>{t("cenoteka")}</Text>
      <Card>
        <Body>{t("soon")}</Body>
      </Card>
    </Screen>
  );
}
