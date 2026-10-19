import { readFileSync } from 'node:fs';
import path from 'node:path';
import { locales } from '@flama/translations/locales';
import { describe, expect, it } from 'vitest';
import { defineManifest } from '../../manifest.config';

/**
 * The manifest is the install prompt. What breaks if these fail: a new
 * permission ships without anyone deciding to ask for it (and Chrome disables
 * the extension for every existing user until they accept it); a string in
 * the store listing or the shortcut list shows as `__MSG_x__`.
 */
const manifest = defineManifest({ version: '1.2.3', apiUrl: 'https://api.flama.dev/v1/ignored' });

describe('manifest', () => {
  it('asks for exactly these permissions — a change here is a decision, not a diff', () => {
    expect(manifest.permissions).toEqual([
      'activeTab',
      'contextMenus',
      'scripting',
      'sidePanel',
      'storage',
    ]);
    expect(manifest.optional_permissions).toBeUndefined();
  });

  it('reaches one host, the API origin, and no website', () => {
    expect(manifest.host_permissions).toEqual(['https://api.flama.dev/*']);
    expect(manifest.content_scripts).toBeUndefined();
    expect(manifest.web_accessible_resources).toBeUndefined();
    expect(manifest.externally_connectable).toBeUndefined();
  });

  it('runs no code it did not ship', () => {
    expect(manifest.content_security_policy?.extension_pages).toBe(
      "script-src 'self'; object-src 'self'",
    );
  });

  it('pins the id only when given a key', () => {
    expect('key' in manifest).toBe(false);
    const pinned = defineManifest({ version: '1.0.0', apiUrl: 'http://x', publicKey: 'MIIB' });
    expect((pinned as { key?: string }).key).toBe('MIIB');
  });

  it.each(locales)('has every message it names in the %s catalog', (locale) => {
    const catalog = JSON.parse(
      readFileSync(
        path.resolve(
          import.meta.dirname,
          `../../../../packages/translations/${locale}/extension.json`,
        ),
        'utf8',
      ),
    ) as { chrome: Record<string, string> };
    const named = [...JSON.stringify(manifest).matchAll(/__MSG_(\w+)__/g)].map((m) => m[1]);

    expect(named.length).toBeGreaterThan(0);
    for (const key of named) expect(catalog.chrome[key], key).toBeTruthy();
  });
});
