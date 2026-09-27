// RevenueCat, configured once at launch: `index.ts` imports this module right
// after the polyfills. Keys are per store; without one for this platform the
// SDK is never configured.
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_REVENUECAT_IOS_KEY?: string;
      EXPO_PUBLIC_REVENUECAT_ANDROID_KEY?: string;
    }
  }
}

const apiKey =
  Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

if (apiKey) {
  try {
    Purchases.configure({ apiKey });
  } catch {
    // Missing store setup must not take the app down.
  }
}
