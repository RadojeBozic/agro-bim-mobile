import { Tabs } from "expo-router";
import { Text, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { primaryTabs } from "../../navigation";
import { t } from "../../i18n";
import { theme } from "../../theme";
export const unstable_settings = { anchor: "home" };
const icons = ["⌂", "♧", "◇", "≋", "⋯"];
export default function TabLayout() {
  const { fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      initialRouteName="home"
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.color.primary,
        tabBarInactiveTintColor: theme.color.muted,
        tabBarStyle: {
          height:
            theme.navigationHeight +
            Math.max(0, fontScale - 1) *
              (theme.type.title + theme.type.tabLine * 2) +
            insets.bottom,
          paddingTop: theme.space.sm,
          paddingBottom: insets.bottom + theme.space.sm,
        },
        tabBarAllowFontScaling: true,
        tabBarLabelPosition: "below-icon",
        tabBarItemStyle: { minWidth: 0, paddingHorizontal: theme.space.xs },
      }}
    >
      {primaryTabs.map((name, i) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: t(name),
            tabBarAccessibilityLabel: t(name),
            tabBarLabel: ({ color }) => (
              <Text
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                style={{
                  color,
                  fontSize: theme.type.tab,
                  lineHeight: theme.type.tabLine,
                  textAlign: "center",
                }}
              >
                {name === "farm" ? t("farmTab") : t(name)}
              </Text>
            ),
            tabBarIcon: ({ color }) => (
              <Text
                accessible={false}
                style={{ fontSize: theme.type.title, color }}
              >
                {icons[i]}
              </Text>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
