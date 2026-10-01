---
"@flama/backend-storage": minor
"@flama/api": patch
---

`StorageService.upload` resolves to the key on every back-end.
`LocalStorageService.upload` used to resolve to a public URL while an object
store's resolved to the key, so a caller's result depended on configuration.
`getSignedUrl(key, expiresIn?)` is the one way to a URL (signed on an object
store, `<publicUrl>/uploads/<key>` locally).
