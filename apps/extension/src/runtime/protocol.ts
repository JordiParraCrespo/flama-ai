import type { Clip } from './items';

/**
 * Everything one part of the extension may say to another, in one table.
 *
 * Chrome runs this extension as several programs that share no memory — the
 * service worker, each open page (popup, side panel, options) and the content
 * script inside a tab — and `chrome.runtime.sendMessage` carries `any`
 * between them. This table is the type that carries instead: a message name,
 * what it takes and what it answers. `send`, `sendToTab` and `listen` in
 * `messaging.ts` accept nothing that is not in it, so a renamed or reshaped
 * message is a compile error at every end at once.
 *
 * Names are `<owner>/<verb>`, the owner being whoever answers.
 */
export interface Protocol {
  /**
   * A page → the service worker: save what the tab shows as a clip. The worker
   * does it, not the page, so the save survives the popup closing under it.
   */
  'clips/save-tab': { request: { tabId: number }; response: Clip };
  /** A page → the service worker, the clips' one writer: forget one. */
  'clips/remove': { request: { id: string }; response: undefined };
  /** A page → the service worker: forget them all. */
  'clips/clear': { request: undefined; response: undefined };
  /** The service worker → the content script: what the page shows. */
  'page/snapshot': { request: undefined; response: PageSnapshot };
  /** The service worker → the content script: say how it went, in the page. */
  'page/toast': { request: PageToast; response: undefined };
  /**
   * A page → every other page: someone signed in or out. Each open surface
   * drops what it knew about the session, so a sign-in in the popup is the
   * side panel's sign-in too.
   */
  'session/changed': { request: undefined; response: undefined };
}

export type MessageType = keyof Protocol;
export type RequestOf<K extends MessageType> = Protocol[K]['request'];
export type ResponseOf<K extends MessageType> = Protocol[K]['response'];

/** What the content script reads off a page. Nothing is read until asked. */
export interface PageSnapshot {
  url: string;
  title: string;
  /** The text the person had selected, trimmed; empty when none. */
  selection: string;
  /** `<meta name="description">`, when the page has one. */
  description: string;
}

export interface PageToast {
  tone: 'success' | 'error';
  message: string;
}
