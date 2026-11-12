import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import {
  QueryClient,
  QueryClientProvider,
  notifyManager,
} from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { AdsDetail, AdsList } from "../src/screens/ads";
import { primaryTabs } from "../src/navigation";

const mock = vi.hoisted(() => ({
  push: vi.fn(),
  fetch: vi.fn(),
  open: vi.fn(),
  share: vi.fn(),
  id: "11111111-1111-4111-8111-111111111111",
}));
vi.mock("expo-router", () => ({
  router: { push: mock.push },
  useLocalSearchParams: () => ({ id: mock.id }),
}));
vi.mock("../src/config/environment", () => ({
  config: { apiBase: "https://agrobim.digital/api/v1" },
}));
vi.mock("../src/runtime", async () => {
  const { ApiClient } = await import("../src/core/client");
  return {
    api: new ApiClient(
      "https://agrobim.digital/api/v1",
      {
        token: () => {
          throw new Error("Public queries must not read auth");
        },
        refresh: async () => null,
        clear: async () => {},
        generation: () => 0,
      },
      mock.fetch,
    ),
  };
});
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
vi.mock("react-native", () => ({
  Text: "span",
  Linking: { openURL: mock.open },
  Share: { share: mock.share },
  TextInput: "input",
  Image: "img",
  Pressable: "button",
  View: "div",
  Modal: ({
    visible,
    children,
  }: {
    visible: boolean;
    children: React.ReactNode;
  }) => (visible ? children : null),
  FlatList: ({
    data,
    renderItem,
  }: {
    data: { value: string }[];
    renderItem: (props: { item: { value: string } }) => React.ReactNode;
  }) =>
    data.map((item) => (
      <React.Fragment key={item.value}>{renderItem({ item })}</React.Fragment>
    )),
}));
vi.mock("../src/components/ui", () => ({
  Screen: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
  Card: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Body: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  Button: ({ label, onPress }: { label: string; onPress: () => void }) => (
    <button onClick={onPress}>{label}</button>
  ),
  Loading: () => <span>Učitavanje</span>,
  ErrorState: () => <span>Greška</span>,
  styles: {},
}));
vi.mock("../src/components/content", () => ({
  ExternalLink: ({ title, url }: { title: string; url: string }) => (
    <button onClick={() => mock.open(url)}>{title}</button>
  ),
  Field: ({ title, value }: { title: string; value: string }) => (
    <span>
      {title}: {value}
    </span>
  ),
}));

const photoId = "22222222-2222-4222-8222-222222222222";
const card = {
  id: mock.id,
  title: "Traktor",
  category: "machinery",
  type: "sell",
  municipalityCode: "70017",
  municipality: "Aleksandrovac",
  settlement: null,
  publishedAt: "2026-11-11T10:00:00Z",
  priceAmount: 123,
  currency: "EUR",
  priceBasis: "komad",
  coverPhotoId: photoId,
  views: 0,
  phone: "PRIVATE_TEST_VALUE",
};
let root: ReactTestRenderer | undefined;
let client: QueryClient | undefined;
const settle = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};
const click = async (label: string) => {
  const button = root!.root
    .findAllByType("button")
    .find(
      (node) =>
        node.props.children === label ||
        node.props.accessibilityLabel === label,
    );
  expect(button, label).toBeDefined();
  await act(async () => (button!.props.onClick ?? button!.props.onPress)());
  await settle();
};
const request = () => new URL(mock.fetch.mock.calls.at(-1)![0]);
const rendered = () => JSON.stringify(root!.toJSON());

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = undefined;
  client?.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  notifyManager.setScheduler((cb) => setTimeout(cb, 0));
});

