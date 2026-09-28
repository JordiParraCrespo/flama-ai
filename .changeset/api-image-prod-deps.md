---
"@flama/api": patch
---

The production stack reads the root `.env` (and refuses to start without it or `BETTER_AUTH_SECRET`), and the API image ships production dependencies only, checked at build time by resolving the API's module graph and no build or test tool.
