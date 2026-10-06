import { ExpoConfig } from "expo/config";
import identity from "./src/config/identity.json";
const environment = process.env.EXPO_PUBLIC_APP_ENV ?? "development";
const config: ExpoConfig = {
  name: identity.name,
  slug: identity.slug,
  version: identity.version,
  orientation: "portrait",
  userInterfaceStyle: "light",
  icon: "./assets/brand/mark.png",
  ...(environment === "development" ? { scheme: "agrobim-dev" } : {}),
  android: {
    package: identity.package,
    versionCode: identity.versionCode,
    adaptiveIcon: {
      foregroundImage: "./assets/brand/mark.png",
      backgroundColor: "#f5f7f3",
    },
  },
  plugins: [
    "expo-router",
    ["expo-dev-client", { addGeneratedScheme: environment === "development" }],
    "expo-secure-store",
    [
      "expo-splash-screen",
      {
        image: "./assets/brand/mark.png",
        imageWidth: 160,
        backgroundColor: "#f5f7f3",
      },
    ],
  ],
  experiments: { typedRoutes: true },
  web: { bundler: "metro", favicon: "./assets/brand/mark.png" },
  extra: { environment },
};
export default config;
