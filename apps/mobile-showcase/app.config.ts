import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Flama Showcase",
  slug: "flama-showcase",
  version: "0.1.0",
  scheme: "flama-showcase",
  newArchEnabled: true,
  platforms: ["ios", "android"],
  userInterfaceStyle: "automatic",
  ios: {
    bundleIdentifier: "com.flama.showcase",
    supportsTablet: true,
  },
  android: {
    package: "com.flama.showcase",
  },
  plugins: ["expo-router"],
};

export default config;
