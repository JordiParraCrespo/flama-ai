/**
 * Writes `src/routeTree.gen.ts` from `src/routes/`, the way the Vite plugin
 * does in dev. The build runs it before `tsc -b`, so the type-check reads the
 * routes as they are on disk rather than as the last dev server left them.
 * Both read `tsr.config.json`.
 */
import { fileURLToPath } from 'node:url';
import { Generator, getConfig } from '@tanstack/router-generator';

const root = fileURLToPath(new URL('..', import.meta.url));
await new Generator({ config: getConfig({}, root), root }).run();
