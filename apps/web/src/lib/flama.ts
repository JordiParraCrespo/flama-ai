import { FlamaApp } from "@flama/frontend";
import { webAuthClient } from "./auth-client";
import { LocalStorageService } from "./storage";

// Same-origin by default: the Vite dev server proxies `/api` to the API so the
// session cookie is sent with every request. Set VITE_API_URL only when the
// API is served from a different origin behind a shared domain in production.
const apiBaseUrl = import.meta.env.VITE_API_URL ?? "";

export const app = FlamaApp.create({
  apiBaseUrl,
  storage: new LocalStorageService(),
  authClient: webAuthClient,
});
