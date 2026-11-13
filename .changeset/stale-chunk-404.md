---
'@flama/web': patch
'@flama/frontend-web': patch
---

A chunk a deploy removed no longer breaks the app until the cache expires: nginx answers a missing `/assets/` file with an uncached 404 instead of a cacheable `index.html`, and the stale-build reload no longer swallows the import error, which had made the router crash on "reading 'component'" before the page reloaded. Ported from Oppenheimer #803.
