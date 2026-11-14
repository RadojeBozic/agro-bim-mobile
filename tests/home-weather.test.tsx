import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { weatherLocation, weatherSchema } from "../src/api/weather";
import { primaryTabs } from "../src/navigation";
import { HomeWeather } from "../src/components/home-weather";

const mock = vi.hoisted(() => ({
  request: vi.fn(),
  getItem: vi.fn(),
  setItem: vi.fn(),
}));
vi.mock("../src/runtime", () => ({
  api: { request: mock.request },
  storage: { getItem: mock.getItem, setItem: mock.setItem },
}));
vi.mock("react-native", () => ({
  View: "div",
  Text: "span",
  Pressable: "button",
  Modal: "aside",
  FlatList: ({
    data,
    renderItem,
  }: {
    data: string[];
    renderItem: (row: { item: string }) => React.ReactNode;
  }) =>
    data.map((item) => (
      <React.Fragment key={item}>{renderItem({ item })}</React.Fragment>
    )),
}));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}));
vi.mock("../src/components/ui", () => ({
  styles: {},
  Card: ({ children }: React.PropsWithChildren) => (
    <section>{children}</section>
  ),
  Button: ({ label, onPress }: { label: string; onPress: () => void }) => (
    <button onClick={onPress}>{label}</button>
  ),
  ErrorState: ({ message }: { message: string }) => <span>{message}</span>,
  Loading: () => <span>Učitavanje</span>,
}));
vi.mock("../src/components/content", () => ({
  ExternalLink: ({ title, url }: { title: string; url: string }) => (
    <a href={url}>{title}</a>
  ),
}));

it("loads public weather, labels stale data and remembers the selected municipality", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let saved: string | null = null;
  let resolveWeather!: (value: unknown) => void;
  mock.getItem.mockImplementation(async () => saved);
  mock.setItem.mockImplementation(async (_key, place: string) => {
    saved = place;
  });
  mock.request.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveWeather = resolve;
      }),
  );
  mock.request.mockRejectedValue(new Error("offline"));
  const client = new QueryClient();
  let root: ReactTestRenderer | undefined;
  const mount = async () => {
    await act(async () => {
      root = create(
        <QueryClientProvider client={client}>
          <HomeWeather />
        </QueryClientProvider>,
      );
    });
  };
  const click = async (label: string) => {
    const button = root!.root
      .findAllByType("button")
      .find(
        (node) =>
          [node.props.children].flat().join("").trim() === label ||
          node
            .findAllByType("span")
            .some(
              (span) => [span.props.children].flat().join("").trim() === label,
            ),
      );
    expect(button).toBeDefined();
    await act(async () => (button!.props.onClick ?? button!.props.onPress)());
  };
  const output = () => JSON.stringify(root!.toJSON());
  const settle = () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  try {
    expect(weatherLocation.options).toHaveLength(22);
    expect(primaryTabs).toEqual([
      "home",
      "farm",
      "programmes",
      "cenoteka",
      "more",
    ]);
    await mount();
    expect(output()).toContain("Učitavanje");
    expect(mock.request).toHaveBeenCalledWith(
      "/weather?location=Beograd",
      weatherSchema,
      { signal: expect.anything() },
    );

    const condition = { code: 1009, text: "Potpuno oblačno" };
    const payload = {
      location: "Beograd",
      updatedAt: "2026-11-14T18:30:00Z",
      fetchedAt: "2026-11-14T18:50:42.751Z",
      stale: true,
      source: { name: "WeatherAPI.com", url: "https://www.weatherapi.com/" },
      current: { condition, temperatureC: 6, precipitationMm: 0, windKph: 3.6 },
      forecast: [14, 15, 16].map((day) => ({
        date: "2026-11-" + day,
        condition,
        minTemperatureC: 4,
        maxTemperatureC: 9,
        precipitationMm: 3.45,
        rainChancePercent: 61,
        maxWindKph: 14.4,
      })),
    };
    expect(
      weatherSchema.safeParse({
        ...payload,
        forecast: payload.forecast.slice(0, 2),
      }).success,
    ).toBe(false);
    await act(async () =>
      resolveWeather({ data: weatherSchema.parse(payload) }),
    );
    await settle();
    expect(output()).toContain("Prikazani su stariji podaci.");
    expect(output().match(/Potpuno oblačno/g)).toHaveLength(4);
    expect(root!.root.findByType("a").props.href).toBe(
      "https://www.weatherapi.com/",
    );

    await click("Mesto: Beograd");
    await click("Niš");
    await settle();
    expect(saved).toBe("Niš");
    expect(mock.request.mock.lastCall?.[0]).toBe("/weather?location=Ni%C5%A1");
    expect(output()).toContain("Vremenska prognoza trenutno nije dostupna.");
    expect(output()).not.toContain("Potpuno oblačno");
    await act(async () => root!.unmount());
    root = undefined;
    await mount();
    expect(output()).toContain("Mesto: Niš");
  } finally {
    if (root) await act(async () => root!.unmount());
    client.clear();
    vi.unstubAllGlobals();
  }
});
