/**
 * The build's own tools. What breaks if these fail: the store rejects the
 * package as a corrupt archive; the dev reloader's handshake is refused and
 * nothing reloads; the id printed for the API is not the id Chrome assigns.
 */
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { test } from 'node:test';
import { inflateRawSync } from 'node:zlib';
import { extensionId } from './keygen.mjs';
import { acceptKey, textFrame } from './reload-server.mjs';
import { zip } from './zip.mjs';

/** Read an archive back through its central directory, the way an unzipper does. */
function unzip(buffer) {
  const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = buffer.readUInt16LE(end + 10);
  let at = buffer.readUInt32LE(end + 16);
  const files = {};
  for (let i = 0; i < count; i += 1) {
    assert.equal(buffer.readUInt32LE(at), 0x02014b50);
    const method = buffer.readUInt16LE(at + 10);
    const size = buffer.readUInt32LE(at + 20);
    const nameLength = buffer.readUInt16LE(at + 28);
    const local = buffer.readUInt32LE(at + 42);
    const name = buffer.subarray(at + 46, at + 46 + nameLength).toString('utf8');
    const localNameLength = buffer.readUInt16LE(local + 26);
    const body = buffer.subarray(local + 30 + localNameLength, local + 30 + localNameLength + size);
    files[name] = (method === 8 ? inflateRawSync(body) : body).toString('utf8');
    at += 46 + nameLength;
  }
  return files;
}

test('zip: an archive reads back to the files that went in', () => {
  const files = [
    { name: 'manifest.json', data: Buffer.from('{"manifest_version":3}') },
    { name: 'assets/app.js', data: Buffer.from('console.log(1);\n'.repeat(200)) },
    { name: '_locales/es/messages.json', data: Buffer.from('{"ñ":"ü"}') },
  ];
  const read = unzip(zip(files));
  for (const { name, data } of files) assert.equal(read[name], data.toString('utf8'));
});

test('zip: the same files make the same bytes, in any order', () => {
  const a = { name: 'a.txt', data: Buffer.from('a') };
  const b = { name: 'b.txt', data: Buffer.from('b') };
  assert.deepEqual(zip([a, b]), zip([b, a]));
});

test('reload server: the handshake answer is the one RFC 6455 §1.3 gives', () => {
  assert.equal(acceptKey('dGhlIHNhbXBsZSBub25jZQ=='), 's3pPLMBiTxaQ9kYGzzhZRbK+xOo=');
});

test('reload server: a text frame is unmasked, final, with its length', () => {
  assert.deepEqual([...textFrame('reload')], [0x81, 6, ...Buffer.from('reload')]);
  const long = textFrame('x'.repeat(300));
  assert.equal(long[1], 126);
  assert.equal(long.readUInt16BE(2), 300);
});

test("keygen: the id is Chrome's — SHA-256 of the key, first 32 hex digits mapped onto a–p", () => {
  const { publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const der = publicKey.export({ type: 'spki', format: 'der' });
  const id = extensionId(der);
  assert.match(id, /^[a-p]{32}$/);
  const hex = createHash('sha256').update(der).digest('hex');
  assert.equal(id.charCodeAt(0) - 97, Number.parseInt(hex[0], 16));
});
