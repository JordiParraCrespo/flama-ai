import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Flama",
  slug: "flama",
  version: "0.1.0",
  scheme: "flama",
  newArchEnabled: true,
  platforms: ["ios", "android"],
  userInterfaceStyle: "automatic",
  ios: {
    bundleIdentifier: "com.flama.app",
    supportsTablet: true,
  },
  android: {
    package: "com.flama.app",
    adaptiveIcon: {
      backgroundColor: "#ffffff",
    },
  },
  plugins: ["expo-router", "expo-secure-store", "expo-localization"],
};

export default config;
