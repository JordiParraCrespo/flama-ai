import { type OutboxMessageRecord, OutboxRelay, OutboxService } from '@flama/backend-ddd';
import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';
import { DataSource } from 'typeorm';
import { loadMigrations } from './run-migrations';

/**
 * The relay's lease against a real Postgres, across two relays on one table: a
 * batch slower than the lease keeps the rows still waiting because each row
 * renews them first, and a relay that lost a row cannot mark or release the new
 * claim.
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
  const twoRelays = (delayMs: number) => {
    const deliveries: string[] = [];
    const relay = (owner: string, delay: number) =>
      new OutboxRelay(
        new OutboxService(dataSource),
        async (message: OutboxMessageRecord) => {
          deliveries.push(`${owner}:${message.id}`);
          await sleep(delay);
        },
        { owner, leaseMs: LEASE_MS, pollIntervalMs: 50 },
      );
    return { deliveries, a: relay('relay:a', delayMs), b: relay('relay:b', 0) };
  };

  const rows = async () =>
    (await dataSource.query(
      `SELECT "id", "status", "lockedBy", "attempts" FROM "outbox_message" ORDER BY "createdAt", "id"`,
    )) as { id: string; status: string; lockedBy: string | null; attempts: number }[];

  const seed = (count: number) =>
    dataSource.query(
      `INSERT INTO "outbox_message" ("channel", "eventName", "payload", "reason", "status")
       SELECT 'event', 'SomethingHappenedDomainEvent', '{}', 'lease test', 'pending'
         FROM generate_series(1, $1)`,
      [count],
    );

  beforeEach(async () => {
    await dataSource.query(`TRUNCATE "outbox_message"`);
  });

  it('keeps the rows waiting behind a slow one: each row renews them first', async () => {
    // Three rows of 300 ms against a 400 ms lease: without renewal the third
    // lapses at 400 ms and `b` would claim it mid-batch.
    await seed(3);
    const { deliveries, a, b } = twoRelays(300);
    const draining = a.drainOnce();
    await sleep(50);
    b.start();
    await expect(draining).resolves.toBe(3);
    await sleep(200);
    await b.stop();

    const all = await rows();
    expect(deliveries.filter((entry) => entry.startsWith('relay:b'))).toEqual([]);
    expect(all.map((row) => [row.status, row.attempts])).toEqual([
      ['processed', 1],
      ['processed', 1],
      ['processed', 1],
    ]);
  });

  it('when a publisher outlasts the lease, the stale relay leaves the new claim alone', async () => {
    // One publisher slower than the lease is the accepted duplicate; what the
    // fence guarantees is that `a` finishing late does not mark `b`'s claim
    // processed or release it.
    await seed(1);
    const { deliveries, a, b } = twoRelays(SLOW_MS);
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
    const [{ id, status, lockedBy, attempts }] = await rows();
    expect(deliveries).toEqual([`relay:a:${id}`, `relay:b:${id}`]);
    expect(status).toBe('pending');
    expect(lockedBy).toBe('relay:b');
    expect(attempts).toBe(2);

    // A stale failure from `a`'s claim is fenced off too.
    await new OutboxService(dataSource).markFailed(
      { id, attempts: 1 } as OutboxMessageRecord,
      'stale',
      'relay:a',
    );
    expect((await rows())[0]).toMatchObject({ status: 'pending', lockedBy: 'relay:b' });

    await slowB.stop();
    await b.stop();
    expect((await rows())[0].status).toBe('processed');
  }, 20_000);
});
