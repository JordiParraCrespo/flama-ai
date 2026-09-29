// Must be first: nitro-fetch replaces global fetch before anything captures it.
import '@flama/frontend-mobile/polyfills';
import './sentry';
// flama:plugins launch
import 'expo-router/entry';
