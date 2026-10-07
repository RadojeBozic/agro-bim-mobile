import { api } from "../runtime";
import { feedPageSchema } from "../api/contracts";
import { ApiError } from "../core/errors";

// There is no individual feed GET endpoint. Resolve a real key through the existing paged feed.
export async function findFeedItem(key: string, signal?: AbortSignal) {
  if (!key || key.length > 240) throw new ApiError("not_found", 404);
  let offset = 0;
  while (offset <= 10000) {
    const result = await api.request(
      "/me/feed?limit=50&offset=" + offset,
      feedPageSchema,
      { private: true, signal },
    );
    const item = result.data.items.find((item) => item.key === key);
    if (item) return item;
    const next = result.data.pagination.nextOffset;
    if (next == null) throw new ApiError("not_found", 404);
    if (next <= offset || next > 10000) throw new ApiError("invalid_response");
    offset = next;
  }
  throw new ApiError("not_found", 404);
}
