const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
if (process.env.AGROBIM_WEB_QA === "true") {
  const proxy = require("./scripts/web-proxy.cjs");
  config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
    if ((req.url ?? "").startsWith("/api/v1/")) void proxy(req, res);
    else middleware(req, res, next);
  };
}
module.exports = config;
