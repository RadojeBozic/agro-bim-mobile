import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import fs from "node:fs";
const identity = JSON.parse(
  fs.readFileSync("src/config/identity.json", "utf8"),
);
for (const stage of ["development", "preview", "production"]) {
  const env = {
    ...process.env,
    AGROBIM_WEB_QA: "false",
    EXPO_PUBLIC_APP_ENV: stage,
    EXPO_PUBLIC_API_BASE_URL: "https://agrobim.digital",
    EXPO_PUBLIC_AUTH_CALLBACK_URL:
      stage === "development"
        ? "agrobim-dev://auth/callback"
        : "https://agrobim.digital/mobile/auth/callback",
    EXPO_PUBLIC_ENABLE_QA: "false",
  };
  const cfg = JSON.parse(
    execFileSync(
      process.execPath,
      ["node_modules/expo/bin/cli", "config", "--type", "public", "--json"],
      { env, encoding: "utf8" },
    ),
  );
  assert.equal(cfg.name, identity.name);
  assert.equal(cfg.android.package, identity.package);
  assert.equal(cfg.android.versionCode, 1);
  assert.equal(cfg.version, "1.0.0");
  assert.equal(cfg.extra.environment, stage);
  assert.equal(cfg.scheme, stage === "development" ? "agrobim-dev" : undefined);
  const dev = cfg.plugins.find(
    (p) => Array.isArray(p) && p[0] === "expo-dev-client",
  );
  assert.equal(dev[1].addGeneratedScheme, stage === "development");
  console.log(
    stage + ": Expo config valid; identity and scheme checks passed.",
  );
}
const eas = JSON.parse(fs.readFileSync("eas.json", "utf8"));
assert.equal(eas.build.development.developmentClient, true);
assert.equal(eas.build.preview.android.buildType, "apk");
assert.equal(eas.build.production.android.buildType, "app-bundle");
console.log("EAS profiles valid.");
