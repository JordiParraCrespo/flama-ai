#!/usr/bin/env node
/**
 * Pins the extension's id for development.
 *
 * Chrome derives an unpacked extension's id from its folder path, so every
 * checkout gets a different one — and the API trusts an origin by id
 * (`chrome-extension://<id>`). A `key` in the manifest fixes the id instead:
 * Chrome hashes the public key, not the path.
 *
 *   pnpm --filter @flama/extension keygen
 *
 * prints the two lines to put in the root `.env`. Only the public half is
 * printed or needed; the private half is discarded, because nothing signs
 * with it — the Web Store signs what it publishes with its own key, and
 * `pnpm zip` strips this one before upload.
 */
import { createHash, generateKeyPairSync } from 'node:crypto';

/** Chrome's id: the first 128 bits of SHA-256(public key DER), hex mapped onto a–p. */
export function extensionId(publicKeyDer) {
  const hex = createHash('sha256').update(publicKeyDer).digest('hex').slice(0, 32);
  return [...hex].map((digit) => String.fromCharCode(97 + Number.parseInt(digit, 16))).join('');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const der = publicKey.export({ type: 'spki', format: 'der' });

  console.log(`EXTENSION_PUBLIC_KEY=${der.toString('base64')}`);
  console.log(`EXTENSION_IDS=${extensionId(der)}`);
}
