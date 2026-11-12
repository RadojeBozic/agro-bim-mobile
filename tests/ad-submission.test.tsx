import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import AdSubmission from "../src/screens/ad-submit";
import { ApiClient } from "../src/core/client";
import { ApiError } from "../src/core/errors";
import {
  adReceipt,
  allowedAdTypes,
  initialAdForm,
  sendAd,
  validateAd,
  type Attempt,
} from "../src/ads/submission";

const m = vi.hoisted(() => ({
  push: vi.fn(),
  dismiss: vi.fn(),
  request: vi.fn(),
  pick: vi.fn(),
  camera: vi.fn(),
  discard: vi.fn(),
  checking: false,
  prepare: vi.fn(),
  open: vi.fn(),
  signed: false,
}));
vi.mock("expo-router", () => ({
  router: { push: m.push, dismissTo: m.dismiss },
}));
vi.mock("expo-crypto", () => ({
  randomUUID: () => "11111111-1111-4111-8111-111111111111",
}));
vi.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: m.pick,
  launchCameraAsync: m.camera,
  requestCameraPermissionsAsync: async () => ({ granted: true }),
}));
vi.mock("expo-file-system", () => ({
  File: class {
    exists = true;
    size = 3;
    async arrayBuffer() {
      return Uint8Array.of(1, 2, 3).buffer;
    }
  },
}));
vi.mock("../src/ads/photos", () => ({
  prepareAdPhoto: m.prepare,
  discardPreparedPhoto: m.discard,
}));
vi.mock("../src/runtime", () => ({
  api: { request: m.request },
  session: { generation: () => 0 },
}));
vi.mock("../src/auth/provider", () => ({
  useAuth: () =>
    m.signed
      ? {
          status: m.checking ? "checking" : "signedIn",
          me: { user: { id: "test-account" } },
        }
      : { status: "guest" },
}));
vi.mock("react-native", () => ({
  Text: "span",
  TextInput: "input",
  Image: "img",
  View: "div",
  Keyboard: { dismiss: vi.fn() },
}));
vi.mock("../src/screens/ads", () => ({
  Picker: ({
    title,
    items,
    onSelect,
  }: {
    title: string;
    items: { value: string; label: string }[];
    onSelect: (v: string) => void;
  }) => (
    <div>
      {items.slice(0, title === "Opština" ? 1 : undefined).map((item) => (
        <button key={item.value} onClick={() => onSelect(item.value)}>
          {title + ": " + item.label}
        </button>
      ))}
    </div>
  ),
}));
vi.mock("../src/components/content", () => ({
  ExternalLink: ({ title, url }: { title: string; url: string }) => (
    <button onClick={() => m.open(url)}>{title}</button>
  ),
  Field: ({ title, value }: { title: string; value?: string }) => (
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
  ErrorState: () => <span>Greška</span>,
  styles: {},
}));

const listingId = "22222222-2222-4222-8222-222222222222";
const requestId = "11111111-1111-4111-8111-111111111111";
let root: ReactTestRenderer | undefined;
async function mount(signed: boolean) {
  m.signed = signed;
  m.checking = false;
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  await act(async () => {
    root = create(<AdSubmission />);
  });
}
const button = (label: string) =>
  root!.root
    .findAllByType("button")
    .find((node) => node.props.children === label);
const click = async (label: string) => {
  expect(button(label), label).toBeDefined();
  await act(async () => button(label)!.props.onClick());
};
const fill = async (label: string, value: string) => {
  await act(async () =>
    root!.root
      .findByProps({ accessibilityLabel: label })
      .props.onChangeText(value),
  );
};
const output = () => JSON.stringify(root!.toJSON());
afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it("offers login, registration and the guest web form without making a write", async () => {
  await mount(false);
  await click("Prijavite se");
  expect(m.push).toHaveBeenLastCalledWith({
    pathname: "/auth/login",
    params: { flow: "submit-ad" },
  });
  await click("Besplatna registracija");
  expect(m.push).toHaveBeenLastCalledWith({
    pathname: "/auth/register",
    params: { flow: "submit-ad" },
  });
  await click("Predajte oglas na webu bez registracije");
  expect(m.open).toHaveBeenCalledWith("https://agrobim.digital/oglasi/novi");
  expect(m.request).not.toHaveBeenCalled();
});

it("keeps fields and fixed photo positions through a failed upload, then confirms review", async () => {
  await mount(true);
  await click("Dalje na fotografije");
  expect(output()).toContain("Izaberite rubriku i odgovarajuću vrstu oglasa.");
  await click("Rubrika: Poljoprivredna mehanizacija");
  expect(button("Vrsta oglasa: Nudim posao")).toBeUndefined();
  await click("Vrsta oglasa: Prodajem");
  await click(buttonsTown());
  await fill("Naslov (do 80 znakova)", "Traktor");
  await fill("Opis (do 200 znakova)", "Ispravan traktor");
  await fill("Kontakt telefon", "0601234567");
  await click("Dalje na fotografije");
  m.pick.mockResolvedValue({
    canceled: false,
    assets: Array.from({ length: 6 }, (_, i) => ({ uri: "original" + i })),
  });
  m.prepare.mockImplementation(
    async (asset: { uri: string }) => "prepared-" + asset.uri,
  );
  await click("Izaberite iz galerije");
  expect(m.pick).toHaveBeenCalledWith(
    expect.objectContaining({ selectionLimit: 5 }),
  );
  expect(root!.root.findAllByType("img")).toHaveLength(5);
  await click("Uklonite fotografiju 5");
  await click("Dalje na pregled");
  let fail = true;
  m.request.mockImplementation(async (path: string) => {
    if (path === "/me/ads") return { data: { listingId, status: "draft" } };
    if (path.endsWith("/photos/2") && fail) {
      fail = false;
      throw new ApiError("network");
    }
    return {
      data: path.endsWith("/submit")
        ? { listingId, status: "pending_review" }
        : { accepted: true },
    };
  });
  await click("Pošalji oglas na pregled");
  expect(output()).toContain("Ispravan traktor");
  expect(output()).not.toContain("Oglas je poslat na pregled");
  expect(m.request.mock.calls.map(([path]) => path)).toEqual([
    "/me/ads",
    "/me/ads/" + listingId + "/photos/1",
    "/me/ads/" + listingId + "/photos/2",
  ]);
  expect(m.request.mock.calls[0]?.[2]).toMatchObject({
    private: true,
    body: { requestId, photoCount: 4, fields: { title: "Traktor" } },
  });
  await click("Ponovite predaju");
  expect(m.request.mock.calls.slice(3).map(([path]) => path)).toEqual(
    ["photos/2", "photos/3", "photos/4", "submit"].map(
      (path) => "/me/ads/" + listingId + "/" + path,
    ),
  );
  expect(output()).toContain("Oglas je poslat na pregled");
  await click("Nazad u Oglasnik");
  expect(m.dismiss).toHaveBeenCalledWith("/more/ads");
});
it("preserves the draft across gallery and camera return and waits for final confirmation", async () => {
  await mount(true);
  await click("Rubrika: Poljoprivredna mehanizacija");
  await click("Vrsta oglasa: Prodajem");
  await click(buttonsTown());
  await click("Dalje na fotografije");
  expect(
    root!.root.findByProps({ accessibilityRole: "alert" }).props.children,
  ).toBe("Unesite naslov do 80 karaktera.");
  expect(button("Izaberite iz galerije")).toBeUndefined();
  await fill("Naslov (do 80 znakova)", "Traktor");
  await fill("Opis (do 200 znakova)", "Ispravan traktor");
  await fill("Kontakt telefon", "0601234567");
  await click("Dalje na fotografije");

  m.prepare.mockImplementation(
    async (asset: { uri: string }) => "prepared-" + asset.uri,
  );
  for (const [picker, label, uri] of [
    [m.pick, "Izaberite iz galerije", "gallery"],
    [m.camera, "Fotografišite", "camera"],
  ] as const) {
    let finish!: (result: {
      canceled: false;
      assets: { uri: string }[];
    }) => void;
    picker.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await click(label);
    await act(async () => {
      m.checking = true;
      root!.update(<AdSubmission />);
    });
    expect(
      root!.root
        .findAllByType("div")
        .some((node) => node.props.style?.display === "none"),
    ).toBe(true);
    await act(async () => finish({ canceled: false, assets: [{ uri }] }));
    await act(async () => {
      m.checking = false;
      root!.update(<AdSubmission />);
    });
    expect(
      root!.root.findByProps({ accessibilityRole: "header" }).children.join(""),
    ).toContain("Korak 2 od 3");
    expect(output()).toContain("prepared-" + uri);
    expect(m.discard).not.toHaveBeenCalled();
  }

  m.pick.mockResolvedValueOnce({ canceled: true, assets: null });
  await click("Izaberite iz galerije");
  expect(root!.root.findAllByType("img")).toHaveLength(2);
  await click("Prethodni korak");
  expect(
    root!.root.findByProps({ accessibilityLabel: "Naslov (do 80 znakova)" })
      .props.value,
  ).toBe("Traktor");
  await click("Dalje na fotografije");
  await click("Dalje na pregled");
  expect(
    root!.root.findByProps({ accessibilityRole: "header" }).children.join(""),
  ).toContain("Korak 3 od 3");
  expect(output()).toContain("Ispravan traktor");
  expect(root!.root.findAllByType("img")).toHaveLength(2);
  expect(button("Pošalji oglas na pregled")?.props.disabled).toBe(false);
  expect(m.request).not.toHaveBeenCalled();
});
it("retries only the final submit after the draft and photo were acknowledged", async () => {
  await mount(true);
  await click("Rubrika: Poljoprivredna mehanizacija");
  await click("Vrsta oglasa: Prodajem");
  await click(buttonsTown());
  await fill("Naslov (do 80 znakova)", "Traktor");
  await fill("Opis (do 200 znakova)", "Ispravan traktor");
  await fill("Kontakt telefon", "0601234567");
  await click("Dalje na fotografije");
  m.pick.mockResolvedValueOnce({
    canceled: false,
    assets: [{ uri: "gallery" }],
  });
  m.prepare.mockResolvedValueOnce("prepared-gallery");
  await click("Izaberite iz galerije");
  await click("Dalje na pregled");

  const submit = "/me/ads/" + listingId + "/submit";
  m.request
    .mockResolvedValueOnce({ data: { listingId, status: "draft" } })
    .mockResolvedValueOnce({ data: { accepted: true } })
    .mockRejectedValueOnce(new ApiError("validation_error", 400, requestId))
    .mockResolvedValueOnce({ data: { listingId, status: "pending_review" } });

  await click("Pošalji oglas na pregled");
  expect(output()).toContain(
    "Završna predaja · HTTP 400 · validation_error · ID zahteva " + requestId,
  );
  expect(output()).toContain("Ispravan traktor");
  expect(root!.root.findAllByType("img")).toHaveLength(1);
  expect(output()).not.toContain("Oglas je poslat na pregled");
  await click("Ponovite predaju");
  expect(m.request.mock.calls.map(([path]) => path)).toEqual([
    "/me/ads",
    "/me/ads/" + listingId + "/photos/1",
    submit,
    submit,
  ]);
  expect(m.request.mock.calls[2]?.[2]).not.toHaveProperty("body");
  expect(output()).toContain("Oglas je poslat na pregled");
});
function buttonsTown() {
  return String(
    root!.root
      .findAllByType("button")
      .find((node) => String(node.props.children).startsWith("Opština: "))!
      .props.children,
  );
}

it("replays the same request ID if create acknowledgment is lost and rejects a draft as final", async () => {
  const fields = validateAd({
    ...initialAdForm,
    title: "Oglas",
    description: "Opis",
    phone: "060123",
    category: "machinery",
    type: "sell",
    municipalityCode: "70017",
  }).fields!;
  const attempt: Attempt = { requestId, uploaded: 0 };
  const createDraft = vi
    .fn()
    .mockRejectedValueOnce(new ApiError("network"))
    .mockResolvedValue({ listingId, status: "draft" });
  const upload = vi.fn();
  const submit = vi.fn().mockResolvedValue({ listingId, status: "draft" });
  const retry = () =>
    sendAd(
      { create: createDraft, upload, submit },
      attempt,
      fields,
      [],
      vi.fn(),
    );
  await expect(retry()).rejects.toThrow();
  await expect(retry()).rejects.toThrow("Predaja nije potvrđena.");
  expect(createDraft.mock.calls[0]).toEqual(createDraft.mock.calls[1]);
  expect(createDraft.mock.calls[1]?.[0].requestId).toBe(requestId);
  expect(allowedAdTypes("services")).toEqual([
    "service_offer",
    "service_wanted",
  ]);
});
it("uses bearer with binary bytes and no JSON re-encoding", async () => {
  const fetcher = vi.fn(async () =>
    Response.json({
      schemaVersion: "1",
      data: { listingId, status: "draft" },
      serverNow: "2026-11-12T00:00:00Z",
      timezone: "Europe/Belgrade",
      requestId,
    }),
  );
  const api = new ApiClient(
    "https://example.org/api/v1",
    {
      generation: () => 0,
      token: () => "test-only",
      refresh: async () => null,
      clear: async () => {},
    },
    fetcher,
  );
  const bytes = Uint8Array.of(1, 2, 3).buffer;
  await api.request("/me/ads/" + listingId + "/photos/1", adReceipt, {
    private: true,
    method: "PUT",
    rawBody: { bytes, contentType: "image/jpeg" },
  });
  expect(fetcher).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      body: bytes,
      headers: expect.objectContaining({
        Authorization: "Bearer test-only",
        "Content-Type": "image/jpeg",
      }),
    }),
  );
});
