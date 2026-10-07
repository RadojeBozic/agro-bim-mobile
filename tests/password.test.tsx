import React from "react";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("react-native", () => ({ Text: "span", TextInput: "input" }));
vi.mock("expo-router", () => ({ router: { push: vi.fn(), replace: vi.fn() } }));
vi.mock("../src/runtime", () => ({ supabase: { auth: {} } }));
vi.mock("../src/config/environment", () => ({
  config: { callbackUrl: "agrobim-dev://auth/callback" },
}));
vi.mock("../src/auth/provider", () => ({
  useAuth: () => ({ validate: vi.fn() }),
}));
vi.mock("../src/components/ui", () => ({
  Screen: ({ children }: any) => <main>{children}</main>,
  Card: ({ children }: any) => <div>{children}</div>,
  Body: ({ children }: any) => <span>{children}</span>,
  styles: {},
  Button: ({ label, onPress, disabled }: any) => (
    <button aria-label={label} onClick={onPress} disabled={disabled}>
      {label}
    </button>
  ),
}));
import AuthForm from "../src/screens/auth-form";
let root: ReactTestRenderer;
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("login password starts hidden and toggling preserves its exact value", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  await act(async () => {
    root = create(<AuthForm mode="login" />);
  });
  const password = () =>
    root.root
      .findAllByType("input")
      .find((input) => input.props.accessibilityLabel === "Lozinka")!;
  expect(password().props.secureTextEntry).toBe(true);
  const value = "synthetic-unit-test-value";
  await act(async () => password().props.onChangeText(value));
  await act(async () =>
    root.root.findByProps({ "aria-label": "Prikaži lozinku" }).props.onClick(),
  );
  expect(password().props.secureTextEntry).toBe(false);
  expect(password().props.value).toBe(value);
  await act(async () =>
    root.root.findByProps({ "aria-label": "Sakrij lozinku" }).props.onClick(),
  );
  expect(password().props.secureTextEntry).toBe(true);
  expect(password().props.value).toBe(value);
});
