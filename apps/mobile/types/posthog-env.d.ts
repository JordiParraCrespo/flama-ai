// PostHog's settings, merged into the `ProcessEnv` of `env.d.ts`.
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_POSTHOG_KEY?: string;
    EXPO_PUBLIC_POSTHOG_HOST?: string;
  }
}
