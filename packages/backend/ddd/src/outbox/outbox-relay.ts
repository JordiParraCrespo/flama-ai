import { DEFAULT_LEASE_MS, type OutboxService } from './outbox.service';
import type { OutboxMessageRecord } from './outbox-message';

/**
 * Delivers one claimed outbox row to its real destination. The consuming app
 * supplies this: emit `event` rows on the in-process bus, add `queue` rows to
 * the named BullMQ queue. A rejection marks the row failed (and retried later);
 * it never un-commits the state change that staged it.
 */
export type OutboxPublisher = (message: OutboxMessageRecord) => Promise<void>;

export interface OutboxRelayOptions {
  /** Identifies this relay instance on the leases it takes (host:pid). */
  owner: string;
  /** Poll interval for the background loop. */
  pollIntervalMs?: number;
  batchSize?: number;
  /** Lease duration passed to `OutboxService.claim` and renewed while a batch is delivered. */
  leaseMs?: number;
  /**
   * How often the lease on the batch being delivered is renewed. Defaults to a
   * third of `leaseMs`, so two renewals can fail before another relay may
   * claim the rows.
   */
  heartbeatMs?: number;
  logger?: { warn(message: string): void };
}

const DEFAULT_POLL_INTERVAL_MS = 2_000;
const DEFAULT_BATCH_SIZE = 20;

/**
 * Drains the outbox: claims due rows (leased via `FOR UPDATE SKIP LOCKED`, so
 * concurrent replicas work disjoint sets), hands each to the publisher, and
 * marks it processed or failed.
 *
 * Runs on two triggers: a background poll (the safety net that picks up rows
 * whose staking process died or whose post-commit drain failed) and explicit
 * `drainOnce()` calls routed through `OutboxService.wake()` right after a
 * commit, which keeps delivery latency at in-process levels in the happy path.
 * Drains are serialized through a promise chain so a wake landing mid-poll
 * queues a follow-up pass instead of racing it. A wake called from inside a
 * delivery (see `drainOnce`) queues its pass and returns at once instead of
 * joining that same chain.
 *
 * While a batch is delivered, a heartbeat renews the lease on its undelivered
 * rows every `heartbeatMs` (`OutboxService.extendLease`, fenced on this
 * relay's `owner`), so a listener slower than `leaseMs` keeps its rows:
 * another replica's poll cannot claim them and run them a second time. The
 * lease still lapses when the process dies or stalls long enough to miss the
 * renewals, which is the crash recovery. The marks that end a delivery are
 * fenced the same way: a relay that lost its lease anyway (a stall past
 * `leaseMs`) neither marks the other relay's claim processed nor releases it.
 */
export class OutboxRelay {
  private timer?: ReturnType<typeof setInterval>;
  private tail: Promise<number> = Promise.resolve(0);
  /** True only while `await this.publisher(message)` is pending. */
  private delivering = false;

  constructor(
    private readonly outbox: OutboxService,
    private readonly publisher: OutboxPublisher,
    private readonly options: OutboxRelayOptions,
  ) {}

  start(): void {
    if (this.timer) return;
    this.outbox.registerDrainer(() => this.drainOnce());
    this.timer = setInterval(
      () => void this.drainOnce(),
      this.options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
    );
    // Never keep the process alive just to poll an empty table.
    this.timer.unref?.();
  }

  /** Stop polling and wait for any in-flight drain to settle. */
  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.outbox.registerDrainer(undefined);
    await this.tail.catch(() => 0);
  }

  /**
   * Drain until no due rows remain. Returns the number of rows delivered.
   * Concurrent calls are chained, never interleaved. Called from inside a
   * delivery, the pass is queued and the call resolves at once with 0 instead
   * of joining the chain the delivery itself is blocking.
   */
  drainOnce(): Promise<number> {
    const run = this.tail.then(
      () => this.drainBatches(),
      () => this.drainBatches(),
    );
    this.tail = run.catch(() => 0);
    return this.delivering ? Promise.resolve(0) : run;
  }

  private async drainBatches(): Promise<number> {
    const batchSize = this.options.batchSize ?? DEFAULT_BATCH_SIZE;
    let delivered = 0;
    for (;;) {
      let batch: OutboxMessageRecord[];
      try {
        batch = await this.outbox.claim(this.options.owner, {
          batchSize,
          leaseMs: this.options.leaseMs,
        });
      } catch (error) {
        this.options.logger?.warn(`Outbox claim failed: ${describe(error)}`);
        return delivered;
      }
      if (batch.length === 0) return delivered;
      const leased = new Set(batch.map((message) => message.id));
      const stopHeartbeat = this.startHeartbeat(leased);
      try {
        for (const message of batch) {
          try {
            this.delivering = true;
            try {
              await this.publisher(message);
            } finally {
              this.delivering = false;
            }
            await this.outbox.markProcessed([message.id], this.options.owner);
            leased.delete(message.id);
            delivered++;
          } catch (error) {
            this.options.logger?.warn(
              `Outbox delivery of ${message.eventName} (${message.id}) failed: ${describe(error)}`,
            );
            // `markFailed` releases the lease, so the heartbeat stops renewing it.
            leased.delete(message.id);
            try {
              await this.outbox.markFailed(message, describe(error));
            } catch {
              // Can't reach the database to record the failure; the lease
              // expires and the row is reclaimed on a later pass.
            }
          }
        }
      } finally {
        stopHeartbeat();
      }
      if (batch.length < batchSize) return delivered;
    }
  }

  /**
   * Renew the lease on the `leased` rows every `heartbeatMs` until the
   * returned function is called. A row the renewal no longer finds under this
   * owner was lost (the process stalled past `leaseMs` and another relay
   * claimed it); it is logged and dropped from the set, and the fenced marks
   * leave it to that relay. A failed renewal is logged, not thrown: the
   * delivery carries on and the next tick tries again.
   */
  private startHeartbeat(leased: Set<string>): () => void {
    const leaseMs = this.options.leaseMs ?? DEFAULT_LEASE_MS;
    const heartbeatMs = this.options.heartbeatMs ?? Math.max(Math.floor(leaseMs / 3), 1);
    let renewing = false;
    const timer = setInterval(() => {
      // Never stack renewals on a slow database; the next tick tries again.
      if (renewing || leased.size === 0) return;
      renewing = true;
      const ids = [...leased];
      void this.outbox
        .extendLease(this.options.owner, ids, leaseMs)
        .then((kept) => {
          const lost = ids.filter((id) => leased.has(id) && !kept.includes(id));
          for (const id of lost) leased.delete(id);
          if (lost.length > 0) {
            this.options.logger?.warn(
              `Outbox lease lost on ${lost.length} row(s) still being delivered: ${lost.join(', ')}`,
            );
          }
        })
        .catch((error: unknown) => {
          this.options.logger?.warn(`Outbox lease renewal failed: ${describe(error)}`);
        })
        .finally(() => {
          renewing = false;
        });
    }, heartbeatMs);
    // A renewal never keeps the process alive on its own.
    timer.unref?.();
    return () => clearInterval(timer);
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
