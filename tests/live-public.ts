import { ApiClient } from "../src/core/client";
import {
  guestTodaySchema,
  programmeSchema,
  financingSchema,
  productSchema,
  page,
} from "../src/api/contracts";
const api = new ApiClient("https://agrobim.digital/api/v1", {
  token: () => null,
  refresh: async () => null,
  clear: async () => {},
  generation: () => 0,
});
async function main() {
  const result = await api.request("/today", guestTodaySchema);
  console.log(
    JSON.stringify(
      {
        endpoint: "GET /api/v1/today",
        status: result.status,
        requestId: result.requestId,
        audience: result.data.audience,
        sections: Object.fromEntries(
          Object.entries(result.data.sections).map(([key, value]) => [
            key,
            { status: value.status, count: value.items.length },
          ]),
        ),
      },
      null,
      2,
    ),
  );
  for (const [endpoint, schema] of [
    ["/programmes", programmeSchema],
    ["/financing/products", financingSchema],
    ["/cenoteka/products", productSchema],
  ] as const) {
    const list = await api.request(
      endpoint + "?limit=20&offset=0",
      page(schema),
    );
    const first = list.data.items[0];
    const detail = first
      ? await api.request(endpoint + "/" + first.id, schema)
      : null;
    console.log(
      JSON.stringify({
        endpoint,
        status: list.status,
        count: list.data.items.length,
        nextOffset: list.data.pagination.nextOffset,
        detailStatus: detail?.status ?? "no_records",
        requestId: list.requestId,
      }),
    );
  }
}
void main().catch((e) => {
  console.error(
    JSON.stringify({
      result: "failed",
      code: e.code,
      status: e.status,
      requestId: e.requestId,
    }),
  );
  process.exitCode = 1;
});
