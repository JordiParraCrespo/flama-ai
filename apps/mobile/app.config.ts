import { loadEnv } from '@flama/env';
import type { ExpoConfig } from 'expo/config';

// Expo only reads .env files from the app directory, but this monorepo keeps a
// single .env at the workspace root. This config runs in Node before Metro
// starts, so loading here puts EXPO_PUBLIC_* values into process.env in time
// for the bundler to inline them. Real environment variables still win.
loadEnv();

const config: ExpoConfig = {
  name: 'Flama',
  slug: 'flama',
  version: '0.1.0',
  // Deep-link scheme; must agree with the API's MOBILE_SCHEME (it registers
  // `${scheme}://` as a trusted origin), so both read the same variable.
  scheme: process.env.MOBILE_SCHEME ?? 'flama',
  newArchEnabled: true,
  platforms: ['ios', 'android'],
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.flama.app',
    supportsTablet: true,
  },
  android: {
    package: 'com.flama.app',
    adaptiveIcon: {
      backgroundColor: '#ffffff',
    },
  },
  plugins: ['expo-router', 'expo-secure-store', 'expo-localization'],
};

export default config;
