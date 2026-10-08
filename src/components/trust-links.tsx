import React from "react";
import { Text } from "react-native";
import {
  availableTrustLinks,
  trustDestinations,
  TrustDestinations,
  TrustKey,
} from "../config/trust";
import identity from "../config/identity.json";
import { t, TranslationKey } from "../i18n";
import { ExternalLink } from "./content";
import { Card, styles } from "./ui";
const titles: Record<TrustKey, TranslationKey> = {
  privacy: "privacy",
  deletion: "accountDeletion",
  terms: "terms",
  support: "support",
};
export function TrustLinks({
  destinations = trustDestinations,
  showAppInfo = false,
}: {
  destinations?: TrustDestinations;
  showAppInfo?: boolean;
}) {
  const links = availableTrustLinks(destinations);
  if (!links.length && !showAppInfo) return null;
  return (
    <Card>
      {links.length > 0 && (
        <>
          <Text accessibilityRole="header" style={styles.section}>
            {t("trust")}
          </Text>
          {links.map((link) => (
            <ExternalLink
              key={link.key}
              title={t(titles[link.key])}
              url={link.url}
            />
          ))}
        </>
      )}
      {showAppInfo && (
        <Text style={styles.muted}>
          {identity.name} · {t("version")} {identity.version}
        </Text>
      )}
    </Card>
  );
}
