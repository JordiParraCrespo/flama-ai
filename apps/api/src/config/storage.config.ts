import { registerAs } from '@nestjs/config';
import { z } from 'zod';
import { orUndefined } from './env';

// Everything here is optional-capability config: with no S3 settings the app
// stores files on local disk. The S3 keys are genuinely optional — a blank or
// whitespace-only env var normalizes to undefined so the capability registry
// never reports S3 as configured on unusable credentials.
const schema = z.object({
  provider: z.enum(['local', 's3']).default('local'),
  uploadDir: z.string().default('./uploads'),
  s3Endpoint: z.string().optional(),
  s3Region: z.string().default('auto'),
  s3Bucket: z.string().default('flama'),
  s3AccessKeyId: z.string().optional(),
  s3SecretAccessKey: z.string().optional(),
});

export const storageConfig = registerAs('storage', () => {
  return schema.parse({
    provider: orUndefined(process.env.STORAGE_PROVIDER),
    uploadDir: orUndefined(process.env.UPLOAD_DIR),
    s3Endpoint: orUndefined(process.env.S3_ENDPOINT),
    s3Region: orUndefined(process.env.S3_REGION),
    s3Bucket: orUndefined(process.env.S3_BUCKET),
    s3AccessKeyId: orUndefined(process.env.S3_ACCESS_KEY_ID),
    s3SecretAccessKey: orUndefined(process.env.S3_SECRET_ACCESS_KEY),
  });
});
