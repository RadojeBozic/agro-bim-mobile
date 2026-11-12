import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import {
  QueryClient,
  QueryClientProvider,
  notifyManager,
} from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiClient } from "../src/core/client";
import { ApiError } from "../src/core/errors";
import { SessionCoordinator } from "../src/core/session";
import {
  editBody,
  editForm,
  myEditSchema,
  ownerAdsKey,
} from "../src/api/my-ads";
import { validateAd } from "../src/ads/submission";

const m = vi.hoisted(() => ({
  owner: "",
  id: "11111111-1111-4111-8111-111111111111",
  request: vi.fn(),
  push: vi.fn(),
  dismiss: vi.fn(),
}));
vi.mock("expo-router", () => ({
  router: { push: m.push, dismissTo: m.dismiss },
  useLocalSearchParams: () => ({ id: m.id }),
}));
vi.mock("../src/runtime", () => ({
  api: { request: m.request },
  session: {
    get session() {
      return m.owner ? { user: { id: m.owner } } : null;
    },
  },
}));
vi.mock("../src/auth/provider", () => ({
  useAuth: () =>
    m.owner
      ? { status: "signedIn", me: { user: { id: m.owner } } }
      : { status: "guest" },
}));
vi.mock("react-native", () => ({ Text: "span", Image: "img" }));
vi.mock("../src/components/ad-fields", () => ({
  AdFieldsForm: ({
    form,
    set,
  }: {
    form: { title: string };
    set: (key: string, value: string) => void;
  }) =>
    React.createElement("input", {
      "aria-label": "Naslov",
      value: form.title,
      onChange: set,
    }),
}));
vi.mock("../src/components/content", () => ({
  Field: ({ title, value }: { title: string; value: string }) => (
    <span>
      {title}: {value}
    </span>
  ),
}));
vi.mock("../src/components/ui", () => ({
  Screen: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
  Card: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Body: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  Button: ({
    label,
    onPress,
    disabled,
  }: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onPress} disabled={disabled}>
      {label}
    </button>
  ),
  Loading: () => <span>Učitavanje</span>,
  ErrorState: ({ message }: { message: string }) => <span>{message}</span>,
  styles: {},
}));
import { MyAdsList, MyAdsDetail, MyAdsEdit } from "../src/screens/my-ads";

let root: ReactTestRenderer | undefined;
let client: QueryClient;
const photo = "22222222-2222-4222-8222-222222222222";
const ad = {
  id: m.id,
  title: "Moja prikolica",
  status: "active",
  category: "machinery",
  expiresAt: "2026-11-15T00:00:00Z",
  hasPendingReview: false,
  actions: ["edit", "withdraw", "complete", "renew"],
  publishedAt: null,
  firstPublishedAt: null,
  description: "Opis",
  versions: [
    {
      id: m.id,
      reviewStatus: "approved",
      reason: null,
      photos: [{ id: photo }],
    },
  ],
};
const edit = myEditSchema.parse({
  id: m.id,
  expectedVersionId: null,
  photos: [{ id: photo }],
  fields: {
    title: "Prikolica",
    description: "Opis",
    category: "machinery",
    type: "sell",
    municipalityCode: "70017",
    phone: "0601234567",
    email: "owner@example.test",
    attributes: { size: "3m" },
  },
});
const tree = (screen: React.ReactNode) => (
  <QueryClientProvider client={client}>{screen}</QueryClientProvider>
);
async function mount(screen: React.ReactNode, owner: string) {
  m.owner = owner;
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  notifyManager.setScheduler(queueMicrotask);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  await act(async () => {
    root = create(tree(screen));
  });
}
const output = () => JSON.stringify(root!.toJSON());
const button = (label: string) =>
  root!.root
    .findAllByType("button")
    .find((node) => node.props.children === label);
async function click(label: string) {
  expect(button(label), label).toBeDefined();
  await act(async () => button(label)!.props.onClick());
}
afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = undefined;
  client?.clear();
  m.request.mockReset();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  notifyManager.setScheduler((cb) => setTimeout(cb, 0));
});

