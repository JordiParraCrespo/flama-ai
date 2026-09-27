---
"@flama/frontend-mobile": major
"@flama/mobile": minor
---

RevenueCat leaves the starter for the `revenuecat` plugin.

- `@flama/frontend-mobile` no longer exports `initPurchases` and no longer
  depends on `react-native-purchases`.
- `@flama/mobile` no longer configures the purchases SDK at launch or depends
  on `react-native-purchases`, and `EXPO_PUBLIC_REVENUECAT_*` are no longer
  read. `pnpm plugin:add revenuecat` puts it back.
