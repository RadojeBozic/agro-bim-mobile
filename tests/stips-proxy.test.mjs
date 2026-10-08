import { createRequire } from "node:module";
import { afterEach, expect, it, vi } from "vitest";
const require = createRequire(import.meta.url);
const proxy = require("../scripts/web-proxy.cjs");
const previous = process.env.AGROBIM_STIPS_LOCAL_QA;
afterEach(() => {
  if (previous == null) delete process.env.AGROBIM_STIPS_LOCAL_QA;
  else process.env.AGROBIM_STIPS_LOCAL_QA = previous;
  vi.unstubAllGlobals();
});
async function run(url, origin = "http://localhost:18081") {
  const res = { writeHead: vi.fn(), setHeader: vi.fn(), end: vi.fn() };
  const req = {
    url,
    headers: { origin },
    method: "GET",
    async *[Symbol.asyncIterator]() {},
  };
  await proxy(req, res);
  return res;
}
it("local STIPS QA uses a fixed loopback backend only for the restricted new public routes", async () => {
  process.env.AGROBIM_STIPS_LOCAL_QA = "true";
  const fetcher = vi.fn(async () => new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetcher);
  await run("/api/v1/market/stips/products/krastavac?q=nis");
  expect(fetcher.mock.calls[0][0]).toBe(
    "http://127.0.0.1:18082/api/v1/market/stips/products/krastavac?q=nis",
  );
  await run("/api/v1/cenoteka/products");
  expect(fetcher.mock.calls[1][0]).toBe(
    "https://agrobim.digital/api/v1/cenoteka/products",
  );
  delete process.env.AGROBIM_STIPS_LOCAL_QA;
  await run("/api/v1/market/stips/products");
  expect(fetcher.mock.calls[2][0]).toBe(
    "https://agrobim.digital/api/v1/market/stips/products",
  );
});
it("QA proxy rejects foreign origins and arbitrary routes", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  expect(
    (await run("/api/v1/market/stips/products", "https://other.example"))
      .writeHead,
  ).toHaveBeenCalledWith(403);
  expect(
    (await run("/api/v1/market/stips/products/../../me")).writeHead,
  ).toHaveBeenCalledWith(403);
  expect((await run("/api/v1/admin")).writeHead).toHaveBeenCalledWith(403);
  expect(fetcher).not.toHaveBeenCalled();
});
