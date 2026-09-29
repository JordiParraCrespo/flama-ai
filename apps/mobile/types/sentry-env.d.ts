// Sentry's settings, merged into the `ProcessEnv` of `env.d.ts`.
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_SENTRY_DSN?: string;
    SENTRY_ORG?: string;
    SENTRY_PROJECT?: string;
  }
}
