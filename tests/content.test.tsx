import React from "react";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  params: {} as any,
  options: [] as any[],
  push: vi.fn(),
  request: vi.fn(),
  openURL: vi.fn(async () => {}),
  auth: { status: "guest", me: null, message: null } as any,
  qa: false,
  query: {
    isPending: false,
    isRefetching: false,
    isFetching: false,
    data: undefined,
    error: null,
    dataUpdatedAt: 0,
    refetch: vi.fn(),
  } as any,
}));
vi.mock("react-native", () => ({
  Text: "span",
  View: "div",
  Pressable: "button",
  Image: "img",
  ScrollView: "main",
  TextInput: "input",
  ActivityIndicator: "progress",
  RefreshControl: "i",
  Linking: { openURL: m.openURL },
  StyleSheet: { create: (s: unknown) => s },
  AccessibilityInfo: {
    isReduceMotionEnabled: async () => false,
    addEventListener: () => ({ remove() {} }),
  },
}));
vi.mock("@react-native-community/netinfo", () => ({
  default: { addEventListener: () => () => {} },
}));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 24, left: 0 }),
}));
vi.mock("expo-router", () => ({
  useLocalSearchParams: () => m.params,
  useFocusEffect: () => {},
  router: { push: m.push },
  Stack: "div",
  Redirect: "redirect",
}));
vi.mock("../src/runtime", () => ({ api: { request: m.request } }));
vi.mock("../src/config/environment", () => ({
  config: {
    get qaEnabled() {
      return m.qa;
    },
  },
}));
vi.mock("../src/auth/provider", () => ({
  useAuth: () => m.auth,
  useCapability: () => false,
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: any) => {
    m.options.push(options);
    return m.query;
  },
}));
import { TrustLinks } from "../src/components/trust-links";
import { availableTrustLinks, trustDestinations } from "../src/config/trust";
import Account from "../src/app/(tabs)/more/account";
import Farm from "../src/app/(tabs)/farm/index";
import Home from "../src/screens/home";
import { CatalogList, CatalogDetail } from "../src/screens/catalog";
import Information from "../src/screens/information";
import More from "../src/app/(tabs)/more/index";
import QA from "../src/app/(tabs)/more/qa";
import { contentHref, safePublicUrl, label } from "../src/content";
import { findFeedItem } from "../src/screens/feed-query";
import { ApiError } from "../src/core/errors";
const id = "11111111-1111-4111-8111-111111111111";
let root: ReactTestRenderer | undefined;
beforeEach(() => {
  m.options = [];
  m.params = {};
  m.qa = false;
  m.push.mockReset();
  m.request.mockReset();
  m.openURL.mockReset();
  m.openURL.mockResolvedValue(undefined);
  m.auth = { status: "guest", me: null, message: null };
  m.query = {
    isPending: false,
    isRefetching: false,
    isFetching: false,
    data: undefined,
    error: null,
    dataUpdatedAt: 0,
    refetch: vi.fn(),
  };
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("Home presses use real programme, financing and Cenoteka product identifiers", async () => {
  const programme = { id, title: "Poziv", target: { type: "programme", id } };
  const financing = {
    id,
    title: "Kredit",
    target: { type: "financing_product", id },
  };
  const offer = {
    id,
    productName: "Seme",
    target: { type: "cenoteka_offer", id, productId: id },
  };
  m.query.data = {
    data: {
      audience: "guest",
      sections: {
        information: { status: "ok", items: [{ title: "Bez odredišta" }] },
        programmes: { status: "ok", items: [programme] },
        financing: { status: "ok", items: [financing] },
        cenoteka: { status: "ok", items: [offer] },
      },
      market: { exchange: { items: [] }, stips: { items: [] } },
    },
  };
  await act(async () => {
    root = create(<Home />);
  });
  for (const [title, path] of [
    ["Poziv", "/programmes/[id]"],
    ["Kredit", "/more/financing/[id]"],
    ["Seme", "/cenoteka/[id]"],
  ]) {
    const button = root!.root
      .findAllByType("button")
      .find((b) => b.props.accessibilityLabel === title)!;
    await act(async () => button.props.onPress());
    expect(m.push).toHaveBeenLastCalledWith({ pathname: path, params: { id } });
  }
  expect(
    root!.root
      .findAllByType("button")
      .some((b) => b.props.accessibilityLabel === "Bez odredišta"),
  ).toBe(false);
});
it("guest information never navigates into a private feed and invalid targets stay inert", () => {
  const item = {
    key: "stream:real",
    shortBody: "Opis",
    target: { type: "feed_item", key: "stream:real" },
  };
  expect(contentHref(item, false)).toEqual({
    pathname: "/home/information/[key]",
    params: { key: "stream:real" },
  });
  expect(contentHref(item, true)).toEqual({
    pathname: "/farm/feed/[key]",
    params: { key: "stream:real" },
  });
  expect(contentHref({ ...item, shortBody: null }, false)).toBeNull();
  expect(
    contentHref({ target: { type: "programme", id: "bad" } }, false),
  ).toBeNull();
});
it.each(["programmes", "financing", "cenoteka"] as const)(
  "valid %s details request the existing public endpoint",
  async (kind) => {
    m.params = { id };
    renderToStaticMarkup(<CatalogDetail kind={kind} />);
    const options = m.options.at(-1);
    expect(options.enabled).toBe(true);
    await options.queryFn({ signal: undefined });
    const endpoints = {
      programmes: "/programmes/",
      financing: "/financing/products/",
      cenoteka: "/cenoteka/products/",
    };
    expect(m.request.mock.calls[0][0]).toBe(endpoints[kind] + id);
    expect(m.request.mock.calls[0][2].private).toBeUndefined();
  },
);
it.each([undefined, "bad", ["one", "two"]])(
  "invalid detail ID %s renders not-found without enabling a request",
  (id) => {
    m.params = { id };
    expect(renderToStaticMarkup(<CatalogDetail kind="programmes" />)).toContain(
      "Traženi sadržaj nije pronađen",
    );
    expect(m.options.at(-1).enabled).toBe(false);
    expect(m.request).not.toHaveBeenCalled();
  },
);
it("404 detail and transient request failures have readable Serbian states", () => {
  m.params = { id };
  m.query.error = new ApiError("not_found", 404);
  expect(renderToStaticMarkup(<CatalogDetail kind="financing" />)).toContain(
    "Traženi sadržaj nije pronađen",
  );
  m.query.error = new ApiError("network");
  const html = renderToStaticMarkup(<CatalogList kind="cenoteka" />);
  expect(html).toContain("Proverite internet vezu");
  expect(html).toContain("Pokušajte ponovo");
});
it.each(["programmes", "financing", "cenoteka"] as const)(
  "%s distinguishes empty results from loading",
  (kind) => {
    m.query.data = { data: { items: [], pagination: { nextOffset: null } } };
    expect(renderToStaticMarkup(<CatalogList kind={kind} />)).toContain(
      "Još nema dostupnih informacija",
    );
    m.query.data = undefined;
    m.query.isPending = true;
    expect(renderToStaticMarkup(<CatalogList kind={kind} />)).toContain(
      "Učitavanje",
    );
  },
);
it("catalog pagination requests the next page and can return to the previous one", async () => {
  m.query.data = { data: { items: [], pagination: { nextOffset: 20 } } };
  await act(async () => {
    root = create(<CatalogList kind="programmes" />);
  });
  await act(async () =>
    root!.root
      .findAllByType("button")
      .find(
        (b) =>
          b.props.label === undefined &&
          b.props.accessibilityLabel === "Sledeća strana",
      )!
      .props.onPress(),
  );
  await m.options.at(-1).queryFn({ signal: undefined });
  expect(m.request.mock.calls[0][0]).toBe("/programmes?limit=20&offset=20");
  await act(async () =>
    root!.root
      .findAllByType("button")
      .find((b) => b.props.accessibilityLabel === "Prethodna strana")!
      .props.onPress(),
  );
  expect(m.options.at(-1).queryKey).toEqual(["public", "programmes", 0]);
});
it("private feed detail remains guarded for a guest", () => {
  m.params = { key: "stream:real" };
  const html = renderToStaticMarkup(<Information privateFeed />);
  expect(html).toContain("Prijavite se");
  expect(m.options.at(-1).enabled).toBe(false);
});
it("public information resolves only an existing key, then fails gracefully if it disappears", async () => {
  m.params = { key: "stream:real" };
  m.request.mockResolvedValue({
    data: {
      sections: {
        information: {
          status: "ok",
          items: [{ key: "stream:real", title: "Stvarno" }],
        },
      },
    },
  });
  renderToStaticMarkup(<Information />);
  expect((await m.options.at(-1).queryFn({})).title).toBe("Stvarno");
  m.request.mockResolvedValue({
    data: { sections: { information: { status: "ok", items: [] } } },
  });
  await expect(m.options.at(-1).queryFn({})).rejects.toMatchObject({
    code: "not_found",
  });
});
it("feed detail searches subsequent pages and missing keys return not-found", async () => {
  m.request
    .mockResolvedValueOnce({
      data: { items: [], pagination: { nextOffset: 50 } },
    })
    .mockResolvedValueOnce({
      data: { items: [{ key: "real" }], pagination: { nextOffset: null } },
    });
  expect(await findFeedItem("real")).toEqual({ key: "real" });
  expect(m.request.mock.calls[1][0]).toBe("/me/feed?limit=50&offset=50");
  expect(m.request.mock.calls[1][2].private).toBe(true);
  m.request.mockResolvedValue({
    data: { items: [], pagination: { nextOffset: null } },
  });
  await expect(findFeedItem("missing")).rejects.toMatchObject({
    code: "not_found",
  });
});
it("QA menu and direct route are gated independently", () => {
  m.auth = { status: "signedIn", me: { user: { id } } };
  expect(renderToStaticMarkup(<More />)).not.toContain("Interna QA provera");
  expect(renderToStaticMarkup(<QA />)).toContain("redirect");
  m.qa = true;
  expect(renderToStaticMarkup(<More />)).toContain("Interna QA provera");
  expect(renderToStaticMarkup(<QA />)).toContain("Interna QA provera");
  m.auth.status = "guest";
  expect(renderToStaticMarkup(<More />)).not.toContain("Interna QA provera");
  expect(renderToStaticMarkup(<QA />)).toContain("redirect");
});
it("source links reject executable/credential URLs and labels never expose unknown enum flags", () => {
  expect(safePublicUrl("javascript:alert(1)")).toBeNull();
  expect(safePublicUrl("https://user:secret@example.com")).toBeNull();
  expect(safePublicUrl("https://example.com/call")).toBe(
    "https://example.com/call",
  );
  expect(label("new_internal_enum")).toBe("Nije navedeno");
  expect(label("commercial_loan")).toBe("Komercijalni kredit");
});

it("programme detail renders only supplied fields and official source attribution", () => {
  m.params = { id };
  m.query.data = {
    data: {
      id,
      title: "Stvarni javni poziv",
      institution: "Fond",
      category: "Oprema",
      status: "open",
      deadline: "2026-11-01",
      deadlineText: null,
      summary: "Opis iz API-ja",
      support: "Nabavka opreme",
      documents: [{ id, label: "Potrebna dokumentacija", note: null }],
      attribution: {
        name: "Zvanični izvor",
        publicUrl: "https://example.com/poziv",
        publishedAt: null,
        checkedAt: "2026-10-07T10:00:00Z",
        verifiedAt: null,
        validUntil: null,
      },
    },
  };
  const html = renderToStaticMarkup(<CatalogDetail kind="programmes" />);
  expect(html).toContain("Stvarni javni poziv");
  expect(html).toContain("Fond");
  expect(html).toContain("Otvoreno");
  expect(html).toContain("Opis iz API-ja");
  expect(html).toContain("Zvanični izvor");
  expect(html).toContain("Poslednja provera");
  expect(html).toContain("Potrebna dokumentacija");
});
it("financing preserves instrument type, zero rates and omits absent amounts", () => {
  m.params = { id };
  m.query.data = {
    data: {
      id,
      title: "Stvarni kredit",
      instrument: "commercial_loan",
      status: "ongoing",
      provider: "Banka",
      description: "Javni opis",
      purposes: ["equipment"],
      applicants: ["entrepreneur"],
      currency: "RSD",
      minAmount: null,
      maxAmount: 10000,
      nominalRate: 0,
      effectiveRate: null,
      minTermMonths: null,
      maxTermMonths: 24,
      graceMonths: null,
      supportPercentage: null,
      ownContributionPercentage: null,
      fees: null,
      collateral: null,
      documents: null,
      publicNote: null,
      attribution: {
        name: null,
        publicUrl: null,
        publishedAt: null,
        checkedAt: null,
        verifiedAt: null,
        validUntil: null,
      },
    },
  };
  const html = renderToStaticMarkup(<CatalogDetail kind="financing" />);
  expect(html).toContain("Komercijalni kredit");
  expect(html).toContain("Nominalna kamata (%)");
  expect(html).toContain("10000");
  expect(html).not.toContain("Minimalni iznos");
  expect(html).not.toContain("Efektivna kamata");
});
it("Više exposes real destinations and explicitly marks the existing web tools", () => {
  const html = renderToStaticMarkup(<More />);
  expect(html).toContain("Finansiranje");
  expect(html).toContain("Kalkulator finansiranja · web");
  expect(html).toContain("Proizvodnja i parcele · web");
  expect(html).not.toContain("Uskoro");
  expect(html).not.toContain("Obaveštenja");
});

it("farm renders existing private profile information without raw capability or status flags", () => {
  m.auth = {
    status: "signedIn",
    me: {
      user: { id },
      farm: { displayName: "Moje gazdinstvo", completionState: "partial" },
      access: { capabilities: { usePersonalizedFeed: true } },
    },
  };
  m.query.data = {
    data: {
      basicProfile: {
        municipality: "Novi Sad",
        registrationStatus: "registered",
        applicantType: "registered_agricultural_holding",
        operationalStatus: "active",
        organicStatus: "none",
        vatRegistered: false,
      },
      completionState: "partial",
      activities: ["crop_farming"],
      capacities: [
        { type: "land_owned", quantity: 0, unit: "ha", category: null },
      ],
      intent: {
        title: "Oprema",
        purpose: "machinery",
        targetTimeframe: "within_6_months",
      },
      items: [],
      pagination: { nextOffset: null },
    },
  };
  const html = renderToStaticMarkup(<Farm />);
  expect(html).toContain("Novi Sad");
  expect(html).toContain("Registrovano");
  expect(html).toContain("Ratarstvo");
  expect(html).toContain("Sopstveno zemljište");
  expect(html).toContain("Mehanizacija");
  expect(html).not.toContain("crop_farming");
  expect(html).not.toContain("registered_agricultural_holding");
  expect(m.options[0].queryKey).toEqual(["private", id, "farm-profile"]);
});

it("Home primary cards navigate to existing routes without login", async () => {
  await act(async () => {
    root = create(<Home />);
  });
  for (const [title, route] of [
    ["Za moje gazdinstvo", "/farm"],
    ["Podsticaji", "/programmes"],
    ["Cenoteka", "/cenoteka"],
    ["Finansiranje", "/more/financing"],
  ]) {
    const card = root!.root
      .findAllByType("button")
      .find((button) => button.props.accessibilityLabel === title)!;
    expect(card.props.accessibilityRole).toBe("button");
    expect(card.props.accessibilityHint).toBeTruthy();
    await act(async () => card.props.onPress());
    expect(m.push).toHaveBeenLastCalledWith(route);
  }
});
it("brand and primary actions stay visible on initial request failure", () => {
  m.query.error = new ApiError("network");
  const html = renderToStaticMarkup(<Home />);
  expect(html).toContain("AgroBIM Digital");
  expect(html).toContain("Dobro došli u AgroBIM");
  expect(html).toContain("Digitalne informacije i alati");
  expect(html).toContain("Finansiranje");
  expect(html).toContain("Podrška");
  expect(html).toContain("Pokušajte ponovo");
  expect(html).not.toContain("Poslednje osvežavanje");
});
it("unavailable Home sections degrade independently and keep the welcome before content", () => {
  m.query.data = {
    data: {
      audience: "guest",
      sections: {
        information: { status: "unavailable", items: [] },
        programmes: {
          status: "ok",
          items: [
            { id, title: "Stvarni poziv", target: { type: "programme", id } },
          ],
        },
        financing: { status: "ok", items: [{ id, title: "Stvarni kredit" }] },
        cenoteka: {
          status: "ok",
          items: [{ id, productName: "Stvarna ponuda" }],
        },
      },
      market: {
        exchange: { status: "ok", items: [] },
        stips: { status: "ok", items: [] },
      },
    },
  };
  const html = renderToStaticMarkup(<Home />);
  expect(html.indexOf("Dobro došli")).toBeLessThan(
    html.indexOf("Stvarni poziv"),
  );
  expect(html.indexOf("Stvarni kredit")).toBeLessThan(
    html.indexOf("Stvarna ponuda"),
  );
  expect(html).toContain("Usluga trenutno nije dostupna");
  expect(html).toContain("Pokušajte ponovo");
});
it("authenticated Home retains farm summary, deadlines and personalized targets", () => {
  m.auth = {
    status: "signedIn",
    me: {
      user: { id },
      farm: { displayName: "Gazdinstvo Marković", completionState: "ready" },
    },
  };
  const section = { status: "ok", items: [] };
  m.query.data = {
    data: {
      profile: {},
      sections: {
        important: {
          status: "ok",
          items: [
            {
              key: "personal",
              title: "Za vas",
              shortBody: "Stvarni savet",
              target: { type: "feed_item", key: "personal" },
            },
          ],
        },
        deadlines: {
          status: "ok",
          items: [{ key: "deadline", title: "Važan rok" }],
        },
        subsidies: section,
        financing: section,
        cenoteka: section,
      },
      market: { exchange: { items: [] }, stips: { items: [] } },
    },
  };
  const html = renderToStaticMarkup(<Home />);
  expect(html).toContain("Gazdinstvo Marković");
  expect(html).toContain("Profil je spreman");
  expect(html).toContain("Za vas");
  expect(html).toContain("Važan rok");
  expect(m.options.at(-1).queryKey).toEqual(["private", id, "today"]);
});
it("trust links show only configured official destinations and reject placeholders", () => {
  expect(
    availableTrustLinks(trustDestinations).map((link) => link.key),
  ).toEqual(["privacy", "terms", "deletion", "support"]);
  const html = renderToStaticMarkup(
    <TrustLinks
      destinations={{
        privacy: "https://agrobim.digital/policy-test",
        deletion: null,
        terms: "javascript:alert(1)",
        support: "https://agrobim.digital/podrska",
      }}
    />,
  );
  expect(html).toContain("Politika privatnosti");
  expect(html).toContain("Podrška");
  expect(html).not.toContain("Brisanje naloga");
  expect(html).not.toContain("Uslovi korišćenja");
  expect(
    availableTrustLinks({
      privacy: "https://agrobim.digital/#kontakt",
      deletion: "https://elsewhere.test/delete",
      terms: "http://agrobim.digital/terms",
      support: "https://user:secret@agrobim.digital/",
    }),
  ).toEqual([]);
  expect(
    renderToStaticMarkup(
      <TrustLinks
        destinations={{
          privacy: null,
          deletion: null,
          terms: null,
          support: null,
        }}
      />,
    ),
  ).toBe("");
});
it("Home, More and Account share the existing external-link opener for contact", async () => {
  for (const element of [
    <Home key="home" />,
    <More key="more" />,
    <Account key="account" />,
  ]) {
    await act(async () => {
      root = create(element);
    });
    const link = root!.root
      .findAllByType("button")
      .find((button) => button.props.accessibilityLabel === "Podrška")!;
    expect(link.props.accessibilityRole).toBe("link");
    await act(async () => link.props.onPress());
    expect(m.openURL).toHaveBeenLastCalledWith(
      "https://agrobim.digital/podrska",
    );
    await act(async () => root!.unmount());
    root = undefined;
  }
});
it("navigation card text can grow and the footer retains safe-area padding", async () => {
  await act(async () => {
    root = create(<Home />);
  });
  const card = root!.root
    .findAllByType("button")
    .find(
      (button) => button.props.accessibilityLabel === "Za moje gazdinstvo",
    )!;
  const style = Object.assign({}, ...card.props.style);
  expect(style.minHeight).toBeGreaterThanOrEqual(48);
  expect(style.height).toBeUndefined();
  const texts = card.findAllByType("span");
  expect(
    texts.every(
      (text) =>
        text.props.numberOfLines === undefined &&
        text.props.allowFontScaling !== false,
    ),
  ).toBe(true);
  const screen = root!.root.findByType("main");
  expect(screen.props.contentContainerStyle.at(-1).paddingBottom).toBe(32 + 24);
});

const officialLegalLinks = [
  ["Politika privatnosti", "https://agrobim.digital/politika-privatnosti"],
  ["Uslovi korišćenja", "https://agrobim.digital/uslovi-koriscenja"],
  ["Brisanje naloga", "https://agrobim.digital/brisanje-naloga"],
  ["Podrška", "https://agrobim.digital/podrska"],
] as const;
it("config contains exactly the four official public URLs with no legacy destinations", () => {
  expect(trustDestinations).toEqual({
    privacy: officialLegalLinks[0][1],
    terms: officialLegalLinks[1][1],
    deletion: officialLegalLinks[2][1],
    support: officialLegalLinks[3][1],
  });
  expect(
    Object.values(trustDestinations).every(
      (url) =>
        url?.startsWith("https://agrobim.digital/") &&
        !url.includes("#kontakt"),
    ),
  ).toBe(true);
});
it.each(["guest", "signedIn"])(
  "all legal rows on Home, More and Account open exact public URLs for %s",
  async (status) => {
    m.auth = {
      status,
      me:
        status === "signedIn"
          ? {
              user: { id, displayName: "Test", emailVerified: true },
              farm: {
                displayName: "Test gazdinstvo",
                completionState: "ready",
              },
            }
          : null,
    };
    for (const element of [
      <Home key="home" />,
      <More key="more" />,
      <Account key="account" />,
    ]) {
      await act(async () => {
        root = create(element);
      });
      for (const [title, url] of officialLegalLinks) {
        const matches = root!.root
          .findAllByType("button")
          .filter((button) => button.props.accessibilityLabel === title);
        expect(matches).toHaveLength(1);
        const link = matches[0];
        expect(link.props.accessibilityRole).toBe("link");
        expect(link.props.style.minHeight).toBeGreaterThanOrEqual(48);
        expect(
          link
            .findAllByType("span")
            .every(
              (text) =>
                text.props.numberOfLines === undefined &&
                text.props.allowFontScaling !== false,
            ),
        ).toBe(true);
        await act(async () => link.props.onPress());
        expect(m.openURL).toHaveBeenLastCalledWith(url);
      }
      expect(m.request).not.toHaveBeenCalled();
      expect(
        root!.root
          .findAllByType("button")
          .some((button) =>
            /Obriši|Potvrdi brisanje/.test(
              button.props.accessibilityLabel ?? "",
            ),
          ),
      ).toBe(false);
      await act(async () => root!.unmount());
      root = undefined;
    }
  },
);
it("failed external legal opening shows the existing retry state and retries the same URL", async () => {
  m.openURL.mockRejectedValueOnce(new Error("No URL handler"));
  await act(async () => {
    root = create(<TrustLinks />);
  });
  const deletionLink = root!.root
    .findAllByType("button")
    .find((button) => button.props.accessibilityLabel === "Brisanje naloga")!;
  await act(async () => deletionLink.props.onPress());
  expect(JSON.stringify(root!.toJSON())).toContain("Nije moguće povezati se");
  const retry = root!.root
    .findAllByType("button")
    .find((button) => button.props.accessibilityLabel === "Pokušajte ponovo")!;
  await act(async () => retry.props.onPress());
  expect(m.openURL).toHaveBeenLastCalledWith(
    "https://agrobim.digital/brisanje-naloga",
  );
  expect(JSON.stringify(root!.toJSON())).not.toContain(
    "Nije moguće povezati se",
  );
  expect(m.request).not.toHaveBeenCalled();
});
