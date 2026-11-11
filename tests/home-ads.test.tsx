import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  push: vi.fn(),
  open: vi.fn(),
  focus: undefined as (() => void | (() => void)) | undefined,
  app: undefined as ((s: string) => void) | undefined,
  mode: "data",
  path: "",
}));
vi.mock("expo-router", async () => {
  const { useEffect } = await import("react");
  return {
    router: { push: m.push },
    useFocusEffect: (cb: () => void) =>
      useEffect(() => {
        m.focus = cb;
        return cb();
      }, [cb]),
  };
});
vi.mock("react-native", () => ({
  Text: "span",
  View: "div",
  Image: "img",
  Pressable: "button",
  AppState: {
    currentState: "active",
    addEventListener: (_: string, cb: (s: string) => void) => {
      m.app = cb;
      return { remove() {} };
    },
  },
}));
vi.mock("../src/config/environment", () => ({
  config: { apiBase: "https://agrobim.digital/api/v1" },
}));
vi.mock("../src/runtime", () => ({ api: { request: vi.fn() } }));
vi.mock("../src/components/content", () => ({
  ExternalLink: ({ title, url }: { title: string; url: string }) => (
    <button onClick={() => m.open(url)}>{title}</button>
  ),
}));
vi.mock("../src/components/ui", () => ({
  Card: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Body: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  Button: ({ label, onPress }: { label: string; onPress: () => void }) => (
    <button onClick={onPress}>{label}</button>
  ),
  ErrorState: ({ message }: { message: string }) => <span>{message}</span>,
  Loading: () => <span>Učitavanje</span>,
  styles: {},
}));
const oldId = "11111111-1111-4111-8111-111111111111";
const renewedId = "22222222-2222-4222-8222-222222222222";
const ad = (id: string, title: string) => ({
  id,
  title,
  coverPhotoId: oldId,
  type: "sell",
  municipality: "Test",
  priceAmount: null,
});
vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    m.path = queryKey[3]!;
    const items = m.path.includes("recent_activity")
      ? [ad(renewedId, "Obnovljen")]
      : [ad(oldId, "Stariji"), ad(renewedId, "Obnovljen")];
    if (m.mode === "error") return { error: new Error("offline") };
    return {
      data: {
        data:
          m.mode === "empty" ? { items: [], total: 0 } : { items, total: 2 },
      },
    };
  },
}));
import { HomeAds } from "../src/components/home-ads";
import { homeAdsPath, moveAd } from "../src/components/home-ads-rotation";
let root: ReactTestRenderer;
const mount = async (guest: boolean) => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  await act(async () => {
    root = create(<HomeAds guest={guest} />);
  });
};
const click = async (label: string) => {
  const node = root.root
    .findAllByType("button")
    .find(
      (b) => b.props.accessibilityLabel === label || b.props.children === label,
    );
  expect(node).toBeDefined();
  await act(async () => (node!.props.onClick ?? node!.props.onPress)());
};
const shows = (label: string) =>
  root.root.findAllByProps({ accessibilityLabel: label }).length > 0;
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  m.mode = "data";
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("rotates one card at 8 seconds, supports arrows, and pauses on blur or background", async () => {
  vi.useFakeTimers();
  await mount(true);
  expect(shows("Obnovljen")).toBe(true);
  expect(shows("Stariji")).toBe(false);
  expect(root.root.findByType("img").props.source.uri).toContain(
    "/api/public/oglasi-foto/",
  );
  await act(async () => {
    vi.advanceTimersByTime(7999);
  });
  expect(shows("Obnovljen")).toBe(true);
  await act(async () => {
    vi.advanceTimersByTime(1);
  });
  expect(shows("Stariji")).toBe(true);
  expect(shows("Obnovljen")).toBe(false);
  expect(m.path).toContain("sort=oldest");
  await act(async () => {
    m.app?.("background");
  });
  await act(async () => {
    vi.advanceTimersByTime(16000);
  });
  expect(shows("Stariji")).toBe(true);
  await act(async () => {
    m.app?.("active");
  });
  let blur: void | (() => void) = undefined;
  await act(async () => {
    blur = m.focus?.();
  });
  await act(async () => {
    if (blur) blur();
  });
  await act(async () => {
    vi.advanceTimersByTime(16000);
  });
  expect(shows("Stariji")).toBe(true);
  await act(async () => {
    m.focus?.();
  });
  await click("Prethodni oglas");
  expect(shows("Obnovljen")).toBe(true);
  await click("Sledeći oglas");
  await click("Stariji");
  expect(m.push).toHaveBeenLastCalledWith({
    pathname: "/more/ads/[id]",
    params: { id: oldId },
  });
});
it("keeps web actions in empty and error states, and offers registration only to guests", async () => {
  m.mode = "empty";
  await mount(true);
  expect(JSON.stringify(root.toJSON())).toContain(
    "Trenutno nema objavljenih malih oglasa.",
  );
  await click("Prikaži sve oglase");
  expect(m.open).toHaveBeenLastCalledWith("https://agrobim.digital/oglasi");
  await click("Predajte besplatno mali oglas");
  expect(m.open).toHaveBeenLastCalledWith(
    "https://agrobim.digital/oglasi/novi",
  );
  await click("Besplatna registracija");
  expect(m.push).toHaveBeenLastCalledWith("/auth/register");
  m.mode = "error";
  await act(async () => root.update(<HomeAds guest={false} />));
  const output = JSON.stringify(root.toJSON());
  expect(output).toContain("Mali oglasi trenutno nisu dostupni.");
  expect(output).not.toContain("Besplatna registracija");
  expect(output).toContain("Prikaži sve oglase");
});
it("walks progressively through oldest pages after the priority slot", () => {
  expect(homeAdsPath(0)).toBe("/ads?page=1&sort=recent_activity");
  expect(moveAd(0, 0, 1, 50, 1)).toEqual({ page: 1, index: 0 });
  expect(moveAd(1, 23, 24, 50, 1)).toEqual({ page: 2, index: 0 });
  expect(homeAdsPath(2)).toBe("/ads?page=2&sort=oldest");
  expect(moveAd(3, 1, 2, 50, 1)).toEqual({ page: 0, index: 0 });
  expect(moveAd(0, 0, 1, 50, -1)).toEqual({ page: 3, index: 23 });
});
