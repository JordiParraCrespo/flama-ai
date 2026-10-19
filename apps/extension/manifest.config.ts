/**
 * The extension's manifest, as code.
 *
 * `manifest.json` is the one file Chrome reads before any of ours, and every
 * line of it is a promise to the person installing: what the extension may
 * touch, where it may talk to, which keys it takes. So it is written here,
 * typed against Chrome's own manifest schema, and generated at build time
 * rather than kept as JSON beside the code — the version comes from
 * `package.json`, the API origin from the root `.env`, and `manifest.spec.ts`
 * holds the permission list to what the code actually uses.
 *
 * The permissions are the least that makes the product work:
 *
 * - `activeTab` + `scripting` instead of host access to every site. The
 *   extension reads a page only after the person invokes it on that page — the
 *   toolbar button, the context menu, the keyboard shortcut — and Chrome grants
 *   that tab alone, for that moment. The install prompt asks for nothing.
 * - Host access to the API's origin only, which is what lets the session
 *   cookie ride along (Chrome treats a request to a host the extension holds
 *   permission for as same-site).
 * - `storage`, `sidePanel` and `contextMenus` for what they say.
 *
 * Every string a person reads is a `__MSG_*__` reference into `_locales/`,
 * which the build writes from `@flama/translations` (`extension.manifest`).
 */
export interface ManifestInput {
  /** `package.json` version; Chrome wants one to four dot-separated integers. */
  version: string;
  /** Origin of the API, e.g. `http://localhost:3001`. */
  apiUrl: string;
  /**
   * Base64 public key that pins the extension id of an unpacked build, so the
   * API can trust one stable `chrome-extension://<id>` origin. Empty leaves
   * the id to Chrome (derived from the folder path). The Web Store refuses a
   * manifest carrying it; `pnpm zip` strips it.
   */
  publicKey?: string;
}

export const ICON_SIZES = [16, 32, 48, 128] as const;

const icons = Object.fromEntries(ICON_SIZES.map((size) => [size, `icons/icon-${size}.png`]));

export function defineManifest(input: ManifestInput): chrome.runtime.ManifestV3 {
  const apiOrigin = new URL(input.apiUrl).origin;

  return {
    manifest_version: 3,
    name: '__MSG_extName__',
    short_name: '__MSG_extShortName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    version: input.version,
    // `sidePanel.open()` and a service worker kept alive by its WebSocket both
    // arrived in 116.
    minimum_chrome_version: '116',
    icons,
    action: {
      default_title: '__MSG_extName__',
      default_popup: 'popup.html',
      default_icon: icons,
    },
    side_panel: { default_path: 'sidepanel.html' },
    options_ui: { page: 'options.html', open_in_tab: true },
    background: { service_worker: 'background.js', type: 'module' },
    permissions: ['activeTab', 'contextMenus', 'scripting', 'sidePanel', 'storage'],
    host_permissions: [`${apiOrigin}/*`],
    commands: {
      _execute_action: {
        suggested_key: { default: 'Alt+Shift+F' },
      },
      'save-page': {
        suggested_key: { default: 'Alt+Shift+S' },
        description: '__MSG_commandSavePage__',
      },
    },
    // MV3's default, written out so a change to it is a reviewed diff: no
    // inline script, no eval, no remote code — every script is in the package.
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'",
    },
    ...(input.publicKey ? { key: input.publicKey } : {}),
  };
}
