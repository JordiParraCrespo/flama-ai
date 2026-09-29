/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API origin. Empty means same-origin (the dev server proxies `/api`). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** App version, injected by Vite from `package.json`. */
declare const __APP_VERSION__: string;
