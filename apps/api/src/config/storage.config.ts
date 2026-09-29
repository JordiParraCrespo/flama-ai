import { LocalStorageService, type StorageDrivers } from '@flama/backend-storage';
import { registerAs } from '@nestjs/config';
import { z } from 'zod';
import { parseEnv } from './env';
// flama:begin storage-s3

import { S3StorageService } from './s3-storage.service';
// flama:end storage-s3
// flama:plugins storage-driver-imports

/**
 * The storage drivers this API can run on, by the name `STORAGE_PROVIDER`
 * selects one with. `app.module.ts` passes this map to `StorageModule`, and the
 * schema below accepts exactly its names, so an unknown provider fails at boot.
 * A driver with settings of its own reads them from a config section of its own.
 */
export const storageDrivers = {
  local: LocalStorageService,
  // flama:begin storage-s3
  s3: S3StorageService,
  // flama:end storage-s3
  // flama:plugins storage-drivers
} satisfies StorageDrivers;

const driverNames = Object.keys(storageDrivers) as [
  keyof typeof storageDrivers,
  ...(keyof typeof storageDrivers)[],
];

// Where uploads go. `local`, the default, writes to disk under `uploadDir`.
const schema = z.object({
  provider: z.enum(driverNames).default('local'),
  uploadDir: z.string().default('./uploads'),
  // Absolute base the browser uses to load locally-stored files, so a stored
  // avatar resolves against the API regardless of where the SPA is hosted — the
  // documented Tier-1 serves the web app from a different origin (Vercel /
  // Cloudflare Pages) than the API. Defaults to the API's own public URL
  // (BETTER_AUTH_URL); set STORAGE_PUBLIC_URL only if local files are fronted by
  // a separate host/CDN. Only the local driver reads it.
  publicUrl: z.string().url().optional(),
});

export const storageConfig = registerAs('storage', () => {
  const config = parseEnv('storage', schema, {
    provider: 'STORAGE_PROVIDER',
    uploadDir: 'UPLOAD_DIR',
    publicUrl: 'STORAGE_PUBLIC_URL',
  });

  return {
    ...config,
    // Fall back to the API's own public URL. `BETTER_AUTH_URL` is the one
    // canonical "where this API is reachable" value the deployment already sets,
    // and it shares the same dev default, so local files need no extra config.
    publicUrl: config.publicUrl ?? process.env.BETTER_AUTH_URL ?? 'http://localhost:3001',
  };
});
