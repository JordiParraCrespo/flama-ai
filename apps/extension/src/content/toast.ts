import type { PageToast } from '@/runtime/protocol';

/**
 * The in-page confirmation, drawn inside a closed shadow root.
 *
 * A content script shares the page's DOM, so anything it adds is exposed to
 * the page's stylesheets and scripts. The shadow root keeps the page's CSS out
 * (`all: initial` stops the inherited properties that cross it too) and keeps
 * our markup out of the page's `querySelector`. It is plain DOM rather than
 * React: this script is injected into somebody else's page, and it should
 * cost that page a few kilobytes, not a framework.
 */
const HOST_ID = 'flama-extension-toast';
const VISIBLE_MS = 2_400;

const STYLES = `
:host { all: initial; }
.toast {
  position: fixed; z-index: 2147483647; right: 20px; bottom: 20px;
  display: flex; align-items: center; gap: 10px;
  padding: 10px 16px 10px 12px; border-radius: 999px;
  font: 500 13px/1.3 -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
  letter-spacing: -0.15px;
  background: #111111; color: #ffffff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  animation: enter 180ms ease-out;
}
.toast[data-tone="error"] { background: #b42318; }
.toast svg { flex: none; }
@media (prefers-color-scheme: dark) {
  .toast { background: #f5f5f4; color: #111111; }
  .toast[data-tone="error"] { background: #fda29b; color: #55160c; }
}
@media (prefers-reduced-motion: reduce) { .toast { animation: none; } }
@keyframes enter { from { opacity: 0; transform: translateY(8px); } }
`;

/** The brand's eight-arm mark, as in `BrandMark`. */
const MARK =
  '<svg width="16" height="16" viewBox="0 0 48 48" fill="none" aria-hidden="true"><g stroke="currentColor" stroke-width="4.2" stroke-linecap="round"><line x1="24" y1="7" x2="24" y2="41"/><line x1="7" y1="24" x2="41" y2="24"/><line x1="12" y1="12" x2="36" y2="36"/><line x1="36" y1="12" x2="12" y2="36"/></g></svg>';

export function showToast({ tone, message }: PageToast, document: Document = window.document) {
  document.getElementById(HOST_ID)?.remove();

  const host = document.createElement('div');
  host.id = HOST_ID;
  const root = host.attachShadow({ mode: 'closed' });

  const sheet = new CSSStyleSheet();
  sheet.replaceSync(STYLES);
  root.adoptedStyleSheets = [sheet];

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.dataset.tone = tone;
  toast.setAttribute('role', tone === 'error' ? 'alert' : 'status');
  toast.innerHTML = MARK;
  // The message is text, never markup: it is ours, but a page title could
  // reach it one day, and this is somebody else's document.
  toast.append(document.createTextNode(message));
  root.append(toast);

  document.documentElement.append(host);
  setTimeout(() => host.remove(), VISIBLE_MS);
  return host;
}
