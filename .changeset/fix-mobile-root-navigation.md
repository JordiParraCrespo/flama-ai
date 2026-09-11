---
"@flama/mobile": patch
---

Mount the root navigator before applying authentication guards so the mobile
app can start without Expo Router throwing an early-navigation error. Session
loading and restore failures remain visible as full-screen overlays. Refresh
the login screen with the Flama auth layout, theme control, session preference,
and deployment-aware social login options.
