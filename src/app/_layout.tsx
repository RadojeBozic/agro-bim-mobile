import React, { useEffect } from "react";
import { AppState } from "react-native";
import { Stack } from "expo-router";
import {
  QueryClientProvider,
  focusManager,
  onlineManager,
} from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";
import { queryClient } from "../runtime";
import { AuthProvider } from "../auth/provider";
import { theme } from "../theme";
export const unstable_settings = { anchor: "index" };
export default function Root() {
  useEffect(() => {
    const app = AppState.addEventListener("change", (s) =>
      focusManager.setFocused(s === "active"),
    );
    const net = NetInfo.addEventListener((s) =>
      onlineManager.setOnline(
        s.isConnected !== false && s.isInternetReachable !== false,
      ),
    );
    return () => {
      app.remove();
      net();
    };
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.color.background },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
