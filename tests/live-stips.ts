import { ApiClient } from "../src/core/client";
import { page } from "../src/api/contracts";
import {
  stipsProductSchema,
  stipsDetailSchema,
} from "../src/api/stips-contracts";
const api = new ApiClient("https://agrobim.digital/api/v1", {
  token: () => null,
  refresh: async () => null,
  clear: async () => {},
  generation: () => 0,
});
async function main() {
  for (const term of [
    "Paprika",
    " PAPRIKA ",
    "Krastavac",
    "Grožđe",
    "grozdje",
    "zzz-no-results",
  ]) {
    const path =
      "/market/stips/products?limit=20&offset=0&q=" +
      encodeURIComponent(term.trim());
    const result = await api.request(path, page(stipsProductSchema));
    if (
      term === "zzz-no-results"
        ? result.data.items.length !== 0
        : result.data.items.length === 0
    )
      throw new Error("Unexpected search result");
    console.log(
      JSON.stringify({
        url: "https://agrobim.digital/api/v1" + path,
        status: result.status,
        requestId: result.requestId,
        items: result.data.items.map((p) => ({
          code: p.code,
          name: p.name,
          observationCount: p.observationCount,
        })),
        pagination: result.data.pagination,
      }),
    );
  }
  const detail = await api.request(
    "/market/stips/products/paprika?limit=1",
    stipsDetailSchema,
  );
  console.log(
    JSON.stringify({
      detail: "paprika",
      status: detail.status,
      count: detail.data.matchingCount,
      source: detail.data.items[0]?.attribution.publicUrl,
    }),
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
