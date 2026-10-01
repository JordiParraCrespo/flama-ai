# @flama/backend-storage

Pluggable file storage for the API — an abstract storage service, the module
that binds it to a driver, and the local filesystem driver.

## What's inside

- `StorageService` — abstract contract (the DI token consumers depend on).
- `LocalStorageService` — stores files on the local filesystem.
- `StorageModule.register(drivers)` — builds the driver `storage.provider`
  names, out of the map the app passes, and binds it to `StorageService`.

Follows the **pluggable service** pattern: abstract class → concrete
implementations → factory in the module.

## Usage

```ts
import { LocalStorageService, StorageModule, StorageService } from '@flama/backend-storage';

StorageModule.register({ local: LocalStorageService });

constructor(private readonly storage: StorageService) {}

// Every back-end resolves `upload` to the key: persist the key, never a URL.
const key = await this.storage.upload(file, 'avatars/u/1.png', 'image/png');
// Resolve it per response (signed and expiring on an object store).
const url = await this.storage.getSignedUrl(key);
```

## Scripts

```bash
pnpm build   # tsc -> dist
pnpm dev     # tsc --watch
```

## Consumed by

`apps/api`.
