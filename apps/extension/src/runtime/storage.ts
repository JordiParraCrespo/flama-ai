import type { IStorageService } from '@flama/frontend-core';
import type { ZodType, ZodTypeDef } from 'zod';

/**
 * Typed, validated state over `chrome.storage`.
 *
 * `chrome.storage` is shared by every context of the extension and outlives
 * all of them, which makes it the one place state can live in an extension
 * whose service worker is stopped whenever it is idle. It is also untyped,
 * and what it holds was written by an older build as often as by this one. So
 * every item is declared once (`items.ts`) with a Zod schema and a fallback,
 * and a value that no longer parses reads as the fallback instead of crashing
 * the reader: an upgrade never bricks a profile.
 *
 * Writes are serialised per item within a context. Across contexts there is
 * no lock, so each item has one writer — `items.ts` says which — and every
 * other context only reads and watches.
 */
export type StorageArea = 'local' | 'session' | 'sync';

export interface StorageItem<T> {
  readonly area: StorageArea;
  readonly key: string;
  get(): Promise<T>;
  set(value: T): Promise<void>;
  /** Read, change and write, in order with this context's other writes to the item. */
  update(change: (current: T) => T): Promise<T>;
  remove(): Promise<void>;
  /** Called with the new value whenever any context changes the item. Returns the unsubscribe. */
  watch(callback: (value: T) => void): () => void;
}

export function defineItem<T>(options: {
  area: StorageArea;
  key: string;
  schema: ZodType<T, ZodTypeDef, unknown>;
  fallback: T;
}): StorageItem<T> {
  const { area, key, schema, fallback } = options;
  const storage = () => chrome.storage[area];
  const parse = (raw: unknown): T => {
    if (raw === undefined) return fallback;
    const result = schema.safeParse(raw);
    return result.success ? result.data : fallback;
  };
  let queue: Promise<unknown> = Promise.resolve();

  const item: StorageItem<T> = {
    area,
    key,
    async get() {
      const stored = await storage().get(key);
      return parse(stored[key]);
    },
    async set(value) {
      await storage().set({ [key]: schema.parse(value) });
    },
    update(change) {
      const next = queue.then(async () => {
        const value = change(await item.get());
        await item.set(value);
        return value;
      });
      queue = next.catch(() => {});
      return next;
    },
    async remove() {
      await storage().remove(key);
    },
    watch(callback) {
      const listener = (
        changes: Record<string, chrome.storage.StorageChange>,
        changedArea: string,
      ) => {
        if (changedArea === area && key in changes) callback(parse(changes[key].newValue));
      };
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    },
  };
  return item;
}

/**
 * An item as an external store for `useSyncExternalStore`: a synchronous
 * snapshot that is `undefined` until the first read lands, then follows every
 * change from any context. The first subscriber starts the read.
 */
export interface ItemStore<T> {
  subscribe(onChange: () => void): () => void;
  getSnapshot(): T | undefined;
}

export function storeOf<T>(item: StorageItem<T>): ItemStore<T> {
  let snapshot: T | undefined;
  const listeners = new Set<() => void>();
  let stopWatching: (() => void) | null = null;

  const publish = (value: T) => {
    snapshot = value;
    for (const listener of listeners) listener();
  };

  return {
    subscribe(onChange) {
      listeners.add(onChange);
      if (!stopWatching) {
        stopWatching = item.watch(publish);
        void item.get().then(publish);
      }
      return () => {
        listeners.delete(onChange);
        if (listeners.size === 0) {
          stopWatching?.();
          stopWatching = null;
        }
      };
    },
    getSnapshot: () => snapshot,
  };
}

/**
 * The kernel's `IStorageService` over `chrome.storage.local`, for
 * `FlamaApp.create({ storage })`. Its keys carry a prefix so `clear()` takes
 * the kernel's own entries and leaves the extension's items alone.
 */
export class ChromeStorageService implements IStorageService {
  constructor(private readonly prefix = 'kernel:') {}

  async get(key: string): Promise<string | null> {
    const name = this.prefix + key;
    const stored = await chrome.storage.local.get(name);
    const value = stored[name];
    return typeof value === 'string' ? value : null;
  }

  async set(key: string, value: string): Promise<void> {
    await chrome.storage.local.set({ [this.prefix + key]: value });
  }

  async remove(key: string): Promise<void> {
    await chrome.storage.local.remove(this.prefix + key);
  }

  async clear(): Promise<void> {
    const everything = await chrome.storage.local.get(null);
    const ours = Object.keys(everything).filter((name) => name.startsWith(this.prefix));
    if (ours.length > 0) await chrome.storage.local.remove(ours);
  }
}
