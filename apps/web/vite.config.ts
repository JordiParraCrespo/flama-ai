import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  // Busts the persisted query cache on release: a version bump drops entries
  // that may not match the new response shapes.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    TanStackRouterVite({
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
      },
    },
  },
  optimizeDeps: {
    // Workspace packages are linked, not installed, so dev has to be told to
    // pre-bundle this CommonJS entrypoint into ESM.
    include: ['@flama/shared/schemas/auth'],
  },
  build: {
    commonjsOptions: {
      // `@flama/shared` builds to CommonJS for the API's sake. Its `dist` sits
      // outside `node_modules`, so the interop plugin skips it by default and
      // Rollup cannot see the named exports.
      include: [/node_modules/, /packages[\\/]shared[\\/]dist/],
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