it("browses anonymously, filters and paginates, preserves the list under detail, and handles withdrawal", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  notifyManager.setScheduler(queueMicrotask);
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  let withdrawn = false;
  mock.fetch.mockImplementation(async (url: string, init: RequestInit) => {
    expect(new Headers(init.headers).has("Authorization")).toBe(false);
    const path = new URL(url).pathname;
    const detail = path.endsWith("/" + mock.id);
    if (detail && withdrawn)
      return Response.json(
        { error: { code: "not_found", message: "Gone", requestId: mock.id } },
        { status: 404 },
      );
    return Response.json({
      schemaVersion: "1",
      serverNow: "2026-11-11T10:00:00Z",
      timezone: "Europe/Belgrade",
      requestId: mock.id,
      data: path.endsWith("/phone")
        ? { phone: "+381 60 1234567" }
        : detail
          ? {
              ...card,
              description: "Opis traktora",
              advertiser: "Javni naziv",
              messagingAvailable: true,
              photos: [photoId],
              attributes: { Snaga: "60 kW" },
            }
          : { items: [card], total: 25 },
    });
  });
  const layout = (detail: boolean) => (
    <QueryClientProvider client={client!}>
      <AdsList key="list" />
      {detail && <AdsDetail key="detail" />}
    </QueryClientProvider>
  );
  await act(async () => {
    root = create(layout(false));
  });
  await settle();
  expect(request().pathname).toBe("/api/v1/ads");
  expect(rendered()).toContain("Traktor");
  expect(root!.root.findByType("img").props.source.uri).toBe(
    "https://agrobim.digital/api/public/oglasi-foto/" + mock.id + "/" + photoId,
  );
  await act(async () =>
    root!.root
      .findByProps({ accessibilityLabel: "Pretraži oglase" })
      .props.onChangeText("traktor .. č"),
  );
  await click("Pretraži");
  expect(request().searchParams.get("q")).toBe("traktor .. č");
  await click("Rubrika: Sve rubrike");
  const select = async (label: string) => {
    const choice = root!.root
      .findAllByType("button")
      .find(
        (node) =>
          node.props.onPress &&
          node
            .findAllByType("span")
            .some((span) => span.props.children.includes(label)),
      );
    expect(choice, label).toBeDefined();
    await act(async () => choice!.props.onPress());
    await settle();
  };
  await select("Poljoprivredna mehanizacija");
  await click("Vrsta oglasa: Sve vrste");
  expect(rendered()).not.toContain("Nudim posao");
  await select("Prodajem");
  await click("Opština: Sve opštine");
  await select("Aleksandrovac");
  await click("Sortiranje: Najnoviji");
  await select("Najstariji");
  await click("Sledeća strana");
  expect(Object.fromEntries(request().searchParams)).toMatchObject({
    page: "2",
    category: "machinery",
    type: "sell",
    municipality: "70017",
    sort: "oldest",
  });
  await click("Traktor");
  expect(mock.push).toHaveBeenCalledWith({
    pathname: "/more/ads/[id]",
    params: { id: mock.id },
  });
  await act(async () => root!.update(layout(true)));
  await settle();
  expect(request().pathname).toBe("/api/v1/ads/" + mock.id);
  expect(rendered()).toContain("Opis traktora");
  expect(rendered()).toContain("60 kW");
  expect(rendered()).not.toContain("PRIVATE_TEST_VALUE");
  expect(rendered()).toContain("Javni naziv");
  expect(rendered()).not.toContain("+381 60 1234567");
  const publicUrl = "https://agrobim.digital/oglasi/" + mock.id;
  await click("Podeli oglas");
  expect(mock.share).toHaveBeenCalledWith({ message: publicUrl });
  await click("Pošaljite poruku");
  expect(mock.open).toHaveBeenCalledWith(publicUrl);
  expect(request().pathname).toBe("/api/v1/ads/" + mock.id);
  await click("Prikaži telefon");
  expect(request().pathname).toBe("/api/v1/ads/" + mock.id + "/phone");
  expect(mock.fetch.mock.lastCall?.[1].method).toBe("POST");
  await click("Pozovi +381 60 1234567");
  expect(mock.open).toHaveBeenLastCalledWith("tel:+381601234567");
  await act(async () => root!.update(layout(false)));
  expect(rendered()).toContain("Strana ");
  expect(rendered()).toContain("Sortiranje: Najstariji");
  expect(
    root!.root.findByProps({ accessibilityLabel: "Pretraži oglase" }).props
      .value,
  ).toBe("traktor .. č");
  withdrawn = true;
  await act(async () => root!.update(layout(true)));
  await settle();
  expect(rendered()).toContain("Oglas više nije javno dostupan.");
  expect(rendered()).not.toContain("Opis traktora");
  expect(rendered()).not.toContain("Pošaljite poruku");
  expect(primaryTabs).toEqual([
    "home",
    "farm",
    "programmes",
    "cenoteka",
    "more",
  ]);
});
