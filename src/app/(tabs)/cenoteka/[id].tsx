import React from "react";
import { Body, Card, Screen } from "../../../components/ui";
import { t } from "../../../i18n";
export default function Target() {
  return (
    <Screen>
      <Card>
        <Body>{t("soon")}</Body>
      </Card>
    </Screen>
  );
}
