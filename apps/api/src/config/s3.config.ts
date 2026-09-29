import { registerAs } from '@nestjs/config';
import { z } from 'zod';
import { parseEnv } from './env';

/**
 * The S3 storage driver's settings, read when `STORAGE_PROVIDER=s3` (any
 * S3-compatible store: AWS, Hetzner Object Storage, MinIO). Optional capability
 * config: the credentials are genuinely optional — a blank or whitespace-only
 * env var normalizes to undefined, so the capability registry never reports S3
 * as configured on unusable credentials.
 */
const schema = z.object({
  endpoint: z.string().optional(),
  region: z.string().default('auto'),
  bucket: z.string().default('flama'),
  accessKeyId: z.string().optional(),
  secretAccessKey: z.string().optional(),
});

export const s3Config = registerAs('s3', () =>
  parseEnv('s3', schema, {
    endpoint: 'S3_ENDPOINT',
    region: 'S3_REGION',
    bucket: 'S3_BUCKET',
    accessKeyId: 'S3_ACCESS_KEY_ID',
    secretAccessKey: 'S3_SECRET_ACCESS_KEY',
  }),
);