it("does not request private ads for guests and opens M3b from an empty owner list", async () => {
  await mount(<MyAdsList />, "");
  expect(m.request).not.toHaveBeenCalled();
  await click("Prijavite se");
  expect(m.push).toHaveBeenCalledWith("/auth/login");
  expect(button("Besplatna registracija")).toBeDefined();
  m.owner = "account-a";
  m.request.mockResolvedValue({
    data: { items: [], pagination: { nextOffset: null } },
  });
  await act(async () => root!.update(tree(<MyAdsList />)));
  expect(m.request).toHaveBeenCalledWith(
    "/me/ads?limit=20&offset=0",
    expect.anything(),
    expect.objectContaining({ private: true }),
  );
  expect(output()).toContain("Još nemate malih oglasa");
  await click("Predajte mali oglas");
  expect(m.push).toHaveBeenLastCalledWith("/more/ads/new");
});
it("invalidates the owner list and detail after a confirmed action", async () => {
  let withdrawn = false;
  m.request.mockImplementation(
    async (path: string, _schema: unknown, options: { method?: string }) => {
      if (options.method === "POST") {
        expect(path).toBe("/me/ads/" + m.id + "/withdraw");
        withdrawn = true;
        return { data: { ok: true } };
      }
      const row = withdrawn ? { ...ad, status: "withdrawn", actions: [] } : ad;
      return {
        data: path.includes("?")
          ? { items: [row], pagination: { nextOffset: null } }
          : row,
      };
    },
  );
  await mount(
    <>
      <MyAdsList />
      <MyAdsDetail />
    </>,
    "account-a",
  );
  expect(output()).toContain("Moja prikolica");
  await click("Povuci oglas");
  expect(withdrawn).toBe(false);
  await click("Potvrdi");
  expect(withdrawn).toBe(true);
  expect(output().match(/Povučen/g)).toHaveLength(2);
  expect(button("Obnovi oglas")).toBeUndefined();
});
it.each([
  ["Označi kao završen", "complete"],
  ["Obnovi oglas", "renew"],
])("confirms %s with the expected request", async (label, action) => {
  m.request.mockResolvedValue({ data: ad });
  await mount(<MyAdsDetail />, "account-a");
  await click(label);
  await click("Potvrdi");
  const post = m.request.mock.calls.find(
    ([, , options]) => options.method === "POST",
  );
  expect(post?.[0]).toBe("/me/ads/" + m.id + "/" + action);
  expect(post?.[2].body).toEqual(
    action === "renew"
      ? { expectedExpiry: ad.expiresAt, confirmed: true }
      : undefined,
  );
});
it("requests owner photo bytes privately and drops the photo and owner cache at logout", async () => {
  m.request.mockImplementation(async (path: string) => ({
    data: path.includes("/photo/") ? "data:image/png;base64,AQ==" : ad,
  }));
  await mount(<MyAdsDetail />, "account-a");
  await click("Prikaži fotografiju 1");
  expect(m.request).toHaveBeenCalledWith(
    "/me/ads/" + m.id + "/photo/" + photo,
    expect.anything(),
    expect.objectContaining({ private: true, responseImage: true }),
  );
  expect(root!.root.findByType("img").props.source.uri).toBe(
    "data:image/png;base64,AQ==",
  );
  const coordinator = new SessionCoordinator(
    client,
    async () => null,
    () => {},
    async () => {},
  );
  coordinator.session = { user: { id: m.owner } } as NonNullable<
    typeof coordinator.session
  >;
  await act(async () => {
    await coordinator.clear(false);
    m.owner = "";
    root!.update(tree(<MyAdsDetail />));
  });
  expect(output()).not.toContain("Moja prikolica");
  expect(root!.root.findAllByType("img")).toHaveLength(0);
  expect(client.getQueriesData({ queryKey: ownerAdsKey("account-a") })).toEqual(
    [],
  );
});
it("preserves edit fields after a failure and submits kept photo IDs without new images", async () => {
  let fail = true;
  m.request.mockImplementation(
    async (_path: string, _schema: unknown, options: { method?: string }) => {
      if (options.method === "PUT") {
        if (fail) {
          fail = false;
          throw new ApiError("conflict", 409);
        }
        return { data: { ok: true } };
      }
      return { data: edit };
    },
  );
  await mount(<MyAdsEdit />, "account-a");
  await act(async () =>
    root!.root.findByType("input").props.onChange("title", "Izmenjen naslov"),
  );
  await click("Ukloni fotografiju 1");
  await click("Zadrži fotografiju 1");
  await click("Pošalji izmenu na pregled");
  expect(output()).toContain("Vaši unosi nisu obrisani.");
  expect(root!.root.findByType("input").props.value).toBe("Izmenjen naslov");
  await click("Pošalji izmenu na pregled");
  const writes = m.request.mock.calls.filter(
    ([, , options]) => options.method === "PUT",
  );
  expect(writes[0]?.[2].body).toEqual(writes[1]?.[2].body);
  expect(writes[1]?.[2].body).toMatchObject({
    keepPhotoIds: [photo],
    photos: [],
    fields: {
      title: "Izmenjen naslov",
      email: "owner@example.test",
      attributes: { size: "3m" },
    },
  });
  expect(output()).toContain("Izmena je poslata na urednički pregled.");
});
it("blocks the edit form if the server returns pending-review conflict", async () => {
  m.request.mockRejectedValue(new ApiError("conflict", 409));
  await mount(<MyAdsEdit />, "account-a");
  expect(output()).toContain("Izmena već čeka pregled");
  expect(root!.root.findAllByType("input")).toHaveLength(0);
});
it("rejects an oversized UTF-8 edit before any request", () => {
  const fields = validateAd(editForm(edit.fields)).fields!;
  const oversized = {
    ...edit,
    fields: {
      ...edit.fields,
      attributes: Object.fromEntries(
        Array.from({ length: 40 }, (_, i) => [String(i), "č".repeat(500)]),
      ),
    },
  };
  expect(() => editBody(oversized, fields, [photo])).toThrow(
    "Izmena je prevelika",
  );
  expect(m.request).not.toHaveBeenCalled();
});
it("fetches a private binary image using bearer and validates MIME and request ID", async () => {
  const fetcher = vi.fn(
    async () =>
      new Response(Uint8Array.of(1, 2, 3), {
        headers: { "Content-Type": "image/png", "X-Request-Id": m.id },
      }),
  );
  const api = new ApiClient(
    "https://example.org/api/v1",
    {
      generation: () => 0,
      token: () => "unit-test",
      refresh: async () => null,
      clear: async () => {},
    },
    fetcher,
  );
  const path = "/me/ads/" + m.id + "/photo/" + photo;
  const result = await api.request(path, z.string(), {
    private: true,
    responseImage: true,
  });
  expect(result.data).toBe("data:image/png;base64,AQID");
  expect(fetcher).toHaveBeenCalledWith(
    expect.stringContaining(path),
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: "Bearer unit-test" }),
    }),
  );
  await expect(
    api.request(path, z.string(), { responseImage: true }),
  ).rejects.toMatchObject({ code: "validation_error" });
});
