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
          listeners={
            name === "more"
              ? ({ navigation, route }) => ({
                  tabPress: (event) => {
                    const stack = navigation
                      .getState()
                      .routes.find(
                        (tab: { key: string }) => tab.key === route.key,
                      )?.state;
                    if (!stack?.key || !stack.index) return;
                    // A tab switch otherwise focuses the last screen in this stack.
                    if (navigation.isFocused()) event.preventDefault();
                    navigation.dispatch({
                      type: "POP_TO_TOP",
                      target: stack.key,
                    });
                  },
                })
              : undefined
          }
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
