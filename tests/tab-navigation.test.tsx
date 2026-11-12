import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import TabLayout from "../src/app/(tabs)/_layout";

const { screen, tabs } = vi.hoisted(() => ({ screen: vi.fn(), tabs: vi.fn() }));
vi.mock("expo-router", () => ({
  Tabs: Object.assign(
    (props: React.PropsWithChildren) => {
      tabs(props);
      return props.children;
    },
    {
      Screen: (props: unknown) => {
        screen(props);
        return null;
      },
    },
  ),
}));
vi.mock("react-native", () => ({
  Text: "span",
  useWindowDimensions: () => ({ fontScale: 1 }),
}));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ bottom: 0 }),
}));

it("pops only the More stack on a tab press and keeps tab back history", () => {
  renderToStaticMarkup(<TabLayout />);
  expect(tabs.mock.calls[0]?.[0].backBehavior).toBe("history");
  const screens = screen.mock.calls.map(([props]) => props);
  expect(screens.map(({ name }) => name)).toEqual([
    "home",
    "farm",
    "programmes",
    "cenoteka",
    "more",
  ]);
  expect(screens.slice(0, 4).every(({ listeners }) => !listeners)).toBe(true);

  const dispatch = vi.fn();
  const preventDefault = vi.fn();
  let index = 2;
  let focused = true;
  const { tabPress } = screens[4].listeners({
    route: { key: "more-tab" },
    navigation: {
      dispatch,
      isFocused: () => focused,
      getState: () => ({
        routes: [{ key: "more-tab", state: { key: "more-stack", index } }],
      }),
    },
  });
  tabPress({ preventDefault });
  expect(dispatch).toHaveBeenLastCalledWith({
    type: "POP_TO_TOP",
    target: "more-stack",
  });
  expect(preventDefault).toHaveBeenCalledOnce();

  index = 1;
  focused = false;
  tabPress({ preventDefault });
  expect(dispatch).toHaveBeenCalledTimes(2);
  expect(preventDefault).toHaveBeenCalledOnce();

  index = 0;
  tabPress({ preventDefault });
  expect(dispatch).toHaveBeenCalledTimes(2);
});
