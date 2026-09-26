/**
 * The render-topology checks, run against trees built for the purpose.
 *
 * Running the checker over the repository only says the repository conforms
 * today; it cannot exercise a rule nothing currently breaks. The script reads
 * the tree beside it, so each case copies it into a scratch root with a
 * minimal app and asserts on what it reports.
 *
 * The fixtures build `apps/web`, so the suite goes when that app does.
 */
// flama:begin web
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';

const roots = [];
after(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

/** A scratch repo holding `apps/web` with `files`, and the checker's report on it. */
function check(files) {
  const root = mkdtempSync(join(tmpdir(), 'flama-structure-'));
  roots.push(root);
  mkdirSync(join(root, 'scripts'));
  copyFileSync(
    new URL('./check-frontend-structure.mjs', import.meta.url),
    join(root, 'scripts/check-frontend-structure.mjs'),
  );
  // The feature name has to be a module of the product package.
  mkdirSync(join(root, 'packages/frontend/consumer/src/modules/things'), { recursive: true });
  for (const [path, contents] of Object.entries(files)) {
    const full = join(root, 'apps/web', path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, contents);
  }
  const run = spawnSync(process.execPath, [join(root, 'scripts/check-frontend-structure.mjs')], {
    encoding: 'utf8',
  });
  return `${run.stdout}${run.stderr}`;
}

const FORWARDING_SECTION = `import { ThingForm } from '@/features/things/forms/thing-form';
export function ThingCard({ groups, onSave }: { groups: string[]; onSave: () => void }) {
  return <ThingForm groups={groups} onSave={onSave} />;
}
`;

test('a section that only hands a data prop on is reported', () => {
  const report = check({ 'src/features/things/sections/thing-card.tsx': FORWARDING_SECTION });
  assert.match(report, /thing-card\.tsx: `groups` is only handed on/);
  assert.doesNotMatch(report, /`onSave` is only handed on/);
});

test('a section that reads the prop as well passes', () => {
  const report = check({
    'src/features/things/sections/thing-card.tsx': `import { ThingForm } from '@/features/things/forms/thing-form';
export function ThingCard({ groups }: { groups: string[] }) {
  return <ThingForm groups={groups} empty={groups.length === 0} />;
}
`,
  });
  assert.doesNotMatch(report, /is only handed on/);
});

test('a form may hand data on: it cannot fetch', () => {
  const report = check({
    'src/features/things/forms/thing-form.tsx': FORWARDING_SECTION.replace(
      'ThingCard',
      'ThingFormBody',
    ),
  });
  assert.doesNotMatch(report, /is only handed on/);
});

test('React Hook Form control handed to a leaf is the prescribed shape', () => {
  const report = check({
    'src/features/things/sections/thing-rows.tsx': `import { ThingRow } from '@/features/things/components/thing-row';
export function ThingRows({ control }: { control: unknown }) {
  return <ThingRow control={control} />;
}
`,
  });
  assert.doesNotMatch(report, /is only handed on/);
});

test('a route that subscribes only to feed one section is reported', () => {
  const report = check({
    'src/routes/things.tsx': `import { useThings } from '@flama/frontend-consumer/react';
import { ThingList } from '@/features/things/sections/thing-list';
function ThingsPage() {
  const things = useThings();
  return <ThingList rows={things.data} />;
}
`,
  });
  assert.match(
    report,
    /routes\/things\.tsx: subscribes to `things` only to hand it to <ThingList \/>/,
  );
});

test('a route that reads the result itself passes', () => {
  const report = check({
    'src/routes/things.tsx': `import { useThings } from '@flama/frontend-consumer/react';
import { ThingList } from '@/features/things/sections/thing-list';
function ThingsPage() {
  const things = useThings();
  return <ThingList />;
}
`,
  });
  assert.doesNotMatch(report, /subscribes to/);
});
// flama:end web
