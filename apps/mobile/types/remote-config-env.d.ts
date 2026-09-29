// Remote config's setting, merged into the `ProcessEnv` of `env.d.ts`.
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_CONFIG_URL?: string;
  }
}
