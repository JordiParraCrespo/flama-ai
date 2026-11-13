import type { CacheReadObserver, CacheReadOperation, CacheReadResult } from '@flama/backend-cache';
import { InjectMetric, type ModuleMetrics } from '@flama/backend-core';
import { Injectable } from '@nestjs/common';

export const CACHE_READS_TOTAL = 'cache_reads_total';

export const CacheMetrics: ModuleMetrics = {
  [CACHE_READS_TOTAL]: {
    type: 'counter',
    help: 'Cache reads by key namespace, operation and result (hit, miss, error). The first 20 namespaces a process reads get a label, later ones are other',
    labelNames: ['namespace', 'operation', 'result'],
  },
};

/**
 * At most this many namespaces get a label of their own; the rest are
 * `other`. A namespace is a key's first segment, which callers write as a
 * literal (`user:`, `session:`), so the set is small; the cap is what keeps
 * a key written without one (its whole value is then the "namespace") from
 * growing the series without bound.
 */
const MAX_NAMESPACES = 20;
const NAMESPACE = /^[a-z][a-z0-9_-]{0,31}$/;
/**
 * Every operation and result the cache reports, written as records keyed by
 * the cache's own types: one it adds fails to compile here until it is listed,
 * so the zeroed series cannot fall behind what `observe` counts.
 */
const OPERATIONS = Object.keys({ get: true } satisfies Record<
  CacheReadOperation,
  true
>) as CacheReadOperation[];
const RESULTS = Object.keys({ hit: true, miss: true, error: true } satisfies Record<
  CacheReadResult,
  true
>) as CacheReadResult[];

/**
 * The label a namespace is counted under, given the ones admitted so far, and
 * whether this read is the one that admits it. Pure: the caller records the
 * admission and zeroes the new series.
 */
function admitNamespace(
  admitted: ReadonlySet<string>,
  namespace: string,
): { label: string; newlyAdmitted: boolean } {
  if (admitted.has(namespace)) return { label: namespace, newlyAdmitted: false };
  if (!NAMESPACE.test(namespace) || admitted.size >= MAX_NAMESPACES) {
    return { label: 'other', newlyAdmitted: false };
  }
  return { label: namespace, newlyAdmitted: true };
}

interface CounterLike {
  inc(labels: Record<string, string>, value?: number): void;
}

/**
 * Counts every read of the cache (`cache_reads_total`), so a hit rate is a
 * rate over `result="hit"` against all of them, per namespace. Handed to the
 * cache as its `onRead` (`app.module.ts`).
 */
@Injectable()
export class CacheReadMetricsAdapter {
  private readonly namespaces = new Set<string>();

  constructor(@InjectMetric(CACHE_READS_TOTAL) private readonly reads: CounterLike) {
    this.zero('other');
  }

  readonly observe: CacheReadObserver = ({ operation, namespace, result }) => {
    const { label, newlyAdmitted } = admitNamespace(this.namespaces, namespace);
    if (newlyAdmitted) {
      this.namespaces.add(label);
      this.zero(label);
    }
    this.reads.inc({ namespace: label, operation, result });
  };

  /**
   * Every result of every operation at zero for a namespace when it first
   * gets a label, so a namespace that only ever misses reads as a 0% hit
   * rate, not as an absent series the dashboard draws nothing for.
   */
  private zero(namespace: string): void {
    for (const operation of OPERATIONS) {
      for (const result of RESULTS) this.reads.inc({ namespace, operation, result }, 0);
    }
  }
}
