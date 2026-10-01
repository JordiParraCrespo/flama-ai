# @flama/backend-storage

## 0.2.0

### Minor Changes

- b87af0a: The S3 storage driver leaves the starter, and `StorageModule.register` takes the drivers the app runs on, which `STORAGE_PROVIDER` must name one of.
- 45125dc: `upload` resolves to the key on every back-end; `getSignedUrl` is the one way to a URL.
