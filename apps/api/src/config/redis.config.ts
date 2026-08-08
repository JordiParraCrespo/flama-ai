import { registerAs } from '@nestjs/config';
import { z } from 'zod';
import { parseEnv } from './env';

const schema = z.object({
  host: z.string().default('localhost'),
  port: z.coerce.number().default(6379),
});

export const redisConfig = registerAs('redis', () =>
  parseEnv('redis', schema, {
    host: 'REDIS_HOST',
    port: 'REDIS_PORT',
  }),
);
