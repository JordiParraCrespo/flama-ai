---
"@flama/backend-storage": minor
---

`StorageService.download(key)` resolves to the bytes stored under a key, for a
caller that serves or forwards a private file itself. `LocalStorageService`
guards it against key escapes exactly as it guards a write.
