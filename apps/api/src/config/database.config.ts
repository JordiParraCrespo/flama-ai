import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const schema = z.object({
  host: z.string().default('localhost'),
  port: z.coerce.number().default(5432),
  username: z.string().default('flama'),
  password: z.string().default('flama'),
  database: z.string().default('flama'),
  // Off by default: query logging buries every other line under a wall of
  // SELECTs. Even when enabled, bound parameters are never logged — see
  // `TypeOrmQueryLogger`.
  logQueries: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

/** Treat unset OR blank ("DB_X=") env vars alike. */
const orUndefined = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export const databaseConfig = registerAs('database', () => {
  return schema.parse({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    logQueries: orUndefined(process.env.DB_LOG_QUERIES),
  });
});
