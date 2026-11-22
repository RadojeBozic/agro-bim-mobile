import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { DiagnosticScreen, StartupBoundary } from "../src/diagnostics/root";
import { makeReport } from "../src/diagnostics/startup";
vi.mock("react-native", () => ({
  View: "div",
  Text: "span",
  ScrollView: "section",
}));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("shows screenshot instructions, sanitized error and stack after an import/render failure", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  function BrokenModule(): React.ReactNode {
    throw new TypeError("Cannot read property 'configure' of null");
  }
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(
      <StartupBoundary>
        <BrokenModule />
      </StartupBoundary>,
    );
  });
  const output = JSON.stringify(tree.toJSON());
  expect(output).toContain("configure");
  expect(output).toContain("router-render-or-import");
  expect(output).toContain("AGRO-IOS-CRASH-004");
  expect(output).toContain("snimak");
  await act(async () => tree.unmount());
});
it("renders only the supplied sanitized report, with selectable text", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(
      <DiagnosticScreen
        report={makeReport(new Error("access_token=private"), "test")}
      />,
    );
  });
  expect(JSON.stringify(tree.toJSON())).not.toContain("private");
  expect(tree.root.findAllByProps({ selectable: true })).toHaveLength(3);
  await act(async () => tree.unmount());
});
