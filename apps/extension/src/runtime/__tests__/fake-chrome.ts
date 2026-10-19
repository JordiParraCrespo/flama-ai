/**
 * An in-memory `chrome`, as much of it as the runtime touches: storage with
 * its change feed, and the message bus between contexts.
 *
 * A context is a set of `onMessage` listeners and an id. `sendMessage` from
 * one context reaches every *other* context's listeners — Chrome never
 * delivers a page's message to its own listeners — and resolves with the
 * first reply, as Chrome does. Tests build a worker and a page and talk across.
 */
type Listener = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (reply: unknown) => void,
) => boolean | undefined;

export const EXTENSION_ID = 'abcdefghijklmnopabcdefghijklmnop';

function createArea() {
  let data: Record<string, unknown> = {};
  return {
    data: () => data,
    reset: () => {
      data = {};
    },
    area: null as unknown as chrome.storage.StorageArea,
  };
}

export interface FakeChrome {
  chrome: typeof chrome;
  /** Make the next calls come from this context: its listeners, its sender. */
  as(context: string): void;
  /** Deliver `message` as if `sender` sent it — a web page, another extension. */
  sendFrom(sender: chrome.runtime.MessageSender, message: unknown): Promise<unknown>;
  storage: Record<'local' | 'session' | 'sync', Record<string, unknown>>;
}

export function createFakeChrome(): FakeChrome {
  const listeners = new Map<string, Set<Listener>>();
  const changeListeners = new Set<
    (changes: Record<string, chrome.storage.StorageChange>, area: string) => void
  >();
  let current = 'worker';

  const contextListeners = (context: string) => {
    let set = listeners.get(context);
    if (!set) {
      set = new Set();
      listeners.set(context, set);
    }
    return set;
  };

  const deliver = (from: string, message: unknown, sender: chrome.runtime.MessageSender) =>
    new Promise((resolve, reject) => {
      let pending = 0;
      let answered = false;
      for (const [context, set] of listeners) {
        if (context === from) continue;
        for (const listener of set) {
          const keepsOpen = listener(structuredClone(message), sender, (reply) => {
            if (answered) return;
            answered = true;
            resolve(structuredClone(reply));
          });
          if (keepsOpen === true) pending += 1;
        }
      }
      if (pending === 0 && !answered) {
        reject(new Error('Could not establish connection. Receiving end does not exist.'));
      }
    });

  const areas = { local: createArea(), session: createArea(), sync: createArea() };
  for (const [name, holder] of Object.entries(areas)) {
    holder.area = {
      get: async (keys?: string | string[] | null) => {
        const data = holder.data();
        if (keys === null || keys === undefined) return structuredClone(data);
        const wanted = Array.isArray(keys) ? keys : [keys];
        return Object.fromEntries(
          wanted.filter((key) => key in data).map((key) => [key, structuredClone(data[key])]),
        );
      },
      set: async (items: Record<string, unknown>) => {
        const data = holder.data();
        const changes: Record<string, chrome.storage.StorageChange> = {};
        for (const [key, value] of Object.entries(items)) {
          changes[key] = { oldValue: data[key], newValue: structuredClone(value) };
          data[key] = structuredClone(value);
        }
        for (const listener of changeListeners) listener(changes, name);
      },
      remove: async (keys: string | string[]) => {
        const data = holder.data();
        const changes: Record<string, chrome.storage.StorageChange> = {};
        for (const key of Array.isArray(keys) ? keys : [keys]) {
          if (!(key in data)) continue;
          changes[key] = { oldValue: data[key] };
          delete data[key];
        }
        for (const listener of changeListeners) listener(changes, name);
      },
    } as unknown as chrome.storage.StorageArea;
  }

  const fake = {
    runtime: {
      id: EXTENSION_ID,
      onMessage: {
        addListener: (listener: Listener) => contextListeners(current).add(listener),
        removeListener: (listener: Listener) => contextListeners(current).delete(listener),
      },
      sendMessage: (message: unknown) => deliver(current, message, { id: EXTENSION_ID }),
    },
    tabs: {
      sendMessage: (_tabId: number, message: unknown) =>
        deliver(current, message, { id: EXTENSION_ID }),
    },
    storage: {
      local: areas.local.area,
      session: areas.session.area,
      sync: areas.sync.area,
      onChanged: {
        addListener: (listener: never) => changeListeners.add(listener),
        removeListener: (listener: never) => changeListeners.delete(listener),
      },
    },
  };

  return {
    chrome: fake as unknown as typeof chrome,
    as(context) {
      current = context;
    },
    sendFrom: (sender, message) => deliver('elsewhere', message, sender),
    storage: {
      get local() {
        return areas.local.data();
      },
      get session() {
        return areas.session.data();
      },
      get sync() {
        return areas.sync.data();
      },
    },
  };
}
