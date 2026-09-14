import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Flama Showcase',
  slug: 'flama-showcase',
  version: '0.1.0',
  scheme: 'flama-showcase',
  newArchEnabled: true,
  platforms: ['ios', 'android'],
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.flama.showcase',
    supportsTablet: true,
  },
  android: {
    package: 'com.flama.showcase',
  },
  plugins: [
    'expo-router',
    'expo-dev-client',
    'expo-image',
    [
      'react-native-nano-icons',
      {
        iconSets: [{ inputDir: '../../packages/design-system/mobile/assets/icons/ui' }],
      },
    ],
  ],
};

export default config;
