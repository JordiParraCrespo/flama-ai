import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The React bindings in `src/react/` need a DOM to render into. The rest of
    // the suite is environment-agnostic and runs unchanged under jsdom.
    environment: 'jsdom',
  },
});
