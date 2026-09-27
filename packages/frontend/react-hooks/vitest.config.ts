import { frontendVitestProjects } from '@flama/tsconfig/vitest-frontend.mjs';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({ test: frontendVitestProjects({ react }) });
