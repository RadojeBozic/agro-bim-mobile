// Local development only. Fixed upstream, restricted routes; no request/response logging.
const upstream = "https://agrobim.digital";
const routes =
  /^\/api\/v1\/(today|me(?:\/(farm-profile|today|feed|financing-analysis))?|programmes(?:\/[a-f0-9-]{36}\/(check-context|checks))?)(?:\?[^#]*)?$/i;
module.exports = async function proxy(req, res) {
  if (
    (req.headers.origin && req.headers.origin !== "http://localhost:18081") ||
    !routes.test(req.url ?? "")
  ) {
    res.writeHead(403);
    res.end();
    return;
  }
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:18081");
  res.setHeader("Vary", "Origin");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, Accept",
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, PATCH, POST, PUT, OPTIONS",
  );
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (!["GET", "PATCH", "POST", "PUT"].includes(req.method ?? "")) {
    res.writeHead(405);
    res.end();
    return;
  }
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 32768) {
        res.writeHead(413);
        res.end();
        return;
      }
      chunks.push(chunk);
    }
    const response = await fetch(upstream + req.url, {
      method: req.method,
      redirect: "error",
      signal: AbortSignal.timeout(15000),
      headers: {
        Accept: "application/json",
        ...(req.headers.authorization
          ? { Authorization: req.headers.authorization }
          : {}),
        ...(size ? { "Content-Type": "application/json" } : {}),
      },
      ...(size ? { body: Buffer.concat(chunks) } : {}),
    });
    res.writeHead(response.status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...(response.headers.get("Retry-After")
        ? { "Retry-After": response.headers.get("Retry-After") }
        : {}),
    });
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end("{}");
  }
};
