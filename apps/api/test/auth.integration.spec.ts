import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';
import { DataSource } from 'typeorm';
import { runAllMigrations } from './run-migrations';

/**
 * The application booted whole, over real Postgres and Redis, for what only
 * the wiring between Better Auth and the API can show: which session fields a
 * client may write through Better Auth's own routes.
 */
describe('Auth (integration)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let dataSource: DataSource;
  let pgContainer: StartedTestContainer;
  let redisContainer: StartedTestContainer;

  beforeAll(async () => {
    [pgContainer, redisContainer] = await Promise.all([
      new GenericContainer('postgres:18-alpine')
        .withEnvironment({
          POSTGRES_USER: 'test',
          POSTGRES_PASSWORD: 'test',
          POSTGRES_DB: 'test',
        })
        .withExposedPorts(5432)
        .withWaitStrategy(Wait.forLogMessage(/database system is ready to accept connections/, 2))
        .start(),
      new GenericContainer('redis:8-alpine').withExposedPorts(6379).start(),
    ]);

    process.env.NODE_ENV = 'test';
    process.env.DB_HOST = pgContainer.getHost();
    process.env.DB_PORT = pgContainer.getMappedPort(5432).toString();
    process.env.DB_USERNAME = 'test';
    process.env.DB_PASSWORD = 'test';
    process.env.DB_DATABASE = 'test';
    process.env.REDIS_HOST = redisContainer.getHost();
    process.env.REDIS_PORT = redisContainer.getMappedPort(6379).toString();
    process.env.BETTER_AUTH_SECRET = 'integration-test-secret';

    await runAllMigrations();

    // Import AppModule (and therefore the Better Auth instance, which reads the
    // database config at module load) only after the container env vars are set.
    const { AppModule } = await import('../src/app.module');

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication({ bodyParser: false });
    const { VersioningType } = await import('@nestjs/common');
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.listen(0);
    baseUrl = (await app.getUrl()).replace('[::1]', '127.0.0.1');
    dataSource = app.get(DataSource);
  }, 180000);

  afterAll(async () => {
    await app?.close();
    // Better Auth's email queue is a module singleton outside the DI container,
    // so `app.close()` does not reach it. Close it before the containers go
    // away, or its in-flight ioredis commands reject into nothing.
    const { emailQueue } = await import('../src/auth/infrastructure/email-queue.util');
    await emailQueue.close().catch(() => {});
    await Promise.all([pgContainer?.stop(), redisContainer?.stop()]);
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
  });

  describe('a session’s own update', () => {
    /**
     * `delegated` marks a credential bridge, which "Active sessions" leaves
     * out. Were it a field `POST /update-session` accepts, a stolen cookie
     * could set it and drop out of the list that exists to expose it.
     */
    it('cannot mark the session delegated, so it stays in the list', async () => {
      const response = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: `hide-${randomUUID()}@example.com`,
          password: 'Integration-test-password-1',
          name: 'Hide Me',
          firstName: 'Hide',
          lastName: 'Me',
        }),
      });
      expect(response.ok).toBe(true);
      const token = response.headers.get('set-auth-token') ?? '';
      const { user } = (await response.json()) as { user: { id: string } };

      await fetch(`${baseUrl}/api/auth/update-session`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ delegated: true, delegatedCredentialId: 'x' }),
      });

      const rows = await dataSource.query(
        `SELECT "delegated", "delegatedCredentialId" FROM "session" WHERE "userId" = $1`,
        [user.id],
      );
      expect(rows).toEqual([{ delegated: false, delegatedCredentialId: null }]);
      const listed = await fetch(`${baseUrl}/api/v1/profile/sessions`, {
        headers: { accept: 'application/json', authorization: `Bearer ${token}` },
      });
      expect(((await listed.json()) as unknown[]).length).toBe(1);
    });
  });
});
