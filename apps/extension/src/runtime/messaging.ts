import type { MessageType, RequestOf, ResponseOf } from './protocol';

/**
 * Typed messaging between the extension's contexts, over the table in
 * `protocol.ts`.
 *
 * Three rules hold here so no caller has to remember them:
 *
 * - **Only this extension is heard.** A listener answers a message only when
 *   `sender.id` is this extension's own id. There is no
 *   `externally_connectable` in the manifest either, so a web page cannot
 *   reach these listeners at all; the check is what keeps that true the day
 *   someone adds one.
 * - **Errors cross the boundary.** Chrome drops a thrown error on the floor
 *   and the sender sees `undefined`. A handler's rejection is sent back as
 *   data and re-thrown at the caller as a `MessageError`, code included.
 * - **A listener says which messages it answers.** Several contexts listen at
 *   once (every open page hears every runtime message); one that has no
 *   handler for a type returns without claiming the reply, so the context that
 *   does have one answers.
 */

/** The wire shape. `flama` tells our envelopes apart from anything else on the bus. */
interface Envelope<K extends MessageType = MessageType> {
  flama: 1;
  type: K;
  payload: RequestOf<K>;
}

type Reply<K extends MessageType> =
  | { ok: true; value: ResponseOf<K> }
  | { ok: false; error: { message: string; code?: string } };

/** A handler's rejection, re-thrown on the sending side. */
export class MessageError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'MessageError';
  }
}

/**
 * Chrome's words when nobody answers: no other context is open, or the ones
 * that are (the worker, for a page's broadcast) have no handler for it.
 */
const NO_ANSWER = ['Receiving end does not exist', 'message port closed before a response'];

type Args<K extends MessageType> = RequestOf<K> extends undefined ? [] : [payload: RequestOf<K>];

function envelope<K extends MessageType>(type: K, args: unknown[]): Envelope<K> {
  return { flama: 1, type, payload: args[0] as RequestOf<K> };
}

function unwrap<K extends MessageType>(reply: Reply<K> | undefined, type: K): ResponseOf<K> {
  if (!reply) throw new MessageError(`No context answered "${type}"`, 'no-handler');
  if (!reply.ok) throw new MessageError(reply.error.message, reply.error.code);
  return reply.value;
}

/** Ask the service worker (or whichever extension page answers `type`). */
export async function send<K extends MessageType>(
  type: K,
  ...args: Args<K>
): Promise<ResponseOf<K>> {
  const reply = (await chrome.runtime.sendMessage(envelope(type, args))) as Reply<K> | undefined;
  return unwrap(reply, type);
}

/** Ask the content script in one tab. It has to have been injected first. */
export async function sendToTab<K extends MessageType>(
  tabId: number,
  type: K,
  ...args: Args<K>
): Promise<ResponseOf<K>> {
  const reply = (await chrome.tabs.sendMessage(tabId, envelope(type, args))) as
    | Reply<K>
    | undefined;
  return unwrap(reply, type);
}

/**
 * Tell every other open context, expecting no answer. Nobody answering is
 * normal — the side panel is usually closed, and the worker hears a page's
 * broadcast without a handler for it — so that failure is quiet.
 */
export async function broadcast<K extends MessageType>(type: K, ...args: Args<K>): Promise<void> {
  try {
    await chrome.runtime.sendMessage(envelope(type, args));
  } catch (error) {
    const unanswered =
      error instanceof Error && NO_ANSWER.some((words) => error.message.includes(words));
    if (!unanswered) throw error;
  }
}

export type Handlers = {
  [K in MessageType]?: (
    payload: RequestOf<K>,
    sender: chrome.runtime.MessageSender,
  ) => ResponseOf<K> | Promise<ResponseOf<K>>;
};

function isEnvelope(message: unknown): message is Envelope {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as Envelope).flama === 1 &&
    typeof (message as Envelope).type === 'string'
  );
}

/**
 * Answer the messages `handlers` names, in this context. Returns the function
 * that stops listening. Register at the top level of a service worker, never
 * inside a callback: Chrome only delivers the event that woke a worker to the
 * listeners added in its first turn.
 */
export function listen(handlers: Handlers): () => void {
  const listener = (
    message: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (reply: Reply<MessageType>) => void,
  ): boolean => {
    if (!isEnvelope(message) || sender.id !== chrome.runtime.id) return false;
    const handler = handlers[message.type] as
      | ((payload: unknown, sender: chrome.runtime.MessageSender) => unknown)
      | undefined;
    if (!handler) return false;

    Promise.resolve()
      .then(() => handler(message.payload, sender))
      .then(
        (value) => sendResponse({ ok: true, value } as Reply<MessageType>),
        (error: unknown) =>
          sendResponse({
            ok: false,
            error: {
              message: error instanceof Error ? error.message : String(error),
              code: error instanceof MessageError ? error.code : undefined,
            },
          }),
      );
    // Keep the channel open: the reply is asynchronous.
    return true;
  };

  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}
