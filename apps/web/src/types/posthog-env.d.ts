// PostHog's settings, merged into the `ImportMetaEnv` of `vite-env.d.ts`.
interface ImportMetaEnv {
  /** PostHog project key. Unset disables analytics entirely. */
  readonly VITE_POSTHOG_KEY?: string;
  /** PostHog host. Defaults to the EU cloud region. */
  readonly VITE_POSTHOG_HOST?: string;
}
