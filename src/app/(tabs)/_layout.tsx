import { Tabs } from "expo-router";
import { Text, useWindowDimensions } from "react-native";
import { primaryTabs } from "../../navigation";
import { t } from "../../i18n";
import { theme } from "../../theme";
export const unstable_settings = { anchor: "home" };
const icons = ["⌂", "♧", "◇", "≋", "⋯"];
export default function TabLayout() {
  const { fontScale } = useWindowDimensions();
  return (
    <Tabs
      initialRouteName="home"
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.color.primary,
        tabBarInactiveTintColor: theme.color.muted,
        tabBarStyle: {
          minHeight:
            theme.navigationHeight +
            Math.max(0, fontScale - 1) * theme.type.tabLine * 2,
          paddingTop: theme.space.sm,
        },
        tabBarAllowFontScaling: true,
        tabBarLabelPosition: "below-icon",
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
                style={{
                  color,
                  fontSize: theme.type.tab,
                  lineHeight: theme.type.tabLine,
                  textAlign: "center",
                }}
              >
                {t(name)}
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
