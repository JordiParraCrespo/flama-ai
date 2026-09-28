---
"@flama/web": patch
---

The permission picker no longer draws an icon per group. It kept a closed map
from resource to icon beside the scope catalog, and every group the map did not
know — a plugin's — was drawn with the API-token key.
