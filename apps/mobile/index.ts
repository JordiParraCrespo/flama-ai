// Must be first: nitro-fetch replaces global fetch before anything captures it.
import '@flama/frontend-mobile/polyfills';
// flama:begin revenuecat
import './purchases';
// flama:end revenuecat
// flama:plugins launch
import 'expo-router/entry';
