// Explicit, read-only live smoke. Excluded from normal tests.
import { ApiClient } from "../src/core/client";
import { guestTodaySchema } from "../src/api/contracts";
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
