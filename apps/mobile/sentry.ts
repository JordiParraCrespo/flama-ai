// Sentry, initialised once at launch: `index.ts` imports this module right
// after the polyfills, so the SDK's handlers are in place before the router
// loads a screen. Without a DSN the SDK is never initialised, and the error
// boundaries keep logging to the console.
import { setErrorReporter } from '@flama/frontend-mobile/platform';
import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    enabled: !__DEV__,
    tracesSampleRate: 0.15,
  });
  setErrorReporter((error, info) => {
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  });
}
