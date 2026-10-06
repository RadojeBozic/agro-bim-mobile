import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  auth: {
    status: "guest",
    me: null,
    message: null,
    validate: async () => {},
    logout: async () => {},
  } as any,
  query: {
    isPending: false,
    isRefetching: false,
    data: undefined,
    error: null,
    dataUpdatedAt: 0,
    refetch: vi.fn(),
  } as any,
  push: vi.fn(),
}));
vi.mock("react-native", () => ({
  Text: "span",
  View: "div",
  Pressable: "button",
  Image: "img",
  ScrollView: "main",
  ActivityIndicator: "progress",
  RefreshControl: "i",
  TextInput: "input",
  StyleSheet: { create: (s: unknown) => s },
  AccessibilityInfo: {
    isReduceMotionEnabled: async () => false,
    addEventListener: () => ({ remove() {} }),
  },
}));
vi.mock("@react-native-community/netinfo", () => ({
  default: { addEventListener: () => () => {} },
}));
vi.mock("expo-router", () => ({
  router: { push: mocks.push },
  Stack: "div",
  Redirect: "i",
}));
vi.mock("../src/runtime", () => ({ api: { request: vi.fn() } }));
vi.mock("../src/auth/provider", () => ({
  useAuth: () => mocks.auth,
  useCapability: (key: string) =>
    mocks.auth.status === "signedIn" &&
    mocks.auth.me?.access.capabilities[key] === true,
}));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => mocks.query }));
import Home from "../src/screens/home";
import Farm from "../src/app/(tabs)/farm/index";
import Account from "../src/app/(tabs)/more/account";
import { primaryTabs } from "../src/navigation";
import { t } from "../src/i18n";
import { ErrorState, GatedAction } from "../src/components/ui";
import { ApiError } from "../src/core/errors";
beforeEach(() => {
  mocks.auth = {
    status: "guest",
    me: null,
    message: null,
    validate: async () => {},
    logout: async () => {},
  };
  mocks.query = {
    isPending: false,
    isRefetching: false,
    data: undefined,
    error: null,
    dataUpdatedAt: 0,
    refetch: vi.fn(),
  };
});
it("guest shell launches without a login wall", () => {
  const html = renderToStaticMarkup(<Home />);
  expect(html).toContain("Početna");
  expect(html).not.toContain('type="password"');
});
it("guest farm screen includes login and registration CTA", () => {
  const html = renderToStaticMarkup(<Farm />);
  expect(html).toContain(t("guestCta"));
  expect(html).toContain(t("login"));
  expect(html).toContain(t("register"));
});
it("has exactly five approved primary tabs", () => {
  expect(primaryTabs.map(t)).toEqual([
    "Početna",
    "Za moje gazdinstvo",
    "Podsticaji",
    "Cenoteka",
    "Više",
  ]);
});
it("signed-in user can open personalized placeholder", () => {
  mocks.auth = {
    status: "signedIn",
    me: {
      user: { id: "x" },
      farm: { displayName: "Test gazdinstvo" },
      access: { capabilities: { usePersonalizedFeed: true } },
    },
  };
  mocks.query.data = {
    data: {
      items: [
        { key: "one", title: "Personalizovano", shortBody: "Informacija" },
      ],
    },
  };
  const html = renderToStaticMarkup(<Farm />);
  expect(html).toContain("Test gazdinstvo");
  expect(html).toContain("Personalizovano");
  expect(html).not.toContain(t("guestCta"));
});
it("offline error renders a clear state without crashing", () => {
  mocks.query.error = new ApiError("network");
  const html = renderToStaticMarkup(<Home />);
  expect(html).toContain(t("network"));
  expect(html).toContain(t("retry"));
});
it("account never renders internal backend error details", () => {
  const html = renderToStaticMarkup(
    <ErrorState error={new ApiError("internal_error", 500)} />,
  );
  expect(html).toContain(t("internal_error"));
  expect(html).not.toContain("stack");
});
it("signed-out account offers guest CTA", () => {
  expect(renderToStaticMarkup(<Account />)).toContain(t("guestCta"));
});
it("advanced denial renders a gate while registered-free farm content stays usable", () => {
  mocks.auth = {
    status: "signedIn",
    me: {
      user: { id: "x" },
      farm: { displayName: "Test gazdinstvo" },
      access: {
        capabilities: {
          usePersonalizedFeed: true,
          runFinancingAnalysis: false,
        },
      },
    },
  };
  const html = renderToStaticMarkup(
    <GatedAction
      capability="runFinancingAnalysis"
      label="Advanced operation"
      onPress={vi.fn()}
    />,
  );
  expect(html).not.toContain("Advanced operation");
  expect(html).toContain(t("gated"));
  expect(renderToStaticMarkup(<Farm />)).toContain("Test gazdinstvo");
});
