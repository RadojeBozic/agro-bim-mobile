// Deliberately use require: Router/app module evaluation must happen after the handler.
const diagnostics = require("./startup");
diagnostics.installHandlers();
try {
  require("@expo/metro-runtime");
  const {
    renderRootComponent,
  } = require("expo-router/build/renderRootComponent");
  const { DiagnosticRoot } = require("./root");
  diagnostics.installHandlers();
  renderRootComponent(DiagnosticRoot);
  diagnostics.markRegistered();
} catch (error) {
  diagnostics.capture(error, "bootstrap");
  // Expo registration may fail while core React Native rendering is still usable.
  try {
    const { AppRegistry } = require("react-native");
    const { DiagnosticRoot } = require("./root");
    AppRegistry.registerComponent("main", () => DiagnosticRoot);
    diagnostics.markRegistered();
  } catch {
    // Only sanitized data; a native/renderer failure still requires device logs.
    console.log("AGRO-IOS-CRASH-004: renderer unavailable");
    throw new Error(
      "AGRO-IOS-CRASH-004: renderer unavailable; capture device logs",
    );
  }
}
