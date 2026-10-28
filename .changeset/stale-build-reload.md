---
"@flama/web": patch
"@flama/frontend-web": patch
---

Web: a tab opened before a deploy reloads when a lazily loaded chunk the deploy removed fails to load, instead of failing into the nearest error boundary.
