/// <reference types="vite/client" />
/// <reference types="chrome" />

interface ImportMetaEnv {
  /** The API origin, e.g. `http://localhost:3001`. Also the manifest's one host permission. */
  readonly EXTENSION_PUBLIC_API_URL?: string;
  /** The web app, for the flows the extension sends people to (sign-up, password reset). */
  readonly EXTENSION_PUBLIC_WEB_URL?: string;
  /** Read by the build only (manifest `key`); listed so nothing else mistakes it for missing. */
  readonly EXTENSION_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** App version, injected by Vite from `package.json`. */
declare const __APP_VERSION__: string;
