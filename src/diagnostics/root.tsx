/* eslint-disable @typescript-eslint/no-require-imports -- Defer Router/native evaluation until protected by diagnostics. */
import React, { Component, useEffect, useSyncExternalStore } from "react";
import { ScrollView, Text, View } from "react-native";
import {
  capture,
  getReport,
  makeReport,
  subscribe,
  type Report,
} from "./startup";

export function DiagnosticScreen({ report }: { report: Report }) {
  useEffect(() => {
    // A failed Router may leave the native splash visible above this screen.
    try {
      const splash =
        require("expo-splash-screen") as typeof import("expo-splash-screen");
      void splash.hideAsync().catch(() => {});
    } catch {
      /* Native splash failure requires the device-log fallback. */
    }
  }, []);
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#ffffff",
        paddingTop: 60,
        paddingBottom: 32,
      }}
    >
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
        <Text
          accessibilityRole="header"
          style={{ color: "#163b27", fontSize: 23, fontWeight: "700" }}
        >
          AgroBIM — dijagnostika
        </Text>
        <Text selectable style={{ color: "#111111", fontSize: 15 }}>
          {report.code}
          {"\n"}Faza: {report.phase}
        </Text>
        <Text style={{ color: "#111111", fontSize: 16 }}>
          Aplikacija je zaustavljena zbog JavaScript greške. Napravite snimak
          ovog ekrana i pošaljite ga razvojnom timu. Ako tekst ne staje,
          skrolujte i napravite još jedan snimak.
        </Text>
        <Text
          selectable
          style={{ color: "#901b1b", fontSize: 16, fontWeight: "600" }}
        >
          {report.message}
        </Text>
        <Text
          selectable
          style={{ color: "#111111", fontSize: 12, fontFamily: "Menlo" }}
        >
          {report.stack}
        </Text>
        <Text style={{ color: "#444444", fontSize: 14 }}>
          Zatvorite aplikaciju nakon snimanja. Dijagnostika se ne šalje
          automatski.
        </Text>
      </ScrollView>
    </View>
  );
}
export class StartupBoundary extends Component<
  React.PropsWithChildren,
  { report: Report | null }
> {
  state: { report: Report | null } = { report: null };
  static getDerivedStateFromError(error: unknown) {
    return { report: makeReport(error, "router-render-or-import") };
  }
  componentDidCatch(error: unknown) {
    capture(error, "router-render-or-import");
  }
  render() {
    return this.state.report ? (
      <DiagnosticScreen report={this.state.report} />
    ) : (
      this.props.children
    );
  }
}
function RouterApp() {
  // This is the same qualified App used by expo-router/entry-classic in SDK 57.
  // Keep this require inside the boundary: static imports execute too early.
  const { App } = require("expo-router/build/qualified-entry") as {
    App: React.ComponentType;
  };
  return <App />;
}
export function DiagnosticRoot() {
  const report = useSyncExternalStore(subscribe, getReport, getReport);
  return report ? (
    <DiagnosticScreen report={report} />
  ) : (
    <StartupBoundary>
      <RouterApp />
    </StartupBoundary>
  );
}
