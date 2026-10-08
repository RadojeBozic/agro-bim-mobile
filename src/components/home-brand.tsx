import React from "react";
import { Image, Text, View } from "react-native";
import mark from "../../assets/brand/mark.png";
import { theme } from "../theme";
import { t } from "../i18n";
import { styles } from "./ui";

/** Home-only identity; native text wraps and follows system font scaling. */
export function HomeBrand() {
  return (
    <View style={{ gap: theme.space.sm }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.space.sm,
        }}
      >
        <Image
          source={mark}
          accessible={false}
          resizeMode="contain"
          style={{ width: 52, height: 52, flexShrink: 0 }}
        />
        <View style={{ flex: 1, minWidth: 0, gap: theme.space.xs }}>
          <Text style={[styles.title, { flexShrink: 1 }]}>Agro BiM</Text>
          <Text style={[styles.text, { color: theme.color.primary }]}>
            {t("homeBrandDescriptor")}
          </Text>
        </View>
      </View>
      <Text style={styles.muted}>{t("homeBrandTagline")}</Text>
    </View>
  );
}
