// Must be first: nitro-fetch replaces global fetch before anything captures it.
import '@flama/frontend-mobile/polyfills';
// flama:begin sentry
import './sentry';
// flama:end sentry
// flama:plugins launch
import 'expo-router/entry';
