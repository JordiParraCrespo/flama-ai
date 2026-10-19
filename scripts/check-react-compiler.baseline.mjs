/**
 * The files the React Compiler already leaves a function uncompiled in, per
 * app: what `pnpm check:compiler` tolerates. A file outside its app's list
 * fails the check, so a new bailout is decided on in review instead of
 * shipping silently.
 *
 * The list only shrinks. When a file stops bailing out the check says so;
 * delete its line. Adding one is a deliberate edit in the same diff as the
 * code that needs it, with the reason in the review.
 */
export const BASELINE = {
  // flama:begin web
  'apps/web': [
    'packages/frontend/core/src/react/analytics.queries.ts',
    'packages/frontend/design-system/web/src/components/combobox.tsx',
    'packages/frontend/design-system/web/src/components/stage-breakdown.tsx',
  ],
  // flama:end web
  // flama:plugins compiler-baseline
  // flama:begin mobile
  'apps/mobile': [
    'packages/frontend/core/src/react/analytics.queries.ts',
    'packages/frontend/design-system/mobile/src/components/ui/combobox.tsx',
    'packages/frontend/design-system/mobile/src/components/ui/stage-breakdown.tsx',
    'packages/frontend/design-system/mobile/src/components/ui/toast.tsx',
    'packages/frontend/design-system/mobile/src/hooks/use-hardware-back.ts',
  ],
  // flama:end mobile
};
