// Same-origin localhost QA only; native and production builds never use this proxy.
import { spawn } from "node:child_process";
const child = spawn(
  process.execPath,
  [
    "node_modules/expo/bin/cli",
    "start",
    "--web",
    "--clear",
    "--localhost",
    "--port",
    "18081",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      AGROBIM_WEB_QA: "true",
      EXPO_PUBLIC_APP_ENV: "development",
      EXPO_PUBLIC_API_BASE_URL: "http://localhost:18081",
    },
  },
);
process.on("SIGINT", () => child.kill());
process.on("SIGTERM", () => child.kill());
child.on("exit", (code) => {
  process.exitCode = code ?? 0;
});
