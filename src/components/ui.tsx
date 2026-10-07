import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  AccessibilityInfo,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NetInfo from "@react-native-community/netinfo";
import { router, Stack } from "expo-router";
import { t } from "../i18n";
import { theme } from "../theme";
import { ApiError } from "../core/errors";
import { useAuth, useCapability, Me } from "../auth/provider";
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.color.background },
  content: {
    padding: theme.space.md,
    gap: theme.space.md,
    paddingBottom: theme.space.xl,
  },
  text: { fontSize: theme.type.body, color: theme.color.text, lineHeight: 24 },
  homeEntry: {
    fontSize: theme.type.body,
    lineHeight: 24,
    color: theme.color.text,
    flexShrink: 1,
    alignSelf: "stretch",
    marginBottom: theme.space.sm,
  },
  muted: {
    fontSize: theme.type.small,
    color: theme.color.muted,
    lineHeight: 22,
  },
  title: {
    fontSize: theme.type.title,
    fontWeight: "700",
    color: theme.color.text,
  },
  section: {
    fontSize: theme.type.section,
    fontWeight: "600",
    color: theme.color.text,
  },
  card: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    padding: theme.space.md,
    gap: theme.space.sm,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  button: {
    minHeight: theme.touch,
    borderRadius: theme.radius.button,
    padding: theme.space.md,
    backgroundColor: theme.color.primary,
    justifyContent: "center",
  },
  input: {
    minHeight: theme.touch,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.button,
    padding: theme.space.md,
    fontSize: theme.type.body,
    color: theme.color.text,
    backgroundColor: theme.color.surface,
  },
});
export const Body = ({ children }: React.PropsWithChildren) => (
  <Text style={styles.text}>{children}</Text>
);
export const Card = ({ children }: React.PropsWithChildren) => (
  <View style={styles.card}>{children}</View>
);
export function Button({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && { opacity: 0.55 }]}
    >
      <Text
        style={[styles.text, { color: theme.color.surface, fontWeight: "600" }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function BrandMark() {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.space.sm,
      }}
    >
      <Image
        source={require("../../assets/brand/mark.png")}
        style={{ width: 32, height: 32 }}
        accessibilityLabel="AgroBIM"
      />
      <Text style={styles.section}>AgroBIM</Text>
    </View>
  );
}
export function Offline() {
  const [offline, setOffline] = useState(false);
  useEffect(
    () =>
      NetInfo.addEventListener((s) =>
        setOffline(s.isConnected === false || s.isInternetReachable === false),
      ),
    [],
  );
  return offline ? (
    <Text
      accessibilityRole="alert"
      style={[styles.text, { color: theme.color.warning }]}
    >
      {t("offline")}
    </Text>
  ) : null;
}
export function Screen({
  children,
  refreshing = false,
  onRefresh,
}: React.PropsWithChildren<{ refreshing?: boolean; onRefresh?: () => void }>) {
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.page}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.content,
        {
          paddingBottom: theme.space.xl + insets.bottom,
          paddingLeft: theme.space.md + insets.left,
          paddingRight: theme.space.md + insets.right,
        },
      ]}
      alwaysBounceVertical
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
    >
      <Offline />
      {auth.message && (
        <Text accessibilityRole="alert" style={styles.text}>
          {t(auth.message)}
        </Text>
      )}
      {auth.message === "internal_error" && (
        <Button label={t("retry")} onPress={() => void auth.validate()} />
      )}
      {auth.status === "checking" && <Loading />}
      {children}
    </ScrollView>
  );
}
export const Loading = () => (
  <View
    accessibilityRole="progressbar"
    accessibilityLabel={t("loading")}
    style={styles.card}
  >
    <ActivityIndicator color={theme.color.primary} />
    <Body>{t("loading")}</Body>
  </View>
);
export const Empty = () => (
  <Card>
    <Body>{t("empty")}</Body>
  </Card>
);
export const Gated = () => (
  <Card>
    <Body>{t("gated")}</Body>
  </Card>
);
export function ErrorState({
  error,
  retry,
  compact = false,
  retryDisabled = false,
}: {
  error: unknown;
  retry?: () => void;
  compact?: boolean;
  retryDisabled?: boolean;
}) {
  const code = error instanceof ApiError ? error.code : "internal_error";
  return (
    <View
      style={[
        styles.card,
        compact && { padding: theme.space.sm, gap: theme.space.xs },
      ]}
    >
      <Text
        accessibilityRole="alert"
        style={compact ? styles.muted : styles.text}
      >
        {t(code)}
      </Text>
      {retry && !compact && (
        <Button label={t("retry")} onPress={retry} disabled={retryDisabled} />
      )}
      {retry && compact && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("retry")}
          accessibilityState={{ disabled: retryDisabled }}
          disabled={retryDisabled}
          onPress={retry}
          style={{
            minHeight: theme.touch,
            justifyContent: "center",
            opacity: retryDisabled ? 0.55 : 1,
          }}
        >
          <Text style={[styles.text, { color: theme.color.primary }]}>
            {t("retry")}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
export function GuestCta() {
  return (
    <Card>
      <Body>{t("guestCta")}</Body>
      <Button label={t("login")} onPress={() => router.push("/auth/login")} />
      <Button
        label={t("register")}
        onPress={() => router.push("/auth/register")}
      />
    </Card>
  );
}
export function TabStack() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => listener.remove();
  }, []);
  return (
    <Stack
      screenOptions={{
        headerTitle: () => <BrandMark />,
        headerTintColor: theme.color.primary,
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: theme.color.background },
        animation: reduced ? "none" : "default",
      }}
    />
  );
}
export function Timestamp({ value }: { value: number }) {
  return value ? (
    <Text style={styles.muted}>
      {t("refreshed")}: {new Date(value).toLocaleString("sr-Latn-RS")}
    </Text>
  ) : null;
}

export function GatedAction({
  capability,
  label,
  onPress,
}: {
  capability: keyof Me["access"]["capabilities"];
  label: string;
  onPress: () => void;
}) {
  const allowed = useCapability(capability);
  return allowed ? <Button label={label} onPress={onPress} /> : <Gated />;
}
