import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // The SWC plugin emits the decorator metadata NestJS relies on for
  // constructor-based dependency injection. Without it, type-only injected
  // params (e.g. ConfigService) resolve to `undefined`.
  plugins: [swc.vite()],
  test: {
    globals: true,
    root: "./",
    include: ["test/**/*.integration.spec.ts"],
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 30000,
  },
});
