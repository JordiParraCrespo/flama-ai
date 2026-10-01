import { type OutboxMessageRecord, OutboxRelay, OutboxService } from '@flama/backend-ddd';
import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';
import { DataSource } from 'typeorm';
import { loadMigrations } from './run-migrations';

/**
 * The relay's lease against a real Postgres, across two relays on one table: a
 * delivery slower than the lease keeps its row while the heartbeat renews it,
 * and a relay that lost the row anyway cannot mark or release the new claim.
 */
describe('the outbox lease (integration)', () => {
  const LEASE_MS = 400;
  const SLOW_MS = 1_500;
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  let pgContainer: StartedTestContainer;
  let dataSource: DataSource;

  beforeAll(async () => {
    pgContainer = await new GenericContainer('postgres:16-alpine')
      .withEnvironment({ POSTGRES_USER: 'test', POSTGRES_PASSWORD: 'test', POSTGRES_DB: 'test' })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage(/database system is ready to accept connections/, 2))
      .start();
    dataSource = new DataSource({
      type: 'postgres',
      url: `postgres://test:test@${pgContainer.getHost()}:${pgContainer.getMappedPort(5432)}/test`,
      migrations: await loadMigrations(),
    });
    await dataSource.initialize();
    await dataSource.runMigrations();
  }, 180000);

  afterAll(async () => {
    await dataSource?.destroy();
    await pgContainer?.stop();
  });

  /** Two relays on the same table: `a` claims first and is slow, `b` polls every 50 ms. */
  const twoRelays = (heartbeatMs: number) => {
    const deliveries: string[] = [];
    const relay = (owner: string, delayMs: number) =>
      new OutboxRelay(
        new OutboxService(dataSource),
        async (message: OutboxMessageRecord) => {
          deliveries.push(`${owner}:${message.id}`);
          await sleep(delayMs);
        },
        { owner, leaseMs: LEASE_MS, heartbeatMs, pollIntervalMs: 50 },
      );
    return { deliveries, a: relay('relay:a', SLOW_MS), b: relay('relay:b', 0) };
  };

  const row = async () =>
    (
      (await dataSource.query(
        `SELECT "id", "status", "lockedBy", "attempts" FROM "outbox_message"`,
      )) as { id: string; status: string; lockedBy: string | null; attempts: number }[]
    )[0];

  beforeEach(async () => {
    await dataSource.query(`TRUNCATE "outbox_message"`);
    await dataSource.query(
      `INSERT INTO "outbox_message" ("channel", "eventName", "payload", "reason", "status")
       VALUES ('event', 'SomethingHappenedDomainEvent', '{}', 'lease test', 'pending')`,
    );
  });

  it('runs the listener once: the heartbeat keeps the lease past leaseMs', async () => {
    const { deliveries, a, b } = twoRelays(LEASE_MS / 4);
    const draining = a.drainOnce();
    await sleep(50);
    b.start();
    await expect(draining).resolves.toBe(1);
    await sleep(200);
    await b.stop();

    const { id, status, attempts } = await row();
    expect(deliveries).toEqual([`relay:a:${id}`]);
    expect(status).toBe('processed');
    expect(attempts).toBe(1);
  });

  it('when the lease is lost anyway, the stale relay leaves the new claim alone', async () => {
    // Renewals slower than the lease: the row lapses mid-delivery and `b`
    // claims it. That duplicate is the one a stall past leaseMs still costs;
    // what the fence guarantees is that `a` finishing late does not mark
    // `b`'s claim processed or release it.
    const { deliveries, a, b } = twoRelays(SLOW_MS * 10);
    const draining = a.drainOnce();
    await sleep(50);
    const slowB = new OutboxRelay(
      new OutboxService(dataSource),
      async (message) => {
        deliveries.push(`relay:b:${message.id}`);
        await sleep(SLOW_MS * 2);
      },
      { owner: 'relay:b', leaseMs: 60_000, pollIntervalMs: 50 },
    );
    slowB.start();
    await draining;

    // `a` is done; `b` is still delivering its claim.
    const { id, status, lockedBy, attempts } = await row();
    expect(deliveries).toEqual([`relay:a:${id}`, `relay:b:${id}`]);
    expect(status).toBe('pending');
    expect(lockedBy).toBe('relay:b');
    expect(attempts).toBe(2);

    // A stale failure from `a`'s claim is fenced off too.
    await new OutboxService(dataSource).markFailed(
      { id, attempts: 1, lockedBy: 'relay:a' } as OutboxMessageRecord,
      'stale',
    );
    expect(await row()).toMatchObject({ status: 'pending', lockedBy: 'relay:b' });

    await slowB.stop();
    await b.stop();
    expect((await row()).status).toBe('processed');
  }, 20_000);
});
